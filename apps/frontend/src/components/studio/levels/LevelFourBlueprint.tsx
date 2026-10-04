'use client';

// apps/frontend/src/components/studio/levels/LevelFourBlueprint.tsx
// Disclosure level four, the Blueprint itself.
// The typed document appears as it is, read and edited directly. Cerulea
// checks every value against the Blueprint schema as a person types, and names
// the place and the fix for each fault.
// Writing the document and reading the text answers with the same document, so
// opening this level and saving with no change alters nothing.
// The shell opens it from the level bar at level four, over the steps.
// Without this level support and audit could not read what a deployment runs.

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import { summariseBlueprint } from '@/lib/blueprint/summary';
import { faultsBySection, readBlueprintText, writeBlueprintText } from '@/lib/blueprint/validate';
import { useProjectState } from '@/lib/studio/project-state';

export default function LevelFourBlueprint({
  projectId,
  onSaved,
}: {
  projectId: string;
  onSaved?: () => void;
}) {
  const handle = useProjectState(projectId);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!handle.state) return;
    setText(writeBlueprintText(handle.state.blueprint));
  }, [handle.state]);

  const reading = useMemo(() => readBlueprintText(text), [text]);
  const grouped = useMemo(() => faultsBySection(reading.faults), [reading.faults]);
  const summary = useMemo(
    () => (reading.document ? summariseBlueprint(reading.document) : []),
    [reading.document],
  );

  const save = async () => {
    if (reading.document === undefined) return;
    setSaved(false);
    const wrote = await handle.saveBlueprint(
      reading.document,
      'Edited the Blueprint directly at the Blueprint level',
    );
    if (!wrote) return;
    setSaved(true);
    if (onSaved) onSaved();
  };

  if (handle.loading) {
    return (
      <Box sx={{ display: 'grid', placeItems: 'center', py: 10 }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress size={28} />
          <Typography variant="body2">Cerulea is opening the Blueprint.</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 4, maxWidth: 1100, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        The Blueprint
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        This is the typed document Cerulea deploys. Every other level writes the same document.
        Cerulea checks every value against the Blueprint schema as the text changes.
      </Typography>

      {handle.failure && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>{handle.failure.message}</AlertTitle>
          {handle.failure.fix}
        </Alert>
      )}
      {saved && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(false)}>
          Cerulea saved the Blueprint as version {handle.state?.blueprintVersion}.
        </Alert>
      )}

      <Stack spacing={3}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
          <TextField
            fullWidth
            multiline
            minRows={18}
            maxRows={40}
            value={text}
            onChange={(event) => setText(event.target.value)}
            label="The typed document"
            inputProps={{
              spellCheck: false,
              'aria-label': 'The typed document',
              style: { fontFamily: 'monospace', fontSize: 13 },
            }}
            helperText="Editing here writes the same Blueprint the other levels write. A value the schema refuses is named below before anything is saved."
          />
        </Paper>

        {reading.faults.length === 0 ? (
          <Alert severity="success" data-testid="schema-clean">
            <AlertTitle>This document passes the Blueprint schema</AlertTitle>
            Every name, every value and every reference reads correctly.
          </Alert>
        ) : (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }} data-testid="schema-faults">
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              {reading.faults.length} corrections to make
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Each line names the place, states the problem and names the fix.
            </Typography>
            {grouped.map((group) => (
              <Box key={group.section} sx={{ mb: 2 }}>
                <Chip size="small" label={group.section} sx={{ mb: 1 }} />
                <List dense disablePadding>
                  {group.faults.map((fault) => (
                    <ListItem key={`${fault.path}:${fault.message}`} disableGutters>
                      <ListItemText
                        primary={`${fault.path || 'the document'}. ${fault.message}`}
                        secondary={fault.fix}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            ))}
          </Paper>
        )}

        {summary.length > 0 && (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
              What this document holds
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={1.5}>
              {summary.map((line) => (
                <Box key={line.section}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    {line.heading}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {line.sentence}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        )}

        <Box>
          <Button
            variant="contained"
            size="large"
            onClick={() => void save()}
            disabled={handle.saving || reading.document === undefined}
          >
            {handle.saving ? 'Saving' : 'Save the Blueprint'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
