import { useEffect, useRef, useState } from 'react';
import { api, RenderResponse } from '../api';

export function useRenderLoop(intervalMs = 45000) {
  const [data, setData] = useState<RenderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inflight = useRef(false);
  const cancelledRef = useRef(false);

  async function tick() {
    if (inflight.current) return;
    inflight.current = true;
    setLoading(true);
    try {
      const res = await api.render();
      if (!cancelledRef.current) { setData(res); setError(res.error ?? null); }
    } catch (e) {
      if (!cancelledRef.current) setError((e as Error).message);
    } finally {
      inflight.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    cancelledRef.current = false;
    tick();
    const id = intervalMs > 0 ? setInterval(tick, intervalMs) : null;
    return () => {
      cancelledRef.current = true;
      if (id) clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  return { data, error, loading, reload: tick };
}
