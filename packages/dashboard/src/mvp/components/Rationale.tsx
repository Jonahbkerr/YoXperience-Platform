import { useTypewriter } from '../hooks/useTypewriter';

export function Rationale({ text }: { text: string }) {
  const { text: shown, done } = useTypewriter(text, 120);
  return (
    <div style={{ fontSize: 11, color: '#9aa0a6', marginTop: 8, fontStyle: 'italic' }}>
      {shown}
      {!done && <span className="yxp-typing-cursor" />}
    </div>
  );
}
