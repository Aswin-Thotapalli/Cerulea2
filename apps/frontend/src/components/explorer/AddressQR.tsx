'use client';

import { Box, Typography, Paper } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { useTheme } from '@mui/material/styles';

interface AddressQRProps {
  address: string;
  size?: number;
  label?: string;
}

export default function AddressQR({ address, size = 160, label }: AddressQRProps) {
  const theme = useTheme();
  return (
    <Paper
      variant="outlined"
      sx={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
        p: 2,
        borderRadius: 3,
      }}
    >
      <Box
        sx={{
          p: 1.5,
          bgcolor: '#fff',
          borderRadius: 2,
          display: 'flex',
        }}
      >
        <QRCodeSVG
          value={address}
          size={size}
          fgColor={theme.palette.mode === 'dark' ? '#1a1a2e' : '#111827'}
          bgColor="#ffffff"
          level="M"
        />
      </Box>
      {label && (
        <Typography variant="caption" color="text.secondary" fontWeight={500}>
          {label}
        </Typography>
      )}
      <Typography
        variant="caption"
        sx={{
          fontFamily: 'monospace',
          wordBreak: 'break-all',
          textAlign: 'center',
          color: 'text.secondary',
          fontSize: '0.68rem',
          maxWidth: size + 24,
        }}
      >
        {address}
      </Typography>
    </Paper>
  );
}
