'use client';

// apps/frontend/src/components/studio/interface/PreviewFrame.tsx
// The generated application as one role sees it.
// The engine renders the screen with the permission resolver the deployment
// uses, so the preview and the deployment show the same thing. The frame is
// isolated, so the application style sheet never reaches Studio.
// Without the frame a person would deploy to see the application.

import { Alert, Box, Typography } from '@mui/material';

import { widthWords } from '@/lib/interface/authoring';
import type { PreviewOutcome } from '@/lib/interface/types';

export type PreviewFrameProps = {
  preview: PreviewOutcome;
  /** The screen on show. An absent value shows the first screen the role reaches. */
  screen?: string;
};

/** The width one preview frame takes, in pixels. */
export function frameWidth(breakpoint: string): number {
  switch (breakpoint) {
    case 'phone':
      return 390;
    case 'tablet':
      return 834;
    default:
      return 1280;
  }
}

/** The whole document the frame shows. */
export function frameDocument(preview: PreviewOutcome, markup: string): string {
  return [
    '<!doctype html>',
    `<html lang="${preview.language}" data-theme="${preview.mode}">`,
    '<head><meta charset="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<style>${preview.styleSheet}</style>`,
    '<style>body{margin:0;font-family:system-ui,sans-serif;}</style>',
    '</head><body>',
    markup,
    '</body></html>',
  ].join('');
}

export default function PreviewFrame({ preview, screen }: PreviewFrameProps) {
  if (preview.screens.length === 0) {
    return (
      <Alert severity="info" data-testid="preview-empty">
        {preview.note}
      </Alert>
    );
  }
  const shown =
    preview.screens.find((held) => held.id === screen) ?? (preview.screens[0] as PreviewOutcome['screens'][number]);
  return (
    <Box data-testid="preview-frame">
      <Typography variant="subtitle2" component="h3">
        {shown.title} · {preview.roleName} · {widthWords(preview.breakpoint)} ·{' '}
        {preview.mode === 'dark' ? 'Dark mode' : 'Light theme'}
      </Typography>
      <Box
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden',
          width: '100%',
          maxWidth: frameWidth(preview.breakpoint),
        }}
      >
        <iframe
          title={`${shown.title} as the ${preview.roleName} role`}
          data-testid="preview-document"
          srcDoc={frameDocument(preview, shown.markup)}
          style={{ width: '100%', height: 620, border: 0, display: 'block' }}
        />
      </Box>
    </Box>
  );
}
