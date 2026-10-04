'use client';

// apps/frontend/src/components/studio/steps/step0.tsx
// Step 1 of 6, Foundation.
// The production phases stay: the type, the Dapps visibility or the legacy
// question, the gallery with compare, the details. A Describe it door opens
// first and sends the sentence to Cerulea Intelligence, which proposes the
// template, the outcomes and the network with reasons. Every answer writes the
// build state and the Blueprint through Cerulea APIs, so the project reopens
// where the person left it on any machine.

import * as React from 'react';
import { useStudio } from '@/context/StudioContext';
import { useSession } from 'next-auth/react';
import AuthModal from '@/components/auth/AuthModal';
import { getClientDivision } from '@/lib/division-client';
import { applicationForDivision, lockedProjectType, type Division } from '@/config/divisions';
import { api } from '@/lib/apiClient';
import { describeSaveFailure, type SaveFailure } from '@/lib/studio/project-state';
import { BLOCK_SECONDS, HISTORY_RETENTION_DAYS, boundFix, withinBound } from '@/lib/studio/foundation-controls';
import { readFoundationDetails, type FoundationDetails } from '@/lib/studio/foundation-record';
import { applyTrackOverride, deriveTrack, type Application, type TrackDerivation } from '@/lib/track/derive';
import type { ProjectTrack } from '@/lib/catalogue/types';
import DescribeDoor, { type DescribeChoice } from './step0-DescribeDoor';
import NetworkPanel from './step0-NetworkPanel';
import {
  Box, Typography, Stack, Paper, Button, Chip, TextField, Select, MenuItem,
  Divider, Dialog, DialogTitle, DialogContent, DialogActions, Fade, Alert,
} from '@mui/material';
import { useTheme, styled, alpha } from '@mui/material/styles';

// Icons
import AutoAwesomeMosaicIcon from '@mui/icons-material/AutoAwesomeMosaic';
import LanIcon from '@mui/icons-material/Lan';
import ArrowBackIcon from '@mui/icons-material/KeyboardArrowLeft';
import ArrowForwardIcon from '@mui/icons-material/KeyboardArrowRight';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import DomainIcon from '@mui/icons-material/Domain';
import DnsIcon from '@mui/icons-material/Dns';
import BoltIcon from '@mui/icons-material/Bolt';
import CheckIcon from '@mui/icons-material/Check';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import CloseIcon from '@mui/icons-material/Close';

/* ---------- Types ---------- */
type Workspace = { id: string; name: string; slug?: string; application?: string };
type ProjectType = 'dapp' | 'blockchain';

type Template = {
  id: string;
  projectType: ProjectType;
  title: string;
  description: string;
  category: string;
  icon?: string;
  tags: string[];
  preinstalledModules: string[];
  modules?: string[];
};

export type Step0Phase = 'describe' | 'choose-type' | 'dapp-type' | 'legacy-question' | 'gallery' | 'details';
type LegacyMode = 'none' | 'connect' | 'port';
type DappVisibility = 'public' | 'private';

/* ---------- Utils ---------- */
function slugify(raw: string) {
  return raw.toLowerCase().normalize('NFKD').replace(/[^\w\s-]+/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60);
}

/** The modules a template installs, under either seed field name. */
function templateModules(template: Template | null | undefined): string[] {
  if (!template) return [];
  return Array.from(new Set(template.modules ?? template.preinstalledModules ?? []));
}

/** The first words of a sentence, as the name a project opens under. */
export function nameFromSentence(sentence: string): string {
  const words = sentence.trim().replace(/\s+/g, ' ').split(' ').slice(0, 6).join(' ').replace(/[.,;:!?]+$/, '');
  const named = words.length > 0 ? words[0].toUpperCase() + words.slice(1) : 'New system';
  return named.length >= 3 ? named.slice(0, 80) : 'New system';
}

/** The sub-step the sidebar shows for each phase. */
export const PHASE_TO_SUBSTEP: Record<Step0Phase, number> = {
  describe: 0,
  'choose-type': 1,
  'dapp-type': 2,
  'legacy-question': 2,
  gallery: 3,
  details: 4,
};

/** The tiers that open a public dApp and a private dApp. */
export const PUBLIC_DAPP_TIERS = ['public_dapps', 'pro'];
export const PRIVATE_DAPP_TIERS = ['private_dapps', 'private_dapps_pro', 'pro', 'enterprise'];

/**
 * Reads what the Dapps tier of the account opens.
 * The division gate admitted the account, so a tier outside both lists opens
 * the public dApp, the entry of the division, and gates the private one.
 */
export function dappAccess(tier: string | null | undefined): { publicDapp: boolean; privateDapp: boolean } {
  const held = tier ?? '';
  const publicDapp = PUBLIC_DAPP_TIERS.includes(held);
  const privateDapp = PRIVATE_DAPP_TIERS.includes(held);
  return { publicDapp: publicDapp || !privateDapp, privateDapp };
}

/* ---------- Styled Components ---------- */

const FloatingIsland = styled(Paper)(({ theme }) => ({
  background: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.96)' : 'rgba(8,14,36,0.96)',
  backdropFilter: 'blur(16px) saturate(180%)',
  border: `0.5px solid ${theme.palette.divider}`,
  boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.1 : 0.2)}`,
  borderRadius: 100,
  padding: '5px 6px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  transition: 'all 0.2s ease',
}));

const PortalCard = styled(Paper, { shouldForwardProp: (p) => p !== 'selected' })<{ selected?: boolean }>(({ theme, selected }) => ({
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  cursor: 'pointer',
  position: 'relative',
  borderRadius: 14,
  background: theme.palette.background.paper,
  border: `${selected ? 1.5 : 0.5}px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
  boxShadow: selected
    ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.08)}, 0 2px 8px ${alpha(theme.palette.primary.main, 0.08)}`
    : `0 1px 4px ${alpha(theme.palette.mode === 'light' ? '#0F1629' : '#000', 0.04)}`,
  overflow: 'hidden',
  transition: 'all 0.15s ease',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.12)}`,
    transform: 'translateY(-2px)',
  },
}));

const GalleryCard = styled(Paper, { shouldForwardProp: (p) => p !== 'selected' })<{ selected?: boolean }>(({ theme, selected }) => ({
  padding: 14,
  borderRadius: 12,
  cursor: 'pointer',
  background: selected
    ? (theme.palette.mode === 'light' ? '#FDFCFF' : alpha(theme.palette.primary.main, 0.06))
    : theme.palette.background.paper,
  border: `${selected ? 1.5 : 0.5}px solid ${selected ? theme.palette.primary.main : theme.palette.divider}`,
  boxShadow: selected ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.08)}` : 'none',
  transition: 'all 0.15s ease',
  position: 'relative',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.07)}`,
  },
}));

const SplitGlassPanel = styled(Paper)(({ theme }) => ({
  background: theme.palette.background.paper,
  border: `0.5px solid ${theme.palette.divider}`,
  borderRadius: 16,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  maxWidth: 1100,
  flex: 1,
  minHeight: 0,
  [theme.breakpoints.up('md')]: { flexDirection: 'row' },
  [theme.breakpoints.down('md')]: { height: 'auto', flex: 'none' },
}));

const ConfigSection = styled(Box)(({ theme }) => ({
  flex: 1,
  padding: 32,
  overflowY: 'auto',
  height: '100%',
  '&::-webkit-scrollbar': { width: '5px' },
  '&::-webkit-scrollbar-track': { background: 'transparent' },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: alpha(theme.palette.primary.main, 0.15),
    borderRadius: '3px',
  },
}));

