'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

type RemoteConfig<T> = {
  /** e.g. `/api/projects/${projectId}/drafts` */
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  /** Convert your data to a serializable payload */
  body?: (data: T) => unknown;
};

export interface UseAutoSaveOptions<T> {
  /** Required for namespacing the local draft key */
  projectId?: string | null;
  /** Step identifier (number or string code) */
  stepCode: number | string;
  /** The data to persist (form state, etc.) */
  data: T;
  /** Debounce for local + remote saves */
  debounceMs?: number;
  /** Optional remote save endpoint */
  remote?: RemoteConfig<T> | null;
}

export interface UseAutoSaveReturn<T> {
  status: AutoSaveStatus;
  lastSavedAt: number | null;
  /** Read the last locally cached draft (if any) */
  loadLocal: () => T | null;
  /** Clear local cache for this step */
  clearLocal: () => void;
  /** Manually trigger an immediate save (local + remote) */
  saveNow: () => Promise<void>;
}

/**
 * Local-first autosave with optional remote sync.
 * - Always writes to localStorage (keyed by projectId + stepCode).
 * - Optionally POSTs/PATCHes to your backend (if `remote` provided).
 * - Debounced by default; call `saveNow()` for immediate flush.
 */
export function useAutoSave<T>({
  projectId,
  stepCode,
  data,
  debounceMs = 300,
  remote = null,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn<T> {
  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const storageKey = useMemo(() => {
    if (!projectId) return null;
    return `draft:${projectId}:${String(stepCode)}`;
  }, [projectId, stepCode]);

  const writeLocal = useCallback(
    (payload: T) => {
      if (!storageKey) return;
      try {
        const record = { data: payload, t: Date.now() };
        localStorage.setItem(storageKey, JSON.stringify(record));
        setLastSavedAt(record.t);
      } catch {
        // ignore localStorage quota errors
      }
    },
    [storageKey]
  );

  const sendRemote = useCallback(
    async (payload: T) => {
      if (!remote) return;
      try {
        const res = await fetch(remote.url, {
          method: remote.method ?? 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(remote.headers || {}),
          },
          body: JSON.stringify(remote.body ? remote.body(payload) : payload),
        });
        if (!res.ok) throw new Error(`Remote save failed: ${res.status}`);
      } catch (e) {
        // Remote errors flip status to error but do not block local caching
        setStatus('error');
      }
    },
    [remote]
  );

  const performSave = useCallback(async () => {
    setStatus('saving');
    writeLocal(data);
    await sendRemote(data);
    setStatus('saved');
  }, [data, writeLocal, sendRemote]);

  // Debounced autosave on data changes
  useEffect(() => {
    if (!storageKey) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void performSave();
    }, debounceMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [data, storageKey, debounceMs, performSave]);

  const loadLocal = useCallback((): T | null => {
    if (!storageKey) return null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { data: T; t: number };
      return parsed?.data ?? null;
    } catch {
      return null;
    }
  }, [storageKey]);

  const clearLocal = useCallback(() => {
    if (!storageKey) return;
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  const saveNow = useCallback(async () => {
    if (!storageKey) return;
    if (timer.current) clearTimeout(timer.current);
    await performSave();
  }, [storageKey, performSave]);

  return { status, lastSavedAt, loadLocal, clearLocal, saveNow };
}
