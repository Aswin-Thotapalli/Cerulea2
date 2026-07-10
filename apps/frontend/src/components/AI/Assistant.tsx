'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Fab, Drawer, Box, Typography, TextField, IconButton, Stack,
  Chip, Divider, Avatar, Paper, Tooltip, Button,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LoginIcon from '@mui/icons-material/Login';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useStudio } from '@/context/StudioContext';
import { api } from '@/lib/apiClient';

const fabVariants = {
  hidden: { scale: 0, y: 50, opacity: 0 },
  visible: {
    scale: 1, y: 0, opacity: 1,
    transition: { type: 'spring' as const, stiffness: 260, damping: 20, delay: 0.5 },
  },
};

type ChatRole = 'user' | 'assistant';
type ChatMessage = { id: string; role: ChatRole; text: string; createdAt: Date };

function makeId(prefix = 'msg') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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

function getInitialMessage(isAuthenticated: boolean, projectName?: string) {
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
  const hasProject = !!(studio.projectId);
  const projectName = studio.appMetadata?.appName || null;

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: makeId('assistant'),
      role: 'assistant',
      text: getInitialMessage(false, undefined),
      createdAt: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const streamTimerRef = useRef<number | null>(null);
  const initializedRef = useRef(false);

  // Re-initialize greeting when auth state becomes known
  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (initializedRef.current) return;
    initializedRef.current = true;
    setMessages([{
      id: makeId('assistant'),
      role: 'assistant',
      text: getInitialMessage(isAuthenticated, projectName ?? undefined),
      createdAt: new Date(),
    }]);
  }, [sessionStatus, isAuthenticated, projectName]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      if (streamTimerRef.current) window.clearInterval(streamTimerRef.current);
    };
  }, []);

  function streamAssistantMessage(fullText: string) {
    const msgId = makeId('assistant');
    const createdAt = new Date();
    setMessages((prev) => [...prev, { id: msgId, role: 'assistant', text: '', createdAt }]);
    let i = 0;
    streamTimerRef.current = window.setInterval(() => {
      const chunk = fullText.slice(i, i + (Math.random() < 0.85 ? 1 : 2));
      i += chunk.length;
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, text: m.text + chunk } : m));
      if (i >= fullText.length) {
        window.clearInterval(streamTimerRef.current!);
        streamTimerRef.current = null;
        setIsTyping(false);
      }
    }, 16 + Math.floor(Math.random() * 12));
  }

  function buildStudioSnapshot() {
    return {
      currentRoute: pathname,
      studioState: {
        projectId: studio.projectId,
        projectType: studio.projectType,
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
    const next = {
      ...prev,
      projectType: studio.projectType,
      selectedModules: studio.selectedModules,
      appMetadata: studio.appMetadata,
      updatedAt: new Date().toISOString(),
    };
    try { localStorage.setItem(`ceruleai:memory:${studio.projectId || 'local'}`, JSON.stringify(next)); } catch {}
    return next;
  }

  function toHistoryPayload(msgs: ChatMessage[]) {
    const budget = 12000;
    const out: { role: ChatRole; text: string }[] = [];
    let used = 0;
    for (let i = msgs.length - 1; i >= 0; i--) {
      const line = `${msgs[i].role}:${msgs[i].text}\n`;
      if (used + line.length > budget) break;
      out.unshift({ role: msgs[i].role, text: msgs[i].text });
      used += line.length;
    }
    return out;
  }

  async function handleSend(text?: string) {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput('');
    const userMsg: ChatMessage = { id: makeId('user'), role: 'user', text: msg, createdAt: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    typingTimerRef.current = window.setTimeout(async () => {
      try {
        const res = await api<{ reply: string }>(`/api/ceruleai`, {
          method: 'POST',
          body: JSON.stringify({
            message: msg,
            history: toHistoryPayload(messages),
            studioSnapshot: buildStudioSnapshot(),
            projectMemory: buildProjectMemory(),
          }),
        });
        streamAssistantMessage(res.reply || "I couldn't generate a response right now.");
      } catch (e: any) {
        setIsTyping(false);
        streamAssistantMessage(
          typeof e?.message === 'string'
            ? `Something went wrong: ${e.message}`
            : 'Something went wrong generating the response.'
        );
      }
    }, 400 + Math.floor(Math.random() * 300));
  }

  const isLight = theme.palette.mode === 'light';
  const quickPrompts = (isAuthenticated && hasProject) ? PROJECT_PROMPTS : GUEST_PROMPTS;

  // Context chip label
  let contextChipLabel: string | null = null;
  if (isAuthenticated && projectName) {
    contextChipLabel = projectName;
  } else if (isAuthenticated && !hasProject) {
    contextChipLabel = 'No active project';
  } else if (!isAuthenticated) {
    contextChipLabel = 'Guest — not signed in';
  }

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
        onClose={() => setOpen(false)}
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
            px: 3, pt: 2.5, pb: 2,
            background: 'linear-gradient(135deg, #3d5afe 0%, #7c3aed 100%)',
            flexShrink: 0,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 36, height: 36, borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 18, color: 'white' }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ color: 'white', lineHeight: 1.2 }}>
                  Cerulea AI
                </Typography>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4ade80' }} />
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
                    {isAuthenticated ? 'Project-aware' : 'Discovery mode'}
                  </Typography>
                </Stack>
              </Box>
            </Stack>
            <IconButton
              onClick={() => setOpen(false)}
              size="small"
              sx={{ color: 'rgba(255,255,255,0.8)', '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          {/* Context chip */}
          {contextChipLabel && (
            <Chip
              label={contextChipLabel}
              size="small"
              sx={{
                mt: 1.5,
                bgcolor: isAuthenticated && hasProject
                  ? 'rgba(74,222,128,0.2)'
                  : 'rgba(255,255,255,0.18)',
                color: 'white',
                fontWeight: 600,
                fontSize: '0.68rem',
                border: `1px solid ${isAuthenticated && hasProject ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.25)'}`,
              }}
            />
          )}
        </Box>

        {/* Guest sign-up nudge */}
        {!isAuthenticated && messages.length > 3 && (
          <Box sx={{
            mx: 2.5, mt: 1.5, px: 2, py: 1.25, borderRadius: 2,
            bgcolor: isLight ? alpha('#3d5afe', 0.06) : alpha('#3d5afe', 0.12),
            border: `1px solid ${alpha('#3d5afe', 0.2)}`,
            display: 'flex', alignItems: 'center', gap: 1.5,
          }}>
            <LoginIcon sx={{ fontSize: 16, color: 'primary.main', flexShrink: 0 }} />
            <Typography variant="caption" sx={{ flex: 1, color: 'text.secondary', fontSize: '0.72rem', lineHeight: 1.4 }}>
              Sign in to let Cerulea AI read your live project data
            </Typography>
            <Button
              component={Link}
              href="/auth/login"
              size="small"
              variant="contained"
              disableElevation
              sx={{ fontSize: '0.68rem', py: 0.4, px: 1.25, minWidth: 0, flexShrink: 0 }}
            >
              Sign in
            </Button>
          </Box>
        )}

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
                      px: 1.75, py: 1.25, borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
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
                      width: 7, height: 7, borderRadius: '50%',
                      bgcolor: 'primary.main',
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
          sx={{
            px: 2, py: 1.75, flexShrink: 0,
            display: 'flex', alignItems: 'flex-end', gap: 1,
          }}
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
      </Drawer>
    </>
  );
}
