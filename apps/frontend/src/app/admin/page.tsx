'use client';

// apps/frontend/src/app/admin/page.tsx
// The Platform Overview of the Cerulea operator.
// The six figure cards, the Platform Health list and the Critical Alerts panel
// read /api/admin/stats, which reads the administration summary, the projects
// and the workspaces from Cerulea APIs. The health list shows the Blockchain
// and every integration driver. The alerts show the chain issues the node
// reports and every driver that is not ready.
// Without this screen the operator has no first view of the platform.

import {
  Box, Typography, Paper, Stack, Chip, Divider, CircularProgress,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { alpha } from '@mui/material/styles';

import PeopleIcon from '@mui/icons-material/People';
import FolderIcon from '@mui/icons-material/Folder';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import HexagonOutlinedIcon from '@mui/icons-material/HexagonOutlined';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CameraIcon from '@mui/icons-material/Camera';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';

import { FailureLine, useOperatorRead } from './_shared/operator';

type KpiProps = {
  label: string;
  value: string;
  sub: string;
  color: string;
  icon: React.ReactNode;
};

function KpiCard({ label, value, sub, color, icon }: KpiProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: 3,
        height: '100%',
        background: alpha(color, 0.05),
        borderColor: alpha(color, 0.15),
        transition: 'box-shadow 0.15s',
        '&:hover': { boxShadow: `0 0 0 1px ${alpha(color, 0.3)}` },
      }}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={1}>
        <Typography
          variant="caption"
          sx={{ color: 'rgba(255,255,255,0.45)', fontWeight: 700, letterSpacing: 0.7, fontSize: '0.67rem' }}
        >
          {label.toUpperCase()}
        </Typography>
        <Box sx={{ color: color, opacity: 0.75 }}>{icon}</Box>
      </Stack>
      <Typography variant="h3" fontWeight={900} sx={{ color, lineHeight: 1.1, fontSize: '1.8rem' }}>
        {value}
      </Typography>
      <Stack direction="row" alignItems="center" spacing={1} mt={0.75}>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>{sub}</Typography>
      </Stack>
    </Paper>
  );
}

type Driver = { integration: string; kind: 'local' | 'live'; ready: boolean; detail: string };

/** The part of /api/admin/stats this screen reads. */
type AdminStats = {
  totalUsers: number;
  totalProjects: number;
  activeSubscriptions: number;
  blockchainProjects: number;
  dappProjects: number;
  totalSnapshots: number;
  /** Present once Cerulea APIs counts Cerulea Intelligence threads. */
  totalAiThreads?: number;
  mode: 'local' | 'live';
  openItems: { id: string; source: 'chain' | 'driver'; message: string }[];
  platform: {
    chainName: string;
    chainKind: 'local' | 'live';
    head: number;
    finalizedBlock: number;
    activeValidators: number;
    totalValidators: number;
    consensusHealth: string;
    healthy: boolean;
    issues: string[];
    drivers: Driver[];
    readAt: string;
  };
};

const STATUS_DOT: Record<string, string> = {
  operational: '#4caf50',
  degraded: '#ff9800',
  down: '#f44336',
};

type HealthRow = {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  reading: string;
  kind: 'local' | 'live';
};

/** The Blockchain first, then every driver, in the production list shape. */
function healthRows(platform: AdminStats['platform']): HealthRow[] {
  const chainStatus: HealthRow['status'] =
    platform.consensusHealth === 'Healthy' && platform.healthy
      ? 'operational'
      : platform.consensusHealth === 'Critical'
        ? 'down'
        : 'degraded';
  const chain: HealthRow = {
    name: platform.chainName,
    status: chainStatus,
    reading: `block ${platform.head}, ${platform.activeValidators} of ${platform.totalValidators} validators`,
    kind: platform.chainKind,
  };
  const drivers: HealthRow[] = platform.drivers.map((driver) => ({
    name: `${driver.integration} driver`,
    status: driver.ready ? 'operational' : 'down',
    reading: driver.detail,
    kind: driver.kind,
  }));
  return [chain, ...drivers];
}

