'use client';

// apps/frontend/src/app/dashboard/integrations/page.tsx
// The Integrations screen.
// Three kinds of connection appear. The platform drivers Cerulea APIs runs,
// each local or live and ready or holding back. The feeds, bridges and
// outbound triggers the Blueprint of a project declares. The surface the live
// deployment of that project publishes, with the real address of every
// endpoint and the events it delivers outward.
// Without this screen nobody can see what a deployment reaches outside itself.

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Stack, Button, Chip,
  IconButton, Tooltip, MenuItem, Select, FormControl,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import WebhookIcon from '@mui/icons-material/Webhook';
import HubIcon from '@mui/icons-material/Hub';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import LinkIcon from '@mui/icons-material/Link';
import ExtensionIcon from '@mui/icons-material/Extension';

import { api } from '@/lib/apiClient';
import { describeCadence } from '@/components/dashboard/wording';
import { studioProjectUrl } from '@/config/divisions';

type Driver = { integration: string; kind: 'local' | 'live'; ready: boolean; detail: string };

type Feed = { id: string; name: string; provider: string; payload_type: string; cadence_seconds: number; attestation: string };
type Bridge = { id: string; target_network: string; direction: string; collection: string; confirmations: number };
type Trigger = { id: string; event: string; endpoint: string; signing: string; retries: number };

type Project = {
  projectId: string;
  projectName: string;
  workspaceName: string;
  division: string | null;
  state: string;
  version: number;
  feeds: Feed[];
  bridges: Bridge[];
  triggers: Trigger[];
};

type SurfaceEndpoint = {
  kind: 'record' | 'action' | 'proof' | 'stream';
  method: string;
  path: string;
  address: string;
  purpose: string;
  roles: string[];
  transactionClass: string | null;
  threshold: number | null;
};

type Surface = {
  projectId: string;
  deploymentId: string;
  status: string;
  host: string | null;
  basePath: string | null;
  certificateNotAfter: string | null;
  descriptionVersion: number | null;
  descriptionMatchesDeployment: boolean;
  endpoints: SurfaceEndpoint[];
  webhooks: { event: string; purpose: string; endpoint: string; signing: string; retries: number }[];
};

type IntegrationsView = {
  platform: { mode: string; ready: boolean; checkedAt: string; drivers: Driver[] };
  projects: Project[];
  selectedProjectId: string | null;
  surface: Surface | null;
};

/** One row of the connected services card. */
type ServiceRow = {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  endpoint?: string;
  logoChar: string;
  logoColor: string;
  source: 'driver' | 'blueprint';
};

const DRIVER_COLOR: Record<string, string> = {
  payments: '#6772e5',
  email: '#0ea5e9',
  certificates: '#10b981',
  domains: '#f59e0b',
  objects: '#8b5cf6',
  delivery: '#ec4899',
  bridge: '#06b6d4',
  notifications: '#f97316',
  queue: '#64748b',
};

const DRIVER_PURPOSE: Record<string, string> = {
  payments: 'Settles subscriptions and invoices in fiat.',
  email: 'Sends the messages Cerulea writes to people.',
  certificates: 'Issues the certificate each deployment serves.',
  domains: 'Publishes the name each deployment answers on.',
  objects: 'Holds files and large records.',
  delivery: 'Serves the generated screens of each deployment.',
  bridge: 'Moves records to and from outside networks.',
  notifications: 'Carries alerts to the people who asked for them.',
  queue: 'Runs deployments and deliveries in the background.',
};

