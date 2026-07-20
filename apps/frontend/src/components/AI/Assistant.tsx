'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Fab, Drawer, Box, Typography, TextField, IconButton, Stack,
  Chip, Divider, Avatar, Paper, Tooltip, Button,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ForumIcon from '@mui/icons-material/Forum';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useStudio } from '@/context/StudioContext';
import { api } from '@/lib/apiClient'; // used by history/thread routes

const fabVariants = {
  hidden: { scale: 0, y: 50, opacity: 0 },
  visible: {
    scale: 1, y: 0, opacity: 1,
    transition: { type: 'spring' as const, stiffness: 260, damping: 20, delay: 0.5 },
  },
};

type ChatRole = 'user' | 'assistant';
type ChatMessage = { id: string; role: ChatRole; text: string; createdAt: Date };
type ThreadSummary = { id: string; title: string; updatedAt: string };
type View = 'chat' | 'history';

function makeId(prefix = 'msg') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatRelative(dateStr: string) {
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

const GUEST_PROMPTS = [
  'What can I build with Cerulea?',
  'Help me choose a template',
  'What is a dApp vs Private Blockchain?',
  'Which modules do I need for a DEX?',
];

const PROJECT_PROMPTS = [
  'What should I configure next?',
  'Check my project for issues',
  'Explain my smart contracts',
  'How do I set access control?',
];

function getGreeting(isAuthenticated: boolean, projectName?: string) {
  if (!isAuthenticated) {
    return "Hi! I'm Cerulea AI.\n\nI can help you figure out what to build and guide you step-by-step through Cerulea Studio — even before you sign up.\n\nTell me about the application you have in mind. What should it do?";
  }
  if (projectName) {
    return `Hi! I'm Cerulea AI.\n\nI have full context on your project **${projectName}** — including your modules, schema, economics, and what's been configured so far.\n\nWhat do you need help with?`;
  }
  return "Hi! I'm Cerulea AI.\n\nI'm aware of your account and can see your project details when you're inside a project.\n\nWhat would you like to work on?";
}

export default function Assistant() {
  const pathname = usePathname();
  const studio = useStudio();
  const theme = useTheme();
  const { data: session, status: sessionStatus } = useSession();

  const isAuthenticated = !!(session?.user);
  const userId = (session?.user as any)?.id as string | undefined;
  const hasProject = !!(studio.projectId);
  const projectName = studio.appMetadata?.appName || null;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('chat');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: makeId('assistant'), role: 'assistant', text: getGreeting(false), createdAt: new Date() },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [threadList, setThreadList] = useState<ThreadSummary[]>([]);
  const [signInDismissed, setSignInDismissed] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const initializedRef = useRef(false);
  const lastLoadedForRef = useRef<string | null>(null);
  const skipThreadLoadRef = useRef(false);
  const pendingAutoSendRef = useRef<string | null>(null);

  // ---------------------------------------------------------------------------
  // Greeting
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (initializedRef.current) return;
    initializedRef.current = true;
    setMessages([{
      id: makeId('assistant'),
      role: 'assistant',
      text: getGreeting(isAuthenticated, projectName ?? undefined),
      createdAt: new Date(),
    }]);
  }, [sessionStatus, isAuthenticated, projectName]);

  // ---------------------------------------------------------------------------
  // Auto-open on first load (before user has ever collapsed the panel)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!localStorage.getItem('ceruleai:hasCollapsed')) setOpen(true);
  }, []);

  // ---------------------------------------------------------------------------
  // Consume pending prompt — reads directly from URL or sessionStorage.
  // URL (?prompt=) is the path for logged-in users redirected from homepage.
  // sessionStorage is the fallback for the register flow.
  // Reading from window.location here avoids the dynamic-import timing issue
  // where StudioEntry may mount after this effect has already run.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPrompt = params.get('prompt');
    if (urlPrompt) {
      skipThreadLoadRef.current = true;
      pendingAutoSendRef.current = urlPrompt;
      setOpen(true);
      const clean = new URL(window.location.href);
      clean.searchParams.delete('prompt');
      window.history.replaceState(null, '', clean.toString());
      return;
    }
    const saved = sessionStorage.getItem('ceruleai:pendingPrompt');
    if (saved) {
      skipThreadLoadRef.current = true;
      pendingAutoSendRef.current = saved;
      sessionStorage.removeItem('ceruleai:pendingPrompt');
      setOpen(true);
    }
  }, []);

  // Fire the auto-send once the session has resolved so auth state is known
  // before we create a thread and send the first message.
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!pendingAutoSendRef.current) return;
    const prompt = pendingAutoSendRef.current;
    pendingAutoSendRef.current = null;
    // Small delay so the greeting message renders before the user turn appears
    const t = window.setTimeout(() => handleSend(prompt), 300);
    return () => window.clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus]);

  // ---------------------------------------------------------------------------
  // Load auth threads when drawer opens
  // ---------------------------------------------------------------------------
  const loadAuthThreads = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const projectId = studio.projectId;
      const url = projectId
        ? `/api/ai/threads?projectId=${encodeURIComponent(projectId)}`
        : '/api/ai/threads';
      const res = await api<{ threads: any[] }>(url);
      const summaries: ThreadSummary[] = (res.threads ?? []).map((t) => ({
        id: t.id, title: t.title ?? 'Untitled', updatedAt: t.updatedAt,
      }));
      setThreadList(summaries);

      if (summaries.length > 0) {
        const latest = summaries[0];
        const msgRes = await api<{ messages: any[] }>(`/api/ai/threads/${latest.id}/messages`);
        if (msgRes.messages?.length > 0) {
          setMessages(msgRes.messages.map((m) => ({
            id: m.id, role: m.role as ChatRole, text: m.content, createdAt: new Date(m.createdAt),
          })));
          setCurrentThreadId(latest.id);
        }
      }
    } catch (err) {
      console.error('[ceruleai] failed to load threads:', err);
    }
  }, [isAuthenticated, studio.projectId]);

  useEffect(() => {
    if (!open) return;
    if (sessionStatus === 'loading') return;
    if (skipThreadLoadRef.current) {
      // Opened from a URL/sessionStorage prompt — keep fresh state, don't load history
      skipThreadLoadRef.current = false;
      return;
    }
    const key = isAuthenticated ? (userId ?? 'auth') : 'guest';
    if (lastLoadedForRef.current === key) return;
    lastLoadedForRef.current = key;
    if (isAuthenticated) loadAuthThreads();
    // Guests: no history — nothing to load
  }, [open, sessionStatus, isAuthenticated, userId, loadAuthThreads]);

  // ---------------------------------------------------------------------------
  // Scroll
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    };
  }, []);


  // ---------------------------------------------------------------------------
  // Studio snapshot & memory
  // ---------------------------------------------------------------------------
  function buildStudioSnapshot() {
    return {
      currentRoute: pathname,
      studioState: {
        projectId: studio.projectId,
        projectType: studio.projectType,
        step0Phase: studio.step0Phase ?? null,
        templateId: studio.templateId,
        selectedModules: studio.selectedModules,
        appMetadata: studio.appMetadata,
        appGoal: studio.appGoal,
        networkConfig: studio.networkConfig,
        dappVisibility: studio.dappVisibility,
        legacyMode: studio.legacyMode,
      },
    };
  }

  function readProjectMemory() {
    try {
      const raw = localStorage.getItem(`ceruleai:memory:${studio.projectId || 'local'}`);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  function buildProjectMemory() {
    const prev = readProjectMemory();
    const next = { ...prev, projectType: studio.projectType, selectedModules: studio.selectedModules, appMetadata: studio.appMetadata, updatedAt: new Date().toISOString() };
    try { localStorage.setItem(`ceruleai:memory:${studio.projectId || 'local'}`, JSON.stringify(next)); } catch {}
    return next;
  }

  function toHistoryPayload(msgs: ChatMessage[]) {
    const out: { role: ChatRole; text: string }[] = [];
    let used = 0;
    for (let i = msgs.length - 1; i >= 0; i--) {
      const line = `${msgs[i].role}:${msgs[i].text}\n`;
      if (used + line.length > 12000) break;
      out.unshift({ role: msgs[i].role, text: msgs[i].text });
      used += line.length;
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // New Chat
  // ---------------------------------------------------------------------------
  function handleNewChat() {
    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    if (streamTimerRef.current) window.clearInterval(streamTimerRef.current);
    setIsTyping(false);
    setInput('');
    setCurrentThreadId(null);
    setSignInDismissed(false);
    setMessages([{
      id: makeId('assistant'),
      role: 'assistant',
      text: getGreeting(isAuthenticated, projectName ?? undefined),
      createdAt: new Date(),
    }]);
    setView('chat');
  }

  // ---------------------------------------------------------------------------
  // Load a thread from history
  // ---------------------------------------------------------------------------
  async function handleLoadThread(id: string) {
    if (!isAuthenticated) return;
    try {
      const res = await api<{ messages: any[] }>(`/api/ai/threads/${id}/messages`);
      if (res.messages?.length > 0) {
        setMessages(res.messages.map((m) => ({
          id: m.id, role: m.role as ChatRole, text: m.content, createdAt: new Date(m.createdAt),
        })));
      }
    } catch {}
    setCurrentThreadId(id);
    setView('chat');
  }

  // ---------------------------------------------------------------------------
  // Delete a thread
  // ---------------------------------------------------------------------------
  async function handleDeleteThread(id: string) {
    try {
      await api<{ ok: boolean }>(`/api/ai/threads/${id}`, { method: 'DELETE' });
      setThreadList((prev) => prev.filter((t) => t.id !== id));
      if (currentThreadId === id) handleNewChat();
    } catch {}
  }

  // ---------------------------------------------------------------------------
  // Send message
  // ---------------------------------------------------------------------------
  async function handleSend(msgText?: string) {
    const msg = (msgText || input).trim();
    if (!msg || isTyping) return;
    setInput('');

    let threadId = currentThreadId;

    // Auth users: create a thread on first message
    if (!threadId && isAuthenticated) {
      try {
        const res = await api<{ thread: any }>('/api/ai/threads', {
          method: 'POST',
          body: JSON.stringify({ projectId: studio.projectId || null, title: msg.slice(0, 80) }),
        });
        threadId = res.thread.id;
        setCurrentThreadId(threadId);
        setThreadList((prev) => [{ id: res.thread.id, title: msg.slice(0, 80), updatedAt: new Date().toISOString() }, ...prev]);
      } catch { /* non-fatal */ }
    }

    const userMsg: ChatMessage = { id: makeId('user'), role: 'user', text: msg, createdAt: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const capturedMessages = messages;

    typingTimerRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch('/api/ceruleai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: msg,
            history: toHistoryPayload(capturedMessages),
            studioSnapshot: buildStudioSnapshot(),
            projectMemory: buildProjectMemory(),
            threadId: threadId || undefined,
          }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.message ?? `Server error ${res.status}`);
        }

        if (!res.body) throw new Error('No response body');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const msgId = makeId('assistant');
        const createdAt = new Date();
        let firstChunk = true;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;

          if (firstChunk) {
            // Switch from typing dots to the actual message bubble on first text
            setMessages((prev) => [...prev, { id: msgId, role: 'assistant', text: chunk, createdAt }]);
            setIsTyping(false);
            firstChunk = false;
          } else {
            setMessages((prev) =>
              prev.map((m) => m.id === msgId ? { ...m, text: m.text + chunk } : m)
            );
          }
        }

        // Guard: if stream closed with no content
        if (firstChunk) {
          setMessages((prev) => [...prev, { id: msgId, role: 'assistant', text: "I couldn't generate a response right now.", createdAt }]);
          setIsTyping(false);
        }

        // Move thread to top of list
        if (isAuthenticated && threadId) {
          setThreadList((prev) => {
            const existing = prev.find((t) => t.id === threadId);
            if (!existing) return prev;
            return [{ ...existing, updatedAt: new Date().toISOString() }, ...prev.filter((t) => t.id !== threadId)];
          });
        }
      } catch (e: any) {
        setIsTyping(false);
        const errText = typeof e?.message === 'string' ? `Something went wrong: ${e.message}` : 'Something went wrong generating the response.';
        setMessages((prev) => [...prev, { id: makeId('assistant'), role: 'assistant', text: errText, createdAt: new Date() }]);
      }
    }, 400 + Math.floor(Math.random() * 300));
  }

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------
  const isLight = theme.palette.mode === 'light';
  const quickPrompts = (isAuthenticated && hasProject) ? PROJECT_PROMPTS : GUEST_PROMPTS;

  // Show sign-in prompt after first AI reply for unauthenticated users
  const showSignInPrompt = !isAuthenticated && !signInDismissed && messages.length >= 3;

  let contextChipLabel: string | null = null;
  if (isAuthenticated && projectName) contextChipLabel = projectName;
  else if (isAuthenticated && !hasProject) contextChipLabel = 'No active project';
  else if (!isAuthenticated) contextChipLabel = 'Guest — not signed in';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.div
            variants={fabVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1301, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
          >
            <Fab
              color="primary"
              aria-label="Cerulea AI"
              onClick={() => setOpen(true)}
              sx={{
                background: 'linear-gradient(135deg, #3d5afe 0%, #7c3aed 100%)',
                boxShadow: `0 8px 32px ${alpha('#3d5afe', 0.45)}`,
                '&:hover': { boxShadow: `0 12px 40px ${alpha('#3d5afe', 0.55)}` },
              }}
            >
              <AutoAwesomeIcon />
            </Fab>
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, fontSize: '0.62rem', letterSpacing: 0.5, color: 'text.secondary', textAlign: 'center', lineHeight: 1, userSelect: 'none' }}
            >
              Cerulea AI
            </Typography>
          </motion.div>
        )}
      </AnimatePresence>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => {
          localStorage.setItem('ceruleai:hasCollapsed', '1');
          setOpen(false);
        }}
        PaperProps={{
          sx: {
            width: { xs: '92%', sm: 420 },
            border: 'none',
            bgcolor: isLight ? '#ffffff' : '#131823',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2.5, pt: 2.5, pb: 2,
            background: 'linear-gradient(135deg, #3d5afe 0%, #7c3aed 100%)',
            flexShrink: 0,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1.5}>
              {view === 'history' ? (
                <IconButton
                  size="small"
                  onClick={() => setView('chat')}
                  sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
                >
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              ) : (
                <Box
                  sx={{
                    width: 36, height: 36, borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <AutoAwesomeIcon sx={{ fontSize: 18, color: 'white' }} />
                </Box>
              )}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ color: 'white', lineHeight: 1.2 }}>
                  {view === 'history' ? 'Past conversations' : 'Cerulea AI'}
                </Typography>
                {view === 'chat' && (
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4ade80' }} />
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
                      {isAuthenticated ? 'Project-aware' : 'Discovery mode'}
                    </Typography>
                  </Stack>
                )}
              </Box>
            </Stack>

            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Tooltip title="New conversation">
                <IconButton
                  size="small"
                  onClick={handleNewChat}
                  sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={view === 'history' ? 'Back to chat' : 'Past conversations'}>
                <IconButton
                  size="small"
                  onClick={() => setView((v) => v === 'history' ? 'chat' : 'history')}
                  sx={{
                    color: view === 'history' ? 'white' : 'rgba(255,255,255,0.8)',
                    bgcolor: view === 'history' ? 'rgba(255,255,255,0.2)' : 'transparent',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
                  }}
                >
                  <HistoryIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton
                onClick={() => {
                  localStorage.setItem('ceruleai:hasCollapsed', '1');
                  setOpen(false);
                }}
                size="small"
                sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          {view === 'chat' && contextChipLabel && (
            <Chip
              label={contextChipLabel}
              size="small"
              sx={{
                mt: 1.5,
                bgcolor: isAuthenticated && hasProject ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.18)',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.68rem',
                border: `1px solid ${isAuthenticated && hasProject ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.25)'}`,
              }}
            />
          )}
        </Box>

        {/* ---------------------------------------------------------------- */}
        {/* HISTORY VIEW                                                      */}
        {/* ---------------------------------------------------------------- */}
        {view === 'history' && (
          <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2 }}>
            {!isAuthenticated ? (
              /* Guest: no history, nudge to sign in */
              <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
                <LockPersonIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1.5 }} />
                <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: 0.75 }}>
                  Conversations aren't saved for guests
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 2.5, lineHeight: 1.5 }}>
                  Sign in to save your chats, access past conversations, and unlock project-aware assistance.
                </Typography>
                <Stack direction="row" spacing={1} justifyContent="center">
                  <Button component={Link} href="/auth/register" variant="contained" size="small" disableElevation sx={{ borderRadius: 2, fontSize: '0.75rem' }}>
                    Sign up free
                  </Button>
                  <Button component={Link} href="/auth/login" variant="outlined" size="small" sx={{ borderRadius: 2, fontSize: '0.75rem' }}>
                    Sign in
                  </Button>
                </Stack>
              </Box>
            ) : (
              <>
                <Box
                  component="button"
                  onClick={handleNewChat}
                  sx={{
                    all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1,
                    width: '100%', px: 2, py: 1.5, mb: 2, borderRadius: 2,
                    border: `1.5px dashed ${alpha(theme.palette.primary.main, 0.4)}`,
                    color: 'primary.main', fontWeight: 700, fontSize: '0.85rem',
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
                    transition: 'background 0.15s',
                  }}
                >
                  <AddIcon sx={{ fontSize: 18 }} />
                  New conversation
                </Box>

                {threadList.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 6 }}>
                    <ForumIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1.5 }} />
                    <Typography variant="body2" color="text.secondary" fontWeight={600}>
                      No past conversations yet
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      Start a chat and it will appear here
                    </Typography>
                  </Box>
                ) : (
                  threadList.map((t) => (
                    <Box
                      key={t.id}
                      onClick={() => handleLoadThread(t.id)}
                      sx={{
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', gap: 1,
                        width: '100%', px: 2, py: 1.5, mb: 0.75, borderRadius: 2,
                        bgcolor: currentThreadId === t.id
                          ? alpha(theme.palette.primary.main, 0.1)
                          : 'transparent',
                        border: `1px solid ${currentThreadId === t.id
                          ? alpha(theme.palette.primary.main, 0.3)
                          : alpha(theme.palette.divider, 0.6)}`,
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
                        '&:hover .delete-btn': { opacity: 1 },
                        transition: 'all 0.15s',
                      }}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" fontWeight={600} noWrap sx={{ color: 'text.primary', maxWidth: 260 }}>
                          {t.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatRelative(t.updatedAt)}
                        </Typography>
                      </Box>
                      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
                        {currentThreadId === t.id && (
                          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'primary.main' }} />
                        )}
                        <IconButton
                          className="delete-btn"
                          size="small"
                          onClick={(e) => { e.stopPropagation(); handleDeleteThread(t.id); }}
                          sx={{
                            p: 0.5, opacity: 0,
                            color: 'text.disabled',
                            transition: 'all 0.15s',
                            '&:hover': { color: 'error.main', bgcolor: alpha('#ef4444', 0.1) },
                          }}
                        >
                          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Stack>
                    </Box>
                  ))
                )}
              </>
            )}
          </Box>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* CHAT VIEW                                                         */}
        {/* ---------------------------------------------------------------- */}
        {view === 'chat' && (
          <>
            {/* Messages */}
            <Box
              ref={scrollRef}
              sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}
            >
              {messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <Box key={m.id} sx={{ display: 'flex', flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 1 }}>
                    {!isUser && (
                      <Avatar
                        sx={{
                          width: 28, height: 28, flexShrink: 0, mb: 0.5,
                          background: 'linear-gradient(135deg, #3d5afe 0%, #7c3aed 100%)',
                          fontSize: '0.75rem',
                        }}
                      >
                        <AutoAwesomeIcon sx={{ fontSize: 14 }} />
                      </Avatar>
                    )}
                    <Box sx={{ maxWidth: '82%' }}>
                      <Paper
                        elevation={0}
                        sx={{
                          px: 1.75, py: 1.25,
                          borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                          bgcolor: isUser
                            ? 'primary.main'
                            : isLight ? '#f1f5ff' : 'rgba(255,255,255,0.07)',
                          border: `1px solid ${isUser ? 'transparent' : alpha(theme.palette.divider, 0.5)}`,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            lineHeight: 1.6, whiteSpace: 'pre-line',
                            color: isUser ? 'white' : 'text.primary',
                            fontSize: '0.84rem',
                          }}
                        >
                          {m.text}
                        </Typography>
                      </Paper>
                      <Typography
                        variant="caption"
                        sx={{
                          opacity: 0.45, display: 'block',
                          mt: 0.4, fontSize: '0.6rem', fontWeight: 600,
                          textAlign: isUser ? 'right' : 'left',
                          mr: isUser ? 0.5 : 0, ml: isUser ? 0 : 0.5,
                        }}
                      >
                        {formatTime(m.createdAt)}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}

              {/* Sign-in prompt — appears after first AI reply for guests */}
              {showSignInPrompt && (
                <Box
                  sx={{
                    mx: 0.5, mt: 0.5, px: 2, py: 1.75, borderRadius: 2.5,
                    background: isLight
                      ? `linear-gradient(135deg, ${alpha('#3d5afe', 0.06)} 0%, ${alpha('#7c3aed', 0.06)} 100%)`
                      : `linear-gradient(135deg, ${alpha('#3d5afe', 0.15)} 0%, ${alpha('#7c3aed', 0.15)} 100%)`,
                    border: `1px solid ${alpha('#3d5afe', 0.25)}`,
                    position: 'relative',
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={() => setSignInDismissed(true)}
                    sx={{ position: 'absolute', top: 6, right: 6, color: 'text.disabled', p: 0.25, '&:hover': { color: 'text.secondary' } }}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                  <Stack direction="row" spacing={1.25} alignItems="flex-start" sx={{ mb: 1.25 }}>
                    <Box sx={{
                      width: 30, height: 30, borderRadius: '8px', flexShrink: 0,
                      background: 'linear-gradient(135deg, #3d5afe 0%, #7c3aed 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <AutoAwesomeIcon sx={{ fontSize: 15, color: 'white' }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary', mb: 0.4 }}>
                        Get full project-aware assistance
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                        Sign in so I can read your live project — exact modules selected, schema configured, economics set — and give you specific, accurate guidance instead of generic steps.
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" spacing={1}>
                    <Button
                      component={Link}
                      href="/auth/register"
                      size="small"
                      variant="contained"
                      disableElevation
                      sx={{ fontSize: '0.72rem', py: 0.5, px: 1.75, borderRadius: 1.5, fontWeight: 700 }}
                    >
                      Sign up free
                    </Button>
                    <Button
                      component={Link}
                      href="/auth/login"
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.72rem', py: 0.5, px: 1.75, borderRadius: 1.5 }}
                    >
                      Sign in
                    </Button>
                  </Stack>
                </Box>
              )}

              {isTyping && (
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
                  <Avatar
                    sx={{
                      width: 28, height: 28, flexShrink: 0, mb: 0.5,
                      background: 'linear-gradient(135deg, #3d5afe 0%, #7c3aed 100%)',
                    }}
                  >
                    <AutoAwesomeIcon sx={{ fontSize: 14 }} />
                  </Avatar>
                  <Paper
                    elevation={0}
                    sx={{
                      px: 2, py: 1.25, borderRadius: '4px 18px 18px 18px',
                      bgcolor: isLight ? '#f1f5ff' : 'rgba(255,255,255,0.07)',
                      border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                      display: 'flex', alignItems: 'center', gap: 0.5,
                    }}
                  >
                    {[0, 0.18, 0.36].map((delay, i) => (
                      <Box
                        key={i}
                        sx={{
                          width: 7, height: 7, borderRadius: '50%', bgcolor: 'primary.main',
                          animation: 'dotBlink 1.1s infinite',
                          animationDelay: `${delay}s`,
                          '@keyframes dotBlink': {
                            '0%': { opacity: 0.3, transform: 'translateY(0px)' },
                            '20%': { opacity: 1, transform: 'translateY(-3px)' },
                            '40%': { opacity: 0.3, transform: 'translateY(0px)' },
                            '100%': { opacity: 0.3 },
                          },
                        }}
                      />
                    ))}
                  </Paper>
                </Box>
              )}
            </Box>

            {/* Quick prompts */}
            {messages.length <= 2 && !isTyping && (
              <Box sx={{ px: 2.5, pb: 1.5, flexShrink: 0 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ px: 0.5, mb: 0.75, display: 'block', letterSpacing: 0.5 }}>
                  QUICK QUESTIONS
                </Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                  {quickPrompts.map((q) => (
                    <Chip
                      key={q}
                      label={q}
                      size="small"
                      variant="outlined"
                      clickable
                      onClick={() => handleSend(q)}
                      sx={{ fontWeight: 600, fontSize: '0.72rem', borderRadius: '999px' }}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            <Divider />

            {/* Input */}
            <Box
              component="form"
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              sx={{ px: 2, py: 1.75, flexShrink: 0, display: 'flex', alignItems: 'flex-end', gap: 1 }}
            >
              <TextField
                fullWidth
                multiline
                maxRows={4}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isAuthenticated ? 'Ask anything about your project...' : 'Tell me what you want to build...'}
                size="small"
                disabled={isTyping}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    bgcolor: isLight ? alpha('#3d5afe', 0.04) : alpha('#3d5afe', 0.1),
                  },
                }}
              />
              <Tooltip title="Send (Enter)">
                <span>
                  <IconButton
                    color="primary"
                    type="submit"
                    disabled={isTyping || !input.trim()}
                    sx={{
                      mb: 0.25, width: 40, height: 40,
                      bgcolor: input.trim() && !isTyping ? 'primary.main' : 'transparent',
                      color: input.trim() && !isTyping ? 'white' : 'text.disabled',
                      borderRadius: 2,
                      '&:hover': { bgcolor: 'primary.dark', color: 'white' },
                      transition: 'all 0.2s',
                    }}
                  >
                    <SendIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>

            {/* Branding */}
            <Box sx={{ px: 2.5, pb: 1.75, flexShrink: 0, textAlign: 'center' }}>
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.62rem' }}>
                Powered by Cerulea AI. May make mistakes. Always verify critical details.
              </Typography>
            </Box>
          </>
        )}
      </Drawer>
    </>
  );
}
