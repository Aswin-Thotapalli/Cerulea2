'use client';

// apps/frontend/src/components/studio/steps/step3.tsx
// Step 4 of 6, Economics.
// Four tabs. Revenue and Payments carry what the builder charges its own
// customers, in fiat. Compliance carries identity verification, access,
// region blocks, consent, retention and the legal addresses. Governance and
// policies carries the five questions, the profiles the solver answers with,
// the chosen profile, the class thresholds in plain words and, for
// Government, the posture.
// Cerulea runs with no token. The production tabs for tokens, gas, staking,
// assets and fee splits are gone, and nothing here names a wallet.
// Every change autosaves after 1.2 seconds. The document goes to the drafts
// area of the build state with the policy answers, and the Governance section,
// the Economics section and the retention of every collection go to the
// Blueprint through Cerulea APIs.
// Without this step a deployment carries no thresholds, no retention and no
// pricing.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import StepGuidance from '@/components/studio/StepGuidance';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Fade,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTheme, styled, alpha } from '@mui/material/styles';
import { useRouter, useSearchParams } from 'next/navigation';

import ArrowBackIcon from '@mui/icons-material/KeyboardArrowLeft';
import ArrowForwardIcon from '@mui/icons-material/KeyboardArrowRight';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import GavelIcon from '@mui/icons-material/Gavel';
import PaymentsIcon from '@mui/icons-material/Payments';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import CloseIcon from '@mui/icons-material/Close';

import { StudioRouteError, api } from '@/lib/apiClient';
import { useProjectState } from '@/lib/studio/project-state';
import type { Blueprint } from '@/lib/blueprint/types';

import DappRevenuePanel from './step3-DappRevenue';
import DappPaymentsPanel from './step3-DappPayments';
import DappCompliancePanel from './step3-DappCompliance';
import ChainGovPanel from './step3-ChainGov';
import { organisationTitlesFor, retentionDaysFor } from './step3-posture';
import {
  type Compliance,
  type EconomicsDocument,
  type GovernanceChoice,
  type Payments,
  type Revenue,
  type SolverProfile,
  answersFromBuildState,
  applyEconomicsToBlueprint,
  buildStateAnswers,
  emptyEconomics,
  proposeAccountsCollection,
  readEconomicsDocument,
} from './step3-shared';

/* ------------------------------------------------------------------ */
/* Styled components                                                   */
/* ------------------------------------------------------------------ */
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

type TabKey = 'rev' | 'pay' | 'comp' | 'gov';

/** The autosave debounce, as production set it. */
export const AUTOSAVE_DELAY_MS = 1200;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'failed';

type HeldEconomics = {
  economics: unknown;
  policies: {
    answers: {
      confirmationPreference?: 'instant' | 'balanced' | 'certain';
      organisationCount?: number;
      wrongRecordCost?: 'low' | 'moderate' | 'high' | 'severe';
      serveDuringSplit?: boolean;
      provableYears?: number;
    };
    chosenProfileId: string;
  };
};

const HELP: Record<TabKey, { title: string; text: string }> = {
  rev: {
    title: 'Revenue',
    text: 'What this system charges its own customers, in fiat. Subscription tiers, metered usage and a trial period. While it charges, the Blueprint Economics section names the currency and the collection holding the paying accounts.',
  },
  pay: {
    title: 'Payments',
    text: 'The fiat provider that settles each charge and the checkout look. The provider keys are entered on the Integrations step and held by Cerulea APIs key custody. A customer meets no wallet, no gas and no fee.',
  },
  comp: {
    title: 'Compliance',
    text: 'Identity verification, access for a private deployment, region blocks, the consent flow, the legal addresses and the retention of every collection. The retention is written into the Blueprint beside each collection.',
  },
  gov: {
    title: 'Governance and policies',
    text: 'Five questions in ordinary language produce three to five profiles from Cerulea APIs, each checked against the fixed limits. The chosen profile sets the class thresholds, 51, 67, 80 and 90 percent at the least, and the authority roles and the constitutional delay complete the Governance section.',
  },
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function Step3({
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
          The Economics step reads the project from Cerulea APIs. Open a project from the project
          list, then return to this step.
        </Alert>
      </Box>
    );
  }

  return <EconomicsStep projectId={resolvedId} goPrev={goPrev} goNext={goNext} router={router} />;
}

