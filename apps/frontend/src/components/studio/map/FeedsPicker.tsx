'use client';

// The guided feeds picker.
// Cerulea draws a feeds arrow on its own where one part is the only possible
// source. Where several parts could be the source, Cerulea asks which ones the
// receiving part reads from.
// Without an answer the receiving part sees no record from those sources.

import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Checkbox,
  FormControlLabel,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import type { FeedsQuestion } from '@/lib/map/feeds';

export type FeedsPickerProps = {
  questions: FeedsQuestion[];
  /** The sources chosen so far, keyed by the receiving part. */
  answers: Record<string, string[]>;
  onAnswerChange: (to: string, sources: string[]) => void;
};

export default function FeedsPicker({ questions, answers, onAnswerChange }: FeedsPickerProps) {
  if (questions.length === 0) {
    return (
      <Alert severity="success" variant="outlined">
        <AlertTitle>Cerulea settled every arrow on its own</AlertTitle>
        Each receiving part has one possible source in this project, so no question remains.
      </Alert>
    );
  }

  const toggle = (to: string, from: string) => {
    const held = answers[to] ?? [];
    const next = held.includes(from) ? held.filter((value) => value !== from) : [...held, from];
    onAnswerChange(to, next);
  };

  return (
    <Stack spacing={2}>
      {questions.map((question) => (
        <Paper key={question.to} variant="outlined" sx={{ p: 2, borderRadius: 3 }} data-testid="feeds-question">
          <Typography variant="subtitle2" fontWeight={800}>
            {question.toTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {question.question}
          </Typography>
          {question.options.map((option) => (
            <Box key={option.from}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={(answers[question.to] ?? []).includes(option.from)}
                    onChange={() => toggle(question.to, option.from)}
                    slotProps={{
                      input: { 'aria-label': `${option.fromTitle} feeds ${question.toTitle}` },
                    }}
                  />
                }
                label={
                  <Stack>
                    <Typography variant="body2" fontWeight={700}>
                      {option.fromTitle}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.reason}
                    </Typography>
                  </Stack>
                }
                sx={{ alignItems: 'flex-start', mb: 1 }}
              />
            </Box>
          ))}
        </Paper>
      ))}
    </Stack>
  );
}
