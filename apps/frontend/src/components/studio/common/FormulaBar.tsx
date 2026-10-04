'use client';

// apps/frontend/src/components/studio/common/FormulaBar.tsx
// The formula bar of the designer level.
// A person writes a condition in plain arithmetic. Cerulea reads it, checks
// every type against the Blueprint expression rules and states the outcome
// while the person types. A fault names the place and the fix.
// The bar offers the fields of the record and every function, so a name is
// never guessed.
// Without the bar a condition would reach the compiler unchecked.

import { useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Chip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import {
  completionsAt,
  describeType,
  describeValue,
  readAndCheck,
  type FormulaScope,
} from '@/lib/blueprint/formula';
import type { Expression } from '@/lib/blueprint/types';

export default function FormulaBar({
  label,
  plain,
  scope,
  value,
  onChange,
  onAccept,
}: {
  label: string;
  /** One sentence stating what this formula does and what breaks without it. */
  plain: string;
  scope: FormulaScope;
  value: string;
  onChange: (next: string) => void;
  onAccept?: (expression: Expression, text: string) => void;
}) {
  const [caret, setCaret] = useState(0);

  const reading = useMemo(() => readAndCheck(value, scope), [value, scope]);
  const completions = useMemo(
    () => completionsAt(value, Math.min(caret, value.length), scope).slice(0, 8),
    [caret, scope, value],
  );

  const insert = (text: string) => {
    const at = Math.min(caret, value.length);
    const before = value.slice(0, at);
    const run = /([A-Za-z_][A-Za-z0-9_]*)$/.exec(before);
    const from = run ? at - run[1].length : at;
    const next = `${value.slice(0, from)}${text}${value.slice(at)}`;
    onChange(next);
    setCaret(from + text.length);
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <TextField
        fullWidth
        size="small"
        label={label}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setCaret(event.target.selectionStart ?? event.target.value.length);
        }}
        onSelect={(event) =>
          setCaret((event.target as HTMLInputElement).selectionStart ?? value.length)
        }
        onKeyDown={(event) => {
          if (event.key === 'Enter' && reading.expression && onAccept) {
            event.preventDefault();
            onAccept(reading.expression, value);
          }
        }}
        error={reading.fault !== undefined && value.trim().length > 0}
        helperText={plain}
        inputProps={{ spellCheck: false, 'aria-label': label }}
      />

      <Box sx={{ mt: 1.5 }}>
        {reading.fault && value.trim().length > 0 && (
          <Alert severity="error" data-testid="formula-fault">
            <AlertTitle>{reading.fault.message}</AlertTitle>
            {reading.fault.fix}
          </Alert>
        )}
        {reading.type && (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              color="success"
              label={`This formula reads ${describeType(reading.type)}`}
            />
            {reading.value && (
              <Chip size="small" label={`Right now it works out to ${describeValue(reading.value)}`} />
            )}
          </Stack>
        )}
      </Box>

      {completions.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 800 }}>
            Names and functions this formula reaches
          </Typography>
          <List dense disablePadding>
            {completions.map((completion) => (
              <ListItem key={`${completion.kind}:${completion.insert}`} disablePadding>
                <ListItemButton onClick={() => insert(completion.insert)}>
                  <ListItemText primary={completion.label} secondary={completion.plain} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Paper>
  );
}