function EconomicsStep({
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
  const [held, setHeld] = useState<HeldEconomics | null>(null);
  const [readFailure, setReadFailure] = useState<{ message: string; fix: string } | null>(null);
  const [document, setDocument] = useState<EconomicsDocument | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('rev');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [saveFailure, setSaveFailure] = useState<{ message: string; fix: string } | null>(null);

  // The held economics draft and the policy answers, read once.
  useEffect(() => {
    let open = true;
    void api<HeldEconomics>(`/api/projects/${encodeURIComponent(projectId)}/economics`)
      .then((reply) => {
        if (open) setHeld(reply);
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

  const foundation = handle.state?.buildState.foundation;
  const application = foundation?.application ?? 'dapps';
  const track = foundation?.track ?? 'dapp';
  const blockSeconds = foundation?.blockSeconds && foundation.blockSeconds > 0 ? foundation.blockSeconds : 3;
  const templateId = foundation?.templateId ?? '';
  const government = application === 'government';
  const division: 'dapp' | 'enterprise' | 'govt' =
    application === 'government' ? 'govt' : application === 'enterprise' ? 'enterprise' : 'dapp';
  // A Dapps project on the public-access chain is public. Every other project is private.
  const dappVisibility: 'public' | 'private' = application === 'dapps' && track === 'dapp' ? 'public' : 'private';

  // Hydration runs once both reads landed. The held draft wins; the build
  // state answers fill a project an earlier Studio saved without a draft.
  useEffect(() => {
    if (document || !handle.state || !held) return;
    const blueprint = handle.state.blueprint;
    const base = emptyEconomics({ track, application, blockSeconds });
    if (government) {
      base.compliance.retention.days = retentionDaysFor(templateId);
      base.governance.organisations = organisationTitlesFor(templateId);
    }
    const read = readEconomicsDocument(held.economics, base);
    const answers =
      Object.keys(read.governance.answers).some(
        (key) => read.governance.answers[key as keyof typeof read.governance.answers],
      )
        ? read.governance.answers
        : answersFromBuildState(held.policies);
    const authority =
      read.governance.authority.length > 0
        ? read.governance.authority
        : blueprint.governance.authority;
    const accountsCollection =
      read.revenue.accountsCollection ||
      blueprint.economics?.accounts_collection ||
      proposeAccountsCollection(blueprint.collections);
    const organisations =
      read.governance.organisations.length > 0
        ? read.governance.organisations
        : government
          ? organisationTitlesFor(templateId)
          : [];
    // A project with no draft yet takes the delay its Blueprint already holds.
    const delay =
      held.economics && typeof held.economics === 'object'
        ? read.governance.constitutionalDelayBlocks
        : blueprint.governance.constitutional_delay_blocks || read.governance.constitutionalDelayBlocks;
    setDocument({
      ...read,
      track,
      revenue: {
        ...read.revenue,
        charges: read.revenue.charges || blueprint.economics !== null,
        accountsCollection,
      },
      governance: {
        ...read.governance,
        answers,
        chosenProfileId: read.governance.chosenProfileId || held.policies.chosenProfileId,
        authority,
        organisations,
        constitutionalDelayBlocks: delay,
      },
    });
  }, [document, handle.state, held, track, application, blockSeconds, government, templateId]);

  /* ---------- autosave: the draft with the answers, then the Blueprint ---------- */
  const latest = useRef<EconomicsDocument | null>(null);
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
      await api(`/api/projects/${encodeURIComponent(projectId)}/economics`, {
        method: 'PUT',
        body: JSON.stringify({
          economics: current,
          policies: {
            answers: buildStateAnswers(current.governance.answers),
            chosenProfileId: current.governance.chosenProfileId,
          },
        }),
      });
      const next: Blueprint = applyEconomicsToBlueprint(state.blueprint, current, {
        blockSeconds,
        government,
      });
      if (JSON.stringify(next) !== JSON.stringify(state.blueprint)) {
        const wrote = await handleRef.current.saveBlueprint(
          next,
          'Economics step: governance thresholds, retention and fiat economics',
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
  }, [projectId, blockSeconds, government]);

  useEffect(() => {
    if (!document) return;
    // The first document after hydration is what the project already holds.
    // It still saves once, so a project an earlier Studio saved gains its
    // Blueprint sections, and after that every change restarts the timer.
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

  const setRevenue = (change: (previous: Revenue) => Revenue) =>
    setDocument((p) => (p ? { ...p, revenue: change(p.revenue) } : p));
  const setPayments = (change: (previous: Payments) => Payments) =>
    setDocument((p) => (p ? { ...p, payments: change(p.payments) } : p));
  const setCompliance = (change: (previous: Compliance) => Compliance) =>
    setDocument((p) => (p ? { ...p, compliance: change(p.compliance) } : p));
  const setGovernance = (change: (previous: GovernanceChoice) => GovernanceChoice) =>
    setDocument((p) => (p ? { ...p, governance: change(p.governance) } : p));
  const setChosenProfile = (profile: SolverProfile | null) =>
    setDocument((p) => (p ? { ...p, chosenProfile: profile } : p));

  const tabs = useMemo(
    () => [
      { key: 'rev' as const, label: 'Revenue', icon: <MonetizationOnIcon fontSize="small" /> },
      { key: 'pay' as const, label: 'Payments', icon: <PaymentsIcon fontSize="small" /> },
      { key: 'comp' as const, label: 'Compliance', icon: <GavelIcon fontSize="small" /> },
      { key: 'gov' as const, label: 'Governance & policies', icon: <AccountBalanceIcon fontSize="small" /> },
    ],
    [],
  );

  const helpContent = HELP[activeTab];
  const statusText =
    status === 'saving'
      ? 'Saving'
      : status === 'saved'
        ? 'Saved to Cerulea APIs'
        : status === 'failed'
          ? 'Save failed'
          : '';

  const collections = handle.state?.blueprint.collections ?? [];
  const roles = handle.state?.blueprint.identities.roles ?? [];

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          backgroundImage: 'radial-gradient(rgba(79,70,229,0.10) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        <StepGuidance
          stepKey="step3"
          title="Economics"
          subtitle="Step 4 of 6"
          description="Decide what the system charges in fiat, how it meets its compliance duties, how long records stay, and the agreement rules the network runs under. Cerulea runs with no token, so nothing here asks for a wallet, gas or a fee."
          steps={[
            {
              first: 'Set the revenue and the payments',
              next: 'Say whether the system charges its customers, in which currency, through which provider.',
            },
            {
              first: 'Set compliance and retention',
              next: 'Choose identity verification, access, region blocks and how long each collection keeps a record.',
            },
            {
              first: 'Answer the five questions',
              next: 'Cerulea answers with three to five profiles. Pick one and the class thresholds are written into the Blueprint.',
            },
          ]}
          tip="Every change saves after a moment. The Blueprint carries the result, and the Deployment Manifest reads it before deployment."
        />

        {/* Tab rail */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 3,
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            flexShrink: 0,
            overflowX: 'auto',
            '&::-webkit-scrollbar': { height: 4 },
          }}
          role="tablist"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Box
                key={tab.key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.key)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: 2.5,
                  py: 1,
                  borderRadius: 1,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  bgcolor: isActive ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
                  color: isActive ? 'primary.main' : 'text.secondary',
                  border: `1px solid ${isActive ? alpha(theme.palette.primary.main, 0.3) : 'transparent'}`,
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.825rem',
                  transition: 'all 0.15s',
                  '&:hover': {
                    bgcolor: isActive
                      ? alpha(theme.palette.primary.main, 0.15)
                      : alpha(theme.palette.primary.main, 0.05),
                    color: isActive ? 'primary.main' : 'text.primary',
                  },
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </Box>
            );
          })}
          <Box sx={{ flex: 1 }} />
          {statusText && (
            <Typography
              variant="caption"
              data-testid="economics-save-status"
              sx={{ color: status === 'failed' ? 'error.main' : 'text.secondary', mr: 1 }}
            >
              {statusText}
            </Typography>
          )}
          <Tooltip title="Help">
            <IconButton size="small" onClick={() => setIsHelpOpen(true)} sx={{ color: 'text.secondary' }}>
              <QuestionMarkIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Tab content */}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 4, py: 3 }}>
          {(readFailure || handle.failure) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <AlertTitle>{(readFailure ?? handle.failure)?.message}</AlertTitle>
              {(readFailure ?? handle.failure)?.fix}
            </Alert>
          )}
          {saveFailure && (
            <Alert severity="error" sx={{ mb: 2 }} data-testid="economics-save-failure">
              <AlertTitle>{saveFailure.message}</AlertTitle>
              {saveFailure.fix}
            </Alert>
          )}
          {!document && !readFailure && !handle.failure && (
            <Stack alignItems="center" spacing={2} sx={{ py: 10 }}>
              <CircularProgress size={28} />
              <Typography variant="body2">Cerulea is opening the project.</Typography>
            </Stack>
          )}
          {document && (
            <Fade in key={activeTab}>
              <Box>
                {activeTab === 'rev' && (
                  <DappRevenuePanel
                    revenue={document.revenue}
                    setRevenue={setRevenue}
                    dappVisibility={dappVisibility}
                    division={division}
                    collections={collections}
                  />
                )}
                {activeTab === 'pay' && (
                  <DappPaymentsPanel payments={document.payments} setPayments={setPayments} />
                )}
                {activeTab === 'comp' && (
                  <DappCompliancePanel
                    compliance={document.compliance}
                    setCompliance={setCompliance}
                    dappVisibility={dappVisibility}
                    government={government}
                    collections={collections}
                  />
                )}
                {activeTab === 'gov' && (
                  <ChainGovPanel
                    projectId={projectId}
                    governance={document.governance}
                    setGovernance={setGovernance}
                    chosenProfile={document.chosenProfile}
                    setChosenProfile={setChosenProfile}
                    roles={roles}
                    blockSeconds={blockSeconds}
                    government={government}
                    templateId={templateId}
                  />
                )}
              </Box>
            </Fade>
          )}
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
              <IconButton
                onClick={goPrev || (() => router.back())}
                size="small"
                sx={{ border: '1px solid', borderColor: 'divider' }}
              >
                <ArrowBackIcon />
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
              Save & Continue
            </Button>
          </FloatingIsland>
        </Box>
      </Box>

      {/* Help Dialog */}
      <Dialog
        open={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
          <Typography variant="h6" fontWeight={800}>
            {helpContent.title}
          </Typography>
          <IconButton onClick={() => setIsHelpOpen(false)} aria-label="Close help">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4 }}>
          <Typography variant="body1" fontWeight={500} paragraph>
            {helpContent.text}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cerulea runs with no token. Validators settle in fiat through the subscription
            arrangement, and an end user meets no gas, no wallet and no fee.
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
