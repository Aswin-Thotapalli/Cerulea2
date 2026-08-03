// apps/frontend/src/app/_studio/StudioEntry.tsx
'use client';

import { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import StudioShell from '@/app/_studio/shell/StudioShell';
import StudioLanding from '@/app/_studio/StudioLanding';
import { useStudio } from '@/context/StudioContext';

type Props = { projectId?: string | null; division?: string | null };

export default function StudioEntry({ projectId: initialProjectId, division }: Props) {
  const { setStudioState } = useStudio();
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [initialStep, setInitialStep] = useState(0);
  const [ready, setReady] = useState(false);
  // 'landing' = show project picker; 'studio' = show StudioShell
  const [mode, setMode] = useState<'landing' | 'studio'>('landing');

  // The division is provided by the server (from the x-cerulea-division header
  // the middleware sets off the /dapps|/enterprise|/govt path) — deterministic,
  // no dependence on client-side URL/cookie timing.
  const divisionProjectType: 'dapp' | 'blockchain' | null =
    division === 'dapp' ? 'dapp'
      : (division === 'enterprise' || division === 'govt') ? 'blockchain'
      : null;
  const divisionPrefix =
    division === 'dapp' ? '/dapps'
      : division === 'enterprise' ? '/enterprise'
      : division === 'govt' ? '/govt'
      : '';

  useEffect(() => {
    async function init() {
      if (initialProjectId) {
        // Opening a specific project.
        await loadProject(initialProjectId);
        setMode('studio');
      } else if (divisionProjectType) {
        // Division entry (studio.cerulea.io/dapps etc.) → open a NEW project
        // directly with the project type locked by the division. Skips both the
        // project picker AND the dApp/blockchain type chooser.
        startNewDivisionProject(divisionProjectType);
      } else {
        // No division context → show the project picker.
        setMode('landing');
      }
      setReady(true);
    }

    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startNewDivisionProject(ptype: 'dapp' | 'blockchain') {
    setResolvedId(null);
    setInitialStep(0);
    localStorage.removeItem('cerulea.projectId');
    localStorage.removeItem('cerulea.activeProjectId');
    localStorage.removeItem('cerulea.step1.graph');
    localStorage.removeItem('cerulea.templateModules');
    localStorage.removeItem('cerulea.economics');
    localStorage.removeItem('cerulea.context.snapshot');
    localStorage.setItem('cerulea.projectType', ptype);
    const visibility = ptype === 'dapp' ? 'public' : null;
    if (visibility) localStorage.setItem('cerulea.dappVisibility', visibility);
    // Pre-set the project type in context so step0 skips the chooser and opens
    // straight on the template gallery.
    setStudioState({
      projectId: undefined,
      slug: undefined,
      projectType: ptype,
      dappVisibility: visibility,
      templateId: null,
      selectedModules: [],
      appMetadata: { appName: '', appDescription: '' },
      legacyMode: 'none',
    } as any);
    window.history.replaceState(null, '', `${divisionPrefix}/`);
    setMode('studio');
  }

  async function loadProject(pid: string) {
    localStorage.setItem('cerulea.projectId', pid);
    localStorage.setItem('cerulea.activeProjectId', pid);

    try {
      const pRes = await fetch(`/api/projects/${pid}`);
      if (pRes.ok) {
        const { project } = await pRes.json();
        if (project?.projectType) {
          localStorage.setItem('cerulea.projectType', project.projectType);
          setStudioState({
            projectType: project.projectType as 'blockchain' | 'dapp',
            projectId: pid,
          });
        }
        if (project?.economics) {
          localStorage.setItem('cerulea.economics', JSON.stringify(project.economics));
        }
      }
    } catch {}

    let hasModules = false;
    try {
      const bpRes = await fetch(`/api/projects/${pid}/blueprint`);
      if (bpRes.ok) {
        const { blueprint } = await bpRes.json();
        if (blueprint?.graph?.nodes?.length) {
          hasModules = true;
          localStorage.setItem('cerulea.step1.graph', JSON.stringify(blueprint.graph));
          localStorage.setItem('cerulea.projectId.last', pid);
          const moduleIds: string[] = (
            blueprint.modules?.map((m: any) => m.moduleId) ??
            blueprint.graph.nodes.map((n: any) => n.data?.moduleId).filter(Boolean)
          );
          if (moduleIds.length) {
            localStorage.setItem('cerulea.templateModules', JSON.stringify(moduleIds));
          }
        }
      }
    } catch {}

    try {
      const schemaRes = await fetch(`/api/projects/${pid}/schema`);
      if (schemaRes.ok) {
        const schemaData = await schemaRes.json();
        if (Array.isArray(schemaData?.entities) && schemaData.entities.length) {
          const moduleEntities: Record<string, any[]> = {};
          for (const entity of schemaData.entities) {
            const key = entity.moduleId || entity.group || 'general';
            if (!moduleEntities[key]) moduleEntities[key] = [];
            moduleEntities[key].push(entity);
          }
          const draft3 = { data: { moduleEntities, relationships: schemaData.relationships ?? [] } };
          localStorage.setItem('draft:local:3', JSON.stringify(draft3));
        }
      }
    } catch {}

    if (hasModules) setInitialStep(1);
    setResolvedId(pid);
  }

  const handleOpenProject = async (pid: string) => {
    window.history.replaceState(null, '', `${divisionPrefix}/?project=${pid}`);
    await loadProject(pid);
    setMode('studio');
  };

  const handleNewProject = () => {
    // Clear localStorage
    setResolvedId(null);
    setInitialStep(0);
    localStorage.removeItem('cerulea.projectId');
    localStorage.removeItem('cerulea.activeProjectId');
    localStorage.removeItem('cerulea.step1.graph');
    localStorage.removeItem('cerulea.templateModules');
    localStorage.removeItem('cerulea.economics');
    localStorage.removeItem('cerulea.context.snapshot'); // clears the StudioContext snapshot so old project data isn't re-hydrated
    window.history.replaceState(null, '', `${divisionPrefix}/`);
    // Reset the React context. In a division, keep the project type locked (so
    // the chooser never returns); otherwise clear it for the normal chooser.
    const visibility = divisionProjectType === 'dapp' ? 'public' : null;
    if (divisionProjectType) localStorage.setItem('cerulea.projectType', divisionProjectType);
    setStudioState({
      projectId: undefined,
      slug: undefined,
      projectType: divisionProjectType ?? null,
      dappVisibility: visibility,
      templateId: null,
      selectedModules: [],
      appMetadata: { appName: '', appDescription: '' },
      legacyMode: 'none',
    } as any);
    setMode('studio');
  };

  if (!ready) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (mode === 'landing') {
    return (
      <StudioLanding
        onNewProject={handleNewProject}
        onOpenProject={handleOpenProject}
        filterProjectType={divisionProjectType}
      />
    );
  }

  return (
    <StudioShell
      initialStep={initialStep}
      initialProjectId={resolvedId}
      onShowProjects={() => { window.history.replaceState(null, '', `${divisionPrefix}/`); setMode('landing'); }}
    />
  );
}
