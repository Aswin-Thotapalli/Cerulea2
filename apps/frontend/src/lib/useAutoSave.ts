'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Status = 'idle' | 'restoring' | 'saving' | 'saved' | 'error';

type AutoSaveOpts<T = unknown> = {
  projectId: string;
  bucket: string;
  data: T;
  onRestore?: (draft: T) => void;
  endpoint?: string;         // default '/api/drafts'
  debounceMs?: number;       // default 600
  enabled?: boolean;         // default true
};

export function useAutoSave<T = unknown>({
  projectId,
  bucket,
  data,
  onRestore,
  endpoint = '/api/drafts',
  debounceMs = 600,
  enabled = true,
}: AutoSaveOpts<T>) {
  const [status, setStatus] = useState<Status>('idle');
  const timerRef = useRef<number | null>(null);
  const savingRef = useRef(false);

  // stable key for localStorage mirror
  const localKey = useMemo(() => `draft:${projectId}::${bucket}`, [projectId, bucket]);

  const clearTimer = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const saveNow = useCallback(async (payload?: T) => {
    if (!enabled) return;
    try {
      setStatus('saving');
      savingRef.current = true;

      const body = {
        projectId,
        bucket,
        data: payload ?? data,
      };

      // local mirror (quick backup)
      try {
        localStorage.setItem(localKey, JSON.stringify(body.data));
      } catch {}

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) {
        console.warn('[autosave] server responded not ok', res.status, json);
        setStatus('error');
      } else {
        setStatus('saved');
      }
    } catch (err) {
      console.error('[autosave] failed', err);
      setStatus('error');
    } finally {
      savingRef.current = false;
    }
  }, [bucket, data, enabled, endpoint, localKey, projectId]);

  // Debounced save when data changes
  useEffect(() => {
    if (!enabled) return;
    clearTimer();
    // Don’t queue while an in-flight save is running
    timerRef.current = window.setTimeout(() => {
      if (!savingRef.current) saveNow();
    }, debounceMs) as unknown as number;
    return clearTimer;
  }, [data, debounceMs, enabled, saveNow]);

  // Try to restore on mount (server first, then local mirror)
  useEffect(() => {
    if (!enabled) return;
    let ignore = false;
    (async () => {
      try {
        setStatus('restoring');
        const url = `${endpoint}?projectId=${encodeURIComponent(projectId)}&bucket=${encodeURIComponent(bucket)}`;
        const res = await fetch(url, { method: 'GET' });
        if (res.ok) {
          const json = await res.json();
          if (!ignore && json?.data && onRestore) onRestore(json.data as T);
          setStatus('idle');
          return;
        }
      } catch {}
      // fallback to local
      try {
        const raw = localStorage.getItem(localKey);
        if (raw && onRestore && !ignore) {
          onRestore(JSON.parse(raw) as T);
        }
      } catch {}
      setStatus('idle');
    })();
    return () => { ignore = true; };
  }, [bucket, endpoint, localKey, onRestore, projectId, enabled]);

  return { status, saveNow };
}
