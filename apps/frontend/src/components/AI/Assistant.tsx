'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Fab, Drawer, Box, Typography, TextField, IconButton } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';

const fabVariants = {
  hidden: { scale: 0, y: 50, opacity: 0 },
  visible: {
    scale: 1,
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 260, damping: 20, delay: 0.5 },
  },
};

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: Date;
};

function makeId(prefix = 'msg') {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function normalize(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[?!.]+$/g, '')
    .replace(/\s+/g, ' ');
}

function formatTime(d: Date) {
  // Client clock (works on Vercel too; runs in the browser)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function Assistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');

  // One tiny switch later: fake -> real
  const USE_FAKE_AI = true;

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: makeId('assistant'),
      role: 'assistant',
      text: 'Ready to help you build.',
      createdAt: new Date(),
    },
  ]);

  // Typing / streaming state
  const [isTyping, setIsTyping] = useState(false);

  // Autoscroll ref
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Timers for cleanup
  const typingDelayTimerRef = useRef<number | null>(null);
  const streamTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Auto-scroll whenever messages change or typing starts/stops
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (typingDelayTimerRef.current) window.clearTimeout(typingDelayTimerRef.current);
      if (streamTimerRef.current) window.clearInterval(streamTimerRef.current);
    };
  }, []);

  // Updated: normal human questions (these are the ones you’ll ask in the video)
  const scripted = useMemo(() => {
    const q1 = 'I am on the Fields tab. What should I create first?';
    const q2 = 'For permissions, should I add fields on the user or make roles separately?';
    const q3 = 'What do these options actually do when I deploy: API exposed, on-chain, immutable?';

    const a1 =
      `Start with the minimum data your explorer and APIs need to work cleanly.\n\n` +
      `A strong order is:\n` +
      `1) A User/Account entity (identity + access scope)\n` +
      `2) Your core Record/Asset entity (the main thing your app stores and queries)\n` +
      `3) An Audit/Event entity (who did what + when) so actions are traceable\n\n` +
      `Keep the first pass small. Once relationships and actions are clear, you can expand fields confidently without rework.`;

    const a2 =
      `If permissions are more than just one simple flag, use Roles as a separate entity.\n\n` +
      `Recommended structure:\n` +
      `• User ↔ Role (many-to-many) using a join like UserRole\n` +
      `• Role contains either permission flags or a JSON policy\n\n` +
      `Why this is better than putting everything on the User:\n` +
      `• roles are reusable across many users\n` +
      `• changing access rules doesn’t require editing every user\n` +
      `• your APIs and admin tooling stay much cleaner\n\n` +
      `If it is truly just one boolean like isAdmin, then a field on User is fine. The moment you have multiple permission types, use Roles.`;

    const a3 =
      `These switches control what gets generated and how it behaves:\n\n` +
      `• API exposed: included in generated endpoints (read/write depends on your actions)\n` +
      `• On-chain: treated as chain-backed state (written through chain-backed logic)\n` +
      `• Immutable: once written, update actions should not modify it\n\n` +
      `Practical rule:\n` +
      `• IDs, timestamps, audit facts, signatures → Immutable\n` +
      `• only fields that must be verifiable/traceable → On-chain\n` +
      `• derived/display fields → keep off-chain and editable`;

    // We match flexibly (so your spoken punctuation/casing won’t break it)
    const match = (user: string) => {
      const t = normalize(user);

      // Q1
      if (
        (t.includes('fields tab') || t.includes('fields')) &&
        (t.includes('what should') || t.includes('create first') || t.includes('start') || t.includes('first'))
      ) {
        return a1;
      }

      // Q2
      if (t.includes('permission') || t.includes('roles') || t.includes('role')) {
        if (t.includes('user') || t.includes('fields on the user') || t.includes('separately')) {
          return a2;
        }
      }

      // Q3
      if (
        t.includes('api') ||
        t.includes('api exposed') ||
        t.includes('on-chain') ||
        t.includes('on chain') ||
        t.includes('immutable')
      ) {
        if (t.includes('deploy') || t.includes('deployment') || t.includes('when i deploy') || t.includes('what do')) {
          return a3;
        }
      }

      return null;
    };

    return { q1, q2, q3, match, fallback: `I can help with Fields, Relationships, and Logic & Actions. Ask me what to create, how to model permissions, or what the field options change on deploy.` };
  }, []);

  function getCeruleAIResponse(userText: string): string {
    if (!USE_FAKE_AI) {
      // Later: replace with real API call
      return 'I’m not connected yet.';
    }

    const hit = scripted.match(userText);
    if (hit) return hit;

    // No “demo” wording. No suggested questions shown.
    return scripted.fallback;
  }

  function streamAssistantMessage(fullText: string) {
    // Add an assistant message with empty text, then stream into it
    const msgId = makeId('assistant');
    const createdAt = new Date();

    setMessages((prev) => [
      ...prev,
      {
        id: msgId,
        role: 'assistant',
        text: '',
        createdAt,
      },
    ]);

    // Stream characters in small chunks so it looks natural
    let i = 0;

    const minDelay = 14; // ms
    const maxDelay = 26; // ms

    const tick = () => {
      const chunkSize = Math.random() < 0.85 ? 1 : 2; // mostly 1 char, sometimes 2
      const next = fullText.slice(i, i + chunkSize);
      i += chunkSize;

      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, text: m.text + next } : m))
      );

      // Autoscroll as the text streams
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });

      if (i >= fullText.length) {
        if (streamTimerRef.current) window.clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
        setIsTyping(false);
      }
    };

    // Use interval with randomized pacing
    if (streamTimerRef.current) window.clearInterval(streamTimerRef.current);
    streamTimerRef.current = window.setInterval(() => {
      tick();
      // randomize interval by resetting (keeps it “human”)
      if (streamTimerRef.current) {
        window.clearInterval(streamTimerRef.current);
        streamTimerRef.current = window.setInterval(tick, Math.floor(minDelay + Math.random() * (maxDelay - minDelay)));
      }
    }, Math.floor(minDelay + Math.random() * (maxDelay - minDelay)));
  }

  function handleSend() {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: makeId('user'),
      role: 'user',
      text,
      createdAt: new Date(),
    };

    setInput('');
    setMessages((prev) => [...prev, userMsg]);

    // Start typing indicator, then respond with streaming text
    const replyText = getCeruleAIResponse(text);

    setIsTyping(true);

    // Delay before response (feels real)
    const base = 650;
    const jitter = Math.floor(Math.random() * 550); // 0..550
    const delayMs = base + jitter;

    if (typingDelayTimerRef.current) window.clearTimeout(typingDelayTimerRef.current);
    typingDelayTimerRef.current = window.setTimeout(() => {
      streamAssistantMessage(replyText);
    }, delayMs);
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
            style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 1301 }}
          >
            <Fab color="primary" aria-label="ai assistant" onClick={() => setOpen(true)}>
              <SmartToyIcon />
            </Fab>
          </motion.div>
        )}
      </AnimatePresence>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '90%', sm: 400 },
            border: 'none',
            // Glass theme directly as Drawer is a portal
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            backgroundColor: (theme) => theme.palette.background.paper,
            backgroundImage: (theme) =>
              theme.palette.mode === 'dark'
                ? 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))'
                : 'none',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">CeruleAI Assistant</Typography>
            <IconButton onClick={() => setOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          <Box
            ref={scrollRef}
            sx={{
              flexGrow: 1,
              overflowY: 'auto',
              pr: 0.5,
            }}
          >
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <Box
                  key={m.id}
                  sx={{
                    display: 'flex',
                    justifyContent: isUser ? 'flex-end' : 'flex-start',
                    mb: 1.25,
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: '92%',
                      px: 1.5,
                      py: 1.25,
                      borderRadius: 2,
                      bgcolor: isUser ? 'rgba(59, 130, 246, 0.18)' : 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      whiteSpace: 'pre-line',
                    }}
                  >
                    <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                      {m.text}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.55, display: 'block', mt: 0.5 }}>
                      {formatTime(m.createdAt)}
                    </Typography>
                  </Box>
                </Box>
              );
            })}

            {/* Typing indicator */}
            {isTyping && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1.25 }}>
                <Box
                  sx={{
                    px: 1.5,
                    py: 1.25,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      '@keyframes dotBlink': {
                        '0%': { opacity: 0.25, transform: 'translateY(0px)' },
                        '20%': { opacity: 1, transform: 'translateY(-1px)' },
                        '40%': { opacity: 0.25, transform: 'translateY(0px)' },
                        '100%': { opacity: 0.25 },
                      },
                    }}
                  >
                    <Typography variant="body2" sx={{ opacity: 0.75 }}>
                      CeruleAI is typing
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          bgcolor: 'rgba(255,255,255,0.8)',
                          animation: 'dotBlink 1.1s infinite',
                        }}
                      />
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          bgcolor: 'rgba(255,255,255,0.8)',
                          animation: 'dotBlink 1.1s infinite',
                          animationDelay: '0.18s',
                        }}
                      />
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: 999,
                          bgcolor: 'rgba(255,255,255,0.8)',
                          animation: 'dotBlink 1.1s infinite',
                          animationDelay: '0.36s',
                        }}
                      />
                    </Box>
                  </Box>
                </Box>
              </Box>
            )}
          </Box>

          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            sx={{ display: 'flex', gap: 1, mt: 2 }}
          >
            <TextField
              fullWidth
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              size="small"
              disabled={isTyping}
            />
            <IconButton color="primary" type="submit" disabled={isTyping}>
              <SendIcon />
            </IconButton>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
