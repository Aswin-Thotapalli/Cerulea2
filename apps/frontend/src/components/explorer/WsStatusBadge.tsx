'use client';

import { Chip, Tooltip } from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import type { WsStatus } from '@cerulea/types';

const CONFIG: Record<WsStatus, { label: string; color: string; tip: string }> = {
  connected: { label: 'Live', color: '#10b981', tip: 'WebSocket connected — live data active' },
  connecting: { label: 'Connecting', color: '#f59e0b', tip: 'Connecting to node...' },
  disconnected: { label: 'Disconnected', color: '#6b7280', tip: 'WebSocket disconnected — retrying...' },
  error: { label: 'Error', color: '#ef4444', tip: 'WebSocket error — check RPC URL configuration' },
};

export default function WsStatusBadge({ status }: { status: WsStatus }) {
  const { label, color, tip } = CONFIG[status];
  return (
    <Tooltip title={tip}>
      <Chip
        size="small"
        icon={<FiberManualRecordIcon sx={{ fontSize: '10px !important', color: `${color} !important` }} />}
        label={label}
        sx={{ fontSize: '0.68rem', fontWeight: 600, height: 22, color }}
        variant="outlined"
      />
    </Tooltip>
  );
}
