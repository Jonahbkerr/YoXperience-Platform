import { useEffect, useState } from 'react';

export function useTypewriter(text: string, charsPerSec = 80) {
  const [shown, setShown] = useState('');

  useEffect(() => {
    setShown('');
    if (!text) return;
    const perChar = 1000 / charsPerSec;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, perChar);
    return () => clearInterval(id);
  }, [text, charsPerSec]);

  return { text: shown, done: shown.length >= text.length };
}
