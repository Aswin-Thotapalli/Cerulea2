'use client';

import { Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import type { TxStatus } from '@cerulea/types';

interface StatusBadgeProps {
  status: TxStatus;
  size?: 'small' | 'medium';
}

const CONFIG: Record<TxStatus, { label: string; color: 'success' | 'error' | 'warning'; icon: React.ReactElement }> = {
  success: { label: 'Success', color: 'success', icon: <CheckCircleIcon /> },
  failed: { label: 'Failed', color: 'error', icon: <CancelIcon /> },
  pending: { label: 'Pending', color: 'warning', icon: <HourglassEmptyIcon /> },
};

export default function StatusBadge({ status, size = 'small' }: StatusBadgeProps) {
  const { label, color, icon } = CONFIG[status];
  return (
    <Chip
      label={label}
      color={color}
      size={size}
      icon={icon}
      variant="outlined"
      sx={{ fontWeight: 600, fontSize: '0.7rem' }}
    />
  );
}
