'use client';

import React, { useEffect, useRef, useState } from "react";
import StepGuidance from '@/components/studio/StepGuidance';
import {
  Box, Button, Divider, LinearProgress, Paper, Stack, Typography,
  IconButton, Tooltip, CircularProgress
} from "@mui/material";
import { useTheme, styled, alpha } from "@mui/material/styles";
import { useStudio } from "@/context/StudioContext";

// Icons
import ArrowBackIcon from "@mui/icons-material/KeyboardArrowLeft";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import CodeIcon from "@mui/icons-material/Code";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import DnsIcon from "@mui/icons-material/Dns";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import MemoryIcon from "@mui/icons-material/Memory";
import TerminalIcon from '@mui/icons-material/Terminal';
import LockIcon from '@mui/icons-material/Lock';
import SpeedIcon from '@mui/icons-material/Speed';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import StorageIcon from '@mui/icons-material/Storage';

/* ------------------ Types ------------------ */
type LogPhase =
  | "idle"
  | "validation"
  | "code_generation"
  | "infra_provisioning"
  | "service_deployment"
  | "post_deploy_checks"
  | "background_finalization";

type DeployMeta = {
  deployId: string;
  region: string;
  startTime: number;
};

/* ------------------ Styled Components ------------------ */

const FloatingIsland = styled(Paper)(({ theme }) => ({
  background: theme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(8, 14, 36, 0.95)',
  backdropFilter: 'blur(16px)',
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.3)',
  borderRadius: 100,
  padding: '8px 24px',
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  zIndex: 1000,
  pointerEvents: 'auto',
}));

const TerminalWindow = styled(Paper)(({ theme }) => ({
  background: theme.palette.mode === 'light' ? '#f5f5f5' : '#080E24',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  borderRadius: 16,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  boxShadow: theme.palette.mode === 'light'
    ? '0 12px 24px -8px rgba(0,0,0,0.1)'
    : '0 24px 48px -12px rgba(0,0,0,0.5)',
  fontFamily: '"Fira Code", "Roboto Mono", monospace',
}));

const TerminalHeader = styled(Box)(({ theme }) => ({
  background: theme.palette.mode === 'light' ? '#e0e0e0' : '#0D1535',
  padding: '12px 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const TerminalDot = styled(Box)<{ color: string }>(({ color }) => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  backgroundColor: color,
}));

const LeftPanel = styled(Box)(({ theme }) => ({
  width: 340,
  flexShrink: 0,
  height: '100%',
  borderRight: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  flexDirection: 'column',
  background: theme.palette.mode === 'dark' ? 'rgba(8,14,36,0.95)' : theme.palette.background.paper,
  overflowY: 'auto',
}));

/* ------------------ Constants ------------------ */

const SCRIPTED_LOGS = [
  "Reading cerulea.config.ts...",
  "Resolving module dependencies...",
  "Validating entity schema 'User'...",
  "Validating entity schema 'Project'...",
  "Checking integration keys for 'Stripe'...",
  "Verifying wallet signature...",
  "Audit: No critical vulnerabilities found in config.",
  "Initializing code generator v2.4.0...",
  "Scaffolding Next.js 14 frontend...",
  "Generating Solidity contracts...",
  "Compiling contracts with Hardhat...",
  "Generating Typechain bindings...",
  "Building API routes for 'Auth' module...",
  "Optimizing static assets...",
  "Tree-shaking unused dependencies...",
  "Build complete: .next/ (45MB)",
  "Build complete: artifacts/ (12MB)",
];

