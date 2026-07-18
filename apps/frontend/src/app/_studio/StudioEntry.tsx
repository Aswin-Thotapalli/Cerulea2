// apps/frontend/src/app/_studio/StudioEntry.tsx
'use client';

import { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import StudioShell from '@/app/_studio/shell/StudioShell';
import StudioLanding from '@/app/_studio/StudioLanding';
import { useStudio } from '@/context/StudioContext';

type Props = { projectId?: string | null; initialPrompt?: string | null };

export default function StudioEntry({ projectId: initialProjectId, initialPrompt }: Props) {
  const { setStudioState } = useStudio();
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [initialStep, setInitialStep] = useState(0);
  const [ready, setReady] = useState(false);
  // 'landing' = show project picker; 'studio' = show StudioShell
  const [mode, setMode] = useState<'landing' | 'studio'>('landing');

  useEffect(() => {
    // Write prompt to context so Assistant can consume it, then clean URL
    if (initialPrompt) {
      setStudioState({ pendingPrompt: initialPrompt });
      const url = new URL(window.location.href);
      url.searchParams.delete('prompt');
      window.history.replaceState(null, '', url.pathname + (url.search || ''));
    }

    async function init() {
      // If a project param is already in the URL, go straight into studio
      if (initialProjectId) {
        await loadProject(initialProjectId);
        setMode('studio');
      } else {
        // No project in URL → show landing page; don't auto-load
        setMode('landing');
      }
      setReady(true);
    }

    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    window.history.replaceState(null, '', `/?project=${pid}`);
    await loadProject(pid);
    setMode('studio');
  };

  const handleNewProject = () => {
    // Clear any stale project state
    setResolvedId(null);
    setInitialStep(0);
    localStorage.removeItem('cerulea.projectId');
    localStorage.removeItem('cerulea.activeProjectId');
    localStorage.removeItem('cerulea.step1.graph');
    localStorage.removeItem('cerulea.templateModules');
    localStorage.removeItem('cerulea.economics');
    window.history.replaceState(null, '', '/');
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
      />
    );
  }

  return <StudioShell initialStep={initialStep} initialProjectId={resolvedId} />;
}
