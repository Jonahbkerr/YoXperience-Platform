import { useRef, useState } from 'react';
import { api } from '../api';

interface Scene {
  narration: string;
  say: string;     // what gets sent as the user turn
  waitMs: number;  // pause after send (mostly to let the render land)
}

const SCRIPT: Scene[] = [
  {
    narration: 'Scene 1 — Single intent, UI adapts',
    say: 'Show me my unread emails',
    waitMs: 35000,
  },
  {
    narration: 'Scene 2 — Compound intent, workflow playbook',
    say: "Check my unread emails and then post to #social on Slack that I'm running 10 minutes late",
    waitMs: 40000,
  },
  {
    narration: 'Scene 3 — UI morphs to a new task',
    say: "What's on my calendar today?",
    waitMs: 30000,
  },
  {
    narration: 'Scene 4 — Write actions with draft + confirm',
    say: 'Draft a short email to me about tomorrow\'s demo',
    waitMs: 30000,
  },
];

interface Props {
  onTourSend: (text: string) => Promise<void> | void;
  disabled?: boolean;
}

export function DemoTour({ onTourSend, disabled }: Props) {
  const [sceneIdx, setSceneIdx] = useState(-1);
  const [running, setRunning] = useState(false);
  const cancelRef = useRef(false);

  const start = async () => {
    setRunning(true);
    cancelRef.current = false;
    for (let i = 0; i < SCRIPT.length; i++) {
      if (cancelRef.current) break;
      setSceneIdx(i);
      const scene = SCRIPT[i];
      await onTourSend(scene.say);
      // Wait for render to land (and audience to absorb)
      await wait(scene.waitMs, cancelRef);
    }
    setSceneIdx(-1);
    setRunning(false);
  };

  const stop = () => {
    cancelRef.current = true;
  };

  if (!running) {
    return (
      <button
        onClick={start}
        disabled={disabled}
        title="Play scripted demo turns automatically"
        style={{
          padding: '5px 12px',
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: 6,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 12,
        }}
      >
        ▶ Demo Tour
      </button>
    );
  }

  const scene = sceneIdx >= 0 ? SCRIPT[sceneIdx] : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: '#4a80d0', fontWeight: 500 }}>
        ● Playing scene {sceneIdx + 1}/{SCRIPT.length}
      </span>
      {scene && (
        <span style={{ fontSize: 11, color: '#666', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {scene.narration}
        </span>
      )}
      <button
        onClick={stop}
        style={{
          padding: '3px 10px',
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: 6,
          cursor: 'pointer',
          fontSize: 11,
        }}
      >
        ⏹ Stop
      </button>
    </div>
  );
}

function wait(ms: number, cancel: { current: boolean }): Promise<void> {
  return new Promise((resolve) => {
    const tick = (left: number) => {
      if (cancel.current) { resolve(); return; }
      if (left <= 0) { resolve(); return; }
      setTimeout(() => tick(left - 200), 200);
    };
    tick(ms);
  });
}

// re-export api in case someone wants to bypass prop injection:
export { api };
