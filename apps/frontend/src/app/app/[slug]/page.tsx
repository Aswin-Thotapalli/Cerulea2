'use client';

// apps/frontend/src/app/app/[slug]/page.tsx
// The page a deployed system opens on.
// Cerulea reads the deployment record for the project the address names, and
// states what the deployment installed and where its generated surface lives.
// Every link leads to a screen Cerulea serves.
// Without this page a deployed system has no front door.

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import { PanelBody, PanelEmpty, usePanelData } from '@/components/dashboard/PanelState';
import {
  deploymentState,
  plainOutcome,
  projectState,
  sentenceWords,
  stageName,
  stageState,
} from '@/lib/deployment/plain';

type DeployedView = {
  project: { projectId: string; name: string; summary: string; state: string; headVersion: number };
  workspace: { workspaceId: string; name: string };
  deployment: {
    deploymentId: string;
    status: string;
    stages: { name: string; status: string; startedAt: string | null; endedAt: string | null; outcome: string | null }[];
  } | null;
  counts: Record<string, number>;
  collections: { id: string; description: string; privacy: string }[];
  actions: { id: string; name: string; description: string }[];
  views: { id: string; name: string; collection: string }[];
};

export default function DeployedSystemPage() {
  const { slug } = useParams<{ slug: string }>();
  const reading = usePanelData<DeployedView>(
    `/api/deployed/${encodeURIComponent(String(slug))}`,
    15000,
  );

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <PanelBody reading={reading} subject="this deployed system">
        {(view) => (
          <Stack spacing={4}>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 900 }}>
                {view.project.name}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                {view.project.summary || 'No summary is written for this system yet.'}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Chip size="small" label={view.workspace.name} />
                <Chip size="small" label={`Version ${view.project.headVersion}`} />
                <Chip
                  size="small"
                  color={view.project.state === 'deployed' ? 'success' : 'default'}
                  label={projectState(view.project.state)}
                />
              </Stack>
            </Box>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                Deployment
              </Typography>
              {view.deployment === null ? (
                <PanelEmpty
                  heading="This system is not deployed yet"
                  explanation="Open the project in Studio, read the readiness checklist and deploy. Deployment is atomic, so the system is either fully present or absent."
                  action={
                    <Button
                      variant="contained"
                      component={Link}
                      href={`/?project=${view.project.projectId}`}
                    >
                      Open the project
                    </Button>
                  }
                />
              ) : (
                <>
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip
                      size="small"
                      color={view.deployment.status === 'succeeded' ? 'success' : 'warning'}
                      label={deploymentState(view.deployment.status)}
                    />
                  </Stack>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Stage</TableCell>
                        <TableCell>State</TableCell>
                        <TableCell>What happened</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {view.deployment.stages.map((stage) => (
                        <TableRow key={stage.name}>
                          <TableCell>{stageName(stage.name)}</TableCell>
                          <TableCell>{stageState(stage.status)}</TableCell>
                          <TableCell>
                            {stage.outcome === null ? 'Still running.' : plainOutcome(stage.outcome)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                What this system holds
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Every line below comes from the Blueprint Cerulea deployed.
              </Typography>
              <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                {Object.entries(view.counts).map(([section, total]) => (
                  <Box key={section}>
                    <Typography variant="caption" color="text.secondary">
                      {sentenceWords(section)}
                    </Typography>
                    <Typography variant="h6">{total}</Typography>
                  </Box>
                ))}
              </Stack>
              <Divider sx={{ mb: 2 }} />
              {view.collections.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No collection is declared yet. Open Step 3 in Studio and add the records this
                  system keeps.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {view.collections.map((collection) => (
                    <Stack
                      key={collection.id}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="body2">
                        {collection.description || collection.id}
                      </Typography>
                      <Chip size="small" variant="outlined" label={collection.privacy} />
                    </Stack>
                  ))}
                </Stack>
              )}
            </Paper>

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                component={Link}
                href={`/?project=${view.project.projectId}`}
              >
                Open in Studio
              </Button>
              <Button variant="outlined" component={Link} href="/dashboard/networks">
                Read the network
              </Button>
              <Button variant="outlined" component={Link} href="/dashboard/keys">
                Manage access keys
              </Button>
            </Stack>
          </Stack>
        )}
      </PanelBody>
    </Container>
  );
}