const INFRA_LOG_POOL = [
  "aws_vpc.main: Creating...",
  "aws_vpc.main: Creation complete after 12s [id=vpc-0a8b...]",
  "aws_subnet.public_a: Creating...",
  "aws_subnet.public_a: Creation complete after 4s",
  "aws_internet_gateway.gw: Creating...",
  "aws_security_group.allow_tls: Creating...",
  "aws_db_instance.postgres: Creating... (this may take a while)",
  "aws_db_instance.postgres: Still creating... [10s elapsed]",
  "aws_db_instance.postgres: Still creating... [20s elapsed]",
  "aws_ecs_cluster.main: Creating...",
  "aws_iam_role.ecs_task_execution_role: Creating...",
  "aws_lb.front_end: Creating...",
  "aws_lb_target_group.front_end: Creating...",
  "Provisioning complete. Applying state...",
  "Initializing Kubernetes control plane...",
  "Waiting for nodes to join cluster...",
  "Node ip-10-0-1-45.ec2.internal joined.",
  "Node ip-10-0-1-120.ec2.internal joined.",
  "Pulling image: cerulea/core:latest...",
  "Pulling image: cerulea/worker:latest...",
  "Deploying deployment.apps/web-server...",
  "Deploying service/web-loadbalancer...",
  "Waiting for load balancer to become healthy...",
];

const BLOCKCHAIN_LOG_POOL = [
  "Bootnode: Started P2P networking on 0.0.0.0:30333",
  "Genesis: Initializing chain spec...",
  "Consensus: Aura (Authorities: 0x4a...e1)",
  "Grandpa: Voters initialized.",
  "Sync: 0 peers connected.",
  "Sync: 4 peers connected. Downloading headers...",
  "Imported #1 (0x4a...b2) - 1.2MB",
  "Imported #2 (0x9c...f1) - 0.8MB",
  "Telemetry: Connecting to telemetry.cerulea.io...",
  "RPC: HTTP server started on 127.0.0.1:9933",
  "RPC: WebSocket server started on 127.0.0.1:9944",
  "TxPool: 0 ready, 0 pending",
  "Mining: Prepared block for proposing at 6000ms",
  "Grandpa: Finalizing block #1...",
  "State: Caching trie nodes...",
  "Database: Compacting RocksDB...",
];

const DEPLOYMENT_PHASES: Array<{ id: LogPhase; label: string; icon: React.ReactNode }> = [
  { id: 'validation', label: 'Validation & Security', icon: <VerifiedUserIcon fontSize="small" /> },
  { id: 'code_generation', label: 'Code Generation', icon: <CodeIcon fontSize="small" /> },
  { id: 'infra_provisioning', label: 'Infra Provisioning', icon: <CloudQueueIcon fontSize="small" /> },
  { id: 'service_deployment', label: 'Service Deployment', icon: <DnsIcon fontSize="small" /> },
  { id: 'post_deploy_checks', label: 'Health Checks', icon: <FactCheckIcon fontSize="small" /> },
  { id: 'background_finalization', label: 'Finalization', icon: <MemoryIcon fontSize="small" /> },
];

function generateRandomHex(len: number) {
  const chars = "0123456789ABCDEF";
  let res = "";
  for (let i = 0; i < len; i++) res += chars[Math.floor(Math.random() * 16)];
  return res;
}

function generateLogLine(phase: LogPhase, projectType: 'dapp' | 'blockchain' | null): string {
  const source = projectType === 'blockchain' ? BLOCKCHAIN_LOG_POOL : INFRA_LOG_POOL;
  let pool: string[] = [];

  if (phase === 'infra_provisioning') pool = source;
  else if (phase === 'service_deployment') pool = source;
  else if (phase === 'post_deploy_checks') pool = ["Health check: 200 OK", "Latency check: 45ms", "Consistency check: PASSED", "Uptime monitor: ACTIVE"];
  else pool = ["Syncing state...", "Processing background jobs...", "Indexing blocks...", "Optimizing storage..."];

  if (pool.length === 0) pool = ["Processing..."];

  const base = pool[Math.floor(Math.random() * pool.length)];
  const detail = Math.random() > 0.7 ? ` [${Math.floor(Math.random() * 500)}ms]` : '';
  return `> ${base}${detail}`;
}

// Random Walk helper for smoother stats
function walkValue(current: number, min: number, max: number, volatility: number) {
  const change = (Math.random() - 0.5) * volatility;
  let next = current + change;
  if (next < min) next = min + Math.random() * (volatility / 2);
  if (next > max) next = max - Math.random() * (volatility / 2);
  return Math.round(next * 10) / 10;
}

