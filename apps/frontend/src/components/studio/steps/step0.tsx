'use client';

import * as React from 'react';
import { useStudio } from '@/context/StudioContext';
import { useSession } from 'next-auth/react';
import AuthModal from '@/components/auth/AuthModal';
import {
  Box, Typography, Stack, Paper, Button, Chip, TextField, Select, MenuItem,
  InputLabel, FormControl, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, Fade,
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

/* ---------- Types ---------- */
type Workspace = { id: string; name: string; slug: string; createdAt: string };
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
};

type Step0Phase = 'choose-type' | 'dapp-type' | 'legacy-question' | 'gallery' | 'details';
type LegacyMode = 'none' | 'connect' | 'port';
type DappVisibility = 'public' | 'private';

/* ---------- Utils ---------- */
function slugify(raw: string) {
  return raw.toLowerCase().normalize('NFKD').replace(/[^\w\s-]+/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60);
}

const PHASE_TO_SUBSTEP: Record<Step0Phase, number> = {
  'choose-type': 0,
  'dapp-type': 1,
  'legacy-question': 1,
  'gallery': 2,
  'details': 3,
};

/* ---------- Styled Components ---------- */

// Floating pill dock at bottom
const FloatingIsland = styled(Paper)(({ theme }) => ({
  background: theme.palette.mode === 'light'
    ? 'rgba(255,255,255,0.96)'
    : 'rgba(8,14,36,0.96)',
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

// Type selection card (choose-type + legacy-question phases)
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

// Gallery grid card
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

// Split configure panel
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

// Opaque menu props (no near-black)
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

/* ====================================================================== */
export default function Step0({
  goNext,
  onSubStepChange,
}: {
  goNext: () => void;
  onSubStepChange?: (subStep: number) => void;
}) {
  const theme = useTheme();
  const { projectType, templateId, appMetadata, workspaceId, setStudioState } = useStudio();
  const { data: session } = useSession();

  const userPlan = (session?.user as any)?.plan as string | undefined;
  const canUsePublicDapp = userPlan === 'public_dapps' || userPlan === 'pro';
  const canUsePrivateDapp = userPlan === 'private_dapps' || userPlan === 'private_dapps_pro' || userPlan === 'pro' || userPlan === 'enterprise';

  /* ---- State ---- */
  const [phase, setPhaseRaw] = React.useState<Step0Phase>(projectType ? 'gallery' : 'choose-type');
  const [dType, setDType] = React.useState<ProjectType | null>(projectType);
  const [dappVisibility, setDappVisibility] = React.useState<DappVisibility | null>(null);
  const [authModalOpen, setAuthModalOpen] = React.useState(false);
  const [pendingType, setPendingType] = React.useState<ProjectType | null>(null);
  const [pendingPrivateDapp, setPendingPrivateDapp] = React.useState(false);
  const [legacyMode, setLegacyMode] = React.useState<LegacyMode>('none');
  const [legacyStep, setLegacyStep] = React.useState<'has-legacy' | 'how-to-proceed'>('has-legacy');
  const [templates, setTemplates] = React.useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = React.useState(false);
  const [workspaces, setWorkspaces] = React.useState<Workspace[]>([]);
  const [selectedTemplate, setSelectedTemplate] = React.useState<string | null>(templateId ?? null);
  const [search, setSearch] = React.useState('');
  const [categoryFilter, setCategoryFilter] = React.useState('All');

  // Form state
  const [name, setName] = React.useState(appMetadata?.appName ?? '');
  const [slug, setSlug] = React.useState(slugify(appMetadata?.appName ?? ''));
  const [slugDirty, setSlugDirty] = React.useState(false);
  const [description, setDescription] = React.useState(appMetadata?.appDescription ?? '');
  const [wsId, setWsId] = React.useState(workspaceId ?? '');

  // Dialogs
  const [wsDialogOpen, setWsDialogOpen] = React.useState(false);
  const [wsNewName, setWsNewName] = React.useState('');
  const [wsType, setWsType] = React.useState<'personal' | 'team'>('personal');

  // Deep config
  const [dappDetails, setDappDetails] = React.useState({
    network: 'cerulea-testnet', tokenFocus: [] as string[], royalties: 5, monetization: [] as string[], emailSender: '',
  });
  const [chainDetails, setChainDetails] = React.useState({
    consensus: 'PoA', region: 'apac-south', initialValidators: 2,
    nativeToken: { symbol: 'CER', decimals: 18 },
    feeModel: { baseGas: 1, burnPct: 0.2, validatorSharePct: 0.8 },
  });

  /* ---- Phase helper — reports to shell sidebar ---- */
  const setPhase = React.useCallback((p: Step0Phase) => {
    setPhaseRaw(p);
    onSubStepChange?.(PHASE_TO_SUBSTEP[p] ?? 0);
  }, [onSubStepChange]);

  // Report initial phase on mount
  React.useEffect(() => {
    onSubStepChange?.(PHASE_TO_SUBSTEP[phase] ?? 0);
  }, []); // eslint-disable-line

  /* ---- Effects ---- */
  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/workspaces');
        const data = await r.json();
        setWorkspaces(data);
        if (!wsId && data.length) { setWsId(data[0].id); setStudioState({ workspaceId: data[0].id }); }
      } catch {}
    })();
  }, []); // eslint-disable-line

  const loadTemplates = React.useCallback(async (ptype: ProjectType) => {
    setLoadingTemplates(true);
    try {
      const r = await fetch(`/api/templates?projectType=${ptype}`);
      setTemplates(await r.json());
    } finally { setLoadingTemplates(false); }
  }, []);

  React.useEffect(() => {
    if (dType && phase === 'gallery' && templates.length === 0) loadTemplates(dType);
  }, [dType, phase]); // eslint-disable-line

  React.useEffect(() => { if (!slugDirty) setSlug(slugify(name)); }, [name, slugDirty]);

  /* ---- Handlers ---- */
  const proceedToGallery = (ptype: ProjectType, lmode: LegacyMode = 'none', visibility: DappVisibility = 'public') => {
    setDType(ptype);
    setStudioState({ projectType: ptype, dappVisibility: ptype === 'dapp' ? visibility : null, templateId: null, legacyMode: lmode } as any);
    setSelectedTemplate(null);
    setSearch('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cerulea.templateModules');
      localStorage.setItem('cerulea.projectType', ptype);
      if (ptype === 'dapp') localStorage.setItem('cerulea.dappVisibility', visibility);
      localStorage.removeItem('cerulea.templateId');
    }
    setPhase('gallery');
    loadTemplates(ptype);
  };

  const chooseType = (ptype: ProjectType) => {
    if (!session) { setPendingType(ptype); setAuthModalOpen(true); return; }
    if (ptype === 'blockchain') {
      setDType(ptype);
      setLegacyStep('has-legacy');
      setPhase('legacy-question');
    } else {
      // dApp — ask public vs private
      setDType(ptype);
      setPhase('dapp-type');
    }
  };

  const chooseDappVisibility = (visibility: DappVisibility) => {
    if (visibility === 'public' && !canUsePublicDapp) {
      if (typeof window !== 'undefined') window.location.href = '/dashboard/billing?upgrade=public-dapp';
      return;
    }
    if (visibility === 'private' && !canUsePrivateDapp) {
      if (typeof window !== 'undefined') window.location.href = '/dashboard/billing?upgrade=private-dapp';
      return;
    }
    setDappVisibility(visibility);
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
      setName(prev => prev || tpl.title);
      setSlug(prev => prev || slugify(tpl.title));
      setDescription(prev => prev || tpl.description);
    }
  };

  const onConfirmTemplate = () => {
    if (!selectedTemplate) return;
    setStudioState({ templateId: selectedTemplate });
    setPhase('details');
  };

  const onInitialize = async () => {
    if (!dType || !name || name.trim().length < 3 || !slug) return;
    const payload: any = {
      name, slug, description, projectType: dType,
      dappVisibility: dType === 'dapp' ? (dappVisibility ?? 'public') : null,
      templateId: selectedTemplate ?? null, workspaceId: wsId || null,
      details: dType === 'dapp' ? { dapp: { ...dappDetails, visibility: dappVisibility ?? 'public' } } : { blockchain: chainDetails },
    };
    try {
      const res = await fetch('/api/projects', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { alert('Failed to create project'); return; }
      const proj = await res.json();
      setStudioState({ projectId: proj.id, slug: proj.slug, appMetadata: { appName: name, appDescription: description } });
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cerulea.step1.graph');
        let modulesToLoad: string[] = [];
        if (selectedTemplate && selectedTemplate !== 'scratch') {
          const tpl = templates.find(t => t.id === selectedTemplate);
          if (tpl) modulesToLoad = tpl.preinstalledModules || [];
        }
        localStorage.setItem('cerulea.templateModules', JSON.stringify(modulesToLoad));
        localStorage.setItem('cerulea.projectType', dType);
        if (dType === 'dapp') localStorage.setItem('cerulea.dappVisibility', dappVisibility ?? 'public');
      }
      goNext();
    } catch (e) { console.error(e); }
  };

  const createWorkspace = async () => {
    if (!wsNewName.trim()) return;
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: wsNewName.trim(), type: wsType }),
      });
      if (!res.ok) throw new Error();
      const ws = await res.json();
      setWorkspaces((w) => [ws, ...w]);
      setWsId(ws.id);
    } catch { alert('Create failed'); } finally { setWsDialogOpen(false); setWsNewName(''); }
  };

  const categories = React.useMemo(() => {
    const cats = new Set(templates.map(t => t.category));
    return ['All', ...Array.from(cats)];
  }, [templates]);

  const filteredTemplates = React.useMemo(() => {
    let arr = templates;
    if (categoryFilter !== 'All') arr = arr.filter(t => t.category === categoryFilter);
    if (search.trim()) {
      arr = arr.filter(t => `${t.title} ${t.description} ${t.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase()));
    }
    return arr;
  }, [templates, search, categoryFilter]);

  const selectedTemplateName = React.useMemo(() => {
    if (!selectedTemplate) return null;
    if (selectedTemplate === 'scratch') return 'Blank canvas';
    return templates.find(t => t.id === selectedTemplate)?.title ?? 'Template';
  }, [selectedTemplate, templates]);

  /* ---- Helpers for back navigation ---- */
  const goBackFromGallery = () => {
    if (dType === 'blockchain') setPhase('legacy-question');
    else setPhase('dapp-type');
  };

  /* ================================================================ */
  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      bgcolor: 'background.default',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Auth gate modal */}
      <AuthModal
        open={authModalOpen}
        title="Sign in to continue"
        subtitle="Create a free account or sign in to start building your project."
        onSuccess={() => {
          setAuthModalOpen(false);
          if (pendingType === 'blockchain') {
            setDType('blockchain');
            setLegacyStep('has-legacy');
            setPhase('legacy-question');
          } else if (pendingType === 'dapp') {
            setDType('dapp');
            setPhase('dapp-type');
          } else if (pendingType) {
            proceedToGallery(pendingType);
          }
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

      {/* ══════════════════════════════════════════════════════════ */}
      {/* CONTENT AREA — scrollable, phases render here            */}
      {/* ══════════════════════════════════════════════════════════ */}
      <Box sx={{
        flex: 1,
        width: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pt: 4,
        pb: 2,
        position: 'relative',
        zIndex: 1,
      }}>

        {/* ─── PHASE: CHOOSE TYPE ─── */}
        {phase === 'choose-type' && (
          <Fade in mountOnEnter unmountOnExit timeout={350}>
            <Stack spacing={5} alignItems="center" justifyContent="center"
              sx={{ width: '100%', maxWidth: 560, px: 3, my: 'auto' }}>

              {/* Badge */}
              <Stack spacing={1.5} alignItems="center" textAlign="center">
                <Box sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.6,
                  bgcolor: 'background.paper', border: '0.5px solid', borderColor: 'divider',
                  borderRadius: 99, px: 1.5, py: 0.4,
                }}>
                  <Typography sx={{ fontSize: '0.65rem', color: 'primary.main', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    Step 1 of 6 · Foundation
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={500} sx={{ letterSpacing: '-0.5px', color: 'text.primary', lineHeight: 1.2 }}>
                  What are you building?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, maxWidth: 380 }}>
                  Your choice determines the module catalog, templates, and deployment targets available to you.
                </Typography>
              </Stack>

              {/* Type cards */}
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} width="100%">
                {/* dApp */}
                <PortalCard selected={dType === 'dapp'} onClick={() => chooseType('dapp')} elevation={0}>
                  {dType === 'dapp' && (
                    <Box sx={{
                      position: 'absolute', top: 10, right: 10, zIndex: 1,
                      width: 20, height: 20, borderRadius: '50%', bgcolor: 'primary.main',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <CheckIcon sx={{ fontSize: 11, color: '#fff' }} />
                    </Box>
                  )}
                  <Box sx={{
                    height: 108,
                    bgcolor: dType === 'dapp' ? alpha(theme.palette.primary.main, 0.07) : alpha(theme.palette.primary.main, 0.03),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}>
                    <AutoAwesomeMosaicIcon sx={{ fontSize: 48, color: dType === 'dapp' ? 'primary.main' : 'text.disabled' }} />
                  </Box>
                  <Box sx={{ p: '14px 14px 16px' }}>
                    <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 0.5 }}>dApp</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7, display: 'block', mb: 1.5 }}>
                      Public chain. Users own assets through wallets.
                    </Typography>
                    <Stack direction="row" gap={0.5} flexWrap="wrap">
                      {['NFT', 'DeFi', 'DAO'].map(tag => (
                        <Chip key={tag} label={tag} size="small" sx={{
                          height: 20, fontSize: '0.65rem', fontWeight: 500,
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                          color: 'primary.main', border: 'none',
                        }} />
                      ))}
                    </Stack>
                  </Box>
                </PortalCard>

                {/* Private Blockchain */}
                <PortalCard selected={dType === 'blockchain'} onClick={() => chooseType('blockchain')} elevation={0}>
                  {dType === 'blockchain' && (
                    <Box sx={{
                      position: 'absolute', top: 10, right: 10, zIndex: 1,
                      width: 20, height: 20, borderRadius: '50%', bgcolor: 'primary.main',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <CheckIcon sx={{ fontSize: 11, color: '#fff' }} />
                    </Box>
                  )}
                  <Box sx={{
                    height: 108,
                    bgcolor: dType === 'blockchain' ? alpha(theme.palette.primary.main, 0.07) : alpha(theme.palette.primary.main, 0.03),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}>
                    <LanIcon sx={{ fontSize: 48, color: dType === 'blockchain' ? 'primary.main' : 'text.disabled' }} />
                  </Box>
                  <Box sx={{ p: '14px 14px 16px' }}>
                    <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 0.5 }}>Private blockchain</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7, display: 'block', mb: 1.5 }}>
                      Sovereign network you control end to end.
                    </Typography>
                    <Stack direction="row" gap={0.5} flexWrap="wrap">
                      {['Enterprise', 'CBDC'].map(tag => (
                        <Chip key={tag} label={tag} size="small" sx={{
                          height: 20, fontSize: '0.65rem', fontWeight: 500,
                          bgcolor: alpha(theme.palette.primary.main, 0.06),
                          color: 'text.secondary', border: 'none',
                        }} />
                      ))}
                    </Stack>
                  </Box>
                </PortalCard>
              </Stack>
            </Stack>
          </Fade>
        )}

        {/* ─── PHASE: DAPP TYPE (public vs private) ─── */}
        {phase === 'dapp-type' && (
          <Fade in mountOnEnter unmountOnExit timeout={350}>
            <Stack spacing={5} alignItems="center" justifyContent="center"
              sx={{ width: '100%', maxWidth: 580, px: 3, my: 'auto' }}>

              <Stack spacing={1.5} alignItems="center" textAlign="center">
                <Box sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.6,
                  bgcolor: 'background.paper', border: '0.5px solid', borderColor: 'divider',
                  borderRadius: 99, px: 1.5, py: 0.4,
                }}>
                  <Typography sx={{ fontSize: '0.65rem', color: 'primary.main', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    dApp · Step 1 of 6
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={500} sx={{ letterSpacing: '-0.5px', color: 'text.primary', lineHeight: 1.2 }}>
                  Who can access your dApp?
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, maxWidth: 400 }}>
                  Public dApps deploy on Cerulea's shared public network and are accessible to any wallet — requires the Public Dapps plan. Private dApps run on your own isolated environment with permissioned access — requires the Private Dapps plan.
                </Typography>
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} width="100%">
                {/* Public dApp */}
                <PortalCard selected={dappVisibility === 'public'} onClick={() => chooseDappVisibility('public')} elevation={0} sx={{ flex: 1, opacity: canUsePublicDapp ? 1 : 0.75 }}>
                  {dappVisibility === 'public' && (
                    <Box sx={{
                      position: 'absolute', top: 10, right: 10, zIndex: 1,
                      width: 20, height: 20, borderRadius: '50%', bgcolor: 'primary.main',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <CheckIcon sx={{ fontSize: 11, color: '#fff' }} />
                    </Box>
                  )}
                  <Box sx={{
                    height: 108,
                    bgcolor: dappVisibility === 'public' ? alpha(theme.palette.primary.main, 0.07) : alpha(theme.palette.primary.main, 0.03),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}>
                    <AutoAwesomeMosaicIcon sx={{ fontSize: 48, color: dappVisibility === 'public' ? 'primary.main' : 'text.disabled' }} />
                  </Box>
                  <Box sx={{ p: '14px 14px 16px' }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                      <Typography variant="subtitle1" fontWeight={600}>Public dApp</Typography>
                      {!canUsePublicDapp && (
                        <Chip label="Public Dapps plan" size="small" sx={{
                          height: 18, fontSize: '0.6rem', fontWeight: 700,
                          bgcolor: alpha('#f59e0b', 0.12), color: '#f59e0b', border: 'none',
                        }} />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7, display: 'block', mb: 1.5 }}>
                      Open to all users on Cerulea's public network. Anyone with a wallet can interact.
                    </Typography>
                    <Stack direction="row" gap={0.5} flexWrap="wrap">
                      {['NFT', 'DeFi', 'DAO', 'Marketplace'].map(tag => (
                        <Chip key={tag} label={tag} size="small" sx={{
                          height: 20, fontSize: '0.65rem', fontWeight: 500,
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                          color: 'primary.main', border: 'none',
                        }} />
                      ))}
                    </Stack>
                    {canUsePublicDapp ? (
                      <Chip label="Public Dapps plan" size="small" sx={{
                        mt: 1.5, height: 20, fontSize: '0.62rem', fontWeight: 600,
                        bgcolor: alpha('#10b981', 0.1), color: '#10b981', border: 'none',
                      }} />
                    ) : (
                      <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: '#f59e0b', fontWeight: 600, fontSize: '0.65rem' }}>
                        Requires Public Dapps plan →
                      </Typography>
                    )}
                  </Box>
                </PortalCard>

                {/* Private dApp */}
                <PortalCard
                  selected={dappVisibility === 'private'}
                  onClick={() => chooseDappVisibility('private')}
                  elevation={0}
                  sx={{ flex: 1, opacity: canUsePrivateDapp ? 1 : 0.75 }}
                >
                  {dappVisibility === 'private' && (
                    <Box sx={{
                      position: 'absolute', top: 10, right: 10, zIndex: 1,
                      width: 20, height: 20, borderRadius: '50%', bgcolor: 'primary.main',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <CheckIcon sx={{ fontSize: 11, color: '#fff' }} />
                    </Box>
                  )}
                  <Box sx={{
                    height: 108,
                    bgcolor: dappVisibility === 'private' ? alpha('#8b5cf6', 0.1) : alpha('#8b5cf6', 0.04),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}>
                    <DomainIcon sx={{ fontSize: 48, color: dappVisibility === 'private' ? '#8b5cf6' : 'text.disabled' }} />
                  </Box>
                  <Box sx={{ p: '14px 14px 16px' }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                      <Typography variant="subtitle1" fontWeight={600}>Private dApp</Typography>
                      {!canUsePrivateDapp && (
                        <Chip label="Private Dapps plan" size="small" sx={{
                          height: 18, fontSize: '0.6rem', fontWeight: 700,
                          bgcolor: alpha('#f59e0b', 0.12), color: '#f59e0b', border: 'none',
                        }} />
                      )}
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7, display: 'block', mb: 1.5 }}>
                      Isolated environment with permissioned access. Only invited wallets can interact.
                    </Typography>
                    <Stack direction="row" gap={0.5} flexWrap="wrap">
                      {['Enterprise', 'Internal Tools', 'Permissioned'].map(tag => (
                        <Chip key={tag} label={tag} size="small" sx={{
                          height: 20, fontSize: '0.65rem', fontWeight: 500,
                          bgcolor: alpha('#8b5cf6', 0.08),
                          color: '#8b5cf6', border: 'none',
                        }} />
                      ))}
                    </Stack>
                    {canUsePrivateDapp ? (
                      <Chip label="Private Dapps plan" size="small" sx={{
                        mt: 1.5, height: 20, fontSize: '0.62rem', fontWeight: 600,
                        bgcolor: alpha('#10b981', 0.1), color: '#10b981', border: 'none',
                      }} />
                    ) : (
                      <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: '#f59e0b', fontWeight: 600, fontSize: '0.65rem' }}>
                        Requires Private Dapps plan →
                      </Typography>
                    )}
                  </Box>
                </PortalCard>
              </Stack>

              <Box>
                <Button
                  size="small"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => setPhase('choose-type')}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'text.primary' } }}
                >
                  Back
                </Button>
              </Box>
            </Stack>
          </Fade>
        )}

        {/* ─── PHASE: LEGACY QUESTION ─── */}
        {phase === 'legacy-question' && (
          <Fade in mountOnEnter unmountOnExit timeout={350}>
            <Stack spacing={5} alignItems="center" justifyContent="center"
              sx={{ width: '100%', maxWidth: 560, px: 3, my: 'auto' }}>

              <Stack spacing={1.5} alignItems="center" textAlign="center">
                <Box sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.6,
                  bgcolor: 'background.paper', border: '0.5px solid', borderColor: 'divider',
                  borderRadius: 99, px: 1.5, py: 0.4,
                }}>
                  <Typography sx={{ fontSize: '0.65rem', color: 'primary.main', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    Private blockchain · Step 1 of 6
                  </Typography>
                </Box>
                <Typography variant="h4" fontWeight={500} sx={{ letterSpacing: '-0.5px', color: 'text.primary', lineHeight: 1.2 }}>
                  {legacyStep === 'has-legacy' ? 'Existing systems?' : 'Integration strategy'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, maxWidth: 380 }}>
                  {legacyStep === 'has-legacy'
                    ? 'Do you have a legacy system you want to integrate with or migrate onto the blockchain?'
                    : 'How would you like to proceed with your existing system?'}
                </Typography>
              </Stack>

              {legacyStep === 'has-legacy' ? (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} width="100%">
                  <PortalCard onClick={() => handleLegacyChoice(true)} elevation={0}>
                    <Box sx={{ height: 96, bgcolor: alpha(theme.palette.primary.main, 0.04), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DnsIcon sx={{ fontSize: 44, color: 'text.disabled' }} />
                    </Box>
                    <Box sx={{ p: '14px 14px 16px' }}>
                      <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 0.5 }}>Yes, I have one</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.65, display: 'block' }}>
                        Integrate with or migrate from an ERP, CRM, or database system.
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
                        Building everything on-chain from scratch.
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
                      <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 0.5 }}>Connect (Hybrid)</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.65, display: 'block', mb: 1 }}>
                        Keep your existing system running alongside a new blockchain layer.
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
                      <Typography variant="subtitle1" fontWeight={500} sx={{ mb: 0.5 }}>Full port (Migrate)</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.65, display: 'block', mb: 1 }}>
                        Migrate all data and logic from the legacy system onto the new chain.
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.65rem' }}>
                        Maximum transformation
                      </Typography>
                    </Box>
                  </PortalCard>
                </Stack>
              )}

              {/* Inline back for the how-to-proceed sub-step */}
              {legacyStep === 'how-to-proceed' && (
                <Button
                  size="small" variant="text" startIcon={<ArrowBackIcon />}
                  onClick={() => setLegacyStep('has-legacy')}
                  sx={{ color: 'text.secondary' }}
                >
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
              {/* Gallery header */}
              <Box sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                mb: 2, gap: 2,
              }}>
                <Box>
                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.7, color: 'primary.main', mb: 0.5 }}>
                    {dType === 'blockchain' ? 'Private blockchain' : 'dApp'}
                    {legacyMode !== 'none' ? ` · ${legacyMode === 'connect' ? 'Connect' : 'Full port'}` : ''} · Templates
                  </Typography>
                  <Typography variant="h5" fontWeight={500} sx={{ letterSpacing: '-0.3px', color: 'text.primary' }}>
                    Choose a starting template
                  </Typography>
                </Box>
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  bgcolor: 'background.paper', border: '0.5px solid', borderColor: 'divider',
                  borderRadius: 2, px: 1.5, py: 0.75,
                }}>
                  <SearchIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search..."
                    style={{
                      border: 'none', outline: 'none', background: 'transparent',
                      fontSize: '0.75rem', width: 140,
                      color: theme.palette.text.primary,
                    }}
                  />
                </Box>
              </Box>

              {/* Category tabs */}
              <Box sx={{ display: 'flex', gap: 0.75, mb: 2, flexWrap: 'wrap' }}>
                {categories.map(c => (
                  <Box
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    sx={{
                      px: 1.75, py: 0.4, borderRadius: 99, cursor: 'pointer',
                      fontSize: '0.7rem', fontWeight: 500,
                      bgcolor: categoryFilter === c ? 'primary.main' : 'background.paper',
                      color: categoryFilter === c ? '#fff' : 'text.secondary',
                      border: '0.5px solid',
                      borderColor: categoryFilter === c ? 'primary.main' : 'divider',
                      transition: 'all 0.15s',
                      userSelect: 'none',
                    }}
                  >
                    {c}
                  </Box>
                ))}
              </Box>

              {/* 2-column grid */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1.5, pb: 4 }}>
                {/* Blank canvas */}
                <GalleryCard
                  selected={selectedTemplate === 'scratch'}
                  elevation={0}
                  onClick={() => selectTemplate({ id: 'scratch', title: 'Blank Canvas', description: 'Start from scratch.', category: 'Custom', tags: [], preinstalledModules: [] } as any)}
                >
                  {selectedTemplate === 'scratch' && (
                    <Box sx={{
                      position: 'absolute', top: 10, right: 10,
                      width: 16, height: 16, borderRadius: '50%', bgcolor: 'primary.main',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <CheckIcon sx={{ fontSize: 9, color: '#fff' }} />
                    </Box>
                  )}
                  <Box sx={{
                    width: 34, height: 34, borderRadius: '8px',
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    border: `1px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    mb: 1.25,
                  }}>
                    <AddIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  </Box>
                  <Typography variant="body2" fontWeight={500} sx={{ mb: 0.5 }}>Blank canvas</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Zero pre-installed modules
                  </Typography>
                  <Chip label="0 modules" size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: alpha(theme.palette.primary.main, 0.05), color: 'text.secondary' }} />
                </GalleryCard>

                {/* Templates from API */}
                {filteredTemplates.map(t => (
                  <GalleryCard key={t.id} selected={selectedTemplate === t.id} elevation={0} onClick={() => selectTemplate(t)}>
                    {selectedTemplate === t.id && (
                      <Box sx={{
                        position: 'absolute', top: 10, right: 10,
                        width: 16, height: 16, borderRadius: '50%', bgcolor: 'primary.main',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <CheckIcon sx={{ fontSize: 9, color: '#fff' }} />
                      </Box>
                    )}
                    <Box sx={{
                      width: 34, height: 34, borderRadius: '8px',
                      bgcolor: alpha(theme.palette.primary.main, 0.07),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.25,
                    }}>
                      <BoltIcon sx={{ fontSize: 17, color: 'primary.main' }} />
                    </Box>
                    <Stack direction="row" alignItems="center" spacing={0.75} mb={0.5} pr={2.5}>
                      <Typography variant="body2" fontWeight={500}>{t.title}</Typography>
                      <Chip label={t.category} size="small" sx={{
                        height: 16, fontSize: '0.58rem', fontWeight: 500,
                        bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main',
                      }} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, lineHeight: 1.5 }}>
                      {t.description}
                    </Typography>
                    <Chip
                      label={`${t.preinstalledModules?.length ?? 0} modules`}
                      size="small"
                      sx={{ height: 18, fontSize: '0.6rem', bgcolor: alpha(theme.palette.primary.main, 0.05), color: 'text.secondary' }}
                    />
                  </GalleryCard>
                ))}

                {loadingTemplates && (
                  <Box sx={{ gridColumn: '1/-1', py: 3, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">Loading templates…</Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Fade>
        )}

        {/* ─── PHASE: DETAILS (split configure) ─── */}
        {phase === 'details' && (
          <Fade in mountOnEnter unmountOnExit timeout={350}>
            <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', px: 3 }}>
              <Box sx={{ width: '100%', maxWidth: 1100, mb: 2 }}>
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.7, color: 'primary.main', mb: 0.5 }}>
                  {dType === 'blockchain' ? 'Private blockchain' : 'dApp'}
                  {selectedTemplateName ? ` · ${selectedTemplateName}` : ''} · Configure
                </Typography>
                <Typography variant="h5" fontWeight={500} sx={{ letterSpacing: '-0.3px', color: 'text.primary' }}>
                  Configure your project
                </Typography>
              </Box>

              <SplitGlassPanel elevation={0}>
                {/* Left: Identity */}
                <ConfigSection sx={{ borderRight: { md: `0.5px solid ${theme.palette.divider}` } }}>
                  <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
                    <Box sx={{ width: 28, height: 28, borderRadius: '7px', bgcolor: alpha(theme.palette.primary.main, 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DomainIcon sx={{ fontSize: 15, color: 'primary.main' }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>Identity</Typography>
                      <Typography variant="caption" color="text.secondary">Naming & workspace</Typography>
                    </Box>
                  </Stack>

                  <Stack spacing={2.5}>
                    <TextField
                      label="Project name" fullWidth value={name}
                      onChange={e => setName(e.target.value)} variant="outlined" size="small"
                    />
                    <TextField
                      label="Slug" fullWidth value={slug} size="small"
                      onChange={e => { setSlug(e.target.value); setSlugDirty(true); }}
                      helperText={
                        <Typography component="span" sx={{ fontSize: '0.7rem', color: 'primary.main', fontFamily: 'monospace' }}>
                          studio.cerulea.io/{slug}
                        </Typography>
                      }
                    />
                    <Box>
                      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.75}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, textTransform: 'uppercase', fontSize: '0.62rem', letterSpacing: 0.4 }}>
                          Workspace
                        </Typography>
                        <Button
                          size="small" startIcon={<AddIcon sx={{ fontSize: 12 }} />}
                          onClick={() => { setWsDialogOpen(true); setWsNewName(''); setWsType('personal'); }}
                          sx={{ fontSize: '0.7rem', p: '2px 8px', minWidth: 0, color: 'primary.main' }}
                        >
                          New
                        </Button>
                      </Stack>
                      <Select
                        fullWidth value={wsId} size="small"
                        onChange={e => { setWsId(e.target.value); setStudioState({ workspaceId: e.target.value }); }}
                        displayEmpty MenuProps={OPAQUE_MENU_PROPS as any}
                      >
                        <MenuItem value="">Personal project</MenuItem>
                        {workspaces.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
                      </Select>
                    </Box>
                    <TextField
                      label="Description" multiline rows={3} fullWidth size="small"
                      value={description} onChange={e => setDescription(e.target.value)}
                      placeholder="Brief description of what this project does…"
                    />
                  </Stack>
                </ConfigSection>

                {/* Right: Technical */}
                <ConfigSection sx={{ bgcolor: alpha(theme.palette.primary.main, 0.015) }}>
                  <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
                    <Box sx={{ width: 28, height: 28, borderRadius: '7px', bgcolor: alpha(theme.palette.primary.main, 0.08), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <DnsIcon sx={{ fontSize: 15, color: 'primary.main' }} />
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>{dType === 'dapp' ? 'Network specs' : 'Genesis params'}</Typography>
                      <Typography variant="caption" color="text.secondary">Technical configuration</Typography>
                    </Box>
                  </Stack>

                  {dType === 'dapp'
                    ? <DappDetails value={dappDetails} onChange={setDappDetails} />
                    : <ChainDetails value={chainDetails} onChange={setChainDetails} />
                  }

                  <Box sx={{
                    mt: 2.5, p: 1.5, bgcolor: 'background.paper',
                    border: '0.5px solid', borderColor: 'divider', borderRadius: 2,
                  }}>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                      These settings pre-load into Blueprint. You can add, remove, or change modules freely in Step 2.
                    </Typography>
                  </Box>
                </ConfigSection>
              </SplitGlassPanel>
            </Box>
          </Fade>
        )}

      </Box>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* FLOATING ISLAND — bottom dock, only for non-choose-type  */}
      {/* ══════════════════════════════════════════════════════════ */}
      {phase !== 'choose-type' && (
        <Box sx={{
          height: 80, display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: 2,
        }}>
          <FloatingIsland elevation={0}>
            {/* Back button */}
            <Button
              size="small"
              startIcon={<ArrowBackIcon sx={{ fontSize: 14 }} />}
              onClick={() => {
                if (phase === 'legacy-question') setPhase('choose-type');
                else if (phase === 'gallery') goBackFromGallery();
                else if (phase === 'details') setPhase('gallery');
              }}
              sx={{
                borderRadius: 99, px: 1.75, py: 0.75, fontSize: '0.72rem',
                color: 'text.secondary', border: '0.5px solid', borderColor: 'divider',
                fontWeight: 400, minWidth: 0,
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
              }}
            >
              Back
            </Button>

            {/* Center context label — gallery phase only */}
            {phase === 'gallery' && (
              <>
                <Divider orientation="vertical" flexItem sx={{ height: 22, my: 'auto', mx: 0.5 }} />
                <Typography sx={{
                  fontSize: '0.72rem', fontWeight: 500, px: 1.25,
                  color: selectedTemplate ? 'primary.main' : 'text.secondary',
                }}>
                  {selectedTemplate
                    ? <><CheckIcon sx={{ fontSize: 11, verticalAlign: 'middle', mr: 0.5 }} />{selectedTemplateName}</>
                    : 'Select a template'
                  }
                </Typography>
              </>
            )}

            <Divider orientation="vertical" flexItem sx={{ height: 22, my: 'auto', mx: 0.5 }} />

            {/* Action button */}
            {phase === 'gallery' && (
              <Button
                variant="contained" disabled={!selectedTemplate}
                onClick={onConfirmTemplate}
                endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                sx={{ borderRadius: 99, px: 2.5, fontSize: '0.72rem', fontWeight: 500, boxShadow: 'none' }}
              >
                Configure
              </Button>
            )}

            {(phase === 'legacy-question') && (
              <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary', px: 1 }}>
                Choose an option above
              </Typography>
            )}

            {phase === 'details' && (
              <Button
                variant="contained"
                disabled={!name || name.trim().length < 3 || !slug}
                onClick={onInitialize}
                sx={{ borderRadius: 99, px: 2.5, fontSize: '0.72rem', fontWeight: 500, boxShadow: 'none' }}
              >
                Initialize project
              </Button>
            )}
          </FloatingIsland>
        </Box>
      )}

      {/* ── Workspace dialog ── */}
      <Dialog open={wsDialogOpen} onClose={() => setWsDialogOpen(false)} PaperProps={{ sx: { borderRadius: 3, p: 0.5, width: 320 } }}>
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 500 }}>New workspace</DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2, lineHeight: 1.6 }}>
            Workspaces let you group projects and manage team access.
          </Typography>
          <TextField
            autoFocus margin="dense" label="Workspace name" fullWidth size="small"
            value={wsNewName} onChange={e => setWsNewName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Stack direction="row" spacing={1}>
            {(['personal', 'team'] as const).map(t => (
              <Box
                key={t}
                onClick={() => setWsType(t)}
                sx={{
                  flex: 1, border: '0.5px solid', borderRadius: 2, p: 1.25, cursor: 'pointer',
                  borderColor: wsType === t ? 'primary.main' : 'divider',
                  bgcolor: wsType === t ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
                  transition: 'all 0.15s',
                }}
              >
                <Typography variant="caption" fontWeight={500} sx={{ color: wsType === t ? 'primary.main' : 'text.primary' }}>
                  {t === 'personal' ? 'Personal' : 'Team'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.62rem' }}>
                  {t === 'personal' ? 'Just me' : 'Collaborate'}
                </Typography>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, gap: 1 }}>
          <Button onClick={() => setWsDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={createWorkspace} sx={{ borderRadius: 2, boxShadow: 'none' }}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* ──────────────────────────────────────────── */
/* Sub-forms (DappDetails, ChainDetails)        */
/* ──────────────────────────────────────────── */

function DappDetails({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  return (
    <Stack spacing={2.5}>
      <FormControl fullWidth size="small">
        <InputLabel>Target network</InputLabel>
        <Select value={value.network} label="Target network" onChange={e => onChange({ ...value, network: e.target.value })} MenuProps={OPAQUE_MENU_PROPS as any}>
          <MenuItem value="cerulea-testnet">Cerulea Testnet</MenuItem>
          <MenuItem value="cerulea-mainnet">Cerulea Mainnet</MenuItem>
          <MenuItem value="ethereum">Ethereum Mainnet</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth size="small">
        <InputLabel>Token standards</InputLabel>
        <Select multiple value={value.tokenFocus} label="Token standards" onChange={e => onChange({ ...value, tokenFocus: e.target.value })} MenuProps={OPAQUE_MENU_PROPS as any}>
          {['erc20', 'erc721', 'erc1155'].map(t => <MenuItem key={t} value={t}>{t.toUpperCase()}</MenuItem>)}
        </Select>
      </FormControl>
      <TextField type="number" label="Royalties (%)" size="small" value={value.royalties} onChange={e => onChange({ ...value, royalties: Number(e.target.value) })} />
    </Stack>
  );
}

function ChainDetails({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  return (
    <Stack spacing={2.5}>
      <FormControl fullWidth size="small">
        <InputLabel>Consensus mechanism</InputLabel>
        <Select value={value.consensus} label="Consensus mechanism" onChange={e => onChange({ ...value, consensus: e.target.value })} MenuProps={OPAQUE_MENU_PROPS as any}>
          <MenuItem value="PoA">Proof of Authority (Dev / Test)</MenuItem>
          <MenuItem value="PoS">Proof of Stake (Production)</MenuItem>
        </Select>
      </FormControl>
      <Stack direction="row" spacing={1.5}>
        <TextField label="Native token" fullWidth size="small" value={value.nativeToken.symbol} onChange={e => onChange({ ...value, nativeToken: { ...value.nativeToken, symbol: e.target.value } })} />
        <TextField type="number" label="Decimals" fullWidth size="small" value={value.nativeToken.decimals} onChange={e => onChange({ ...value, nativeToken: { ...value.nativeToken, decimals: Number(e.target.value) } })} />
      </Stack>
      <Stack direction="row" spacing={1.5}>
        <TextField type="number" label="Validators" fullWidth size="small" value={value.initialValidators} onChange={e => onChange({ ...value, initialValidators: Number(e.target.value) })} />
        <TextField type="number" label="Base gas" fullWidth size="small" value={value.feeModel.baseGas} onChange={e => onChange({ ...value, feeModel: { ...value.feeModel, baseGas: Number(e.target.value) } })} />
      </Stack>
    </Stack>
  );
}
