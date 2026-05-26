// apps/frontend/src/app/_studio/StudioEntry.tsx
'use client';

import { useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import StudioShell from '@/app/_studio/shell/StudioShell';
import { useStudio } from '@/context/StudioContext';

type Props = { projectId?: string | null };

export default function StudioEntry({ projectId: initialProjectId }: Props) {
  const { setStudioState } = useStudio();
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [initialStep, setInitialStep] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      let pid = initialProjectId ?? null;

      // If no project param in URL, auto-detect the user's most recent project
      if (!pid) {
        try {
          const res = await fetch('/api/projects');
          if (res.ok) {
            const j = await res.json();
            if (j.projects?.[0]?.id) {
              pid = j.projects[0].id;
              window.history.replaceState(null, '', `/?project=${pid}`);
            }
          }
        } catch {}
      }

      if (pid) {
        localStorage.setItem('cerulea.projectId', pid);
        localStorage.setItem('cerulea.activeProjectId', pid);

        // Load project metadata: projectType, economics, integrations
        try {
          const pRes = await fetch(`/api/projects/${pid}`);
          if (pRes.ok) {
            const { project } = await pRes.json();

            if (project?.projectType) {
              localStorage.setItem('cerulea.projectType', project.projectType);
              // Set StudioContext so steps that read from context get the right value
              setStudioState({
                projectType: project.projectType as 'blockchain' | 'dapp',
                projectId: pid,
              });
            }

            // Pre-populate Step 3 economics — step3 reads cerulea.economics on mount
            if (project?.economics) {
              localStorage.setItem('cerulea.economics', JSON.stringify(project.economics));
            }
          }
        } catch {}

        // Pre-populate Step 1 blueprint — always overwrite from DB for this project
        try {
          const bpRes = await fetch(`/api/projects/${pid}/blueprint`);
          if (bpRes.ok) {
            const { blueprint } = await bpRes.json();
            if (blueprint?.graph?.nodes?.length) {
              localStorage.setItem('cerulea.step1.graph', JSON.stringify(blueprint.graph));
              localStorage.setItem('cerulea.projectId.last', pid);

              // Derive templateModules list for step2 fallback
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

        // Pre-populate Step 2 schema (draft:local:3)
        try {
          const schemaRes = await fetch(`/api/projects/${pid}/schema`);
          if (schemaRes.ok) {
            const schemaData = await schemaRes.json();
            if (Array.isArray(schemaData?.entities) && schemaData.entities.length) {
              // Group entities by moduleId / group field for step2's moduleEntities format
              const moduleEntities: Record<string, any[]> = {};
              for (const entity of schemaData.entities) {
                const key = entity.moduleId || entity.group || 'general';
                if (!moduleEntities[key]) moduleEntities[key] = [];
                moduleEntities[key].push(entity);
              }
              const draft3 = {
                data: {
                  moduleEntities,
                  relationships: schemaData.relationships ?? [],
                },
              };
              localStorage.setItem('draft:local:3', JSON.stringify(draft3));
            }
          }
        } catch {}

        // Existing project — skip Step 0 (type selection), go straight to Blueprint
        setInitialStep(1);
      }

      setResolvedId(pid);
      setReady(true);
    }

    void init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <StudioShell initialStep={initialStep} initialProjectId={resolvedId} />;
}
