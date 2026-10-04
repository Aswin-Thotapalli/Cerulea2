'use client';

// apps/frontend/src/components/studio/steps/step4.tsx
// Step 5 of 6, Integrations.
// Production's catalogue of 45 providers, its category sidebar, its
// credential forms and its test button stay. Each provider maps to a Cerulea
// integration kind served by Cerulea APIs through a live driver and a local
// driver, or by the chain oracle module, or by Cerulea APIs key custody. A
// secret goes to key custody and never into the browser state after the
// call returns. The test button asks Cerulea APIs for the real state of the
// driver serving the kind. The step writes the Blueprint Integrations section:
// an oracle feed, a bridge endpoint or an external trigger per provider.
// Every change autosaves after 1.2 seconds to the drafts area of the build
// state and to the Blueprint through Cerulea APIs.
// Without this step a deployment reaches no outside service.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import StepGuidance from '@/components/studio/StepGuidance';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Fade,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme, styled, alpha } from '@mui/material/styles';
import { useRouter, useSearchParams } from 'next/navigation';

import ArrowBackIcon from '@mui/icons-material/KeyboardArrowLeft';
import ArrowForwardIcon from '@mui/icons-material/KeyboardArrowRight';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PaymentsIcon from '@mui/icons-material/Payments';
import EmailIcon from '@mui/icons-material/Email';
import StorageIcon from '@mui/icons-material/Storage';
import WebhookIcon from '@mui/icons-material/Webhook';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SecurityIcon from '@mui/icons-material/Security';
import HubIcon from '@mui/icons-material/Hub';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import CloseIcon from '@mui/icons-material/Close';

import { StudioRouteError, api } from '@/lib/apiClient';
import { useProjectState } from '@/lib/studio/project-state';
import {
  BRIDGE_TARGETS,
  CATALOGUE,
  CATEGORIES,
  type CredentialField,
  type CustodyAnswer,
  type IntegrationCategory,
  type IntegrationConfig,
  type IntegrationEnvironment,
  type IntegrationsDocument,
  KINDS,
  type ProviderDef,
  type TestOutcome,
  applyIntegrationsToBlueprint,
  emptyConfig,
  providerById,
  providersIn,
  readIntegrationsDocument,
  settingFaults,
} from './step4-catalogue';

/* ------------------ Brand marks ------------------ */
// Studio ships the mark of each provider as its initials in the brand colour.
// Nothing is fetched from an outside host.
const BRAND_META: Record<string, { color: string; initials: string }> = {
  stripe: { color: '#635BFF', initials: 'ST' },
  paypal: { color: '#00457C', initials: 'PP' },
  coinbase: { color: '#1652F0', initials: 'CB' },
  lemonsqueezy: { color: '#FFC233', initials: 'LS' },
  razorpay: { color: '#3395FF', initials: 'RZ' },
  clerk: { color: '#6C47FF', initials: 'CL' },
  privy: { color: '#6B5CE7', initials: 'PR' },
  dynamic: { color: '#4F46E5', initials: 'DY' },
  auth0: { color: '#EB5424', initials: 'A0' },
  firebase: { color: '#FFA000', initials: 'FB' },
  sumsub: { color: '#00B77A', initials: 'SS' },
  chainalysis: { color: '#0B8EE5', initials: 'CA' },
  docusign: { color: '#E04646', initials: 'DS' },
  sendgrid: { color: '#1A82E2', initials: 'SG' },
  resend: { color: '#6366F1', initials: 'RS' },
  twilio: { color: '#F22F46', initials: 'TW' },
  xmtp: { color: '#FC4F37', initials: 'XM' },
  push: { color: '#DD44B9', initials: 'PU' },
  s3: { color: '#569A31', initials: 'S3' },
  pinata: { color: '#E5A732', initials: 'PI' },
  arweave: { color: '#4B5563', initials: 'AR' },
  filecoin: { color: '#0090FF', initials: 'FC' },
  supabase_storage: { color: '#3ECF8E', initials: 'SB' },
  chainlink: { color: '#375BD2', initials: 'CL' },
  graph: { color: '#6747ED', initials: 'GR' },
  alchemy: { color: '#363FF9', initials: 'AL' },
  moralis: { color: '#2D3748', initials: 'MR' },
  pyth: { color: '#E6007A', initials: 'PY' },
  apeda_agriexchange: { color: '#2E7D32', initials: 'AP' },
  icegate_api: { color: '#1565C0', initials: 'IC' },
  nppo_dppq: { color: '#558B2F', initials: 'NP' },
  posthog: { color: '#F54E00', initials: 'PH' },
  segment: { color: '#52BD94', initials: 'SG' },
  dune: { color: '#E84142', initials: 'DN' },
  ga4: { color: '#E37400', initials: 'GA' },
  mixpanel: { color: '#7856FF', initials: 'MX' },
  cloudwatch_elk: { color: '#FF9900', initials: 'CW' },
  prometheus_grafana: { color: '#F46800', initials: 'GF' },
  slack_webhook: { color: '#4A154B', initials: 'SL' },
  discord_webhook: { color: '#5865F2', initials: 'DC' },
  telegram_bot: { color: '#26A5E4', initials: 'TG' },
  zapier: { color: '#FF4A00', initials: 'ZP' },
  custom_webhook: { color: '#6B7280', initials: 'CW' },
  pagerduty: { color: '#06AC38', initials: 'PD' },
  aws_kms: { color: '#FF9900', initials: 'KM' },
};