const KIND_META: Record<SurfaceEndpoint['kind'], { label: string; desc: string }> = {
  record: { label: 'RECORDS', desc: 'Reads records of a collection' },
  action: { label: 'ACTIONS', desc: 'Runs an action the Blueprint declares' },
  proof: { label: 'PROOFS', desc: 'Returns the inclusion proof of a record' },
  stream: { label: 'STREAM', desc: 'Carries changes as they happen' },
};

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function studioBase(): string {
  if (typeof window === 'undefined') return 'https://studio.cerulea.io';
  return window.location.hostname.includes('localhost') ? window.location.origin : 'https://studio.cerulea.io';
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    void navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Tooltip title={copied ? 'Copied!' : 'Copy'} arrow>
      <IconButton size="small" onClick={handleCopy} aria-label={`Copy ${value}`}>
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

/** Turns a driver into the row the connected services card shows. */
function driverRow(driver: Driver): ServiceRow {
  return {
    id: `driver:${driver.integration}`,
    name: titleCase(driver.integration),
    description: driver.detail,
    category: driver.kind === 'live' ? 'Live driver' : 'Local driver',
    enabled: driver.ready,
    logoChar: driver.integration.charAt(0).toUpperCase(),
    logoColor: DRIVER_COLOR[driver.integration] ?? '#4F46E5',
    source: 'driver',
  };
}

/** Turns the declared connections of a project into rows. */
function blueprintRows(project: Project): ServiceRow[] {
  const rows: ServiceRow[] = [];
  for (const feed of project.feeds) {
    rows.push({
      id: `feed:${feed.id}`,
      name: feed.name,
      description: `Feed from ${feed.provider}, ${describeCadence(feed.cadence_seconds)}, attested by ${feed.attestation.toLowerCase()}.`,
      category: 'Feed',
      enabled: true,
      logoChar: 'F',
      logoColor: '#0ea5e9',
      source: 'blueprint',
    });
  }
  for (const bridge of project.bridges) {
    rows.push({
      id: `bridge:${bridge.id}`,
      name: `${bridge.collection} to ${bridge.target_network}`,
      description: `Bridge moving ${bridge.direction.toLowerCase()} after ${bridge.confirmations} confirmations.`,
      category: 'Bridge',
      enabled: true,
      logoChar: 'B',
      logoColor: '#06b6d4',
      source: 'blueprint',
    });
  }
  for (const trigger of project.triggers) {
    rows.push({
      id: `trigger:${trigger.id}`,
      name: trigger.event,
      description: `Outbound trigger signed by ${trigger.signing.toLowerCase()}, retried ${trigger.retries} times.`,
      category: 'Outbound trigger',
      enabled: true,
      endpoint: trigger.endpoint || undefined,
      logoChar: 'T',
      logoColor: '#8b5cf6',
      source: 'blueprint',
    });
  }
  return rows;
}

export default function IntegrationsPage() {
  const theme = useTheme();
  const [view, setView] = useState<IntegrationsView | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const read = useCallback(async (projectId?: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const suffix = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
      const data = await api<IntegrationsView>(`/api/dashboard/integrations${suffix}`);
      setView(data);
      setSelectedProjectId(data.selectedProjectId ?? '');
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Cerulea could not read the integrations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void read(); }, [read]);

  const projects = view?.projects ?? [];
  const drivers = view?.platform.drivers ?? [];
  const selectedProject = projects.find((p) => p.projectId === selectedProjectId);
  const surface = view?.surface && view.surface.projectId === selectedProjectId ? view.surface : null;

  const rows: ServiceRow[] = useMemo(
    () => [...drivers.map(driverRow), ...(selectedProject ? blueprintRows(selectedProject) : [])],
    [drivers, selectedProject],
  );
  const current = rows.find((r) => r.id === detailId);
  const enabledCount = rows.filter((r) => r.enabled).length;

  const studioHref = selectedProject
    ? studioProjectUrl(studioBase(), selectedProject.projectId, selectedProject.division)
    : studioBase();
  const goToStudio = () => { window.location.href = studioHref; };

  const grouped = useMemo(() => {
    const map = new Map<SurfaceEndpoint['kind'], SurfaceEndpoint[]>();
    for (const entry of surface?.endpoints ?? []) {
      const held = map.get(entry.kind) ?? [];
      held.push(entry);
      map.set(entry.kind, held);
    }
    return (['record', 'action', 'proof', 'stream'] as const)
      .filter((kind) => map.has(kind))
      .map((kind) => ({ kind, entries: map.get(kind) ?? [] }));
  }, [surface]);

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
            The platform drivers Cerulea runs, the connections each Blueprint declares, and the surface each deployment publishes.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<HubIcon />} endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
          sx={{ borderRadius: 1, fontWeight: 700 }} onClick={goToStudio}>
          Open the Integrations step
        </Button>
      </Stack>

      {loadError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} action={<Button size="small" onClick={() => void read(selectedProjectId || undefined)}>Retry</Button>}>
          {loadError}
        </Alert>
      )}

      {/* Stat strip */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 3 }}>
        {[
          { label: 'Available', value: rows.length, color: '#4F46E5' },
          { label: 'Enabled', value: enabledCount, color: '#10b981' },
          { label: 'Disabled', value: rows.length - enabledCount, color: '#6b7db3' },
        ].map((s) => (
          <Paper key={s.label} variant="outlined" data-testid={`stat-${s.label}`} sx={{ p: 2, borderRadius: 2.5, bgcolor: alpha(s.color, 0.05), borderColor: alpha(s.color, 0.18) }}>
            <Typography variant="caption" sx={{ color: s.color, fontWeight: 800, letterSpacing: 0.8, fontSize: '0.62rem' }}>{s.label.toUpperCase()}</Typography>
            <Typography variant="h4" fontWeight={900} sx={{ color: s.color, lineHeight: 1, mt: 0.5 }}>{loading ? '…' : s.value}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Project selector */}
      {projects.length > 0 && (
        <Stack direction="row" alignItems="center" spacing={2} mb={2}>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>
            Showing connections and endpoints for:
          </Typography>
          {projects.length === 1 ? (
            <Typography variant="caption" fontWeight={700} color="primary.main">{projects[0].projectName}</Typography>
          ) : (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <Select value={selectedProjectId} inputProps={{ 'aria-label': 'Project' }} onChange={(e) => void read(String(e.target.value))}
                sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
                {projects.map((p) => (
                  <MenuItem key={p.projectId} value={p.projectId} sx={{ fontSize: '0.8rem' }}>{p.projectName}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {loading && <CircularProgress size={14} />}
        </Stack>
      )}

      {/* Connected services */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha('#4F46E5', 0.02) }}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <HubIcon sx={{ fontSize: 16, color: 'primary.main' }} />
            <Typography variant="overline" sx={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: 1, color: 'primary.main' }}>CONNECTED SERVICES</Typography>
            {view && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                Cerulea APIs runs in {view.platform.mode} mode. Checked {new Date(view.platform.checkedAt).toLocaleTimeString()}.
              </Typography>
            )}
          </Stack>
        </Box>

        {loading && !view && (
          <Box sx={{ py: 5, display: 'flex', justifyContent: 'center' }} role="status" aria-label="Reading the integrations">
            <CircularProgress size={24} />
          </Box>
        )}

        {!loading && !loadError && rows.length === 0 && (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <ExtensionIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">No connection yet.</Typography>
            <Typography variant="caption" color="text.disabled">Cerulea APIs reported no driver and the project declares no feed, bridge or trigger.</Typography>
          </Box>
        )}

        {view && rows.map((intg, idx) => (
          <Box key={intg.id} data-testid={`service-${intg.id}`} sx={{
            px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 2.5,
            borderBottom: idx < rows.length - 1 ? '1px solid' : 'none', borderColor: 'divider',
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
                  {intg.source === 'driver' ? <HubIcon sx={{ fontSize: 12 }} /> : <ExtensionIcon sx={{ fontSize: 12 }} />}
                  <span>{intg.category}</span>
                </Box>
                {intg.enabled && <CheckCircleIcon sx={{ fontSize: 14, color: '#10b981' }} />}
              </Stack>
              <Typography variant="caption" color="text.secondary">{intg.description}</Typography>
              {intg.endpoint && (
                <Stack direction="row" alignItems="center" spacing={0.5} mt={0.75}
                  sx={{ px: 1.25, py: 0.5, borderRadius: 1.5, bgcolor: alpha(intg.logoColor, 0.06), border: `1px solid ${alpha(intg.logoColor, 0.15)}`, display: 'inline-flex', maxWidth: 400 }}>
                  <LinkIcon sx={{ fontSize: 12, color: intg.logoColor, flexShrink: 0 }} />
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.68rem' }} noWrap>{intg.endpoint}</Typography>
                  <CopyButton value={intg.endpoint} />
                </Stack>
              )}
            </Box>

            {/* State + details */}
            <Stack direction="row" alignItems="center" spacing={1.5} flexShrink={0}>
              <Typography variant="caption" color={intg.enabled ? 'text.secondary' : 'error.main'} fontWeight={600}>
                {intg.source === 'driver' ? (intg.enabled ? 'Ready' : 'Holding back') : 'Declared'}
              </Typography>
              <Button size="small" variant="outlined" startIcon={<InfoOutlinedIcon sx={{ fontSize: 12 }} />}
                onClick={() => setDetailId(intg.id)}
                aria-label={`Details of ${intg.name}`}
                sx={{ borderRadius: 1, fontSize: '0.7rem', fontWeight: 700, borderColor: alpha(intg.logoColor, 0.3), color: intg.logoColor }}>
                Details
              </Button>
            </Stack>
          </Box>
        ))}
      </Paper>

      {/* Endpoints */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
        {/* API Endpoints */}
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }} data-testid="api-endpoints">
          <Stack direction="row" alignItems="center" spacing={1} mb={0.75}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha('#4F46E5', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LinkIcon sx={{ fontSize: 14, color: '#4F46E5' }} />
            </Box>
            <Typography variant="subtitle2" fontWeight={800}>API Endpoints</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            The surface the live deployment publishes. Every call carries an access key from Keys & Access.
          </Typography>
          {!surface ? (
            <Typography variant="caption" color="text.disabled">No deployed projects found.</Typography>
          ) : (
            <Stack spacing={1.25}>
              <EndpointRow label="Host" value={surface.host ? `https://${surface.host}` : 'No host recorded'} />
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" label={`Deployment ${surface.deploymentId}`} sx={{ height: 18, fontSize: '0.6rem' }} />
                {surface.certificateNotAfter && (
                  <Chip size="small" label={`Certificate until ${new Date(surface.certificateNotAfter).toLocaleDateString()}`} sx={{ height: 18, fontSize: '0.6rem', bgcolor: alpha('#10b981', 0.1), color: '#10b981' }} />
                )}
                {surface.descriptionVersion !== null && (
                  <Chip size="small" label={surface.descriptionMatchesDeployment ? `Blueprint version ${surface.descriptionVersion}` : `Described at version ${surface.descriptionVersion}, newer than the deployment`} sx={{ height: 18, fontSize: '0.6rem' }} />
                )}
              </Stack>
              <Box sx={{ maxHeight: 420, overflowY: 'auto', pr: 0.5 }}>
                <Stack spacing={1.25}>
                  {grouped.map(({ kind, entries }) => (
                    <Box key={kind}>
                      <Stack direction="row" alignItems="center" spacing={1} mb={0.4}>
                        <Box sx={{ px: 0.75, py: 0.2, borderRadius: 0.75, bgcolor: alpha('#4F46E5', 0.1), color: '#4F46E5', fontSize: '0.58rem', fontWeight: 800 }}>{KIND_META[kind].label}</Box>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.62rem' }}>{KIND_META[kind].desc}, {entries.length}</Typography>
                      </Stack>
                      <Stack spacing={0.75}>
                        {entries.map((ep) => (
                          <Box key={`${ep.method} ${ep.path}`}>
                            <Stack direction="row" alignItems="center" spacing={0.5}
                              sx={{ px: 1.5, py: 0.75, borderRadius: 1.5, bgcolor: alpha('#4F46E5', 0.03), border: `1px solid ${alpha('#4F46E5', 0.12)}` }}>
                              <Box sx={{ px: 0.6, borderRadius: 0.5, bgcolor: alpha('#4F46E5', 0.1), color: '#4F46E5', fontSize: '0.55rem', fontWeight: 800, flexShrink: 0 }}>{ep.method}</Box>
                              <Tooltip title={ep.purpose} arrow>
                                <Typography variant="caption" sx={{ fontFamily: 'monospace', flex: 1, color: 'text.secondary', fontSize: '0.68rem' }} noWrap>{ep.address}</Typography>
                              </Tooltip>
                              {ep.threshold !== null && (
                                <Chip size="small" label={`${ep.transactionClass} ${ep.threshold}%`} sx={{ height: 16, fontSize: '0.55rem' }} />
                              )}
                              <CopyButton value={ep.address} />
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Stack>
          )}
        </Paper>

        {/* Webhook card */}
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }} data-testid="webhooks">
          <Stack direction="row" alignItems="center" spacing={1} mb={0.75}>
            <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha('#8b5cf6', 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WebhookIcon sx={{ fontSize: 14, color: '#8b5cf6' }} />
            </Box>
            <Typography variant="subtitle2" fontWeight={800}>Webhooks</Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            The events the live deployment delivers outward. Every delivery carries a signature over the instant and the body.
          </Typography>
          {!surface ? (
            <Typography variant="caption" color="text.disabled">No deployed projects found.</Typography>
          ) : surface.webhooks.length === 0 ? (
            <Typography variant="caption" color="text.disabled">The Blueprint of this deployment declares no event for delivery.</Typography>
          ) : (
            <Stack spacing={1.25}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 800, letterSpacing: 0.8, fontSize: '0.6rem' }}>DELIVERED EVENTS</Typography>
                <Stack spacing={0.5} mt={0.5} sx={{ maxHeight: 300, overflowY: 'auto', pr: 0.5 }}>
                  {surface.webhooks.map((hook) => (
                    <Box key={hook.event} data-testid={`webhook-${hook.event}`} sx={{ px: 1.25, py: 0.75, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'text.primary', fontSize: '0.68rem' }} noWrap>{hook.event}</Typography>
                        <Chip size="small" label={hook.signing === 'None' ? 'Unsigned' : `Signed, ${hook.retries} retries`} sx={{ height: 16, fontSize: '0.55rem', ml: 'auto', flexShrink: 0 }} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.66rem' }}>{hook.purpose}</Typography>
                      {hook.endpoint && (
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.disabled', fontSize: '0.62rem' }} noWrap>to {hook.endpoint}</Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Box>
              <Typography variant="caption" color="text.disabled">
                A delivery address is registered through the generated surface with a key holding the events.manage scope. Cerulea shows the signing secret once at that moment.
              </Typography>
            </Stack>
          )}
        </Paper>
      </Box>

      {/* Details Dialog */}
      <Dialog open={!!detailId} onClose={() => setDetailId(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>{current?.name}</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
            {current?.source === 'driver'
              ? `${current.category}. ${DRIVER_PURPOSE[current.name.toLowerCase()] ?? 'A platform driver Cerulea APIs runs.'}`
              : 'A connection the Blueprint of this project declares. It is edited in the Integrations step of Studio.'}
          </Alert>
          <Typography variant="body2" color="text.secondary">{current?.description}</Typography>
          {current?.source === 'driver' && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              A platform driver serves every deployment. The feeds, bridges and outbound triggers of a project are declared in the Integrations step of Studio.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDetailId(null)} sx={{ borderRadius: 1 }}>Close</Button>
          <Button variant="contained" endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />} onClick={goToStudio} sx={{ borderRadius: 1, fontWeight: 700 }}>
            Open the Integrations step
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