/* ====================================================================== */
export default function Step6({ goPrev }: { goPrev?: () => void }) {
  const theme = useTheme();
  const { appMetadata, selectedModules, projectType } = useStudio();

  // State
  const [deploying, setDeploying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [activePhase, setActivePhase] = useState<LogPhase>("idle");
  const [completedPhases, setCompletedPhases] = useState<Set<LogPhase>>(new Set());
  const [deployMeta, setDeployMeta] = useState<DeployMeta | null>(null);

  // Metrics State
  const [metricsActive, setMetricsActive] = useState(false);
  const [metrics, setMetrics] = useState({ cpu: 0, ram: 0, net: 0, storage: 200 });

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);
  const metricsTimerRef = useRef<any>(null);
  const logIndexRef = useRef(0);

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Start Deployment Logic
  const startDeployment = () => {
    if (deploying) return;

    const meta = {
      deployId: `dep-${generateRandomHex(8)}`,
      region: "us-east-1",
      startTime: Date.now()
    };
    setDeployMeta(meta);
    setDeploying(true);
    setMetricsActive(false);
    setMetrics({ cpu: 0, ram: 0, net: 0, storage: 200 });
    setLogs([`INITIALIZING DEPLOYMENT: ${meta.deployId}`, `TARGET REGION: ${meta.region}`, `Loading blueprint configuration...`]);
    setProgress(0);
    setActivePhase("validation");
    setCompletedPhases(new Set());
    logIndexRef.current = 0;

    // 1. Metrics Boot Delay (10-12 Seconds)
    setTimeout(() => {
      setMetricsActive(true);
      setMetrics({ cpu: 15, ram: 24, net: 0.5, storage: 210 });
    }, 12000);

    // 2. Main Progression Loop
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        let currentPhase: LogPhase = "validation";
        let speed = 0.5;

        if (prev < 10) {
          currentPhase = "validation";
          speed = 0.02 + Math.random() * 0.02;
        } else if (prev < 25) {
          currentPhase = "code_generation";
          speed = 0.015 + Math.random() * 0.02;
        } else if (prev < 60) {
          currentPhase = "infra_provisioning";
          speed = 0.0005;
        } else if (prev < 90) {
          currentPhase = "service_deployment";
          speed = 0.001;
        } else {
          currentPhase = "background_finalization";
          speed = 0.0001;
        }

        setActivePhase((p) => {
          if (p !== currentPhase && p !== 'idle') {
            setCompletedPhases((s) => {
              const newSet = new Set(s);
              newSet.add(p);
              return newSet;
            });
          }
          return currentPhase;
        });

        setLogs((prevLogs) => {
          let newLog: string | null = null;
          const isFastPhase = currentPhase === 'validation' || currentPhase === 'code_generation';

          if (isFastPhase) {
            if (Math.random() > 0.9 && logIndexRef.current < SCRIPTED_LOGS.length) {
              newLog = `> ${SCRIPTED_LOGS[logIndexRef.current]}`;
              logIndexRef.current++;
            }
          } else {
            if (Math.random() > 0.99) {
              const newRaw = generateLogLine(currentPhase, projectType);
              const ts = new Date().toISOString().split('T')[1].split('.')[0];
              newLog = `${ts} ${newRaw}`;
            }
          }

          if (newLog) {
            const updated = [...prevLogs, newLog];
            return updated.length > 1000 ? updated.slice(updated.length - 1000) : updated;
          }
          return prevLogs;
        });

        const next = prev + speed;
        return next > 99.9 ? 99.9 : next;
      });
    }, 500);

    // 3. Metrics Random Walk Loop (Smoother)
    metricsTimerRef.current = setInterval(() => {
      setMetrics((prev) => {
        const isBurst = Math.random() > 0.95;
        const growth = isBurst
          ? (10 + Math.random() * 40)
          : (0.1 + Math.random() * 0.5);

        const isNetBurst = Math.random() > 0.90;
        const netTarget = isNetBurst
          ? (40 + Math.random() * 60)
          : (0.1 + Math.random() * 2);

        const netDiff = netTarget - prev.net;
        const newNet = prev.net + (netDiff * 0.2);

        return {
          cpu: walkValue(prev.cpu, 10, 80, 5),
          ram: walkValue(prev.ram, 20, 60, 2),
          net: Math.round(newNet * 10) / 10,
          storage: prev.storage + growth
        };
      });
    }, 1000);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (metricsTimerRef.current) clearInterval(metricsTimerRef.current);
    };
  }, []);

  return (
    <Box sx={{ width: '100%', height: '100%', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>

      <StepGuidance
        stepKey="step6"
        title="Review & Deploy"
        subtitle="Step 6 of 6"
        description="Review your complete project configuration and deploy it to production. Cerulea validates your setup, generates all smart contracts and infrastructure, and provisions your live environment."
        steps={[
          { first: 'Review the summary', next: 'Check your selected modules, token configuration, and integrations in the left panel.' },
          { first: 'Click Deploy', next: 'Cerulea will validate your config, compile contracts, provision infrastructure, and go live.' },
          { first: 'Access your project', next: "Once deployed, you'll get an RPC endpoint, dashboard URL, and API access for your app." },
        ]}
        tip="Deployment typically takes 2–5 minutes. You'll see real-time progress logs as each phase completes."
      />

      {/* Dot grid */}
      <Box sx={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: theme.palette.mode === 'dark'
          ? 'radial-gradient(rgba(79,70,229,0.13) 1px, transparent 1px)'
          : 'radial-gradient(rgba(79,70,229,0.07) 1px, transparent 1px)',
        backgroundSize: '28px 28px'
      }} />

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1, pt: 2, px: 3, pb: 14 }}>

        {/* LEFT PANEL */}
        <LeftPanel>
          {/* Project identity header */}
          <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
              <Box sx={{
                p: 1, borderRadius: 1.5,
                bgcolor: alpha(theme.palette.primary.main, 0.15),
                color: 'primary.main', display: 'flex'
              }}>
                <RocketLaunchIcon sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={800}>
                  {appMetadata?.appName || 'New Project'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {projectType === 'blockchain' ? 'Layer 1 Network' : 'Full Stack dApp'}
                </Typography>
              </Box>
            </Stack>
            {deploying && deployMeta && (
              <Box sx={{
                p: 1.5, borderRadius: 2,
                bgcolor: alpha(theme.palette.primary.main, 0.06),
                border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.15)
              }}>
                <Typography variant="caption" fontFamily="monospace" color="text.secondary" display="block">
                  ID: {deployMeta.deployId}
                </Typography>
                <Typography variant="caption" fontFamily="monospace" color="text.secondary" display="block">
                  Region: {deployMeta.region}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Pipeline steps */}
          <Box sx={{ p: 2, flex: 1 }}>
            <Typography
              variant="overline"
              fontSize="0.6rem"
              fontWeight={800}
              color="text.secondary"
              sx={{ letterSpacing: 1.2, pl: 1, mb: 1.5, display: 'block' }}
            >
              DEPLOYMENT PIPELINE
            </Typography>
            <Stack spacing={0.75}>
              {DEPLOYMENT_PHASES.map((p, idx) => {
                const isActive = activePhase === p.id;
                const isDone = completedPhases.has(p.id as LogPhase);
                return (
                  <Box
                    key={p.id}
                    sx={{
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      px: 1.5, py: 1.25, borderRadius: 2,
                      bgcolor: isActive
                        ? alpha(theme.palette.primary.main, 0.08)
                        : isDone
                        ? alpha('#10b981', 0.05)
                        : 'transparent',
                      border: `1px solid ${
                        isActive
                          ? alpha(theme.palette.primary.main, 0.25)
                          : isDone
                          ? alpha('#10b981', 0.2)
                          : 'transparent'
                      }`,
                      opacity: (!deploying || isActive || isDone) ? 1 : 0.35,
                      transition: 'all 0.3s',
                    }}
                  >
                    {/* Step number/status icon */}
                    <Box sx={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: isDone
                        ? alpha('#10b981', 0.15)
                        : isActive
                        ? alpha(theme.palette.primary.main, 0.15)
                        : alpha(theme.palette.divider, 0.3),
                      color: isDone ? '#10b981' : isActive ? 'primary.main' : 'text.disabled',
                      fontSize: '0.75rem', fontWeight: 800,
                    }}>
                      {isDone
                        ? <CheckCircleIcon sx={{ fontSize: 14 }} />
                        : isActive
                        ? <CircularProgress size={14} color="inherit" />
                        : <Typography variant="caption" fontWeight={800}>{idx + 1}</Typography>
                      }
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="body2"
                        fontWeight={isDone || isActive ? 700 : 500}
                        color={isDone ? '#10b981' : isActive ? 'primary.main' : 'text.disabled'}
                        sx={{ lineHeight: 1.2 }}
                      >
                        {p.label}
                      </Typography>
                      {isActive && (
                        <Typography variant="caption" color="primary.main" sx={{ opacity: 0.7 }}>
                          Processing...
                        </Typography>
                      )}
                      {isDone && (
                        <Typography variant="caption" sx={{ color: '#10b981', opacity: 0.7 }}>
                          Complete
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </Box>

          {/* Pre-deploy info (only when idle) */}
          {!deploying && (
            <Box sx={{ p: 2.5, borderTop: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={800} mb={1.5}>Before you deploy</Typography>
              <Stack spacing={1}>
                {[
                  'Config validation & security scan',
                  'Smart contract compilation',
                  'Infrastructure provisioning',
                  'Service deployment & health checks',
                ].map((item, i) => (
                  <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                    <Typography variant="caption" color="primary.main" fontWeight={800} sx={{ flexShrink: 0, mt: 0.1 }}>
                      {i + 1}.
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                      {item}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}
        </LeftPanel>

        {/* RIGHT: Terminal + metrics */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', pl: 2.5, minWidth: 0 }}>

          {/* Compact metrics strip (only when deploying) */}
          {deploying && (
            <Stack direction="row" spacing={1.5} mb={1.5}>
              {[
                { label: 'CPU', value: metricsActive ? `${metrics.cpu}%` : '--', color: theme.palette.primary.main, icon: <SpeedIcon sx={{ fontSize: 14 }} /> },
                { label: 'MEMORY', value: metricsActive ? `${metrics.ram}%` : '--', color: '#8b5cf6', icon: <MemoryIcon sx={{ fontSize: 14 }} /> },
                { label: 'NET I/O', value: metricsActive ? `${metrics.net} MB/s` : '--', color: '#f59e0b', icon: <NetworkCheckIcon sx={{ fontSize: 14 }} /> },
                { label: 'STORAGE', value: metricsActive ? `${Math.floor(metrics.storage)} MB` : '--', color: '#10b981', icon: <StorageIcon sx={{ fontSize: 14 }} /> },
              ].map(m => (
                <Box
                  key={m.label}
                  sx={{
                    px: 2, py: 1, borderRadius: 2,
                    border: '1px solid', borderColor: alpha(m.color, 0.2),
                    bgcolor: alpha(m.color, 0.05),
                    display: 'flex', alignItems: 'center', gap: 1,
                  }}
                >
                  <Box sx={{ color: m.color, display: 'flex', opacity: 0.8 }}>{m.icon}</Box>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mr: 0.5 }}>
                    {m.label}
                  </Typography>
                  <Typography variant="body2" fontWeight={800} fontFamily="monospace" sx={{ color: m.color }}>
                    {m.value}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}

          {/* Terminal — takes remaining height */}
          <TerminalWindow elevation={8} sx={{ flex: 1 }}>
            <TerminalHeader>
              <Stack direction="row" alignItems="center" spacing={1}>
                <TerminalDot color="#FF5F56" />
                <TerminalDot color="#FFBD2E" />
                <TerminalDot color="#27C93F" />
                <Typography variant="caption" fontFamily="monospace" color="text.secondary" sx={{ ml: 1.5 }}>
                  cerulea:deploy
                </Typography>
              </Stack>
              {deploying && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box sx={{
                    width: 6, height: 6, borderRadius: '50%', bgcolor: '#27C93F',
                    animation: 'pulse 1.5s infinite'
                  }} />
                  <Typography variant="caption" fontFamily="monospace" sx={{ color: '#27C93F' }}>
                    LIVE
                  </Typography>
                </Stack>
              )}
            </TerminalHeader>

            <Box
              ref={scrollRef}
              sx={{
                flex: 1, p: 2.5, overflowY: 'auto', lineHeight: 1.7,
                fontFamily: '"Fira Code","Roboto Mono",monospace', fontSize: 13
              }}
            >
              {!deploying && logs.length === 0 ? (
                <Box sx={{
                  height: '100%', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', opacity: 0.25
                }}>
                  <TerminalIcon sx={{ fontSize: 56, mb: 2 }} />
                  <Typography fontFamily="monospace">System ready. Awaiting initialization...</Typography>
                </Box>
              ) : (
                <>
                  {logs.map((log, i) => (
                    <Box key={i} sx={{ mb: 0.25, wordBreak: 'break-all' }}>
                      {log.startsWith('INITIALIZING') || log.startsWith('TARGET') ? (
                        <Typography
                          component="span"
                          sx={{ color: theme.palette.primary.main, fontWeight: 700, fontFamily: 'inherit', fontSize: 'inherit' }}
                        >
                          {log}
                        </Typography>
                      ) : log.includes('>') ? (
                        <Typography
                          component="span"
                          sx={{ color: '#10b981', fontWeight: 600, fontFamily: 'inherit', fontSize: 'inherit' }}
                        >
                          {log}
                        </Typography>
                      ) : (
                        <Typography
                          component="span"
                          sx={{
                            color: theme.palette.mode === 'light' ? '#374151' : '#d1d5db',
                            fontFamily: 'inherit', fontSize: 'inherit'
                          }}
                        >
                          {log}
                        </Typography>
                      )}
                    </Box>
                  ))}
                  {deploying && (
                    <Box
                      component="span"
                      sx={{ color: '#10b981', fontWeight: 700, animation: 'blink 1s infinite' }}
                    >
                      █
                    </Box>
                  )}
                </>
              )}
            </Box>

            {deploying && (
              <Box sx={{
                px: 2.5, py: 1.5,
                bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.06)',
                borderTop: '1px solid', borderColor: 'divider'
              }}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                  <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                    {activePhase.toUpperCase().replace(/_/g, ' ')}
                  </Typography>
                  <Typography variant="caption" fontFamily="monospace" color="primary.main" fontWeight={700}>
                    {progress.toFixed(1)}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: 3, borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(90deg, #4F46E5, #8b5cf6)'
                    }
                  }}
                />
              </Box>
            )}
          </TerminalWindow>
        </Box>

      </Box>

      {/* Floating nav island at bottom center */}
      <Box sx={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
        <FloatingIsland elevation={6}>
          <Tooltip title="Back">
            <IconButton onClick={goPrev} size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />
          {!deploying ? (
            <Button
              variant="contained"
              size="large"
              onClick={startDeployment}
              startIcon={<RocketLaunchIcon />}
              sx={{
                borderRadius: 1, px: 4, fontWeight: 800,
                background: 'linear-gradient(135deg, #4F46E5 0%, #7c3aed 100%)',
                boxShadow: '0 4px 20px rgba(79,70,229,0.4)'
              }}
            >
              Deploy Now
            </Button>
          ) : (
            <Tooltip title="Deployment in progress">
              <span>
                <Button
                  variant="outlined"
                  size="large"
                  disabled
                  startIcon={<LockIcon />}
                  sx={{ borderRadius: 1, px: 4, fontWeight: 700 }}
                >
                  Deploying...
                </Button>
              </span>
            </Tooltip>
          )}
        </FloatingIsland>
      </Box>

    </Box>
  );
}
