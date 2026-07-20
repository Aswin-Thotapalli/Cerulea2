'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Stack, Switch, Button,
  TextField, IconButton, Tooltip, Divider, MenuItem, Select, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import WebhookIcon from '@mui/icons-material/Webhook';
import HubIcon from '@mui/icons-material/Hub';
import SettingsIcon from '@mui/icons-material/Settings';
import PaymentIcon from '@mui/icons-material/Payment';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import StorageIcon from '@mui/icons-material/Storage';
import LinkIcon from '@mui/icons-material/Link';

type Integration = {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  endpoint?: string;
  logoChar: string;
  logoColor: string;
};

const STUB_INTEGRATIONS: Integration[] = [
  { id: 'stripe', name: 'Stripe', description: 'Accept payments and manage subscriptions within your dApp.', category: 'Payments', enabled: true, endpoint: 'https://api.cerulea.app/hooks/stripe/****...****a3f2', logoChar: 'S', logoColor: '#6772e5' },
  { id: 'sumsub', name: 'Sumsub', description: 'KYC/AML identity verification for compliant dApps.', category: 'KYC / Identity', enabled: true, endpoint: 'https://api.cerulea.app/hooks/sumsub/****...****b9d1', logoChar: 'K', logoColor: '#00b16a' },
  { id: 'alchemy', name: 'Alchemy', description: 'Enhanced node infrastructure and RPC access via Alchemy.', category: 'Infrastructure', enabled: false, endpoint: undefined, logoChar: 'A', logoColor: '#363ff9' },
  { id: 'ipfs', name: 'IPFS / Filecoin', description: 'Decentralised file storage for on-chain metadata and assets.', category: 'Storage', enabled: false, endpoint: undefined, logoChar: 'F', logoColor: '#0090ff' },
];

const CAT_ICON: Record<string, React.ReactNode> = {
  Payments: <PaymentIcon sx={{ fontSize: 16 }} />,
  'KYC / Identity': <VerifiedUserIcon sx={{ fontSize: 16 }} />,
  Infrastructure: <HubIcon sx={{ fontSize: 16 }} />,
  Storage: <StorageIcon sx={{ fontSize: 16 }} />,
};

const WEBHOOK_EVENTS = ['project.deployed', 'snapshot.created', 'node.status_changed', 'proposal.finalized'];

function makeEndpoints(projectId: string) {
  return [
    { label: 'JSON-RPC', value: `https://rpc.cerulea.app/v1/${projectId}/mainnet`, desc: 'Ethereum-compatible JSON-RPC' },
    { label: 'REST', value: `https://api.cerulea.app/v1/${projectId}/mainnet`, desc: 'REST API for off-chain queries' },
    { label: 'WebSocket', value: `wss://ws.cerulea.app/v1/${projectId}/mainnet`, desc: 'Real-time subscriptions' },
    { label: 'GraphQL', value: `https://gql.cerulea.app/v1/${projectId}/mainnet`, desc: 'Flexible GraphQL queries' },
  ];
}

function makeWebhook(projectId: string) {
  return {
    url: `https://hooks.cerulea.app/events/${projectId}`,
    secret: `whsec_${projectId}`,
    events: WEBHOOK_EVENTS,
  };
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Tooltip title={copied ? 'Copied!' : 'Copy'} arrow>
      <IconButton size="small" onClick={handleCopy}>
        {copied ? <CheckIcon sx={{ fontSize: 14, color: '#10b981' }} /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}
      </IconButton>
    </Tooltip>
  );
}

function EndpointRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 800, letterSpacing: 0.8, fontSize: '0.6rem' }}>{label.toUpperCase()}</Typography>
      <Stack direction="row" alignItems="center" spacing={0.5} mt={0.5}
        sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
        <Typography variant="caption" sx={{ fontFamily: 'monospace', flex: 1, color: 'text.secondary' }} noWrap>{value}</Typography>
        <CopyButton value={value} />
      </Stack>
    </Box>
  );
}

