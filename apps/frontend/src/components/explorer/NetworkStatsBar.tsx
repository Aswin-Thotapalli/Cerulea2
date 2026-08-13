'use client';

import { Box, Typography, Divider, Skeleton } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import CellTowerIcon from '@mui/icons-material/CellTower';
import TimerIcon from '@mui/icons-material/Timer';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import GroupIcon from '@mui/icons-material/Group';
import SpeedIcon from '@mui/icons-material/Speed';
import type { NetworkStats } from '@cerulea/types';
import { formatNumber } from '@/lib/explorer/format';

interface NetworkStatsBarProps {
  stats: NetworkStats | null;
  loading?: boolean;
}

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  loading?: boolean;
}

function StatItem({ icon, label, value, loading }: StatItemProps) {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2 }}>
      <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.2 }}>
          {label}
        </Typography>
        {loading ? (
          <Skeleton width={60} height={18} />
        ) : (
          <Typography variant="body2" fontWeight={700}>
            {value}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default function NetworkStatsBar({ stats, loading = false }: NetworkStatsBarProps) {
  const theme = useTheme();

  const chainStatus = stats?.chainStatus ?? 'down';
  const statusColor =
    chainStatus === 'healthy' ? '#10b981'
    : chainStatus === 'degraded' ? '#f59e0b'
    : '#ef4444';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 0,
        py: 1.5,
        px: 1,
        bgcolor: alpha(theme.palette.background.paper, 0.8),
        borderBottom: `1px solid ${theme.palette.divider}`,
        backdropFilter: 'blur(8px)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 2 }}>
        <Box
          sx={{
            width: 8, height: 8, borderRadius: '50%',
            bgcolor: statusColor,
            boxShadow: `0 0 6px ${statusColor}`,
          }}
        />
        <Typography variant="caption" fontWeight={700} sx={{ color: statusColor }}>
          {chainStatus.charAt(0).toUpperCase() + chainStatus.slice(1)}
        </Typography>
      </Box>

      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <StatItem
        icon={<CellTowerIcon fontSize="small" />}
        label="Latest Block"
        value={stats ? `#${formatNumber(stats.latestBlock)}` : '—'}
        loading={loading}
      />
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <StatItem
        icon={<TimerIcon fontSize="small" />}
        label="Avg Block Time"
        value={stats ? `${(stats.avgBlockTime / 1000).toFixed(1)}s` : '—'}
        loading={loading}
      />
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <StatItem
        icon={<SwapHorizIcon fontSize="small" />}
        label="Total Txs"
        value={stats ? formatNumber(stats.totalTransactions) : '—'}
        loading={loading}
      />
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <StatItem
        icon={<GroupIcon fontSize="small" />}
        label="Validators"
        value={stats ? formatNumber(stats.activeValidators) : '—'}
        loading={loading}
      />
      <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
      <StatItem
        icon={<SpeedIcon fontSize="small" />}
        label="TPS"
        value={stats ? (stats.tps >= 100 ? formatNumber(Math.round(stats.tps)) : stats.tps.toFixed(1)) : '—'}
        loading={loading}
      />
    </Box>
  );
}
