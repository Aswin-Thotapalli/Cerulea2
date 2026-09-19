'use client';

// apps/frontend/src/components/AI/Assistant.tsx
// The chat surface for Cerulea Intelligence.
// Studio holds no model. Every question reaches the Cerulea APIs intelligence
// routes, and every reply arrives as typed cards this surface renders with
// Material UI. A failure shows the message Cerulea named together with its fix.
// Without this surface a person could not ask Cerulea to change the Blueprint.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  Fab,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { usePathname } from 'next/navigation';

import CardSurface, { type CardActions } from '@/components/studio/intelligence/CardSurface';
import { useStudio } from '@/context/StudioContext';
import { StudioRouteError, api } from '@/lib/apiClient';
import type {
  Card,
  InterfaceState,
  MessageReply,
  PatchApplied,
  Thread,
  ThreadStart,
} from '@/lib/intelligence/types';

export type Turn = {
  turnId: string;
  role: 'person' | 'cerulea';
  text: string;
  cards: Card[];
};

export type SurfaceFailure = { message: string; fix: string };

/** Turns any failure into the message and the fix the surface shows. */
export function describeFailure(cause: unknown): SurfaceFailure {
  if (cause instanceof StudioRouteError) {
    return { message: cause.message.replace(` ${cause.fix}`, ''), fix: cause.fix };
  }
  return {
    message: cause instanceof Error ? cause.message : String(cause),
    fix: 'Ask again. Report the problem to the Cerulea operator when it repeats.',
  };
}

let turnCounter = 0;

/** Names one turn in this conversation. The value never leaves the browser. */
function nextTurnId(prefix: string): string {
  turnCounter += 1;
  return `${prefix}_${turnCounter}`;
}

/** The four questions a person asks most often on a first visit. */
export const QUICK_QUESTIONS = [
  'Which parts does this system need?',
  'What does the Blueprint hold?',
  'What remains before we deploy?',
  'What does this screen change?',
];

/** Reads the screen a route names, in the words a person uses. */
export function screenName(pathname: string | null): string {
  if (!pathname) return 'Studio';
  if (pathname === '/') return 'The project workspace';
  const trimmed = pathname.replace(/^\/+/, '').split('/')[0];
  return trimmed.length === 0 ? 'Studio' : trimmed.replace(/-/g, ' ');
}

