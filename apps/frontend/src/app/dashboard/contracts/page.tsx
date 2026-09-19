'use client';

// apps/frontend/src/app/dashboard/contracts/page.tsx
// Where each system runs.
// Cerulea runs a Blueprint on one of three execution substrates. This panel
// lists every project with the substrate it holds, and opens the choice for
// one project at a time.
// Without this panel nobody can see how a deployed system executes.

import { useState } from 'react';
import {
  Box,
  Button,
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
import ExecutionSubstrate from '@/components/studio/ExecutionSubstrate';

type SubstrateView = {
  projects: {
    projectId: string;
    projectName: string;
    workspaceName: string;
    state: string;
    substrate: string;
    substrateName: string;
    reason: string;
  }[];
};

export default function ExecutionPanel() {
  const reading = usePanelData<SubstrateView>('/api/dashboard/execution');
  const [open, setOpen] = useState<string | null>(null);

  if (open) {
    return (
      <ExecutionSubstrate
        projectId={open}
        onClose={() => {
          setOpen(null);
          reading.readAgain();
        }}
      />
    );
  }

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        Where each system runs
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Cerulea reads the Blueprint directly by default. WebAssembly serves computation the typed
        document cannot express. Ethereum Virtual Machine bytecode serves ecosystem interoperation.
      </Typography>

      <PanelBody reading={reading} subject="the substrate each project runs on">
        {(view) => (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
            {view.projects.length === 0 ? (
              <PanelEmpty
                heading="No project yet"
                explanation="Open Studio and start a project. Its substrate appears here, set to native interpretation."
              />
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Project</TableCell>
                    <TableCell>Workspace</TableCell>
                    <TableCell>Runs on</TableCell>
                    <TableCell>Why</TableCell>
                    <TableCell align="right">Change</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {view.projects.map((project) => (
                    <TableRow key={project.projectId}>
                      <TableCell>{project.projectName}</TableCell>
                      <TableCell>{project.workspaceName}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip size="small" label={project.substrateName} />
                          {project.substrate === 'Native' && (
                            <Chip size="small" variant="outlined" label="Default" />
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>{project.reason || 'No reason written yet.'}</TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={() => setOpen(project.projectId)}>
                          Open the choice
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        )}
      </PanelBody>
    </Box>
  );
}
