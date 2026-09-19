'use client';

// apps/frontend/src/app/dashboard/governance/page.tsx
// The Governance panel.
// Each project states who may change the system, the share of validators each
// transaction class needs and the delay a constitutional change waits. Every
// value comes from the Blueprint of that project.
// Without this panel nobody can see who holds authority over a deployment.

import {
  Box,
  Chip,
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
import { describeDelay } from '@/components/dashboard/wording';

type GovernanceView = {
  classes: {
    name: string;
    architectureThreshold: number;
    mandatoryDelay: boolean;
    meaning: string;
  }[];
  projects: {
    projectId: string;
    projectName: string;
    workspaceName: string;
    state: string;
    version: number;
    authority: string[];
    quorum: {
      routine: number;
      financial: number;
      structural: number;
      constitutional: number;
    };
    constitutionalDelayBlocks: number;
    changeProcess: string;
    roleCount: number;
  }[];
};

export default function GovernancePanel() {
  const reading = usePanelData<GovernanceView>('/api/dashboard/governance');

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        Governance
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        A transaction commits once enough validators agree. The share needed rises with what the
        transaction touches.
      </Typography>

      <PanelBody reading={reading} subject="the governance of every project">
        {(view) => (
          <Stack spacing={4}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Transaction classes
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Class</TableCell>
                    <TableCell align="right">Share needed</TableCell>
                    <TableCell>Delay</TableCell>
                    <TableCell>What the class covers</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {view.classes.map((entry) => (
                    <TableRow key={entry.name}>
                      <TableCell>{entry.name}</TableCell>
                      <TableCell align="right">{entry.architectureThreshold} percent</TableCell>
                      <TableCell>
                        {entry.mandatoryDelay ? 'Mandatory delay' : 'Commits at once'}
                      </TableCell>
                      <TableCell>{entry.meaning}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>

            {view.projects.length === 0 ? (
              <PanelEmpty
                heading="No project yet"
                explanation="Open Studio and start a project. Its governance rules appear here as soon as the first Blueprint is saved."
              />
            ) : (
              view.projects.map((project) => (
                <Paper key={project.projectId} variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ mb: 2 }}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {project.projectName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {project.workspaceName}, version {project.version}
                      </Typography>
                    </Box>
                    <Chip size="small" label={project.state} />
                  </Stack>

                  <Typography variant="subtitle2">Who may change this system</Typography>
                  {project.authority.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      No role holds authority yet. Open Step 4 and name the roles that approve a
                      change.
                    </Typography>
                  ) : (
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
                      {project.authority.map((role) => (
                        <Chip key={role} size="small" label={role} />
                      ))}
                    </Stack>
                  )}

                  <Typography variant="subtitle2">How a change happens</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {project.changeProcess || 'No change process is written yet.'}
                  </Typography>

                  <Divider sx={{ mb: 2 }} />

                  <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Everyday records
                      </Typography>
                      <Typography variant="h6">{project.quorum.routine} percent</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Movements of value
                      </Typography>
                      <Typography variant="h6">{project.quorum.financial} percent</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Changes to the shape
                      </Typography>
                      <Typography variant="h6">{project.quorum.structural} percent</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Changes to the rules
                      </Typography>
                      <Typography variant="h6">{project.quorum.constitutional} percent</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {describeDelay(project.constitutionalDelayBlocks)}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              ))
            )}
          </Stack>
        )}
      </PanelBody>
    </Box>
  );
}