export default function IntegrationsPage() {
  const theme = useTheme();
  const [integrations, setIntegrations] = useState(STUB_INTEGRATIONS);
  const [reConfigId, setReConfigId] = useState<string | null>(null);
  const [userProjects, setUserProjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.json())
      .then((j) => {
        const projs: { id: string; name: string }[] = j.projects || [];
        setUserProjects(projs);
        if (projs.length > 0) setSelectedProjectId(projs[0].id);
      })
      .catch(() => {});
  }, []);

  // Load saved integration configs when the selected project changes.
  useEffect(() => {
    if (!selectedProjectId) return;
    fetch(`/api/projects/${selectedProjectId}/integrations`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok && j.configs) {
          setIntegrations(STUB_INTEGRATIONS.map((i) => ({
            ...i,
            enabled: i.id in j.configs,
          })));
        }
      })
      .catch(() => {});
  }, [selectedProjectId]);

  const apiEndpoints = selectedProjectId ? makeEndpoints(selectedProjectId) : [];
  const webhookConfig = selectedProjectId ? makeWebhook(selectedProjectId) : null;

  const toggle = (id: string) => {
    setIntegrations((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i));
      // Persist the updated enabled set to the project's integration config.
      if (selectedProjectId) {
        const configs: Record<string, boolean> = {};
        next.filter((i) => i.enabled).forEach((i) => { configs[i.id] = true; });
        fetch(`/api/projects/${selectedProjectId}/integrations`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ configs }),
        }).catch(() => {});
      }
      return next;
    });
  };

  const current = integrations.find((i) => i.id === reConfigId);
  const goToStudio = () => {
    const isLocal = window.location.hostname.includes('localhost');
    window.location.href = isLocal ? 'http://studio.localhost:3000' : 'https://studio.cerulea.io';
  };

  const enabledCount = integrations.filter((i) => i.enabled).length;

  return (
    <Box sx={{ p: 4, maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={4}>
        <Box>
          <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, letterSpacing: 1.5, fontSize: '0.62rem' }}>THIRD-PARTY SERVICES</Typography>
          <Typography variant="h4" fontWeight={900} sx={{
            background: `linear-gradient(135deg, ${theme.palette.mode === 'dark' ? '#e0e7ff' : '#1e1b4b'} 0%, #a5b4fc 60%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: -0.5, mt: 0.5,
          }}>Integrations</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Connect your dApp to payments, identity, storage, and infrastructure services.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<HubIcon />} endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
          sx={{ borderRadius: 1, fontWeight: 700 }} onClick={goToStudio}>
          Configure in Studio
        </Button>
      </Stack>

      {/* Stat strip */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
        {[
          { label: 'Available', value: integrations.length, color: '#4F46E5' },
          { label: 'Enabled', value: enabledCount, color: '#10b981' },
          { label: 'Disabled', value: integrations.length - enabledCount, color: '#6b7db3' },
        ].map((s) => (
          <Paper key={s.label} variant="outlined" sx={{ p: 2, borderRadius: 2.5, bgcolor: alpha(s.color, 0.05), borderColor: alpha(s.color, 0.18) }}>
            <Typography variant="caption" sx={{ color: s.color, fontWeight: 800, letterSpacing: 0.8, fontSize: '0.62rem' }}>{s.label.toUpperCase()}</Typography>
            <Typography variant="h4" fontWeight={900} sx={{ color: s.color, lineHeight: 1, mt: 0.5 }}>{s.value}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Integration cards */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.02) }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <HubIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="overline" sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: 1, color: 'primary.main' }}>CONNECTED SERVICES</Typography>
          </Stack>
        </Box>

        {integrations.map((intg, idx) => (
          <Box key={intg.id} sx={{
            px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 2.5,
            borderBottom: idx < integrations.length - 1 ? '1px solid' : 'none', borderColor: 'divider',
            borderLeft: `3px solid ${intg.enabled ? alpha(intg.logoColor, 0.5) : 'transparent'}`,
            bgcolor: intg.enabled ? alpha(intg.logoColor, 0.02) : 'transparent',
            transition: 'all 0.12s',
            '&:hover': { bgcolor: alpha(intg.logoColor, 0.04) },
          }}>
            {/* Logo */}
            <Box sx={{
              width: 46, height: 46, borderRadius: 2, flexShrink: 0,
              bgcolor: alpha(intg.logoColor, 0.1),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 900, fontSize: 20, color: intg.logoColor,
              border: intg.enabled ? `1px solid ${alpha(intg.logoColor, 0.25)}` : '1px solid transparent',
            }}>
              {intg.logoChar}
            </Box>

            {/* Name + category + description */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={0.25}>
                <Typography variant="subtitle2" fontWeight={800}>{intg.name}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, px: 1, py: 0.3, borderRadius: 1, bgcolor: alpha(intg.logoColor, 0.08), color: intg.logoColor, fontSize: '0.62rem', fontWeight: 700 }}>
                  {CAT_ICON[intg.category]}
                  <span>{intg.category}</span>
                </Box>
                {intg.enabled && <CheckCircleIcon sx={{ fontSize: 14, color: '#10b981' }} />}
              </Stack>
              <Typography variant="caption" color="text.secondary">{intg.description}</Typography>
              {intg.enabled && intg.endpoint && (
                <Stack direction="row" alignItems="center" spacing={0.5} mt={0.75}
                  sx={{ px: 1.25, py: 0.5, borderRadius: 1.5, bgcolor: alpha(intg.logoColor, 0.06), border: `1px solid ${alpha(intg.logoColor, 0.15)}`, display: 'inline-flex', maxWidth: 400 }}>
                  <LinkIcon sx={{ fontSize: 12, color: intg.logoColor, flexShrink: 0 }} />
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.68rem' }} noWrap>{intg.endpoint}</Typography>
                  <CopyButton value={intg.endpoint} />
                </Stack>
              )}
            </Box>

            {/* Toggle + configure */}
            <Stack direction="row" alignItems="center" spacing={1.5} flexShrink={0}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="caption" color="text.secondary" fontWeight={600}>{intg.enabled ? 'Enabled' : 'Disabled'}</Typography>
                <Switch checked={intg.enabled} onChange={() => toggle(intg.id)} size="small" />
              </Stack>
              <Button size="small" variant="outlined" startIcon={<SettingsIcon sx={{ fontSize: 12 }} />}
                onClick={() => setReConfigId(intg.id)}
                sx={{ borderRadius: 1, fontSize: '0.7rem', fontWeight: 700, borderColor: alpha(intg.logoColor, 0.3), color: intg.logoColor }}>
                Configure
              </Button>
            </Stack>
          </Box>
        ))}
      </Paper>

      {/* Project selector for endpoints */}
      {userProjects.length > 0 && (
        <Stack direction="row" alignItems="center" spacing={2} mb={2}>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>
            Showing endpoints for:
          </Typography>
          {userProjects.length === 1 ? (
            <Typography variant="caption" fontWeight={700} color="primary.main">{userProjects[0].name}</Typography>
          ) : (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <Select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)}
                sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                {userProjects.map((p) => (
                  <MenuItem key={p.id} value={p.id} sx={{ fontSize: '0.8rem' }}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>
      )}

      {/* Endpoints */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2.5 }}>
        {/* API Endpoints */}
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={0.75}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LinkIcon sx={{ fontSize: 14, color: '#4F46E5' }} />
            </Box>
            <Typography variant="subtitle2" fontWeight={800}>API Endpoints</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Connect your dApp to the deployed network. Each project has its own unique endpoint set.
          </Typography>
          {apiEndpoints.length === 0 ? (
            <Typography variant="caption" color="text.disabled">No deployed projects found.</Typography>
          ) : (
            <Stack spacing={1.25}>
              {apiEndpoints.map((ep) => (
                <Box key={ep.label}>
                  <Stack direction="row" alignItems="center" spacing={1} mb={0.4}>
                    <Box sx={{ px: 0.75, py: 0.2, borderRadius: 0.75, bgcolor: alpha('#4F46E5', 0.1), color: '#4F46E5', fontSize: '0.58rem', fontWeight: 800 }}>{ep.label}</Box>
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.62rem' }}>{ep.desc}</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={0.5}
                    sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: alpha('#4F46E5', 0.03), border: `1px solid ${alpha('#4F46E5', 0.12)}` }}>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', flex: 1, color: 'text.secondary', fontSize: '0.68rem' }} noWrap>{ep.value}</Typography>
                    <CopyButton value={ep.value} />
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>

        {/* Webhook config */}
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={0.75}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha('#8b5cf6', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WebhookIcon sx={{ fontSize: 14, color: '#8b5cf6' }} />
            </Box>
            <Typography variant="subtitle2" fontWeight={800}>Webhook Config</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Receive real-time event notifications at your endpoint.
          </Typography>
          {!webhookConfig ? (
            <Typography variant="caption" color="text.disabled">No deployed projects found.</Typography>
          ) : (
            <Stack spacing={1.25}>
              <EndpointRow label="Webhook URL" value={webhookConfig.url} />
              <EndpointRow label="Signing Secret" value={webhookConfig.secret} />
              <Box>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 800, letterSpacing: 0.8, fontSize: '0.6rem' }}>SUBSCRIBED EVENTS</Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" mt={0.5}>
                  {webhookConfig.events.map((e) => (
                    <Box key={e} sx={{ px: 1, py: 0.25, borderRadius: 1, border: '1px solid', borderColor: 'divider', fontSize: '0.62rem', fontWeight: 600, color: 'text.secondary', my: 0.25 }}>
                      {e}
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Stack>
          )}
        </Paper>
      </Box>

      {/* Re-configure Dialog */}
      <Dialog open={!!reConfigId} onClose={() => setReConfigId(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Configure {current?.name}</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
            Full integration configuration is available in the Studio builder (Step 5: Integrations).
          </Alert>
          <Typography variant="body2" color="text.secondary">
            You will be redirected to Studio where you can update API keys, scopes, and event mappings for <strong>{current?.name}</strong>.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReConfigId(null)} sx={{ borderRadius: 1 }}>Cancel</Button>
          <Button variant="contained" endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />} onClick={goToStudio} sx={{ borderRadius: 1, fontWeight: 700 }}>
            Open Studio
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
