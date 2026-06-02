import { useEffect, useRef, useState } from 'react';

interface Props {
  onSend: (text: string, source: 'text' | 'voice') => void;
  disabled?: boolean;
}

type SRCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort?(): void;
  onresult: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
  onstart: (() => void) | null;
};

function getSR(): SRCtor | null {
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const recogRef = useRef<ReturnType<SRCtor> | null>(null);
  const finalTextRef = useRef<string>('');
  const sentRef = useRef<boolean>(false);

  useEffect(() => {
    setSupported(getSR() !== null);
  }, []);

  const submit = (source: 'text' | 'voice', override?: string) => {
    const t = (override ?? text).trim();
    if (!t || disabled) return;
    onSend(t, source);
    setText('');
  };

  const startListening = async () => {
    const Ctor = getSR();
    if (!Ctor) { setMicError('Speech recognition not supported in this browser'); return; }

    // Proactively request mic permission so we get a clear error
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
      }
    } catch (e) {
      setMicError('Microphone permission denied. Click the lock icon in the URL bar to allow.');
      return;
    }

    setMicError(null);
    finalTextRef.current = '';
    sentRef.current = false;

    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => setListening(true);

    rec.onresult = (e: unknown) => {
      const ev = e as { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> };
      let final = finalTextRef.current;
      let interim = '';
      // Collect only results we haven't already committed to final
      for (let i = 0; i < ev.results.length; i++) {
        const res = ev.results[i];
        if (res.isFinal) {
          final += res[0].transcript;
        } else {
          interim += res[0].transcript;
        }
      }
      finalTextRef.current = final;
      setText((final + interim).trim());
    };

    rec.onerror = (e: unknown) => {
      const err = e as { error?: string };
      setMicError(`Mic error: ${err.error ?? 'unknown'}`);
      setListening(false);
    };

    rec.onend = () => {
      setListening(false);
      const final = finalTextRef.current.trim();
      const current = (finalTextRef.current || text).trim();
      const toSend = final || current;
      if (toSend && !sentRef.current) {
        sentRef.current = true;
        setText('');
        onSend(toSend, 'voice');
      }
    };

    recogRef.current = rec;

    try {
      rec.start();
    } catch (e) {
      setMicError(`Failed to start: ${(e as Error).message}`);
      setListening(false);
    }
  };

  const stopListening = () => {
    recogRef.current?.stop();
  };

  return (
    <div style={{ borderTop: '1px solid #e4e8ec', background: 'white' }}>
      {micError && (
        <div style={{ padding: '6px 20px', background: '#fee', color: '#c33', fontSize: 12 }}>
          ⚠ {micError}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, padding: '12px 20px', alignItems: 'center' }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit('text'); }}
          placeholder={listening ? 'Listening… speak now' : 'Tell me what you want to do…'}
          disabled={disabled}
          style={{
            flex: 1,
            padding: '10px 12px',
            fontSize: 14,
            border: `1px solid ${listening ? '#ff6b35' : '#d0d6dc'}`,
            borderRadius: 8,
            outline: 'none',
            background: listening ? '#fff4e6' : 'white',
          }}
        />
        {supported && (
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            disabled={disabled}
            title={listening ? 'Stop listening' : 'Click to speak'}
            style={{
              padding: '8px 12px',
              fontSize: 18,
              background: listening ? '#ff6b35' : 'white',
              color: listening ? 'white' : '#333',
              border: `1px solid ${listening ? '#ff6b35' : '#d0d6dc'}`,
              borderRadius: 8,
              cursor: disabled ? 'not-allowed' : 'pointer',
              minWidth: 44,
            }}
          >
            {listening ? '⏹' : '🎤'}
          </button>
        )}
        {!supported && (
          <span style={{ fontSize: 11, color: '#999' }}>
            (Voice unsupported in this browser — use Chrome/Edge/Safari)
          </span>
        )}
        <button
          type="button"
          onClick={() => submit('text')}
          disabled={disabled || !text.trim()}
          style={{
            padding: '10px 18px',
            fontSize: 13,
            background: text.trim() && !disabled ? '#111' : '#eee',
            color: text.trim() && !disabled ? 'white' : '#888',
            border: 'none',
            borderRadius: 8,
            cursor: text.trim() && !disabled ? 'pointer' : 'not-allowed',
            fontWeight: 500,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
