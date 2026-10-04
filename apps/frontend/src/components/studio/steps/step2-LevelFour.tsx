'use client';

// apps/frontend/src/components/studio/steps/step2-LevelFour.tsx
// Disclosure level four, the Blueprint itself, reached from the Data schema step.
// The typed document appears as it is, read and edited directly. Cerulea
// checks every value against the Blueprint schema as a person types, and names
// the place and the fix for each fault. Saving writes the whole document as one
// version. Writing the document and reading the text answers with the same
// document, so opening this level and saving with no change alters nothing.
// Without this level support and audit could not read what a deployment runs.

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import ControlMirror from '@/components/studio/common/ControlMirror';
import { summariseBlueprint } from '@/lib/blueprint/summary';
import type { Blueprint } from '@/lib/blueprint/types';
import { faultsBySection, readBlueprintText, writeBlueprintText } from '@/lib/blueprint/validate';

export type LevelFourProps = {
  blueprint: Blueprint;
  version: number;
  saving: boolean;
  onSave: (document: Blueprint, note: string) => Promise<boolean>;
};

export default function LevelFour({ blueprint, version, saving, onSave }: LevelFourProps) {
  const [text, setText] = useState(() => writeBlueprintText(blueprint));
  const [saved, setSaved] = useState<number | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    // The text follows the document while the person has typed nothing yet.
    if (touched === false) setText(writeBlueprintText(blueprint));
  }, [blueprint, touched]);

  const reading = useMemo(() => readBlueprintText(text), [text]);
  const grouped = useMemo(() => faultsBySection(reading.faults), [reading.faults]);
  const summary = useMemo(() => (reading.document ? summariseBlueprint(reading.document) : []), [reading.document]);

  const save = async () => {
    if (reading.document === undefined) return;
    const wrote = await onSave(reading.document, 'Edited the Blueprint directly at the Blueprint level');
    if (wrote) {
      setSaved(version + 1);
      setTouched(false);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1100, mx: 'auto', overflowY: 'auto', height: '100%' }} data-testid="level-four">
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        The Blueprint
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
        This is the typed document Cerulea deploys. The Designer level writes the same document.
        Cerulea checks every value against the Blueprint schema while the text changes.
      </Typography>
      <Box sx={{ mb: 3 }}>
        <ControlMirror controlId="blueprint.document" dense />
      </Box>

      {saved !== null && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaved(null)}>
          Cerulea saved the Blueprint. The head now stands at version {saved}.
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
            onChange={(event) => {
              setTouched(true);
              setText(event.target.value);
            }}
            label="The typed document"
            inputProps={{
              spellCheck: false,
              'aria-label': 'The typed document',
              style: { fontFamily: 'monospace', fontSize: 13 },
            }}
            helperText="Editing here writes the same Blueprint the Designer level writes. A value the schema refuses is named below before anything is saved."
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
                      <ListItemText primary={`${fault.path || 'the document'}. ${fault.message}`} secondary={fault.fix} />
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
            disabled={saving || reading.document === undefined || touched === false}
          >
            {saving ? 'Saving' : 'Save the Blueprint'}
          </Button>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            The head stands at version {version}. Saving writes version {version + 1} when the content changed.
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
