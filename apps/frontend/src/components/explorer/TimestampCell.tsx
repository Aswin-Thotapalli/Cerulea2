'use client';

import { useState, useEffect } from 'react';
import { Tooltip, Typography } from '@mui/material';
import { formatTimestamp } from '@/lib/explorer/format';

interface TimestampCellProps {
  tsMs: number;
  variant?: 'body2' | 'caption';
}

export default function TimestampCell({ tsMs, variant = 'body2' }: TimestampCellProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15_000);
    return () => clearInterval(id);
  }, []);

  const { relative, absolute } = formatTimestamp(tsMs);

  return (
    <Tooltip title={absolute} placement="top">
      <Typography variant={variant} sx={{ cursor: 'default', whiteSpace: 'nowrap' }}>
        {relative}
      </Typography>
    </Tooltip>
  );
}
