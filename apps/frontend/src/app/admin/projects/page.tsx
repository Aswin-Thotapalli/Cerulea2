'use client';

// apps/frontend/src/app/admin/projects/page.tsx
// The workspaces and projects screen of the Cerulea operator.
// Each row states the workspace, the application it serves, its plan and how
// much work it holds. The content of a Blueprint never appears here.
// Without this screen the operator cannot size the platform.

import {
  Box,
  Chip,
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

type WorkspacesView = {
  workspaces: {
    workspaceId: string;
    name: string;
    application: string;
    tier: string;
    state: string;
    members: number;
    projects: number;
    createdAt: string;
  }[];
};

type ProjectsView = {
  projects: {
    projectId: string;
    workspaceName: string;
    name: string;
    state: string;
    headVersion: number;
    deployments: number;
    createdAt: string;
    updatedAt: string;
  }[];
};

export default function OperatorWorkspacesScreen() {
  const workspaces = usePanelData<WorkspacesView>('/api/admin/workspaces');
  const projects = usePanelData<ProjectsView>('/api/admin/projects');

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        Workspaces and projects
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        One workspace holds the projects a team builds together. The operator reads the counts and
        never the content.
      </Typography>

      <Stack spacing={4}>
        <PanelBody reading={workspaces} subject="every workspace">
          {(view) => (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Workspaces
              </Typography>
              {view.workspaces.length === 0 ? (
                <PanelEmpty
                  heading="No workspace yet"
                  explanation="A workspace opens the first time a person signs in and starts work."
                />
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Workspace</TableCell>
                      <TableCell>Application</TableCell>
                      <TableCell>Plan</TableCell>
                      <TableCell align="right">Members</TableCell>
                      <TableCell align="right">Projects</TableCell>
                      <TableCell>Opened</TableCell>
                      <TableCell>State</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {view.workspaces.map((entry) => (
                      <TableRow key={entry.workspaceId}>
                        <TableCell>{entry.name}</TableCell>
                        <TableCell>{entry.application}</TableCell>
                        <TableCell>{entry.tier}</TableCell>
                        <TableCell align="right">{entry.members}</TableCell>
                        <TableCell align="right">{entry.projects}</TableCell>
                        <TableCell>{new Date(entry.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Chip size="small" label={entry.state} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
          )}
        </PanelBody>

        <PanelBody reading={projects} subject="every project">
          {(view) => (
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Projects
              </Typography>
              {view.projects.length === 0 ? (
                <PanelEmpty
                  heading="No project yet"
                  explanation="A project appears here as soon as a person starts one in Studio."
                />
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Project</TableCell>
                      <TableCell>Workspace</TableCell>
                      <TableCell align="right">Version</TableCell>
                      <TableCell align="right">Deployments</TableCell>
                      <TableCell>Last changed</TableCell>
                      <TableCell>State</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {view.projects.map((entry) => (
                      <TableRow key={entry.projectId}>
                        <TableCell>{entry.name}</TableCell>
                        <TableCell>{entry.workspaceName}</TableCell>
                        <TableCell align="right">{entry.headVersion}</TableCell>
                        <TableCell align="right">{entry.deployments}</TableCell>
                        <TableCell>{new Date(entry.updatedAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <Chip size="small" label={entry.state} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
          )}
        </PanelBody>
      </Stack>
    </Box>
  );
}