function BrandMark({ id, size = 42 }: { id: string; size?: number }) {
  const meta = BRAND_META[id];
  return (
    <Typography
      sx={{
        fontSize: Math.round(size * 0.36),
        fontWeight: 900,
        color: meta?.color || '#4F46E5',
        lineHeight: 1,
        letterSpacing: -0.5,
        userSelect: 'none',
      }}
    >
      {meta?.initials || id.slice(0, 2).toUpperCase()}
    </Typography>
  );
}

/* ------------------ Styled Components ------------------ */

const FloatingIsland = styled(Paper)(({ theme }) => ({
  background: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.95)' : 'rgba(13,21,53,0.97)',
  backdropFilter: 'blur(16px)',
  border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
  boxShadow: '0 20px 40px -8px rgba(0,0,0,0.4)',
  borderRadius: 100,
  padding: '8px 24px',
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  zIndex: 1000,
  pointerEvents: 'auto',
}));

const CAT_COLOR: Record<IntegrationCategory, string> = {
  Payments: '#10b981',
  Auth: '#ef4444',
  Communication: '#3b82f6',
  Storage: '#f97316',
  Data: '#8b5cf6',
  Analytics: '#06b6d4',
  Webhooks: '#f59e0b',
};

function getIcon(cat: IntegrationCategory) {
  switch (cat) {
    case 'Payments':
      return <PaymentsIcon fontSize="small" />;
    case 'Auth':
      return <SecurityIcon fontSize="small" />;
    case 'Communication':
      return <EmailIcon fontSize="small" />;
    case 'Storage':
      return <StorageIcon fontSize="small" />;
    case 'Data':
      return <HubIcon fontSize="small" />;
    case 'Analytics':
      return <AnalyticsIcon fontSize="small" />;
    case 'Webhooks':
      return <WebhookIcon fontSize="small" />;
    default:
      return <HubIcon fontSize="small" />;
  }
}

/** The autosave debounce, as production set it. */
export const AUTOSAVE_DELAY_MS = 1200;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

/* ------------------ Field rows ------------------ */

function PlainFieldRow({
  field,
  value,
  onChange,
  fault,
}: {
  field: CredentialField;
  value: string;
  onChange: (value: string) => void;
  fault: string | null;
}) {
  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
        {field.label}
      </Typography>
      <TextField
        fullWidth
        size="small"
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={Boolean(fault)}
        helperText={fault || field.hint || 'A plain value. It stays in the project.'}
        inputProps={{ 'aria-label': field.label }}
        sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
      />
    </Box>
  );
}

function SecretFieldRow({
  field,
  value,
  held,
  onChange,
}: {
  field: CredentialField;
  value: string;
  held: boolean;
  onChange: (value: string) => void;
}) {
  const [show, setShow] = useState(false);
  const fault = value.length > 0 && field.validate ? field.validate(value) : null;
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
        <Typography variant="subtitle2" fontWeight={700}>
          {field.label}
        </Typography>
        {held && (
          <Chip
            size="small"
            icon={<LockIcon sx={{ fontSize: 12 }} />}
            label="Held by Cerulea APIs key custody"
            sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700 }}
          />
        )}
      </Stack>
      <TextField
        fullWidth
        size="small"
        placeholder={held ? 'Stored. Type a new value to replace it.' : field.placeholder}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={Boolean(fault)}
        helperText={fault || field.hint || 'A secret. Cerulea APIs seals it in key custody and the browser keeps nothing.'}
        inputProps={{ 'aria-label': field.label }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton size="small" onClick={() => setShow(!show)} aria-label={show ? 'Hide the value' : 'Show the value'}>
                {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton>
            </InputAdornment>
          ),
          sx: { fontFamily: 'monospace' },
        }}
        sx={{ '& .MuiInputBase-root': { borderRadius: 2 } }}
      />
    </Box>
  );
}

/* ====================================================================== */
export default function Step4({
  goPrev,
  goNext,
  projectId,
}: {
  goPrev?: () => void;
  goNext?: () => void;
  projectId: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedId = projectId || searchParams?.get('projectId') || null;

  if (!resolvedId) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="info">
          <AlertTitle>Open a project first</AlertTitle>
          The Integrations step reads the project from Cerulea APIs. Open a project from the
          project list, then return to this step.
        </Alert>
      </Box>
    );
  }
  return <IntegrationsStep projectId={resolvedId} goPrev={goPrev} goNext={goNext} router={router} />;
}