const OPAQUE_MENU_PROPS = {
  PaperProps: {
    sx: {
      backgroundImage: 'none',
      backgroundColor: (t: any) => t.palette.background.paper,
      border: '0.5px solid',
      borderColor: 'divider',
      boxShadow: (t: any) => `0 8px 32px ${alpha(t.palette.primary.main, 0.1)}`,
    },
  },
};

const APPLICATION_OF_DIVISION: Record<Division, Application> = {
  dapp: 'dapps',
  enterprise: 'enterprise',
  govt: 'government',
};

/** The answer the Foundation route returns. */
type FoundationReply = {
  ok: true;
  project: { id: string; name: string; slug: string; description: string; projectType: ProjectType; workspaceId: string };
  foundation: {
    projectName: string;
    summary: string;
    application: string;
    track: ProjectType;
    trackOverridden: boolean;
    templateId: string;
    publishSelectedRecords: boolean;
    blockSeconds: number;
    historyRetentionDays: number;
  };
  details: FoundationDetails;
  steps: { foundation: boolean };
};

/* ====================================================================== */
export default function Step0({
  goNext,
  onSubStepChange,
}: {
  goNext: () => void;
  onSubStepChange?: (subStep: number) => void;
}) {
  const theme = useTheme();
  const { projectType, templateId, appMetadata, workspaceId, projectId: existingProjectId, setStudioState } = useStudio();
  const { data: session } = useSession();

  /* ---- Division lock ----
   * The division of the address locks the type. Enterprise and Government
   * build private Blockchain networks; Dapps builds decentralised applications. */
  const division: Division | null = React.useMemo(() => getClientDivision(), []);
  const divisionLockedType: ProjectType | null = React.useMemo(
    () => (division ? lockedProjectType(division) : null) as ProjectType | null,
    [division],
  );
  const application: Application = division ? APPLICATION_OF_DIVISION[division] : 'dapps';

  const sessionUser = session?.user as { plan?: string; divisionSubs?: Record<string, string | null> } | undefined;
  const dappTier = sessionUser?.divisionSubs?.dapp ?? sessionUser?.plan ?? null;
  const access = dappAccess(dappTier);

  /* ---- State ---- */
  const [projectId, setProjectId] = React.useState<string | null>(existingProjectId ?? null);
  const [phase, setPhaseRaw] = React.useState<Step0Phase>(existingProjectId ? 'details' : 'describe');
  const [dType, setDType] = React.useState<ProjectType | null>(projectType ?? divisionLockedType);
  const [dappVisibility, setDappVisibility] = React.useState<DappVisibility | null>(null);
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const [pendingType, setPendingType] = React.useState<ProjectType | null>(null);
  const [legacyMode, setLegacyMode] = React.useState<LegacyMode>('none');
  const [legacyStep, setLegacyStep] = React.useState<'has-legacy' | 'how-to-proceed'>('has-legacy');
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = React.useState(false);
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);
  const [selectedTemplate, setSelectedTemplate] = React.useState<string | null>(templateId ?? null);
  const [compareMode, setCompareMode] = React.useState(false);
  const [compareSet, setCompareSet] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('All');

  // Form state. An existing project fills from Cerulea APIs; a new one starts empty.
  const [name, setName] = React.useState(existingProjectId ? (appMetadata?.appName ?? '') : '');
  const [slug, setSlug] = React.useState(existingProjectId ? slugify(appMetadata?.appName ?? '') : '');
  const [assignedSlug, setAssignedSlug] = React.useState<string | null>(null);
  const [description, setDescription] = React.useState(existingProjectId ? (appMetadata?.appDescription ?? '') : '');
  const [wsId, setWsId] = React.useState(workspaceId ?? '');
  const lastTemplateAutoRef = React.useRef<{ name: string; slug: string; description: string } | null>(null);

  // The specification additions: the derived network, the outcomes and the properties.
  const [derivation, setDerivation] = React.useState<TrackDerivation>(() => deriveTrack(application));
  const [publishSelected, setPublishSelected] = React.useState(false);
  const [outcomeIds, setOutcomeIds] = React.useState<string[]>([]);
  const [blockSeconds, setBlockSeconds] = React.useState(BLOCK_SECONDS.bound.fallback);
  const [retentionDays, setRetentionDays] = React.useState(HISTORY_RETENTION_DAYS.bound.fallback);
  const [saveState, setSaveState] = React.useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [failure, setFailure] = React.useState<SaveFailure | null>(null);
  const [initialising, setInitialising] = React.useState(false);

  // Dialogs
  const [wsDialogOpen, setWsDialogOpen] = React.useState(false);
  const [wsNewName, setWsNewName] = React.useState('');

  /* ---- Phase helper, reports to the shell sidebar ---- */
  const setPhase = React.useCallback((p: Step0Phase) => {
    setPhaseRaw(p);
    onSubStepChange?.(PHASE_TO_SUBSTEP[p] ?? 0);
    setStudioState({ step0Phase: p } as any);
  }, [onSubStepChange, setStudioState]);

  React.useEffect(() => {
    onSubStepChange?.(PHASE_TO_SUBSTEP[phase] ?? 0);
    setStudioState({ step0Phase: phase } as any);
  }, []); // eslint-disable-line

  React.useEffect(() => {
    if (!divisionLockedType || existingProjectId || projectType) return;
    setStudioState({ projectType: divisionLockedType } as any);
    if (typeof window !== 'undefined') localStorage.setItem('cerulea.projectType', divisionLockedType);
  }, []); // eslint-disable-line

  /* ---- Effects ---- */
  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/workspaces');
        const data = await r.json();
        const list: Workspace[] = Array.isArray(data) ? data : [];
        setWorkspaces(list);
        if (!wsId && list.length) { setWsId(list[0].id); setStudioState({ workspaceId: list[0].id }); }
      } catch {}
    })();
  }, []); // eslint-disable-line

  const loadTemplates = React.useCallback(async (ptype: ProjectType) => {
    setLoadingTemplates(true);
    try {
      const url = `/api/templates?projectType=${ptype}${division ? `&division=${division}` : ''}`;
      const r = await fetch(url);
      const list = await r.json();
      setTemplates(Array.isArray(list) ? list : []);
    } finally { setLoadingTemplates(false); }
  }, [division]);

  React.useEffect(() => {
    if (dType && (phase === 'gallery' || phase === 'details') && templates.length === 0) void loadTemplates(dType);
  }, [dType, phase]); // eslint-disable-line

  React.useEffect(() => { if (!assignedSlug) setSlug(slugify(name)); }, [name, assignedSlug]);

  // An existing project opens on its details, read from Cerulea APIs.
  React.useEffect(() => {
    if (!existingProjectId) return;
    let live = true;
    (async () => {
      try {
        const reply = await api<FoundationReply>(`/api/projects/${encodeURIComponent(existingProjectId)}/foundation`);
        if (!live) return;
        setProjectId(reply.project.id);
        setName(reply.project.name);
        setDescription(reply.project.description);
        setAssignedSlug(reply.project.slug);
        setSlug(reply.project.slug);
        setWsId(reply.project.workspaceId);
        setDType(reply.foundation.track);
        setSelectedTemplate(reply.foundation.templateId || 'scratch');
        setBlockSeconds(reply.foundation.blockSeconds);
        setRetentionDays(reply.foundation.historyRetentionDays);
        setPublishSelected(reply.foundation.publishSelectedRecords);
        setDappVisibility(reply.details.dappVisibility);
        setLegacyMode(reply.details.legacyMode);
        const base = deriveTrack(application, {
          templateTrack: reply.foundation.track,
        });
        const wanted: ProjectTrack = reply.details.network.kind === 'public-access' ? 'dapp' : 'blockchain';
        setDerivation(reply.details.network.overridden ? applyTrackOverride(base, wanted) : base);
        setStudioState({ projectType: reply.foundation.track, templateId: reply.foundation.templateId || null, appMetadata: { appName: reply.project.name, appDescription: reply.project.description } });
      } catch (cause) {
        if (live) setFailure(describeSaveFailure(cause));
      }
    })();
    return () => { live = false; };
  }, [existingProjectId]); // eslint-disable-line

  /* ---- The network as the person answered it ---- */
  const networkKind: 'public-access' | 'private' = derivation.track === 'dapp' ? 'public-access' : 'private';
  const planNote = React.useMemo(() => {
    if (dType !== 'dapp') return null;
    if (networkKind === 'private' && !access.privateDapp) {
      return 'A private dApp needs the Private Dapps plan. Open the billing screen to add it, or keep the public-access chain.';
    }
    if (networkKind === 'public-access' && !access.publicDapp) {
      return 'A public dApp needs the Public Dapps plan. Open the billing screen to add it, or choose the private network.';
    }
    return null;
  }, [access.privateDapp, access.publicDapp, dType, networkKind]);

  /* ---- Saving through Cerulea APIs ---- */
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFoundation = React.useCallback(async (id: string, extra: Record<string, unknown> = {}) => {
    const template = templates.find((t) => t.id === selectedTemplate) ?? null;
    const body = {
      name: name.trim().length >= 3 ? name.trim() : undefined,
      description,
      templateId: selectedTemplate ?? undefined,
      network: networkKind,
      networkReason: derivation.reason,
      networkOverridden: derivation.overridden,
      dappVisibility: dType === 'dapp' ? (networkKind === 'private' ? 'private' : 'public') : null,
      legacyMode,
      publishSelectedRecords: publishSelected,
      blockSeconds: withinBound(blockSeconds, BLOCK_SECONDS.bound),
      historyRetentionDays: withinBound(retentionDays, HISTORY_RETENTION_DAYS.bound),
      outcomeIds,
      ...extra,
    };
    setSaveState('saving');
    try {
      const reply = await api<{ ok: true; slug: string }>(`/api/projects/${encodeURIComponent(id)}/foundation`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      setAssignedSlug(reply.slug);
      setSlug(reply.slug);
      setSaveState('saved');
      setFailure(null);
      if (typeof window !== 'undefined') {
        localStorage.setItem('cerulea.templateModules', JSON.stringify(templateModules(template)));
      }
      return true;
    } catch (cause) {
      setSaveState('failed');
      setFailure(describeSaveFailure(cause));
      return false;
    }
  }, [blockSeconds, dType, derivation.overridden, derivation.reason, description, legacyMode, name, networkKind, outcomeIds, publishSelected, retentionDays, selectedTemplate, templates]);

  // Every answer on the details phase saves after a short pause.
  React.useEffect(() => {
    if (!projectId || phase !== 'details') return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void saveFoundation(projectId); }, 1000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [projectId, phase, name, description, selectedTemplate, networkKind, derivation.overridden, publishSelected, blockSeconds, retentionDays, legacyMode]); // eslint-disable-line

  /** Opens the project in Cerulea APIs. The division workspace holds it. */
  const createProject = React.useCallback(async (projectName: string, summary: string, ptype: ProjectType, template: string | null): Promise<string> => {
    const payload = {
      name: projectName,
      slug: slugify(projectName),
      description: summary,
      projectType: ptype,
      dappVisibility: ptype === 'dapp' ? (dappVisibility ?? 'public') : null,
      templateId: template,
      workspaceId: wsId || null,
    };
    const reply = await api<{ ok: true; id: string; slug: string; workspaceId: string }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setProjectId(reply.id);
    setAssignedSlug(reply.slug);
    setSlug(reply.slug);
    setStudioState({ projectId: reply.id, slug: reply.slug, workspaceId: reply.workspaceId, appMetadata: { appName: projectName, appDescription: summary } });
    if (typeof window !== 'undefined') {
      localStorage.setItem('cerulea.projectId', reply.id);
      localStorage.setItem('cerulea.activeProjectId', reply.id);
      localStorage.removeItem('cerulea.step1.graph');
      localStorage.setItem('cerulea.projectType', ptype);
      if (ptype === 'dapp') localStorage.setItem('cerulea.dappVisibility', dappVisibility ?? 'public');
    }
    return reply.id;
  }, [dappVisibility, setStudioState, wsId]);

  /* ---- Handlers ---- */
  const proceedToGallery = (ptype: ProjectType, lmode: LegacyMode = 'none', visibility: DappVisibility = 'public') => {
    setDType(ptype);
    setStudioState({
      projectType: ptype,
      dappVisibility: ptype === 'dapp' ? visibility : null,
      templateId: null,
      legacyMode: lmode,
      appMetadata: { appName: name, appDescription: description },
      selectedModules: [],
    } as any);
    setSelectedTemplate(null);
    setSearch('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cerulea.templateModules');
      localStorage.setItem('cerulea.projectType', ptype);
      if (ptype === 'dapp') localStorage.setItem('cerulea.dappVisibility', visibility);
      localStorage.removeItem('cerulea.templateId');
    }
    setPhase('gallery');
    void loadTemplates(ptype);
  };

  const chooseType = (ptype: ProjectType) => {
    if (!session) { setPendingType(ptype); setAuthModalOpen(true); return; }
    setDType(ptype);
    if (ptype === 'blockchain') {
      setLegacyStep('has-legacy');
      setPhase('legacy-question');
    } else {
      setPhase('dapp-type');
    }
  };

  const chooseDappVisibility = (visibility: DappVisibility) => {
    if (visibility === 'public' && !access.publicDapp) {
      if (typeof window !== 'undefined') window.location.href = '/dashboard/billing?upgrade=public-dapp';
      return;
    }
    if (visibility === 'private' && !access.privateDapp) {
      if (typeof window !== 'undefined') window.location.href = '/dashboard/billing?upgrade=private-dapp';
      return;
    }
    setDappVisibility(visibility);
    const base = deriveTrack(application);
    setDerivation(visibility === 'private' ? applyTrackOverride(base, 'blockchain') : base);
    proceedToGallery('dapp', 'none', visibility);
  };

  const handleLegacyChoice = (hasLegacy: boolean) => {
    if (!hasLegacy) {
      setLegacyMode('none');
      proceedToGallery('blockchain', 'none');
    } else {
      setLegacyStep('how-to-proceed');
    }
  };

  const handleLegacyProceed = (mode: 'connect' | 'port') => {
    setLegacyMode(mode);
    proceedToGallery('blockchain', mode);
  };

  const selectTemplate = (tpl: Template | null) => {
    const id = tpl?.id ?? null;
    setSelectedTemplate(id);
    if (tpl) {
      const last = lastTemplateAutoRef.current;
      setName(prev => (!prev || prev === last?.name) ? tpl.title : prev);
      setDescription(prev => (!prev || prev === last?.description) ? tpl.description : prev);
      lastTemplateAutoRef.current = { name: tpl.title, slug: slugify(tpl.title), description: tpl.description };
      setDerivation((held) => {
        const base = deriveTrack(application, { templateTrack: tpl.projectType });
        return held.overridden ? applyTrackOverride(base, held.track) : base;
      });
    }
  };

  const onConfirmTemplate = () => {
    if (!selectedTemplate) return;
    setStudioState({ templateId: selectedTemplate });
    setPhase('details');
  };

  /** The Describe it door accepted a proposal. The details open filled from it. */
  const onDescribeAccepted = (choice: DescribeChoice) => {
    const ptype: ProjectType = dType ?? divisionLockedType ?? 'dapp';
    setDType(ptype);
    setOutcomeIds(choice.outcomeIds);
    setDerivation(choice.derivation);
    setPublishSelected(choice.publishSelectedRecords);
    if (ptype === 'dapp') setDappVisibility(choice.derivation.track === 'blockchain' ? 'private' : 'public');
    if (choice.template) {
      setSelectedTemplate(choice.template.id);
      setName((prev) => (prev.trim().length >= 3 && prev !== nameFromSentence(choice.description) ? prev : choice.template?.title ?? prev));
      lastTemplateAutoRef.current = { name: choice.template.title, slug: slugify(choice.template.title), description: choice.template.description };
    } else {
      setSelectedTemplate('scratch');
    }
    setDescription(choice.description);
    setStudioState({ projectType: ptype, templateId: choice.template?.id ?? null, appMetadata: { appName: name, appDescription: choice.description } });
    if (typeof window !== 'undefined') {
      localStorage.setItem('cerulea.projectType', ptype);
      localStorage.setItem('cerulea.outcomeIds', JSON.stringify(choice.outcomeIds));
    }
    setPhase('details');
  };

  const onBrowseInstead = () => {
    const ptype = dType ?? divisionLockedType;
    if (ptype === 'dapp') setPhase('dapp-type');
    else if (ptype === 'blockchain') { setLegacyStep('has-legacy'); setPhase('legacy-question'); }
    else setPhase('choose-type');
  };

  const nameFix = name.trim().length < 3 ? 'Type a name of at least three characters.' : null;
  const blockFix = boundFix(blockSeconds, BLOCK_SECONDS);
  const retentionFix = boundFix(retentionDays, HISTORY_RETENTION_DAYS);
  const canInitialise = !nameFix && !blockFix && !retentionFix && !!dType && !initialising;

  const onInitialize = async () => {
    if (!canInitialise || !dType) return;
    setInitialising(true);
    try {
      const id = projectId ?? (await createProject(name.trim(), description, dType, selectedTemplate));
      if (saveTimer.current) clearTimeout(saveTimer.current);
      const wrote = await saveFoundation(id, { done: true });
      if (!wrote) return;
      const template = templates.find(t => t.id === selectedTemplate) ?? null;
      setStudioState({ projectId: id, templateId: selectedTemplate, appMetadata: { appName: name.trim(), appDescription: description } });
      if (typeof window !== 'undefined') {
        localStorage.setItem('cerulea.projectId', id);
        localStorage.setItem('cerulea.activeProjectId', id);
        localStorage.setItem('cerulea.templateModules', JSON.stringify(templateModules(template)));
        localStorage.setItem('cerulea.outcomeIds', JSON.stringify(outcomeIds));
        localStorage.setItem('cerulea.projectType', dType);
        if (dType === 'dapp') localStorage.setItem('cerulea.dappVisibility', networkKind === 'private' ? 'private' : 'public');
      }
      goNext();
    } catch (cause) {
      setFailure(describeSaveFailure(cause));
    } finally {
      setInitialising(false);
    }
  };

  const createWorkspace = async () => {
    if (!wsNewName.trim()) return;
    try {
      const ws = await api<Workspace & { workspaceId?: string }>('/api/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name: wsNewName.trim(), application: applicationForDivision(division ?? 'dapp') }),
      });
      const opened = { ...ws, id: ws.id ?? ws.workspaceId ?? '' };
      setWorkspaces((w) => [opened, ...w]);
      setWsId(opened.id);
    } catch (cause) { setFailure(describeSaveFailure(cause)); } finally { setWsDialogOpen(false); setWsNewName(''); }
  };

  const categories = React.useMemo(() => {
    const cats = new Set(templates.map(t => t.category));
    return ['All', ...Array.from(cats)];
  }, [templates]);

  const filteredTemplates = React.useMemo(() => {
    let arr = templates;
    if (categoryFilter !== 'All') arr = arr.filter(t => t.category === categoryFilter);
    if (search.trim()) {
      arr = arr.filter(t => `${t.title} ${t.description} ${(t.tags ?? []).join(' ')}`.toLowerCase().includes(search.toLowerCase()));
    }
    return arr;
  }, [templates, search, categoryFilter]);

  const selectedTemplateName = React.useMemo(() => {
    if (!selectedTemplate) return null;
    if (selectedTemplate === 'scratch') return 'Blank canvas';
    return templates.find(t => t.id === selectedTemplate)?.title ?? 'Template';
  }, [selectedTemplate, templates]);

  const goBackFromGallery = () => {
    if (dType === 'blockchain') setPhase('legacy-question');
    else setPhase('dapp-type');
  };

  const typeLabel = dType === 'blockchain' ? 'Private Blockchain' : 'dApp';
  const saveText = saveState === 'saving' ? 'Saving' : saveState === 'saved' ? 'Saved to Cerulea' : saveState === 'failed' ? 'Save failed' : '';

  /* ================================================================ */
  return (
    <Box sx={{ width: '100%', height: '100%', overflow: 'hidden', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <AuthModal
        open={authModalOpen}
        title="Sign in to continue"
        subtitle="Sign in, or create an account, to start building the project."
        onSuccess={() => {
          setAuthModalOpen(false);
          if (pendingType === 'blockchain') { setDType('blockchain'); setLegacyStep('has-legacy'); setPhase('legacy-question'); }
          else if (pendingType === 'dapp') { setDType('dapp'); setPhase('dapp-type'); }
          else if (pendingType) proceedToGallery(pendingType);
        }}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Subtle dot-grid background */}
      <Box sx={{
        position: 'absolute', inset: 0, opacity: 0.5, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `radial-gradient(${alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.07 : 0.12)} 1px, transparent 1px)`,
        backgroundSize: '28px 28px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
      }} />

      <Box sx={{ flex: 1, width: '100%', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 4, pb: 2, position: 'relative', zIndex: 1 }}>

        {/* ─── PHASE: DESCRIBE IT ─── */}
        {phase === 'describe' && (
          <Fade in mountOnEnter unmountOnExit timeout={350}>
            <Stack spacing={3} alignItems="center" sx={{ width: '100%' }}>
              <Stack spacing={1.5} alignItems="center" textAlign="center" sx={{ px: 3 }}>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, bgcolor: 'background.paper', border: '0.5px solid', borderColor: 'divider', borderRadius: 99, px: 1.5, py: 0.4 }}>
                  <Typography sx={{ fontSize: '0.65rem', color: 'primary.main', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    Step 1 of 6 · Foundation
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={500} sx={{ letterSpacing: '-0.5px', color: 'text.primary', lineHeight: 1.2 }}>
                  What are we building
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, maxWidth: 440 }}>
                  One sentence is enough. Cerulea proposes the template, the outcomes and the network, and states the reason for each.
                </Typography>
              </Stack>
              <DescribeDoor
                application={application}
                projectId={projectId}
                createProject={(sentence) => createProject(nameFromSentence(sentence), sentence, dType ?? divisionLockedType ?? 'dapp', null)}
                onAccept={onDescribeAccepted}
                onBrowse={onBrowseInstead}
              />
            </Stack>
          </Fade>
        )}

        {/* ─── PHASE: CHOOSE TYPE ─── */}
        {phase === 'choose-type' && (
          <Fade in mountOnEnter unmountOnExit timeout={350}>
            <Stack spacing={5} alignItems="center" justifyContent="center" sx={{ width: '100%', maxWidth: 560, px: 3, my: 'auto' }}>
              <Stack spacing={1.5} alignItems="center" textAlign="center">
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, bgcolor: 'background.paper', border: '0.5px solid', borderColor: 'divider', borderRadius: 99, px: 1.5, py: 0.4 }}>
                  <Typography sx={{ fontSize: '0.65rem', color: 'primary.main', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    Step 1 of 6 · Foundation
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={500} sx={{ letterSpacing: '-0.5px', color: 'text.primary', lineHeight: 1.2 }}>
                  What are we building
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, maxWidth: 380 }}>
                  The choice decides the module catalogue, the templates and the deployment targets on offer.
                </Typography>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} width="100%">
                <PortalCard selected={dType === 'dapp'} onClick={() => chooseType('dapp')} elevation={0}>
                  {dType === 'dapp' && (
                    <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1, width: 20, height: 20, borderRadius: '50%', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckIcon sx={{ fontSize: 11, color: '#fff' }} />
                    </Box>
                  )}
                  <Box sx={{ height: 108, bgcolor: dType === 'dapp' ? alpha(theme.palette.primary.main, 0.07) : alpha(theme.palette.primary.main, 0.03), display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
                    <AutoAwesomeMosaicIcon sx={{ fontSize: 48, color: dType === 'dapp' ? 'primary.main' : 'text.disabled' }} />
                  </Box>
                  <Box sx={{ p: '14px 14px 16px' }}>
                    <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 0.5 }}>dApp</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7, display: 'block', mb: 1.5 }}>
                      An application on the public-access chain. Anyone can verify a record.
                    </Typography>
                    <Stack direction="row" gap={0.5} flexWrap="wrap">
                      {['Marketplace', 'Registry', 'Community'].map(tag => (
                        <Chip key={tag} label={tag} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 500, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', border: 'none' }} />
                      ))}
                    </Stack>
                  </Box>
                </PortalCard>

                <PortalCard selected={dType === 'blockchain'} onClick={() => chooseType('blockchain')} elevation={0}>
                  {dType === 'blockchain' && (
                    <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1, width: 20, height: 20, borderRadius: '50%', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckIcon sx={{ fontSize: 11, color: '#fff' }} />
                    </Box>
                  )}
                  <Box sx={{ height: 108, bgcolor: dType === 'blockchain' ? alpha(theme.palette.primary.main, 0.07) : alpha(theme.palette.primary.main, 0.03), display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
                    <LanIcon sx={{ fontSize: 48, color: dType === 'blockchain' ? 'primary.main' : 'text.disabled' }} />
                  </Box>
                  <Box sx={{ p: '14px 14px 16px' }}>
                    <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 0.5 }}>Private Blockchain</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7, display: 'block', mb: 1.5 }}>
                      A network we run end to end. Every record stays inside the organisations we name.
                    </Typography>
                    <Stack direction="row" gap={0.5} flexWrap="wrap">
                      {['Enterprise', 'Central bank currency'].map(tag => (
                        <Chip key={tag} label={tag} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 500, bgcolor: alpha(theme.palette.primary.main, 0.06), color: 'text.secondary', border: 'none' }} />
                      ))}
                    </Stack>
                  </Box>
                </PortalCard>
              </Stack>
            </Stack>
          </Fade>
        )}

        {/* ─── PHASE: DAPP TYPE (public or private) ─── */}
        {phase === 'dapp-type' && (
          <Fade in mountOnEnter unmountOnExit timeout={350}>
            <Stack spacing={5} alignItems="center" justifyContent="center" sx={{ width: '100%', maxWidth: 580, px: 3, my: 'auto' }}>
              <Stack spacing={1.5} alignItems="center" textAlign="center">
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, bgcolor: 'background.paper', border: '0.5px solid', borderColor: 'divider', borderRadius: 99, px: 1.5, py: 0.4 }}>
                  <Typography sx={{ fontSize: '0.65rem', color: 'primary.main', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    dApp · Step 1 of 6
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={500} sx={{ letterSpacing: '-0.5px', color: 'text.primary', lineHeight: 1.2 }}>
                  Who can reach the dApp
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, maxWidth: 420 }}>
                  {deriveTrack(application).reason} A public dApp runs on the shared public-access network and needs the Public Dapps plan. A private dApp runs in its own permissioned network and needs the Private Dapps plan.
                </Typography>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} width="100%">
                <PortalCard selected={dappVisibility === 'public'} onClick={() => chooseDappVisibility('public')} elevation={0} sx={{ flex: 1, opacity: access.publicDapp ? 1 : 0.75 }}>
                  {dappVisibility === 'public' && (
                    <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1, width: 20, height: 20, borderRadius: '50%', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckIcon sx={{ fontSize: 11, color: '#fff' }} />
                    </Box>
                  )}
                  <Box sx={{ height: 108, bgcolor: dappVisibility === 'public' ? alpha(theme.palette.primary.main, 0.07) : alpha(theme.palette.primary.main, 0.03), display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
                    <AutoAwesomeMosaicIcon sx={{ fontSize: 48, color: dappVisibility === 'public' ? 'primary.main' : 'text.disabled' }} />
                  </Box>
                  <Box sx={{ p: '14px 14px 16px' }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                      <Typography variant="subtitle1" fontWeight={600}>Public dApp</Typography>
                      <Chip label="Default" size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', border: 'none' }} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7, display: 'block', mb: 1.5 }}>
                      Open to everyone on the Cerulea public-access network. Anyone can verify a record. Cerulea publishes no private field there.
                    </Typography>
                    <Stack direction="row" gap={0.5} flexWrap="wrap">
                      {['Marketplace', 'Registry', 'Community'].map(tag => (
                        <Chip key={tag} label={tag} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 500, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main', border: 'none' }} />
                      ))}
                    </Stack>
                    {access.publicDapp ? (
                      <Chip label="Public Dapps plan" size="small" sx={{ mt: 1.5, height: 20, fontSize: '0.62rem', fontWeight: 600, bgcolor: alpha('#10b981', 0.1), color: '#10b981', border: 'none' }} />
                    ) : (
                      <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: '#f59e0b', fontWeight: 600, fontSize: '0.65rem' }}>
                        Needs the Public Dapps plan
                      </Typography>
                    )}
                  </Box>
                </PortalCard>

                <PortalCard selected={dappVisibility === 'private'} onClick={() => chooseDappVisibility('private')} elevation={0} sx={{ flex: 1, opacity: access.privateDapp ? 1 : 0.75 }}>
                  {dappVisibility === 'private' && (
                    <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1, width: 20, height: 20, borderRadius: '50%', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckIcon sx={{ fontSize: 11, color: '#fff' }} />
                    </Box>
                  )}
                  <Box sx={{ height: 108, bgcolor: dappVisibility === 'private' ? alpha('#8b5cf6', 0.1) : alpha('#8b5cf6', 0.04), display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s' }}>
                    <DomainIcon sx={{ fontSize: 48, color: dappVisibility === 'private' ? '#8b5cf6' : 'text.disabled' }} />
                  </Box>
                  <Box sx={{ p: '14px 14px 16px' }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                      <Typography variant="subtitle1" fontWeight={600}>Private dApp</Typography>
                      {!access.privateDapp && (
                        <Chip label="Private Dapps plan" size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: alpha('#f59e0b', 0.12), color: '#f59e0b', border: 'none' }} />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7, display: 'block', mb: 1.5 }}>
                      A permissioned network of its own. Only the people we invite reach it.
                    </Typography>
                    <Stack direction="row" gap={0.5} flexWrap="wrap">
                      {['Enterprise', 'Internal tools', 'Permissioned'].map(tag => (
                        <Chip key={tag} label={tag} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 500, bgcolor: alpha('#8b5cf6', 0.08), color: '#8b5cf6', border: 'none' }} />
                      ))}
                    </Stack>
                    {access.privateDapp ? (
                      <Chip label="Private Dapps plan" size="small" sx={{ mt: 1.5, height: 20, fontSize: '0.62rem', fontWeight: 600, bgcolor: alpha('#10b981', 0.1), color: '#10b981', border: 'none' }} />
                    ) : (
                      <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: '#f59e0b', fontWeight: 600, fontSize: '0.65rem' }}>
                        Needs the Private Dapps plan
                      </Typography>
                    )}
                  </Box>
                </PortalCard>
              </Stack>

              <Box>
                <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => setPhase(divisionLockedType ? 'describe' : 'choose-type')} sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
                  Back
                </Button>
              </Box>
            </Stack>
          </Fade>
        )}

        {/* ─── PHASE: LEGACY QUESTION ─── */}
        {phase === 'legacy-question' && (
          <Fade in mountOnEnter unmountOnExit timeout={350}>
            <Stack spacing={5} alignItems="center" justifyContent="center" sx={{ width: '100%', maxWidth: 560, px: 3, my: 'auto' }}>
              <Stack spacing={1.5} alignItems="center" textAlign="center">
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, bgcolor: 'background.paper', border: '0.5px solid', borderColor: 'divider', borderRadius: 99, px: 1.5, py: 0.4 }}>
                  <Typography sx={{ fontSize: '0.65rem', color: 'primary.main', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    Private Blockchain · Step 1 of 6
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={500} sx={{ letterSpacing: '-0.5px', color: 'text.primary', lineHeight: 1.2 }}>
                  {legacyStep === 'has-legacy' ? 'Existing systems' : 'How the existing system joins'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, maxWidth: 380 }}>
                  {legacyStep === 'has-legacy'
                    ? 'Is there an existing system to connect to the Blockchain, or to move onto it'
                    : 'How should the existing system and the new network work together'}
                </Typography>
              </Stack>

              {legacyStep === 'has-legacy' ? (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} width="100%">
                  <PortalCard onClick={() => handleLegacyChoice(true)} elevation={0}>
                    <Box sx={{ height: 96, bgcolor: alpha(theme.palette.primary.main, 0.04), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DnsIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
                    </Box>
                    <Box sx={{ p: '14px 14px 16px' }}>
                      <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 0.5 }}>Yes, there is one</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.65, display: 'block' }}>
                        Connect to, or move from, a resource planning, customer or database system.
                      </Typography>
                    </Box>
                  </PortalCard>

                  <PortalCard onClick={() => handleLegacyChoice(false)} elevation={0}>
                    <Box sx={{ height: 96, bgcolor: alpha(theme.palette.primary.main, 0.07), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <BoltIcon sx={{ fontSize: 44, color: 'primary.main' }} />
                    </Box>
                    <Box sx={{ p: '14px 14px 16px' }}>
                      <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 0.5 }}>No, starting fresh</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.65, display: 'block' }}>
                        Everything starts on the Blockchain.
                      </Typography>
                    </Box>
                  </PortalCard>
                </Stack>
              ) : (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} width="100%">
                  <PortalCard onClick={() => handleLegacyProceed('connect')} elevation={0}>
                    <Box sx={{ height: 96, bgcolor: alpha(theme.palette.primary.main, 0.04), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LanIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
                    </Box>
                    <Box sx={{ p: '14px 14px 16px' }}>
                      <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 0.5 }}>Connect</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.65, display: 'block', mb: 1 }}>
                        The existing system keeps running beside the new Blockchain layer.
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'primary.main', fontSize: '0.65rem' }}>
                        Recommended · least disruption
                      </Typography>
                    </Box>
                  </PortalCard>

                  <PortalCard onClick={() => handleLegacyProceed('port')} elevation={0}>
                    <Box sx={{ height: 96, bgcolor: alpha(theme.palette.primary.main, 0.04), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AutoAwesomeMosaicIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
                    </Box>
                    <Box sx={{ p: '14px 14px 16px' }}>
                      <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 0.5 }}>Full port</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.65, display: 'block', mb: 1 }}>
                        Every record and every rule moves from the existing system onto the new network.
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                        The largest change
                      </Typography>
                    </Box>
                  </PortalCard>
                </Stack>
              )}

              {legacyStep === 'how-to-proceed' && (
                <Button size="small" variant="text" startIcon={<ArrowBackIcon />} onClick={() => setLegacyStep('has-legacy')} sx={{ color: 'text.secondary' }}>
                  Back
                </Button>
              )}
            </Stack>
          </Fade>
        )}

        {/* ─── PHASE: GALLERY (2-column grid) ─── */}
        {phase === 'gallery' && (
          <Fade in mountOnEnter unmountOnExit timeout={350}>
            <Box sx={{ width: '100%', maxWidth: 860, px: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 2 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.7, color: 'primary.main', mb: 0.5 }}>
                    {typeLabel}
                    {legacyMode !== 'none' ? ` · ${legacyMode === 'connect' ? 'Connect' : 'Full port'}` : ''} · Templates
                  </Typography>
                  <Typography variant="h5" fontWeight={500} sx={{ letterSpacing: '-0.3px', color: 'text.primary' }}>
                    Choose a starting template
                  </Typography>
                </Box>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box
                    onClick={() => { setCompareMode(m => !m); if (compareMode) setCompareSet(new Set()); }}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'pointer', px: 1.5, py: 0.75, borderRadius: 2,
                      bgcolor: compareMode ? alpha(theme.palette.primary.main, 0.1) : 'background.paper',
                      border: '0.5px solid', borderColor: compareMode ? 'primary.main' : 'divider',
                      color: compareMode ? 'primary.main' : 'text.secondary',
                      fontSize: '0.72rem', fontWeight: compareMode ? 700 : 500, userSelect: 'none', transition: 'all 0.15s',
                    }}
                  >
                    <CompareArrowsIcon sx={{ fontSize: 14 }} />
                    Compare
                    {compareSet.size > 0 && (
                      <Box sx={{ width: 16, height: 16, borderRadius: '50%', bgcolor: 'primary.main', color: '#fff', fontSize: '0.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {compareSet.size}
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'background.paper', border: '0.5px solid', borderColor: 'divider', borderRadius: 2, px: 1.5, py: 0.75 }}>
                    <SearchIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search"
                      aria-label="Search the templates"
                      style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: '0.75rem', width: 140, color: theme.palette.text.primary }}
                    />
                  </Box>
                </Stack>
              </Box>

              <Box sx={{ display: 'flex', gap: 0.75, mb: 2, flexWrap: 'wrap' }}>
                {categories.map(c => (
                  <Box
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    sx={{
                      px: 1.75, py: 0.4, borderRadius: 99, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 500,
                      bgcolor: categoryFilter === c ? 'primary.main' : 'background.paper',
                      color: categoryFilter === c ? '#fff' : 'text.secondary',
                      border: '0.5px solid', borderColor: categoryFilter === c ? 'primary.main' : 'divider',
                      transition: 'all 0.15s', userSelect: 'none',
                    }}
                  >
                    {c}
                  </Box>
                ))}
              </Box>

              {compareMode && (
                <Box sx={{ mb: 1.5, px: 1.5, py: 1, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.06), border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}` }}>
                  <Typography variant="caption" color="primary.main" fontWeight={600}>
                    Compare mode. Select two or three templates to read them side by side.
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, pb: compareMode && compareSet.size >= 2 ? 0 : 4 }}>
                {!compareMode && (
                  <GalleryCard
                    selected={selectedTemplate === 'scratch'}
                    elevation={0}
                    onClick={() => selectTemplate({ id: 'scratch', title: 'Blank canvas', description: 'An empty canvas. We add outcomes in the Blueprint step.', category: 'Custom', tags: [], preinstalledModules: [], projectType: dType ?? 'dapp' })}
                  >
                    {selectedTemplate === 'scratch' && (
                      <Box sx={{ position: 'absolute', top: 10, right: 10, width: 16, height: 16, borderRadius: '50%', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckIcon sx={{ fontSize: 9, color: '#fff' }} />
                      </Box>
                    )}
                    <Box sx={{ width: 34, height: 34, borderRadius: '8px', bgcolor: alpha(theme.palette.primary.main, 0.05), border: `1px dashed ${alpha(theme.palette.primary.main, 0.2)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.25 }}>
                      <AddIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    </Box>
                    <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>Blank canvas</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      No module installed yet
                    </Typography>
                    <Chip label="0 modules" size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: alpha(theme.palette.primary.main, 0.05), color: 'text.secondary' }} />
                  </GalleryCard>
                )}

                {filteredTemplates.map(t => {
                  const inCompare = compareSet.has(t.id);
                  const compareDisabled = compareMode && compareSet.size >= 3 && !inCompare;
                  const count = templateModules(t).length;
                  return (
                    <GalleryCard
                      key={t.id}
                      selected={compareMode ? inCompare : selectedTemplate === t.id}
                      elevation={0}
                      data-testid="template-card"
                      onClick={() => {
                        if (!compareMode) { selectTemplate(t); return; }
                        if (compareDisabled) return;
                        setCompareSet(prev => { const next = new Set(prev); if (next.has(t.id)) next.delete(t.id); else next.add(t.id); return next; });
                      }}
                      sx={compareDisabled ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                    >
                      {(compareMode ? inCompare : selectedTemplate === t.id) && (
                        <Box sx={{ position: 'absolute', top: 10, right: 10, width: 16, height: 16, borderRadius: '50%', bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <CheckIcon sx={{ fontSize: 9, color: '#fff' }} />
                        </Box>
                      )}
                      <Box sx={{ width: 34, height: 34, borderRadius: '8px', bgcolor: alpha(theme.palette.primary.main, 0.07), display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.25 }}>
                        <BoltIcon sx={{ fontSize: 17, color: 'primary.main' }} />
                      </Box>
                      <Stack direction="row" alignItems="center" spacing={0.75} mb={0.5} pr={2.5}>
                        <Typography variant="body2" fontWeight={500}>{t.title}</Typography>
                        <Chip label={t.category} size="small" sx={{ height: 16, fontSize: '0.58rem', fontWeight: 500, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main' }} />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, lineHeight: 1.5 }}>
                        {t.description}
                      </Typography>
                      <Chip label={`${count} modules`} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: alpha(theme.palette.primary.main, 0.05), color: 'text.secondary' }} />
                    </GalleryCard>
                  );
                })}

                {loadingTemplates && (
                  <Box sx={{ gridColumn: '1/-1', py: 3, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">Reading the templates</Typography>
                  </Box>
                )}
              </Box>

              {compareMode && compareSet.size >= 2 && (() => {
                const compareTemplates = Array.from(compareSet).map(id => templates.find(t => t.id === id)).filter(Boolean) as Template[];
                const allModules = Array.from(new Set(compareTemplates.flatMap(t => templateModules(t))));
                const columns = `120px repeat(${compareTemplates.length}, 1fr)`;
                return (
                  <Box sx={{ mt: 2, mb: 4, borderRadius: 2, border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`, overflow: 'hidden' }}>
                    <Box sx={{ px: 2, py: 1.25, bgcolor: alpha(theme.palette.primary.main, 0.06), borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="caption" fontWeight={700} color="primary.main" sx={{ letterSpacing: 0.5, textTransform: 'uppercase', fontSize: '0.63rem' }}>
                        Comparing {compareTemplates.length} templates
                      </Typography>
                      <Box onClick={() => { setCompareSet(new Set()); setCompareMode(false); }} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </Box>
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: columns, borderBottom: `1px solid ${theme.palette.divider}` }}>
                      <Box sx={{ p: 1.5, bgcolor: 'background.default' }} />
                      {compareTemplates.map(t => (
                        <Box key={t.id} sx={{ p: 1.5, borderLeft: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}>
                          <Typography variant="body2" fontWeight={700} sx={{ mb: 0.25 }}>{t.title}</Typography>
                          <Chip label={t.category} size="small" sx={{ height: 15, fontSize: '0.57rem', bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main' }} />
                        </Box>
                      ))}
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: columns, borderBottom: `1px solid ${theme.palette.divider}` }}>
                      <Box sx={{ p: 1.25, bgcolor: 'background.default', display: 'flex', alignItems: 'flex-start' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Description</Typography>
                      </Box>
                      {compareTemplates.map(t => (
                        <Box key={t.id} sx={{ p: 1.25, borderLeft: `1px solid ${theme.palette.divider}` }}>
                          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>{t.description}</Typography>
                        </Box>
                      ))}
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: columns, borderBottom: `1px solid ${theme.palette.divider}` }}>
                      <Box sx={{ p: 1.25, bgcolor: 'background.default', display: 'flex', alignItems: 'flex-start' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>Modules</Typography>
                      </Box>
                      {compareTemplates.map(t => (
                        <Box key={t.id} sx={{ p: 1.25, borderLeft: `1px solid ${theme.palette.divider}` }}>
                          <Typography variant="caption" fontWeight={700} color="primary.main">{templateModules(t).length}</Typography>
                          <Typography variant="caption" color="text.secondary"> installed</Typography>
                        </Box>
                      ))}
                    </Box>
                    {allModules.map(mod => (
                      <Box key={mod} sx={{ display: 'grid', gridTemplateColumns: columns, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}` }}>
                        <Box sx={{ p: 1, bgcolor: 'background.default', display: 'flex', alignItems: 'center', pl: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>{mod}</Typography>
                        </Box>
                        {compareTemplates.map(t => (
                          <Box key={t.id} sx={{ p: 1, borderLeft: `1px solid ${theme.palette.divider}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {templateModules(t).includes(mod)
                              ? <CheckIcon sx={{ fontSize: 13, color: '#10b981' }} />
                              : <Box sx={{ width: 12, height: 1.5, bgcolor: alpha(theme.palette.text.secondary, 0.2), borderRadius: 1 }} />}
                          </Box>
                        ))}
                      </Box>
                    ))}
                    <Box sx={{ display: 'grid', gridTemplateColumns: columns, bgcolor: alpha(theme.palette.primary.main, 0.03) }}>
                      <Box sx={{ p: 1.5, bgcolor: 'background.default' }} />
                      {compareTemplates.map(t => (
                        <Box key={t.id} sx={{ p: 1.5, borderLeft: `1px solid ${theme.palette.divider}` }}>
                          <Button size="small" variant="outlined" fullWidth onClick={() => { selectTemplate(t); setCompareMode(false); setCompareSet(new Set()); }} sx={{ fontSize: '0.7rem', borderRadius: 1.5, py: 0.5 }}>
                            Use this
                          </Button>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                );
              })()}
            </Box>
          </Fade>
        )}

        {/* ─── PHASE: DETAILS (split panel) ─── */}
        {phase === 'details' && (
          <Fade in mountOnEnter unmountOnExit timeout={350}>
            <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', px: 3 }}>
              <Box sx={{ width: '100%', maxWidth: 1100, mb: 2 }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.7, color: 'primary.main', mb: 0.5 }}>
                  {typeLabel}
                  {selectedTemplateName ? ` · ${selectedTemplateName}` : ''} · Details
                </Typography>
                <Typography variant="h5" fontWeight={500} sx={{ letterSpacing: '-0.3px', color: 'text.primary' }}>
                  The project details
                </Typography>
              </Box>

              {failure && (
                <Alert severity="error" variant="outlined" sx={{ width: '100%', maxWidth: 1100, mb: 2 }}>
                  {failure.message} {failure.fix}
                </Alert>
              )}

              <SplitGlassPanel elevation={0}>
                <ConfigSection sx={{ borderRight: { md: `0.5px solid ${theme.palette.divider}` } }}>
                  <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
                    <Box sx={{ width: 28, height: 28, borderRadius: '7px', bgcolor: alpha(theme.palette.primary.main, 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DomainIcon sx={{ fontSize: 15, color: 'primary.main' }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>Identity</Typography>
                      <Typography variant="caption" color="text.secondary">The name and the workspace</Typography>
                    </Box>
                  </Stack>

                  <Stack spacing={2.5}>
                    <TextField
                      label="Project name" fullWidth value={name}
                      onChange={e => setName(e.target.value)} variant="outlined" size="small"
                      error={name.length > 0 && !!nameFix}
                      helperText={name.length > 0 ? nameFix : undefined}
                      inputProps={{ 'data-testid': 'project-name' }}
                    />
                    <TextField
                      label="Address" fullWidth value={slug} size="small"
                      InputProps={{ readOnly: true }}
                      helperText={
                        <Typography component="span" sx={{ fontSize: '0.7rem', color: 'primary.main', fontFamily: 'monospace' }}>
                          studio.cerulea.io/{slug || 'the-name'}{assignedSlug ? '' : ' · Cerulea assigns the address from the name when the project opens.'}
                        </Typography>
                      }
                    />
                    <Box>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.75}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: 0.4 }}>
                          Workspace
                        </Typography>
                        <Button size="small" startIcon={<AddIcon sx={{ fontSize: 12 }} />} onClick={() => { setWsDialogOpen(true); setWsNewName(''); }} sx={{ fontSize: '0.7rem', p: '2px 8px', minWidth: 0, color: 'primary.main' }} disabled={!!projectId}>
                          New
                        </Button>
                      </Stack>
                      <Select
                        fullWidth value={wsId} size="small" disabled={!!projectId}
                        onChange={e => { setWsId(e.target.value); setStudioState({ workspaceId: e.target.value }); }}
                        displayEmpty MenuProps={OPAQUE_MENU_PROPS as any}
                      >
                        <MenuItem value="">The division workspace</MenuItem>
                        {workspaces.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                      </Select>
                      {projectId && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          A project stays in the workspace it opened in.
                        </Typography>
                      )}
                    </Box>
                    <TextField
                      label="Description" multiline rows={3} fullWidth size="small"
                      value={description} onChange={e => setDescription(e.target.value)}
                      placeholder="What this system does, in a sentence or two"
                      helperText="This sentence reaches the Deployment Manifest, where we compare what we asked for with what we get."
                      inputProps={{ 'data-testid': 'project-description' }}
                    />
                  </Stack>
                </ConfigSection>

                <ConfigSection sx={{ bgcolor: alpha(theme.palette.primary.main, 0.015) }}>
                  <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
                    <Box sx={{ width: 28, height: 28, borderRadius: '7px', bgcolor: alpha(theme.palette.primary.main, 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DnsIcon sx={{ fontSize: 15, color: 'primary.main' }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>The network</Typography>
                      <Typography variant="caption" color="text.secondary">Where the system runs and how it keeps history</Typography>
                    </Box>
                  </Stack>

                  <NetworkPanel
                    division={division}
                    derivation={derivation}
                    onDerivationChange={(next) => {
                      setDerivation(next);
                      if (dType === 'dapp') setDappVisibility(next.track === 'blockchain' ? 'private' : 'public');
                    }}
                    publishSelected={publishSelected}
                    onPublishSelectedChange={setPublishSelected}
                    planNote={planNote}
                    blockSeconds={blockSeconds}
                    onBlockSecondsChange={setBlockSeconds}
                    historyRetentionDays={retentionDays}
                    onHistoryRetentionDaysChange={setRetentionDays}
                  />

                  <Box sx={{ mt: 2.5, p: 1.5, bgcolor: 'background.paper', border: '0.5px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      The template installs its parts and their record shapes into the Blueprint. We add, remove or change parts freely in the Blueprint step.
                      {outcomeIds.length > 0 ? ` ${outcomeIds.length} outcomes from the description join the Blueprint step as well.` : ''}
                    </Typography>
                  </Box>
                </ConfigSection>
              </SplitGlassPanel>
            </Box>
          </Fade>
        )}

      </Box>

      {/* FLOATING ISLAND, the bottom dock for every phase after the first */}
      {phase !== 'describe' && phase !== 'choose-type' && (
        <Box sx={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: 2 }}>
          <FloatingIsland elevation={0}>
            <Button
              size="small"
              startIcon={<ArrowBackIcon sx={{ fontSize: 14 }} />}
              onClick={() => {
                if (phase === 'legacy-question') setPhase(divisionLockedType ? 'describe' : 'choose-type');
                else if (phase === 'dapp-type') setPhase(divisionLockedType ? 'describe' : 'choose-type');
                else if (phase === 'gallery') goBackFromGallery();
                else if (phase === 'details') setPhase('gallery');
              }}
              sx={{ borderRadius: 99, px: 1.75, py: 0.75, fontSize: '0.72rem', color: 'text.secondary', border: '0.5px solid', borderColor: 'divider', fontWeight: 400, minWidth: 0, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) } }}
            >
              Back
            </Button>

            {phase === 'gallery' && (
              <>
                <Divider orientation="vertical" flexItem sx={{ height: 22, my: 'auto', mx: 0.5 }} />
                <Typography sx={{ fontSize: '0.72rem', fontWeight: 500, px: 1.25, color: selectedTemplate ? 'primary.main' : 'text.secondary' }}>
                  {selectedTemplate
                    ? <><CheckIcon sx={{ fontSize: 11, verticalAlign: 'middle', mr: 0.5 }} />{selectedTemplateName}</>
                    : 'Select a template'}
                </Typography>
              </>
            )}

            <Divider orientation="vertical" flexItem sx={{ height: 22, my: 'auto', mx: 0.5 }} />

            {phase === 'gallery' && (
              <Button variant="contained" disabled={!selectedTemplate} onClick={onConfirmTemplate} endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />} sx={{ borderRadius: 99, px: 2.5, fontSize: '0.72rem', fontWeight: 500, boxShadow: 'none' }}>
                Details
              </Button>
            )}

            {(phase === 'legacy-question' || phase === 'dapp-type') && (
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', px: 1 }}>
                Choose an option above
              </Typography>
            )}

            {phase === 'details' && (
              <>
                {saveText && (
                  <Typography sx={{ fontSize: '0.68rem', color: saveState === 'failed' ? 'error.main' : 'text.secondary', px: 1 }} data-testid="foundation-save-state">
                    {saveText}
                  </Typography>
                )}
                <Button variant="contained" disabled={!canInitialise} onClick={() => void onInitialize()} data-testid="initialize-project" sx={{ borderRadius: 99, px: 2.5, fontSize: '0.72rem', fontWeight: 500, boxShadow: 'none' }}>
                  {projectId ? 'Save and continue' : 'Initialise project'}
                </Button>
              </>
            )}
          </FloatingIsland>
        </Box>
      )}

      {/* Workspace dialog */}
      <Dialog open={wsDialogOpen} onClose={() => setWsDialogOpen(false)} PaperProps={{ sx: { borderRadius: 3, p: 0.5, width: 320 } }}>
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 500 }}>New workspace</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, lineHeight: 1.6 }}>
            A workspace groups projects and holds the team that reaches them. It serves the division of this address.
          </Typography>
          <TextField autoFocus margin="dense" label="Workspace name" fullWidth size="small" value={wsNewName} onChange={e => setWsNewName(e.target.value)} sx={{ mb: 1 }} />
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
          <Button onClick={() => setWsDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={() => void createWorkspace()} sx={{ borderRadius: 2, boxShadow: 'none' }}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
