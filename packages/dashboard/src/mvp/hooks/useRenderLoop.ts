import { useEffect, useState } from 'react';
import { api, RenderResponse } from '../api';

export function useRenderLoop(intervalMs = 7000) {
  const [data, setData] = useState<RenderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await api.render();
        if (!cancelled) { setData(res); setError(res.error ?? null); }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }

    tick();
    const id = setInterval(tick, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [intervalMs]);

  return { data, error };
}
