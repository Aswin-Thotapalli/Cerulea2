"use client";

// apps/frontend/src/app/dashboard/projects/page.tsx
// The Projects panel.
// Every project on this screen comes from Cerulea APIs, across every workspace
// the account belongs to. Closing a project keeps every Blueprint version
// readable afterwards.
// Without this panel a person cannot find the work they started.

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

import {
  PanelBody,
  PanelEmpty,
  describeFailure,
  usePanelData,
  type PanelFailure,
} from "@/components/dashboard/PanelState";
import { api } from "@/lib/apiClient";
import ProjectReadiness from "@/components/studio/steps6/ProjectReadiness";

type ProjectsView = {
  projects: {
    projectId: string;
    workspaceId: string;
    name: string;
    slug: string;
    summary: string;
    state: string;
    headVersion: number;
    createdAt: string;
    updatedAt: string;
    workspaceName: string;
    workspaceApplication: string;
  }[];
  workspaces: { workspaceId: string; name: string }[];
};

const STATE_COLOUR: Record<string, "success" | "warning" | "default" | "info"> =
  {
    deployed: "success",
    building: "warning",
    draft: "default",
    closed: "info",
  };

export default function ProjectsPanel() {
  const reading = usePanelData<ProjectsView>("/api/projects");
  const [search, setSearch] = useState("");
  const [state, setState] = useState("all");
  const [closing, setClosing] = useState<{
    projectId: string;
    name: string;
  } | null>(null);
  const [failure, setFailure] = useState<PanelFailure | null>(null);
  const [working, setWorking] = useState(false);

  const visible = useMemo(() => {
    const held = reading.data?.projects ?? [];
    const term = search.trim().toLowerCase();
    return held.filter(
      (project) =>
        (state === "all" || project.state === state) &&
        (term.length === 0 || project.name.toLowerCase().includes(term)),
    );
  }, [reading.data, search, state]);

  const close = async () => {
    if (!closing) return;
    setWorking(true);
    setFailure(null);
    try {
      await api(`/api/projects/${encodeURIComponent(closing.projectId)}`, {
        method: "DELETE",
      });
      setClosing(null);
      reading.readAgain();
    } catch (cause) {
      setFailure(describeFailure(cause));
    } finally {
      setWorking(false);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1 }}
      >
        <Typography variant="h4" sx={{ fontWeight: 900 }}>
          Projects
        </Typography>
        <Button variant="contained" component={Link} href="/">
          Start a project
        </Button>
      </Stack>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Each project holds one Blueprint and its whole version history. Closing
        a project keeps every version readable.
      </Typography>

      {failure && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <AlertTitle>{failure.message}</AlertTitle>
          {failure.fix}
        </Alert>
      )}

      <PanelBody reading={reading} subject="every project this account holds">
        {(view) => (
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField
                  size="small"
                  label="Search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  sx={{ minWidth: 260 }}
                  helperText="Matches the project name."
                />
                <TextField
                  select
                  size="small"
                  label="State"
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  sx={{ minWidth: 200 }}
                  helperText="A project moves from draft to building to deployed."
                >
                  <MenuItem value="all">Every state</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="building">Building</MenuItem>
                  <MenuItem value="deployed">Deployed</MenuItem>
                  <MenuItem value="closed">Closed</MenuItem>
                </TextField>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              {view.projects.length === 0 ? (
                <PanelEmpty
                  heading="No project yet"
                  explanation="Open Studio and describe what the system does. Cerulea proposes the track, the template and the outcomes, then the project begins populated."
                  action={
                    <Button variant="contained" component={Link} href="/">
                      Start the first project
                    </Button>
                  }
                />
              ) : visible.length === 0 ? (
                <PanelEmpty
                  heading="No project matches"
                  explanation="Clear the search, or choose every state. The whole list returns."
                />
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Project</TableCell>
                      <TableCell>Workspace</TableCell>
                      <TableCell align="right">Version</TableCell>
                      <TableCell>Before deployment</TableCell>
                      <TableCell>State</TableCell>
                      <TableCell>Last changed</TableCell>
                      <TableCell align="right">Open</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visible.map((project) => (
                      <TableRow key={project.projectId}>
                        <TableCell>
                          <Typography sx={{ fontWeight: 700 }}>
                            {project.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {project.summary || "No summary written yet."}
                          </Typography>
                        </TableCell>
                        <TableCell>{project.workspaceName}</TableCell>
                        <TableCell align="right">
                          {project.headVersion}
                        </TableCell>
                        <TableCell>
                          <ProjectReadiness projectId={project.projectId} />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={STATE_COLOUR[project.state] ?? "default"}
                            label={project.state}
                          />
                        </TableCell>
                        <TableCell>
                          {new Date(project.updatedAt).toLocaleString()}
                        </TableCell>
                        <TableCell align="right">
                          <Stack
                            direction="row"
                            spacing={1}
                            justifyContent="flex-end"
                          >
                            <Button
                              size="small"
                              component={Link}
                              href={`/?project=${project.projectId}`}
                            >
                              Open
                            </Button>
                            {project.state !== "closed" && (
                              <Button
                                size="small"
                                color="error"
                                onClick={() =>
                                  setClosing({
                                    projectId: project.projectId,
                                    name: project.name,
                                  })
                                }
                              >
                                Close
                              </Button>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
          </Stack>
        )}
      </PanelBody>

      <Dialog open={closing !== null} onClose={() => setClosing(null)}>
        <DialogTitle>Close {closing?.name}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Closing sets the project state to closed. Every Blueprint version
            and every checkpoint stays readable and exportable afterwards.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClosing(null)}>Leave it open</Button>
          <Button color="error" onClick={() => void close()} disabled={working}>
            Close the project
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