export default function Assistant() {
  const pathname = usePathname();
  const studio = useStudio();
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<SurfaceFailure | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const surface = scrollRef.current;
    if (surface && typeof surface.scrollTo === 'function') {
      surface.scrollTo({ top: surface.scrollHeight, behavior: 'smooth' });
    }
  }, [turns, busy]);

  const projectId = studio.projectId ?? '';

  const buildInterfaceState = useCallback((): InterfaceState => {
    const selection = [...studio.selectedOutcomes, ...studio.selectedModules];
    return {
      screen: screenName(pathname),
      selection,
      validationErrors: [],
      recentActions: [],
    };
  }, [pathname, studio.selectedModules, studio.selectedOutcomes]);

  const openThread = useCallback(async (): Promise<string | null> => {
    if (threadId) return threadId;
    try {
      const started = await api<ThreadStart>('/api/intelligence/threads', {
        method: 'POST',
        body: JSON.stringify({ projectId }),
      });
      setThreadId(started.threadId);
      setFailure(null);
      return started.threadId;
    } catch (cause) {
      setFailure(describeFailure(cause));
      return null;
    }
  }, [projectId, threadId]);

  useEffect(() => {
    if (!open || threadId) return;
    void openThread();
  }, [open, openThread, threadId]);

  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;
    void (async () => {
      try {
        const held = await api<Thread>(
          `/api/intelligence/threads/${encodeURIComponent(threadId)}`,
        );
        if (cancelled || held.turns.length === 0) return;
        setTurns(
          held.turns.map((turn) => ({
            turnId: turn.messageId,
            role: turn.role,
            text: turn.text,
            cards: turn.cards,
          })),
        );
      } catch (cause) {
        if (!cancelled) setFailure(describeFailure(cause));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  const send = useCallback(
    async (asked: string) => {
      const text = asked.trim();
      if (text.length === 0 || busy) return;
      setInput('');
      setNotice(null);
      setTurns((previous) => [
        ...previous,
        { turnId: nextTurnId('person'), role: 'person', text, cards: [] },
      ]);
      setBusy(true);
      try {
        const thread = await openThread();
        if (!thread) return;
        const reply = await api<MessageReply>(
          `/api/intelligence/threads/${encodeURIComponent(thread)}/messages`,
          {
            method: 'POST',
            body: JSON.stringify({ text, interfaceState: buildInterfaceState() }),
          },
        );
        setTurns((previous) => [
          ...previous,
          {
            turnId: reply.messageId,
            role: 'cerulea',
            text: '',
            cards: reply.cards,
          },
        ]);
        setFailure(null);
      } catch (cause) {
        setFailure(describeFailure(cause));
      } finally {
        setBusy(false);
      }
    },
    [buildInterfaceState, busy, openThread],
  );

  const actions: CardActions = {
    applyPatch: (card) => {
      void (async () => {
        setBusy(true);
        try {
          const applied = await api<PatchApplied>(
            `/api/intelligence/patches/${encodeURIComponent(card.patchId)}/apply`,
            { method: 'POST', body: JSON.stringify({}) },
          );
          setNotice(
            `Cerulea applied the change and wrote checkpoint ${applied.checkpointId}. The Blueprint now holds version ${applied.version}.`,
          );
          setFailure(null);
        } catch (cause) {
          setFailure(describeFailure(cause));
        } finally {
          setBusy(false);
        }
      })();
    },
    discardPatch: (card) => {
      void (async () => {
        setBusy(true);
        try {
          await api(`/api/intelligence/patches/${encodeURIComponent(card.patchId)}/discard`, {
            method: 'POST',
            body: JSON.stringify({}),
          });
          setNotice('Cerulea discarded the change. The Blueprint keeps the state it holds.');
          setFailure(null);
        } catch (cause) {
          setFailure(describeFailure(cause));
        } finally {
          setBusy(false);
        }
      })();
    },
    submitForm: (card, values) => {
      const stated = card.fields
        .map((field) => `${field.label}: ${values[field.name] ?? ''}`)
        .join('. ');
      void send(`${card.title}. ${stated}`);
    },
    submitChoice: (card, optionId) => {
      const option = card.options.find((entry) => entry.id === optionId);
      void send(`${card.title}. We take ${option?.label ?? optionId}.`);
    },
    openScreen: (card) => {
      window.location.assign(card.href);
    },
  };

  return (
    <>
      {!open && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 32,
            right: 32,
            zIndex: 1301,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <Fab color="primary" aria-label="Open Cerulea Intelligence" onClick={() => setOpen(true)}>
            <AutoAwesomeIcon />
          </Fab>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            Cerulea Intelligence
          </Typography>
        </Box>
      )}

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '95%', sm: 480 },
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Box sx={{ px: 3, pt: 2.5, pb: 2, bgcolor: 'primary.main', flexShrink: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: alpha('#FFFFFF', 0.2) }}>
                <AutoAwesomeIcon sx={{ fontSize: 18, color: '#FFFFFF' }} />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" sx={{ color: '#FFFFFF', fontWeight: 800 }}>
                  Cerulea Intelligence
                </Typography>
                <Typography variant="caption" sx={{ color: alpha('#FFFFFF', 0.8) }}>
                  We shape the model with you and change the Blueprint on your word
                </Typography>
              </Box>
            </Stack>
            <IconButton
              onClick={() => setOpen(false)}
              size="small"
              aria-label="Close Cerulea Intelligence"
              sx={{ color: alpha('#FFFFFF', 0.85) }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Box>

        {busy && <LinearProgress />}

        <Box
          ref={scrollRef}
          sx={{ flex: 1, overflowY: 'auto', px: 2.5, py: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}
        >
          {notice && <Alert severity="success">{notice}</Alert>}

          {failure && (
            <Alert severity="error">
              <AlertTitle>{failure.message}</AlertTitle>
              {failure.fix}
            </Alert>
          )}

          {turns.length === 0 && failure === null && (
            <Alert severity="info">
              <AlertTitle>We are ready for the first question</AlertTitle>
              Ask what this screen changes, or ask us to change the Blueprint. Every change arrives
              as a card with apply and discard.
            </Alert>
          )}

          {turns.map((turn) => {
            const person = turn.role === 'person';
            return (
              <Box
                key={turn.turnId}
                sx={{ display: 'flex', flexDirection: person ? 'row-reverse' : 'row', gap: 1 }}
              >
                <Box sx={{ maxWidth: person ? '82%' : '100%', width: person ? 'auto' : '100%' }}>
                  {turn.text.length > 0 && (
                    <Paper
                      elevation={0}
                      variant={person ? 'elevation' : 'outlined'}
                      sx={{
                        px: 1.75,
                        py: 1.25,
                        bgcolor: person ? 'primary.main' : isLight ? 'grey.50' : 'background.paper',
                        color: person ? '#FFFFFF' : 'text.primary',
                        borderRadius: 2,
                      }}
                    >
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                        {turn.text}
                      </Typography>
                    </Paper>
                  )}
                  <CardSurface cards={turn.cards} actions={actions} />
                </Box>
              </Box>
            );
          })}
        </Box>

        {turns.length === 0 && (
          <Box sx={{ px: 2.5, pb: 1.5, flexShrink: 0 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.75 }}>
              Questions people ask first
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75}>
              {QUICK_QUESTIONS.map((question) => (
                <Chip
                  key={question}
                  label={question}
                  size="small"
                  variant="outlined"
                  clickable
                  onClick={() => void send(question)}
                />
              ))}
            </Stack>
          </Box>
        )}

        <Divider />

        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
          sx={{ px: 2, py: 1.75, display: 'flex', alignItems: 'flex-end', gap: 1, flexShrink: 0 }}
        >
          <TextField
            fullWidth
            multiline
            maxRows={4}
            size="small"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            label="Ask Cerulea"
            helperText="We read the screen you are on and the project you have open."
            disabled={busy}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send(input);
              }
            }}
          />
          <Tooltip title="Send">
            <span>
              <IconButton
                color="primary"
                type="submit"
                aria-label="Send the question"
                disabled={busy || input.trim().length === 0}
              >
                <SendIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Drawer>
    </>
  );
}
