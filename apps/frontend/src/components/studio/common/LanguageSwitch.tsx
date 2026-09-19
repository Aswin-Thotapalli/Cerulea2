'use client';

// apps/frontend/src/components/studio/common/LanguageSwitch.tsx
// The language switch.
// A person picks the language every Studio screen reads in. English ships with
// the build. A language awaiting its file reads in English and says so, so
// nobody meets a blank screen.
// Without the switch a person reads English whatever language they work in.

import { MenuItem, Stack, TextField, Typography } from '@mui/material';

import { useMessages } from '@/lib/messages/MessagesProvider';
import { coverageStatement, type LanguageTag } from '@/lib/messages/catalogue';

export default function LanguageSwitch({ dense = false }: { dense?: boolean }) {
  const messages = useMessages();

  return (
    <Stack spacing={0.5} data-testid="language-switch">
      <TextField
        select
        size="small"
        value={messages.language.tag}
        onChange={(event) => messages.setLanguage(event.target.value as LanguageTag)}
        label={messages.t('common.language.label', 'Language')}
        helperText={messages.t(
          'common.language.helper',
          'Every screen in Studio reads in the language chosen here.',
        )}
        sx={{ minWidth: dense ? 180 : 260 }}
        inputProps={{ 'aria-label': messages.t('common.language.label', 'Language') }}
      >
        {messages.languages.map((language) => (
          <MenuItem key={language.tag} value={language.tag}>
            {`${language.name}, ${language.endonym}`}
          </MenuItem>
        ))}
      </TextField>
      <Typography variant="caption" color="text.secondary" data-mirror="workspace.language">
        {coverageStatement(messages.language.tag)}
      </Typography>
    </Stack>
  );
}