function IntegrationsStep({
  projectId,
  goPrev,
  goNext,
  router,
}: {
  projectId: string;
  goPrev?: () => void;
  goNext?: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const theme = useTheme();
  const handle = useProjectState(projectId);

  const [activeCat, setActiveCat] = useState<IntegrationCategory>('Payments');
  const [selectedId, setSelectedId] = useState<string>('stripe');
  const [document, setDocument] = useState<IntegrationsDocument | null>(null);
  const [readFailure, setReadFailure] = useState<{ message: string; fix: string } | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [saveFailure, setSaveFailure] = useState<{ message: string; fix: string } | null>(null);
  /** The secret values typed and not yet stored, per provider and field. */
  const [secretDraft, setSecretDraft] = useState<Record<string, Record<string, string>>>({});
  const [storing, setStoring] = useState(false);
  const [storeNote, setStoreNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let open = true;
    void api<{ document: unknown }>(`/api/projects/${encodeURIComponent(projectId)}/integrations`)
      .then((reply) => {
        if (open) setDocument(readIntegrationsDocument(reply.document));
      })
      .catch((cause: unknown) => {
        if (!open) return;
        setReadFailure({
          message: cause instanceof Error ? cause.message : String(cause),
          fix: cause instanceof StudioRouteError ? cause.fix : 'Open the step again in a moment.',
        });
      });
    return () => {
      open = false;
    };
  }, [projectId]);

  const providers = useMemo(() => providersIn(activeCat), [activeCat]);
  const activeDef = useMemo(() => providerById(selectedId), [selectedId]);
  const activeConfig: IntegrationConfig | null = useMemo(() => {
    if (!activeDef || !document) return null;
    return document.configs[activeDef.id] ?? emptyConfig(activeDef);
  }, [document, activeDef]);

  const blueprint = handle.state?.blueprint ?? null;
  const recordTypes = useMemo(
    () => (blueprint?.types ?? []).filter((entry) => entry.kind === 'Record').map((entry) => entry.id),
    [blueprint],
  );
  const collections = useMemo(() => (blueprint?.collections ?? []).map((entry) => entry.id), [blueprint]);
  const events = useMemo(() => blueprint?.events ?? [], [blueprint]);

  const gaps = useMemo(() => {
    if (!blueprint || !document) return [];
    return applyIntegrationsToBlueprint(blueprint, document).gaps;
  }, [blueprint, document]);

  /* ---------- change one provider ---------- */
  const updateConfig = useCallback(
    (providerId: string, change: (previous: IntegrationConfig) => IntegrationConfig) => {
      const provider = providerById(providerId);
      if (!provider) return;
      setDocument((previous) => {
        if (!previous) return previous;
        const current = previous.configs[providerId] ?? emptyConfig(provider);
        return { ...previous, configs: { ...previous.configs, [providerId]: change(current) } };
      });
    },
    [],
  );

  /* ---------- autosave: the draft, then the Blueprint ---------- */
  const latest = useRef<IntegrationsDocument | null>(null);
  latest.current = document;
  const savedKey = useRef<string>('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef<Promise<void> | null>(null);
  const handleRef = useRef(handle);
  handleRef.current = handle;

  const persist = useCallback(async () => {
    const current = latest.current;
    const state = handleRef.current.state;
    if (!current || !state) return;
    const key = JSON.stringify(current);
    if (key === savedKey.current) return;
    setStatus('saving');
    setSaveFailure(null);
    try {
      await api(`/api/projects/${encodeURIComponent(projectId)}/integrations`, {
        method: 'PATCH',
        body: JSON.stringify({ document: current }),
      });
      const next = applyIntegrationsToBlueprint(state.blueprint, current).blueprint;
      if (JSON.stringify(next.integrations) !== JSON.stringify(state.blueprint.integrations)) {
        const wrote = await handleRef.current.saveBlueprint(
          next,
          'Integrations step: feeds, bridges and triggers',
        );
        if (!wrote) {
          setStatus('failed');
          return;
        }
      }
      savedKey.current = key;
      setStatus('saved');
    } catch (cause) {
      setStatus('failed');
      setSaveFailure({
        message: cause instanceof Error ? cause.message : String(cause),
        fix:
          cause instanceof StudioRouteError
            ? cause.fix
            : 'Change a value to save again. Report the problem to the Cerulea operator when it repeats.',
      });
    }
  }, [projectId]);

  const hydrated = useRef(false);
  useEffect(() => {
    if (!document) return;
    // The document read from Cerulea APIs is already held. A change after
    // that starts the timer.
    if (!hydrated.current) {
      hydrated.current = true;
      savedKey.current = JSON.stringify(document);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saving.current = persist();
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [document, persist]);

  const flushAndContinue = async () => {
    if (timer.current) clearTimeout(timer.current);
    await saving.current;
    await persist();
    if (goNext) goNext();
  };

  /* ---------- key custody ---------- */
  const storeSecrets = async () => {
    if (!activeDef || !activeConfig) return;
    const values = secretDraft[activeDef.id] ?? {};
    const filled = Object.fromEntries(Object.entries(values).filter(([, value]) => value.length > 0));
    if (Object.keys(filled).length === 0) {
      setStoreNote({ ok: false, text: 'Type at least one secret value first.' });
      return;
    }
    setStoring(true);
    setStoreNote(null);
    try {
      const answer = await api<CustodyAnswer>(
        `/api/projects/${encodeURIComponent(projectId)}/integrations/${encodeURIComponent(activeDef.id)}/credentials`,
        {
          method: 'PUT',
          body: JSON.stringify({ environment: activeConfig.environment, values: filled }),
        },
      );
      updateConfig(activeDef.id, (previous) => ({
        ...previous,
        held: { ...previous.held, [answer.environment]: answer.held },
      }));
      setSecretDraft((previous) => ({ ...previous, [activeDef.id]: {} }));
      setStoreNote({
        ok: true,
        text: `Cerulea APIs key custody holds ${answer.held.join(', ')} for the ${answer.environment} environment. The browser keeps nothing.`,
      });
    } catch (cause) {
      setStoreNote({
        ok: false,
        text:
          cause instanceof StudioRouteError
            ? `${cause.message}`
            : cause instanceof Error
              ? cause.message
              : String(cause),
      });
    } finally {
      setStoring(false);
    }
  };

  /* ---------- the test ---------- */
  const runTest = async () => {
    if (!activeDef || !activeConfig) return;
    setTesting(true);
    try {
      const result = await api<TestOutcome>('/api/integrations/test', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          integrationId: activeDef.id,
          environment: activeConfig.environment,
        }),
      });
      updateConfig(activeDef.id, (previous) => ({ ...previous, lastTest: result }));
    } catch (cause) {
      updateConfig(activeDef.id, (previous) => ({
        ...previous,
        lastTest: {
          ok: false,
          driver: 'none',
          message: cause instanceof Error ? cause.message : String(cause),
          checkedAt: new Date().toISOString(),
        },
      }));
    } finally {
      setTesting(false);
    }
  };

  const statusText =
    status === 'saving'
      ? 'Saving'
      : status === 'saved'
        ? 'Saved to Cerulea APIs'
        : status === 'failed'
          ? 'Save failed'
          : '';

  const faults = activeDef && activeConfig ? settingFaults(activeDef, activeConfig.settings) : {};
  const activeGap = activeDef ? gaps.find((gap) => gap.providerId === activeDef.id) : undefined;

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        position: 'relative',
      }}
    >
      <StepGuidance
        stepKey="step4"
        title="Integrations"
        subtitle="Step 5 of 6"
        description="Connect the system to outside services. Each provider maps to a Cerulea kind that Cerulea APIs serves through a live driver and a local driver. A secret goes to Cerulea APIs key custody. The Blueprint records every feed, bridge and trigger."
        steps={[
          { first: 'Pick a category on the left', next: 'Payments, Auth, Communication, Storage, Data, Analytics or Webhooks.' },
          { first: 'Choose a provider', next: 'The panel on the right names its Cerulea kind and what that kind serves.' },
          { first: 'Enable it and store its keys', next: 'Pick the test or the live environment, store the secrets in key custody, then press Test to read the real state of the driver.' },
        ]}
        tip="Enable only the providers the system uses. Each one appears in the Deployment Manifest."
      />

      {/* 3-pane layout */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* ── LEFT: Category sidebar ── */}
        <Box
          sx={{
            width: 200,
            flexShrink: 0,
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ px: 2.5, py: 1.75, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="overline" sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: 1, color: 'primary.main' }}>
              CATEGORIES
            </Typography>
          </Box>
          <Box sx={{ flex: 1, overflowY: 'auto', py: 0.5 }} data-testid="category-sidebar">
            {CATEGORIES.map((cat) => {
              const isActive = activeCat === cat;
              const catColor = CAT_COLOR[cat];
              const inCategory = providersIn(cat);
              const enabledCount = inCategory.filter((c) => document?.configs[c.id]?.enabled).length;
              return (
                <Box
                  key={cat}
                  onClick={() => setActiveCat(cat)}
                  role="button"
                  aria-label={`${cat} category`}
                  sx={{
                    px: 2,
                    py: 1.25,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    borderLeft: `3px solid ${isActive ? catColor : 'transparent'}`,
                    bgcolor: isActive ? alpha(catColor, 0.08) : 'transparent',
                    color: isActive ? catColor : 'text.secondary',
                    transition: 'all 0.12s',
                    '&:hover': { bgcolor: alpha(catColor, 0.06), color: catColor },
                  }}
                >
                  <Box sx={{ color: 'inherit', display: 'flex', '& .MuiSvgIcon-root': { fontSize: 17 } }}>
                    {getIcon(cat)}
                  </Box>
                  <Typography variant="body2" fontWeight={isActive ? 700 : 500} color="inherit" sx={{ flex: 1, fontSize: '0.82rem' }}>
                    {cat}
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={0.4}>
                    {enabledCount > 0 && (
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          borderRadius: '50%',
                          bgcolor: '#10b981',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.55rem',
                          fontWeight: 800,
                        }}
                        data-testid={`enabled-count-${cat}`}
                      >
                        {enabledCount}
                      </Box>
                    )}
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.62rem' }}>
                      {inCategory.length}
                    </Typography>
                  </Stack>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* ── CENTER: Provider list ── */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ px: 3, py: 1.75, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 1.5,
                  bgcolor: alpha(CAT_COLOR[activeCat], 0.12),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: CAT_COLOR[activeCat],
                  '& .MuiSvgIcon-root': { fontSize: 16 },
                }}
              >
                {getIcon(activeCat)}
              </Box>
              <Typography variant="subtitle1" fontWeight={800}>
                {activeCat}
              </Typography>
              <Chip
                label={providers.length}
                size="small"
                sx={{ height: 18, fontSize: '0.62rem', bgcolor: alpha(CAT_COLOR[activeCat], 0.1), color: CAT_COLOR[activeCat], border: 'none', fontWeight: 700 }}
              />
              <Box sx={{ flex: 1 }} />
              {statusText && (
                <Typography
                  variant="caption"
                  data-testid="integrations-save-status"
                  sx={{ color: status === 'failed' ? 'error.main' : 'text.secondary' }}
                >
                  {statusText}
                </Typography>
              )}
            </Stack>
          </Box>

          {(readFailure || handle.failure) && (
            <Alert severity="error" sx={{ m: 2 }}>
              <AlertTitle>{(readFailure ?? handle.failure)?.message}</AlertTitle>
              {(readFailure ?? handle.failure)?.fix}
            </Alert>
          )}
          {saveFailure && (
            <Alert severity="error" sx={{ m: 2 }} data-testid="integrations-save-failure">
              <AlertTitle>{saveFailure.message}</AlertTitle>
              {saveFailure.fix}
            </Alert>
          )}

          <Box sx={{ flex: 1, overflowY: 'auto', pb: 14 }} data-testid="provider-list">
            {providers.map((def, idx) => {
              const cfg = document?.configs[def.id];
              const isEnabled = cfg?.enabled || false;
              const isSelected = selectedId === def.id;
              const catColor = CAT_COLOR[def.category];
              return (
                <Box
                  key={def.id}
                  onClick={() => setSelectedId(def.id)}
                  role="button"
                  aria-label={`${def.name} provider`}
                  data-provider={def.id}
                  sx={{
                    px: 3,
                    py: 2,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    borderBottom: idx < providers.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    borderLeft: `3px solid ${isSelected ? catColor : 'transparent'}`,
                    bgcolor: isSelected ? alpha(catColor, 0.05) : 'transparent',
                    opacity: def.kind === null ? 0.7 : 1,
                    transition: 'all 0.12s',
                    '&:hover': { bgcolor: isSelected ? alpha(catColor, 0.06) : alpha(theme.palette.action.hover, 0.4) },
                  }}
                >
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: 2,
                      flexShrink: 0,
                      bgcolor: alpha(catColor, 0.08),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: isSelected ? `1px solid ${alpha(catColor, 0.3)}` : `1px solid ${alpha(catColor, 0.12)}`,
                      overflow: 'hidden',
                    }}
                  >
                    <BrandMark id={def.id} size={42} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ color: isSelected ? catColor : 'text.primary' }}>
                        {def.name}
                      </Typography>
                      {isEnabled && <CheckCircleIcon sx={{ fontSize: 13, color: '#10b981' }} />}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.73rem' }}>
                      {def.description}
                    </Typography>
                  </Box>
                  <Box sx={{ flexShrink: 0 }}>
                    {def.kind === null ? (
                      <Chip
                        label="Not available in this release"
                        size="small"
                        sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700 }}
                      />
                    ) : isEnabled ? (
                      <Chip
                        label="Enabled"
                        size="small"
                        sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700, bgcolor: alpha('#10b981', 0.1), color: '#10b981', border: `1px solid ${alpha('#10b981', 0.2)}` }}
                      />
                    ) : (
                      <Chip
                        label={`${KINDS[def.kind].title} kind`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.62rem' }}
                      />
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* ── RIGHT: Provider panel ── */}
        <Box
          sx={{
            width: 460,
            flexShrink: 0,
            borderLeft: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            pb: 14,
          }}
          data-testid="provider-panel"
        >
          {!activeDef || !activeConfig ? (
            <Box sx={{ p: 5, textAlign: 'center', mt: 6, color: 'text.secondary' }}>
              {document ? (
                <>
                  <Box sx={{ width: 64, height: 64, borderRadius: 3, bgcolor: alpha(theme.palette.primary.main, 0.07), display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
                    <HubIcon sx={{ fontSize: 34, color: 'primary.main', opacity: 0.4 }} />
                  </Box>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    No provider chosen
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Pick a provider from the list to set it up here.
                  </Typography>
                </>
              ) : (
                <Stack alignItems="center" spacing={2}>
                  <CircularProgress size={24} />
                  <Typography variant="body2">Cerulea is opening the project.</Typography>
                </Stack>
              )}
            </Box>
          ) : (
            <Fade in key={activeDef.id}>
              <Box>
                {/* Header */}
                <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid', borderColor: 'divider', bgcolor: alpha(CAT_COLOR[activeDef.category], 0.04) }}>
                  <Stack direction="row" alignItems="center" spacing={2} mb={1.5}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2.5,
                        bgcolor: alpha(CAT_COLOR[activeDef.category], 0.08),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `1px solid ${alpha(CAT_COLOR[activeDef.category], 0.18)}`,
                        overflow: 'hidden',
                      }}
                    >
                      <BrandMark id={activeDef.id} size={48} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={800}>
                        {activeDef.name}
                      </Typography>
                      <Chip
                        label={activeDef.category}
                        size="small"
                        sx={{ height: 18, mt: 0.25, fontSize: '0.6rem', fontWeight: 700, bgcolor: alpha(CAT_COLOR[activeDef.category], 0.1), color: CAT_COLOR[activeDef.category], border: 'none' }}
                      />
                    </Box>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6, display: 'block' }}>
                    {activeDef.description}
                  </Typography>
                  {activeDef.docsUrl && (
                    <Link
                      href={activeDef.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      underline="hover"
                      color="primary"
                      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.78rem', fontWeight: 600, mt: 1 }}
                    >
                      Provider documentation <OpenInNewIcon sx={{ fontSize: 13 }} />
                    </Link>
                  )}
                </Box>

                {/* The Cerulea kind */}
                <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }} data-testid="kind-line">
                  {activeDef.kind === null ? (
                    <Alert severity="info">
                      <AlertTitle>Not available in this release</AlertTitle>
                      {activeDef.unavailable}
                    </Alert>
                  ) : (
                    <>
                      <Typography variant="body2" fontWeight={700}>
                        Cerulea kind: {KINDS[activeDef.kind].title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" data-mirror={`integration.${activeDef.kind}`}>
                        {KINDS[activeDef.kind].serves}{' '}
                        {KINDS[activeDef.kind].service === 'apis_driver'
                          ? 'Cerulea APIs serves this kind through a live driver and a local driver behind one interface. Press Test to read which one runs.'
                          : KINDS[activeDef.kind].service === 'key_custody'
                            ? 'Cerulea APIs key custody serves this kind. A signing key never leaves it in the clear.'
                            : 'The chain oracle module serves this kind from the feed the Blueprint records.'}
                      </Typography>
                    </>
                  )}
                </Box>

                {activeDef.kind !== null && (
                  <>
                    {/* Enable toggle */}
                    <Box sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        p={1.75}
                        sx={{
                          bgcolor: activeConfig.enabled ? alpha('#10b981', 0.06) : alpha(theme.palette.action.hover, 0.3),
                          borderRadius: 2,
                          border: `1px solid ${activeConfig.enabled ? alpha('#10b981', 0.2) : 'transparent'}`,
                        }}
                      >
                        <Stack>
                          <Typography variant="body2" fontWeight={700}>
                            Enable {activeDef.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {activeConfig.enabled ? 'Part of the deployment and listed in the Deployment Manifest' : 'Left out of the deployment'}
                          </Typography>
                        </Stack>
                        <Switch
                          checked={activeConfig.enabled}
                          onChange={(e) => updateConfig(activeDef.id, (p) => ({ ...p, enabled: e.target.checked }))}
                          size="small"
                          slotProps={{ input: { 'aria-label': `Enable ${activeDef.name}` } }}
                        />
                      </Stack>
                    </Box>

                    {activeConfig.enabled && (
                      <Box sx={{ px: 3, py: 2.5 }}>
                        {/* Environment toggle */}
                        <Stack
                          direction="row"
                          spacing={0.5}
                          bgcolor={alpha(theme.palette.primary.main, 0.06)}
                          p={0.5}
                          borderRadius={2}
                          mb={1}
                          border={`1px solid ${alpha(theme.palette.primary.main, 0.1)}`}
                        >
                          {(['test', 'live'] as IntegrationEnvironment[]).map((environment) => (
                            <Button
                              key={environment}
                              size="small"
                              fullWidth
                              variant={activeConfig.environment === environment ? 'contained' : 'text'}
                              color={environment === 'live' ? 'secondary' : 'primary'}
                              onClick={() => updateConfig(activeDef.id, (p) => ({ ...p, environment }))}
                              sx={{ borderRadius: 1.5, fontWeight: 700, fontSize: '0.72rem' }}
                            >
                              {environment === 'test' ? 'Test environment' : 'Live environment'}
                            </Button>
                          ))}
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2.5 }}>
                          The test environment holds the provider&apos;s test keys. The live environment holds the keys a
                          live deployment uses. Each environment keeps its own secrets in key custody.
                        </Typography>

                        <Typography variant="overline" sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: 1, color: 'text.disabled', display: 'block', mb: 1.5 }}>
                          CREDENTIALS, {activeConfig.environment.toUpperCase()} ENVIRONMENT
                        </Typography>

                        <Stack spacing={2}>
                          {activeDef.fields.map((field) =>
                            field.secret ? (
                              <SecretFieldRow
                                key={field.key}
                                field={field}
                                value={secretDraft[activeDef.id]?.[field.key] ?? ''}
                                held={activeConfig.held[activeConfig.environment].includes(field.key)}
                                onChange={(value) =>
                                  setSecretDraft((previous) => ({
                                    ...previous,
                                    [activeDef.id]: { ...(previous[activeDef.id] ?? {}), [field.key]: value },
                                  }))
                                }
                              />
                            ) : (
                              <PlainFieldRow
                                key={field.key}
                                field={field}
                                value={activeConfig.settings[field.key] ?? ''}
                                fault={faults[field.key] ?? null}
                                onChange={(value) =>
                                  updateConfig(activeDef.id, (p) => ({
                                    ...p,
                                    settings: { ...p.settings, [field.key]: value },
                                  }))
                                }
                              />
                            ),
                          )}
                        </Stack>

                        {activeDef.fields.some((field) => field.secret) && (
                          <Stack spacing={1} mt={2}>
                            <Button
                              fullWidth
                              variant="outlined"
                              size="small"
                              onClick={() => void storeSecrets()}
                              disabled={storing}
                              startIcon={storing ? <CircularProgress size={14} /> : <LockIcon />}
                              sx={{ borderRadius: 2, fontWeight: 700 }}
                            >
                              {storing ? 'Storing in key custody' : 'Store the secrets in Cerulea APIs key custody'}
                            </Button>
                            {storeNote && (
                              <Typography
                                variant="caption"
                                data-testid="custody-note"
                                sx={{ color: storeNote.ok ? 'success.main' : 'error.main', fontWeight: 600 }}
                              >
                                {storeNote.text}
                              </Typography>
                            )}
                          </Stack>
                        )}

                        {/* The Blueprint part */}
                        {activeDef.blueprint && (
                          <Box sx={{ mt: 3 }} data-testid="blueprint-part">
                            <Typography variant="overline" sx={{ fontSize: '0.6rem', fontWeight: 800, letterSpacing: 1, color: 'text.disabled', display: 'block', mb: 1.5 }}>
                              IN THE BLUEPRINT
                            </Typography>
                            {activeDef.blueprint.kind === 'feed' && (
                              <Stack spacing={2}>
                                <FormControl fullWidth size="small">
                                  <InputLabel id="feed-type">Record type the values arrive as</InputLabel>
                                  <Select
                                    labelId="feed-type"
                                    label="Record type the values arrive as"
                                    value={recordTypes.includes(activeConfig.blueprint.payloadType ?? '') ? activeConfig.blueprint.payloadType : ''}
                                    onChange={(e) =>
                                      updateConfig(activeDef.id, (p) => ({
                                        ...p,
                                        blueprint: { ...p.blueprint, payloadType: String(e.target.value) },
                                      }))
                                    }
                                    inputProps={{ 'data-testid': 'feed-type-select' }}
                                  >
                                    {recordTypes.map((id) => (
                                      <MenuItem key={id} value={id}>
                                        {id}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                                <TextField
                                  size="small"
                                  type="number"
                                  label="Cadence (seconds)"
                                  value={activeConfig.blueprint.cadenceSeconds ?? activeDef.blueprint.cadenceSeconds}
                                  onChange={(e) =>
                                    updateConfig(activeDef.id, (p) => ({
                                      ...p,
                                      blueprint: {
                                        ...p.blueprint,
                                        cadenceSeconds: Math.max(1, Math.min(86400, Math.round(Number(e.target.value) || 1))),
                                      },
                                    }))
                                  }
                                  helperText="How often a value is read. The chain oracle module records each value with a signature attestation and a dispute window."
                                />
                                {recordTypes.length === 0 && (
                                  <Alert severity="warning">
                                    The Blueprint holds no record type yet. Add a collection on the Data schema step, then choose its record type here.
                                  </Alert>
                                )}
                              </Stack>
                            )}
                            {activeDef.blueprint.kind === 'bridge' && (
                              <Stack spacing={2}>
                                <FormControl fullWidth size="small">
                                  <InputLabel id="bridge-target">Outside network</InputLabel>
                                  <Select
                                    labelId="bridge-target"
                                    label="Outside network"
                                    value={activeConfig.blueprint.targetNetwork ?? ''}
                                    onChange={(e) =>
                                      updateConfig(activeDef.id, (p) => ({
                                        ...p,
                                        blueprint: { ...p.blueprint, targetNetwork: String(e.target.value) },
                                      }))
                                    }
                                    inputProps={{ 'data-testid': 'bridge-target-select' }}
                                  >
                                    {BRIDGE_TARGETS.map((target) => (
                                      <MenuItem key={target} value={target}>
                                        {target}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                                <FormControl fullWidth size="small">
                                  <InputLabel id="bridge-collection">Collection that crosses</InputLabel>
                                  <Select
                                    labelId="bridge-collection"
                                    label="Collection that crosses"
                                    value={collections.includes(activeConfig.blueprint.collection ?? '') ? activeConfig.blueprint.collection : ''}
                                    onChange={(e) =>
                                      updateConfig(activeDef.id, (p) => ({
                                        ...p,
                                        blueprint: { ...p.blueprint, collection: String(e.target.value) },
                                      }))
                                    }
                                    inputProps={{ 'data-testid': 'bridge-collection-select' }}
                                  >
                                    {collections.map((id) => (
                                      <MenuItem key={id} value={id}>
                                        {id}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                                <FormControl fullWidth size="small">
                                  <InputLabel id="bridge-direction">Direction</InputLabel>
                                  <Select
                                    labelId="bridge-direction"
                                    label="Direction"
                                    value={activeConfig.blueprint.direction ?? 'Both'}
                                    onChange={(e) =>
                                      updateConfig(activeDef.id, (p) => ({
                                        ...p,
                                        blueprint: { ...p.blueprint, direction: e.target.value as 'Outbound' | 'Inbound' | 'Both' },
                                      }))
                                    }
                                  >
                                    <MenuItem value="Outbound">Outbound, records leave for the outside network</MenuItem>
                                    <MenuItem value="Inbound">Inbound, records arrive from the outside network</MenuItem>
                                    <MenuItem value="Both">Both ways</MenuItem>
                                  </Select>
                                </FormControl>
                                <Typography variant="caption" color="text.secondary">
                                  Each message carries a proof the bridge module verifies before it executes. Twelve confirmations are waited on the outside network.
                                </Typography>
                              </Stack>
                            )}
                            {activeDef.blueprint.kind === 'trigger' && (
                              <Stack spacing={2}>
                                <FormControl fullWidth size="small">
                                  <InputLabel id="trigger-event">Event that sends</InputLabel>
                                  <Select
                                    labelId="trigger-event"
                                    label="Event that sends"
                                    value={events.some((event) => event.id === activeConfig.blueprint.event) ? activeConfig.blueprint.event : ''}
                                    onChange={(e) =>
                                      updateConfig(activeDef.id, (p) => ({
                                        ...p,
                                        blueprint: { ...p.blueprint, event: String(e.target.value) },
                                      }))
                                    }
                                    inputProps={{ 'data-testid': 'trigger-event-select' }}
                                  >
                                    {events.map((event) => (
                                      <MenuItem key={event.id} value={event.id}>
                                        {event.name || event.id}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                                {events.length === 0 && (
                                  <Alert severity="warning">
                                    The Blueprint holds no event yet. Add one on the Data schema step, then choose it here.
                                  </Alert>
                                )}
                                <Typography variant="caption" color="text.secondary">
                                  Every time the event fires, the deployment sends a signed JSON delivery to the address above and retries five times.
                                </Typography>
                              </Stack>
                            )}
                            {activeGap && (
                              <Alert severity="info" sx={{ mt: 2 }} data-testid="blueprint-gap">
                                {activeGap.reason}
                              </Alert>
                            )}
                            {!activeGap && (
                              <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 2, fontWeight: 600 }} data-testid="blueprint-written">
                                The Blueprint Integrations section carries this {activeDef.blueprint.kind}.
                              </Typography>
                            )}
                          </Box>
                        )}

                        {/* The test */}
                        <Stack spacing={1} mt={3}>
                          <Button
                            fullWidth
                            variant="outlined"
                            size="small"
                            onClick={() => void runTest()}
                            disabled={testing}
                            startIcon={testing ? <CircularProgress size={14} /> : <PlayArrowIcon />}
                            sx={{ borderRadius: 2, borderColor: alpha(theme.palette.primary.main, 0.4), fontWeight: 700 }}
                          >
                            {testing ? 'Asking Cerulea APIs' : 'Test'}
                          </Button>
                          {activeConfig.lastTest && (
                            <Alert severity={activeConfig.lastTest.ok ? 'success' : 'warning'} data-testid="test-result">
                              <AlertTitle>
                                {activeConfig.lastTest.ok ? 'Ready' : 'Not ready'}
                                {activeConfig.lastTest.driver !== 'none' ? `, ${activeConfig.lastTest.driver} driver` : ''}
                              </AlertTitle>
                              {activeConfig.lastTest.message}
                              {activeConfig.lastTest.checkedAt && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                  Checked at {new Date(activeConfig.lastTest.checkedAt).toLocaleString()}.
                                </Typography>
                              )}
                            </Alert>
                          )}
                        </Stack>
                      </Box>
                    )}
                  </>
                )}
              </Box>
            </Fade>
          )}
        </Box>
      </Box>

      {/* Dock */}
      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'center',
          py: 2,
          borderTop: `1px solid ${alpha('#4F46E5', 0.12)}`,
          bgcolor: 'background.paper',
        }}
      >
        <FloatingIsland elevation={6}>
          <Tooltip title="Back">
            <IconButton onClick={goPrev ? goPrev : () => router.back()} size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />
          <Tooltip title="Help">
            <IconButton size="small" color="primary" onClick={() => setIsHelpOpen(true)}>
              <QuestionMarkIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />
          <Button
            variant="contained"
            onClick={() => void flushAndContinue()}
            endIcon={<ArrowForwardIcon />}
            disabled={!document}
            sx={{ borderRadius: 1, px: 3, fontWeight: 700 }}
          >
            Complete
          </Button>
        </FloatingIsland>
      </Box>

      {/* Help Dialog */}
      <Dialog
        open={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 1, bgcolor: 'background.paper', color: 'text.primary' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
          <Typography variant="h6" fontWeight={800}>
            Integrations guide
          </Typography>
          <IconButton onClick={() => setIsHelpOpen(false)} aria-label="Close help">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4 }}>
          <Typography variant="body1" paragraph>
            Connect the system to outside services.
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            <Box component="p" sx={{ mt: 0 }}>
              <b>Kinds.</b> Each provider maps to one Cerulea kind: {Object.values(KINDS).map((kind) => kind.title).join(', ')}.
              Cerulea APIs serves nine of them through a live driver and a local driver behind one interface.
              Key custody serves the signing keys. The chain oracle module serves the feeds.
            </Box>
            <Box component="p">
              <b>Environments.</b> The test environment holds the provider&apos;s test keys. The live environment holds
              the keys a live deployment uses. Each keeps its own secrets.
            </Box>
            <Box component="p">
              <b>Secrets.</b> A secret goes to Cerulea APIs key custody when the store button is pressed. The browser
              keeps nothing afterwards, and the project draft records the field names alone.
            </Box>
            <Box component="p" sx={{ mb: 0 }}>
              <b>Test.</b> The Test button asks Cerulea APIs for the real state of the driver serving the kind, and
              reads the Blueprint for an oracle feed. The answer states which driver runs and what it holds.
            </Box>
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            <Link href="/dashboard/integrations" underline="hover">
              Open the Dashboard integrations screen, which lists the endpoints and the webhook guide of a deployment
            </Link>
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

/** The catalogue count the step lists, for the Deployment Manifest and the tests. */
export const PROVIDER_COUNT = CATALOGUE.length;
export type { ProviderDef };