export default function AdminOverviewPage() {
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const { data: stats, error, loading } = useOperatorRead<AdminStats>('/api/admin/stats');

  const kpiData: KpiProps[] = stats ? [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), sub: `${stats.activeSubscriptions} with active plan`, color: '#448aff', icon: <PeopleIcon sx={{ fontSize: 24 }} /> },
    { label: 'Total Projects', value: stats.totalProjects.toLocaleString(), sub: `${stats.dappProjects} dApp / ${stats.blockchainProjects} Chain`, color: '#80deea', icon: <FolderIcon sx={{ fontSize: 24 }} /> },
    { label: 'Blockchain Projects', value: stats.blockchainProjects.toLocaleString(), sub: 'Blockchain networks created', color: '#ce93d8', icon: <HexagonOutlinedIcon sx={{ fontSize: 24 }} /> },
    { label: 'Active Subscriptions', value: stats.activeSubscriptions.toLocaleString(), sub: 'Paid plans', color: '#4caf50', icon: <RocketLaunchIcon sx={{ fontSize: 24 }} /> },
    ...(typeof stats.totalAiThreads === 'number'
      ? [{ label: 'AI Conversations', value: stats.totalAiThreads.toLocaleString(), sub: 'Cerulea Intelligence threads total', color: '#ab47bc', icon: <SmartToyIcon sx={{ fontSize: 24 }} /> }]
      : []),
    { label: 'Snapshots', value: stats.totalSnapshots.toLocaleString(), sub: 'Studio checkpoints saved', color: '#ff9800', icon: <CameraIcon sx={{ fontSize: 24 }} /> },
  ] : [];

  const health = stats ? healthRows(stats.platform) : [];
  const operational = health.filter((row) => row.status === 'operational').length;
  const alerts = stats?.openItems ?? [];
  const modeColor = stats?.mode === 'live' ? '#4caf50' : '#448aff';

  return (
    <Box sx={{ maxWidth: 1400 }}>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={900} sx={{ mb: 0.25 }}>
            Platform Overview
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
            {today} - Cerulea operator command centre
          </Typography>
        </Box>
        {stats && (
          <Chip
            label={stats.mode === 'live' ? 'LIVE' : 'LOCAL'}
            size="small"
            data-testid="overview-mode-chip"
            icon={<RadioButtonCheckedIcon sx={{ fontSize: '0.65rem !important', animation: 'pulse 2s infinite' }} />}
            sx={{
              bgcolor: alpha(modeColor, 0.12),
              color: modeColor,
              border: `1px solid ${alpha(modeColor, 0.25)}`,
              fontWeight: 800,
              fontSize: '0.65rem',
              height: 24,
              '& .MuiChip-icon': { color: `${modeColor} !important` },
            }}
          />
        )}
      </Stack>

      {error && <FailureLine message={error} />}

      {/* KPI Cards */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress size={32} /></Box>
      ) : (
        <Grid container spacing={2} mb={4}>
          {kpiData.map((kpi) => (
            <Grid key={kpi.label} xs={12} sm={6} md={4}>
              <KpiCard {...kpi} />
            </Grid>
          ))}
        </Grid>
      )}

      {stats && (
        <Grid container spacing={3}>
          {/* Platform Health */}
          <Grid xs={12} md={7}>
            <Paper
              variant="outlined"
              sx={{ borderRadius: 3, overflow: 'hidden', height: '100%', borderColor: 'rgba(255,255,255,0.07)' }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ px: 3, py: 2, borderBottom: '1px solid rgba(255,255,255,0.07)' }}
              >
                <Typography variant="h6" fontWeight={800} sx={{ fontSize: '0.95rem' }}>
                  Platform Health
                </Typography>
                <Chip
                  label={`${operational} / ${health.length} Operational`}
                  size="small"
                  sx={{
                    bgcolor: alpha(operational === health.length ? '#4caf50' : '#ff9800', 0.1),
                    color: operational === health.length ? '#4caf50' : '#ff9800',
                    fontWeight: 700,
                    fontSize: '0.65rem',
                    height: 20,
                    border: 'none',
                  }}
                />
              </Stack>
              <Stack divider={<Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />}>
                {health.map((svc) => (
                  <Stack
                    key={svc.name}
                    direction="row"
                    alignItems="center"
                    sx={{ px: 3, py: 1.25 }}
                    spacing={1.5}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: STATUS_DOT[svc.status],
                        flexShrink: 0,
                        boxShadow: `0 0 6px ${STATUS_DOT[svc.status]}`,
                      }}
                    />
                    <Typography variant="body2" sx={{ flex: 1, fontSize: '0.82rem', fontWeight: 500 }}>
                      {svc.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }} noWrap>
                      {svc.reading}
                    </Typography>
                    <Chip
                      label={svc.kind}
                      size="small"
                      sx={{ height: 16, fontSize: '0.55rem', fontWeight: 800, bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: 'none', textTransform: 'uppercase' }}
                    />
                    {svc.status !== 'operational' && (
                      <Chip
                        label={svc.status.toUpperCase()}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: '0.55rem',
                          fontWeight: 800,
                          bgcolor: alpha(STATUS_DOT[svc.status], 0.12),
                          color: STATUS_DOT[svc.status],
                          border: 'none',
                        }}
                      />
                    )}
                  </Stack>
                ))}
              </Stack>
              <Typography variant="caption" sx={{ display: 'block', px: 3, py: 1.25, color: 'rgba(255,255,255,0.3)', fontSize: '0.67rem' }}>
                Read from Cerulea APIs at {new Date(stats.platform.readAt).toLocaleTimeString('en-GB')}
              </Typography>
            </Paper>
          </Grid>

          {/* Critical Alerts */}
          <Grid xs={12} md={5}>
            <Paper
              variant="outlined"
              sx={{ borderRadius: 3, overflow: 'hidden', borderColor: alpha(alerts.length > 0 ? '#f44336' : '#4caf50', 0.2) }}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ px: 3, py: 2, borderBottom: `1px solid ${alpha(alerts.length > 0 ? '#f44336' : '#4caf50', 0.15)}` }}
              >
                <WarningAmberIcon sx={{ fontSize: 16, color: alerts.length > 0 ? '#f44336' : '#4caf50' }} />
                <Typography variant="h6" fontWeight={800} sx={{ fontSize: '0.95rem', color: alerts.length > 0 ? '#f44336' : '#4caf50' }}>
                  Critical Alerts
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Chip
                  label={`${alerts.length} open`}
                  size="small"
                  sx={{
                    bgcolor: alpha(alerts.length > 0 ? '#f44336' : '#4caf50', 0.1),
                    color: alerts.length > 0 ? '#f44336' : '#4caf50',
                    fontWeight: 800,
                    fontSize: '0.6rem',
                    height: 18,
                    border: 'none',
                  }}
                />
              </Stack>
              {alerts.length === 0 ? (
                <Stack alignItems="center" spacing={1} sx={{ px: 3, py: 5 }}>
                  <CheckCircleIcon sx={{ fontSize: 32, color: alpha('#4caf50', 0.6) }} />
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', textAlign: 'center' }}>
                    No open alerts. The Blockchain and every driver answer as expected.
                  </Typography>
                </Stack>
              ) : (
                <Stack divider={<Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />}>
                  {alerts.map((alert) => (
                    <Stack key={alert.id} direction="row" alignItems="flex-start" spacing={1.5} sx={{ px: 3, py: 1.5 }}>
                      <Box
                        sx={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          bgcolor: alert.source === 'chain' ? '#f44336' : '#ff9800',
                          mt: 0.65,
                          flexShrink: 0,
                        }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.79rem', lineHeight: 1.4, color: 'rgba(255,255,255,0.8)' }}>
                          {alert.message}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.67rem' }}>
                          {alert.source === 'chain' ? 'Reported by the node' : 'Reported by the driver'}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
