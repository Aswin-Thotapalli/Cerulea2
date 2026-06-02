'use client';

import { useState } from 'react';
import { Tooltip, Typography, IconButton, Box } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { truncateHash } from '@/lib/format';

interface HashChipProps {
  value: string;
  head?: number;
  tail?: number;
  /** If true, renders just the text (no copy button) */
  compact?: boolean;
  monospace?: boolean;
  color?: string;
}

export default function HashChip({
  value,
  head = 8,
  tail = 6,
  compact = false,
  monospace = true,
  color,
}: HashChipProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const short = truncateHash(value, head, tail);

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
      <Tooltip title={value} placement="top">
        <Typography
          variant="body2"
          component="span"
          sx={{
            fontFamily: monospace ? 'monospace' : undefined,
            fontSize: monospace ? '0.8rem' : undefined,
            color: color ?? 'primary.main',
            cursor: 'default',
            letterSpacing: 0,
          }}
        >
          {short}
        </Typography>
      </Tooltip>
      {!compact && (
        <Tooltip title={copied ? 'Copied!' : 'Copy full value'}>
          <IconButton size="small" onClick={handleCopy} sx={{ p: 0.25 }}>
            {copied
              ? <CheckIcon sx={{ fontSize: 13, color: 'success.main' }} />
              : <ContentCopyIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
            }
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
