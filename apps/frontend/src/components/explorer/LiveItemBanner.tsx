'use client';

import { Box, Typography, keyframes } from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { alpha, useTheme } from '@mui/material/styles';

const slideDown = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
`;

interface LiveItemBannerProps {
  newCount: number;
  label?: string;
  onClick?: () => void;
}

export default function LiveItemBanner({ newCount, label = 'new items', onClick }: LiveItemBannerProps) {
  const theme = useTheme();
  if (newCount === 0) return null;

  return (
    <Box
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 2,
        py: 0.5,
        borderRadius: 999,
        bgcolor: alpha(theme.palette.primary.main, 0.1),
        border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
        cursor: onClick ? 'pointer' : 'default',
        animation: `${slideDown} 0.3s ease-out`,
        '&:hover': onClick ? { bgcolor: alpha(theme.palette.primary.main, 0.18) } : undefined,
        transition: 'background-color 0.15s',
        userSelect: 'none',
      }}
    >
      <FiberManualRecordIcon
        sx={{
          fontSize: 8,
          color: theme.palette.primary.main,
          animation: `${pulse} 1.5s ease-in-out infinite`,
        }}
      />
      <Typography variant="caption" fontWeight={700} color="primary.main">
        {newCount} {label}
      </Typography>
    </Box>
  );
}
