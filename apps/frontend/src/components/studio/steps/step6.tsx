"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Divider,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import SaveIcon from "@mui/icons-material/Save";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { IconButton } from "@mui/material";

type LogPhase =
  | "validation"
  | "code_generation"
  | "infra_provisioning"
  | "service_deployment"
  | "post_deploy_checks"
  | "background_finalization";

const PHASE_LOGS: Record<LogPhase, string[]> = {
  validation: [
    "✔ Blueprint schema validated",
    "✔ Module dependency graph resolved",
    "✔ No circular dependencies detected",
    "✔ Security baseline checks passed",
  ],
  code_generation: [
    "→ Generating smart contract templates",
    "→ Emitting EVM bytecode artifacts",
    "→ Generating backend services",
    "→ Writing API bindings",
    "→ Running static analysis (Slither)",
    "✔ No critical issues found",
  ],
  infra_provisioning: [
    "→ Provisioning VPC",
    "→ Allocating subnets",
    "→ Attaching security groups",
    "→ Waiting for network propagation...",
    "→ Retrying IAM policy attachment (attempt 2/3)",
    "✔ IAM roles ready",
    "→ Creating database cluster",
    "→ Waiting for database availability...",
  ],
  service_deployment: [
    "→ Deploying contracts",
    "→ Waiting for confirmations (12/12)",
    "✔ Contracts deployed",
    "→ Deploying API services",
    "→ Rolling out frontend",
  ],
  post_deploy_checks: [
    "→ Running health checks",
    "→ Verifying service connectivity",
    "✔ Core services reachable",
  ],
  background_finalization: [
    "→ Indexing initial state",
    "→ Syncing analytics",
    "→ Health checks in progress",
    "→ Deployment continuing in background",
  ],
};

export default function Step6({ goPrev }: { goPrev?: () => void }) {
  const [deploying, setDeploying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const phaseRef = useRef<LogPhase>("validation");
  const timerRef = useRef<any>(null);

  const startDeploymentSimulation = useCallback(() => {
    if (deploying) return;

    setDeploying(true);
    setLogs([
      "Deployment started.",
      "Deployment in progress. This may take several hours.",
    ]);
    setProgress(1);
    phaseRef.current = "validation";

    timerRef.current = setInterval(() => {
      setLogs((prev) => {
        const phase = phaseRef.current;
        const phaseLogs = PHASE_LOGS[phase];
        const nextLog =
          phaseLogs[Math.floor(Math.random() * phaseLogs.length)];
        return [...prev, nextLog];
      });

setProgress((p) => {
  let increment = 0;

  if (p < 15) increment = Math.random() * 0.4;            // validation
  else if (p < 35) increment = Math.random() * 5.25;      // code gen
  else if (p < 70) increment = Math.random() * 6.08;      // infra (very slow)
  else if (p < 85) increment = Math.random() * 7.15;      // services
  else if (p < 92) increment = Math.random() * 10.05;      // checks
  else increment = Math.random() * 0.01;                  // background creep

  let next = p + increment;

  if (p > 12) phaseRef.current = "code_generation";
  if (p > 30) phaseRef.current = "infra_provisioning";
  if (p > 65) phaseRef.current = "service_deployment";
  if (p > 82) phaseRef.current = "post_deploy_checks";
  if (p > 92) phaseRef.current = "background_finalization";

  if (next >= 95.5) next = 95.5; // NEVER completes
  return next;
});

    }, 3000 + Math.random() * 12000);
  }, [deploying]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <Box sx={{ minHeight: "calc(100vh - 64px)", px: 1 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton onClick={goPrev}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              Review & Deploy
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Review your configuration and run a realistic deployment simulation.
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            sx={{ borderRadius: 999 }}
          >
            Save
          </Button>
          <Button
            variant="contained"
            startIcon={<RocketLaunchIcon />}
            onClick={startDeploymentSimulation}
            disabled={deploying}
            sx={{ borderRadius: 999 }}
          >
            {deploying ? "Deploying…" : "Deploy"}
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 2, borderRadius: 4 }}>
        <Typography sx={{ fontWeight: 900, mb: 1 }}>Deployment</Typography>
        <Divider sx={{ mb: 1.5 }} />

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {deploying
            ? "Deployment is continuing in the background. You will be notified when ready."
            : "Click Deploy to start a realistic deployment simulation."}
        </Typography>

        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ height: 10, borderRadius: 999, mb: 1 }}
        />

        <Typography variant="caption" sx={{ fontWeight: 800 }}>
          {Math.floor(progress)}%
        </Typography>

        <Paper sx={{ mt: 1, p: 1, height: 300, overflow: "auto" }}>
          <Typography
            variant="body2"
            sx={{ fontFamily: "ui-monospace, Menlo, monospace", whiteSpace: "pre-wrap" }}
          >
            {logs.length === 0
              ? "Logs will appear here once deployment starts…"
              : logs.join("\n")}
          </Typography>
        </Paper>

        {progress > 90 && (
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={() => (window.location.href = "/studio")}
            >
              Return to dashboard
            </Button>
            <Button
              variant="outlined"
              endIcon={<OpenInNewIcon />}
            >
              View deployment details
            </Button>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
