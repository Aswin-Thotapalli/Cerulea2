'use client';

// apps/frontend/src/app/dashboard/page.tsx
// The Overview panel.
// Every tile counts real rows, and the Blockchain figures come from the node.
// The open items list names a fix beside each one.
// Without this panel an operator has no first view of the deployment.

import Link from 'next/link';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import { PanelBody, PanelEmpty, usePanelData } from '@/components/dashboard/PanelState';
import { describeAction } from '@/components/dashboard/wording';

type Overview = {
  account: { accountId: string; email: string; displayName: string };
  counts: {
    workspaces: number;
    projects: number;
    projectsDeployed: number;
    projectsInBuild: number;
    blueprintVersions: number;
    checkpoints: number;
    deployments: number;
    deploymentsRunning: number;
    openKeys: number;
  };
  chain: {
    chainName: string;
    kind: 'local' | 'live';
    head: number;
    finalizedBlock: number;
    activeValidators: number;
    totalValidators: number;
    consensusHealth: string;
    healthy: boolean;
  };
  integrations: { integration: string; kind: string; ready: boolean; detail: string }[];
  attention: { subject: string; fix: string }[];
  recentProjects: {
    projectId: string;
    name: string;
    state: string;
    headVersion: number;
    updatedAt: string;
  }[];
  recentEvents: {
    eventId: string;
    action: string;
    subjectType: string;
    outcome: string;
    occurredAt: string;
  }[];
};

function Tile({
  label,
  value,
  explanation,
}: {
  label: string;
  value: string;
  explanation: string;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, flex: 1, minWidth: 210 }}>
      <Typography variant="overline" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 900 }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {explanation}
      </Typography>
    </Paper>
  );
}

export default function OverviewPanel() {
  const reading = usePanelData<Overview>('/api/dashboard/overview', 15000);

  return (
    <Box sx={{ p: 4 }}>
      <PanelBody reading={reading} subject="the work this account holds">
        {(view) => (
          <Stack spacing={4}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900 }}>
                Welcome back, {view.account.displayName}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                We read {view.chain.chainName} and the work held against this account.
              </Typography>
            </Box>

            {view.attention.length > 0 && (
              <Stack spacing={1}>
                {view.attention.map((item) => (
                  <Alert key={item.subject} severity="warning">
                    <AlertTitle>{item.subject}</AlertTitle>
                    {item.fix}
                  </Alert>
                ))}
              </Stack>
            )}

            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Tile
                label="Projects"
                value={String(view.counts.projects)}
                explanation={`${view.counts.projectsDeployed} deployed, ${view.counts.projectsInBuild} still in build.`}
              />
              <Tile
                label="Blueprint versions"
                value={String(view.counts.blueprintVersions)}
                explanation={`Saved across every project, with ${view.counts.checkpoints} named checkpoints.`}
              />
              <Tile
                label="Deployments"
                value={String(view.counts.deployments)}
                explanation={`${view.counts.deploymentsRunning} running now. A deployment is atomic.`}
              />
              <Tile
                label="Open access keys"
                value={String(view.counts.openKeys)}
                explanation="Keys that reach a deployed system. Revoke a key to close it at once."
              />
            </Stack>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {view.chain.chainName}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip
                    size="small"
                    color={view.chain.healthy ? 'success' : 'warning'}
                    label={view.chain.healthy ? 'Serving' : 'Needs attention'}
                  />
                  <Chip size="small" label={`Agreement ${view.chain.consensusHealth}`} />
                </Stack>
              </Stack>
              <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Newest block
                  </Typography>
                  <Typography variant="h6">{view.chain.head}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Irreversible height
                  </Typography>
                  <Typography variant="h6">{view.chain.finalizedBlock}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Validators serving
                  </Typography>
                  <Typography variant="h6">
                    {view.chain.activeValidators} of {view.chain.totalValidators}
                  </Typography>
                </Box>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Platform drivers
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {view.integrations.map((entry) => (
                  <Chip
                    key={entry.integration}
                    size="small"
                    color={entry.ready ? 'success' : 'warning'}
                    variant="outlined"
                    label={`${entry.integration} ${entry.kind}`}
                  />
                ))}
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Projects
                </Typography>
                <Button component={Link} href="/dashboard/projects" size="small">
                  Open every project
                </Button>
              </Stack>
              {view.recentProjects.length === 0 ? (
                <PanelEmpty
                  heading="No project yet"
                  explanation="Open Studio and describe what the system does. Cerulea proposes the track, the template and the outcomes."
                  action={
                    <Button variant="contained" component={Link} href="/">
                      Start the first project
                    </Button>
                  }
                />
              ) : (
                <Stack divider={<Divider />}>
                  {view.recentProjects.map((project) => (
                    <Stack
                      key={project.projectId}
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ py: 1.5 }}
                    >
                      <Box>
                        <Typography sx={{ fontWeight: 700 }}>{project.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Version {project.headVersion}, last changed{' '}
                          {new Date(project.updatedAt).toLocaleString()}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={project.state} />
                        <Button
                          size="small"
                          component={Link}
                          href={`/?project=${project.projectId}`}
                        >
                          Open
                        </Button>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Recent activity
              </Typography>
              {view.recentEvents.length === 0 ? (
                <PanelEmpty
                  heading="Nothing recorded yet"
                  explanation="Cerulea records every change with its actor, its subject and its outcome. The first change appears here."
                />
              ) : (
                <Stack divider={<Divider />}>
                  {view.recentEvents.map((event) => (
                    <Stack
                      key={event.eventId}
                      direction="row"
                      justifyContent="space-between"
                      sx={{ py: 1 }}
                    >
                      <Typography variant="body2">{describeAction(event.action)}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(event.occurredAt).toLocaleString()}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Paper>
          </Stack>
        )}
      </PanelBody>
    </Box>
  );
}
