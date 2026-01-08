"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Box,
  Button,
  Divider,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  Checkbox,
  FormControlLabel,
  Switch,
  Paper,
  Tooltip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import { useRouter, useSearchParams } from "next/navigation";

type ProjectType = "dapp" | "blockchain";

type ProjectRecord = {
  id: string;
  projectType?: ProjectType;
  blueprint?: { modules?: Array<{ moduleId: string }> };
  schema?: any;
  logic?: any;
  economics?: any;
};

type StepProps = {
  goPrev?: () => void;
  goNext?: () => void;
  projectId: string | null;
};

type DappRevenueModel = {
  modes: string[];
  currencyMode: "crypto" | "fiat" | "both";
  primaryCurrency: { type: "token" | "fiat"; symbol?: string; fiat?: string };
  tiers?: Array<{ name: string; monthly: number; annual: number; features: string[] }>;

  // added for depth
  billingModel: "one-time" | "recurring" | "usage" | "hybrid";
  trialEnabled: boolean;
  trialDays: number;
  refundPolicy: "none" | "7-days" | "14-days" | "custom";
  refundNotes: string;
};

type DappAssets = {
  erc20?: {
    name: string;
    symbol: string;
    decimals: number;
    initialSupply: number;
    mintable: boolean;
    burnable: boolean;
    restrictions: string;

    // added for depth
    maxSupply: number;
    transferEnabled: boolean;
    blacklistEnabled: boolean;
  };
  nft?: {
    collectionName: string;
    symbol: string;
    baseUri: string;
    mintPrice: number;
    maxSupply: number;
    phases: Array<{ name: string; startsAt: string; price: number; supply: number }>;

    // added for depth
    revealEnabled: boolean;
    revealUri: string;
    allowlistEnabled: boolean;
  };
};

type DappFees = {
  platformFeePct: number;
  referralFeePct: number;
  creatorFeePct: number;
  royaltyPct: number;
  payoutAddressRules: string;

  // added for depth
  minPayoutAmount: number;
  payoutSchedule: "instant" | "daily" | "weekly" | "monthly";
  chargebackHandling: "none" | "manual-review" | "auto-disable-user";
};

type DappPayments = {
  fiatEnabled: boolean;
  fiatProvider: "Stripe" | "Razorpay" | "Manual";
  cryptoEnabled: boolean;
  treasuryAddress: string;
  subscriptionsMode: "provider" | "onchain";
  trialDays: number;
  graceDays: number;

  // added for depth
  webhookSecret: string;
  successUrl: string;
  cancelUrl: string;
};

type DappCompliance = {
  kycEnabled: boolean;
  restrictedRegions: string[];
  taxMode: "none" | "gst" | "vat" | "custom";

  // added for depth
  ageGateEnabled: boolean;
  termsUrl: string;
  privacyUrl: string;
};

type ChainTokenomics = {
  tokenName: string;
  tokenSymbol: string;
  decimals: number;
  supplyModel: "fixed" | "inflationary";
  totalSupply: number;
  inflationPct: number;
  rewardSplitValidatorsPct: number;
  rewardSplitTreasuryPct: number;
  genesisAllocations: Array<{ label: string; address: string; amount: number }>;
  treasuryAddress: string;
  vestingEnabled: boolean;

  // added for depth
  blockTimeSeconds: number;
  existentialDeposit: number;
  maxIssuancePerBlock: number;
};

type ChainFees = {
  feeModel: "flat" | "gas";
  baseFee: number;
  dynamicBaseFee: boolean;
  burnPct: number;
  validatorSharePct: number;
  treasurySharePct: number;
  minFee: number;

  // added for depth
  maxFee: number;
  congestionMultiplier: number;
};

type ChainStaking = {
  minStake: number;
  unbondingDays: number;
  slashingEnabled: boolean;
  slashingPreset: "lite" | "balanced" | "strict";
  validatorLimit: number;

  // added for depth
  validatorCommissionPct: number;
  commissionMinPct: number;
  commissionMaxPct: number;
};

type ChainGovernance = {
  enabled: boolean;
  votingModel: "token-weighted" | "one-person-one-vote" | "council";
  deposit: number;
  votingPeriodDays: number;
  quorumPct: number;

  // added for depth
  proposalCooldownDays: number;
  councilSize: number;
  fastTrackEnabled: boolean;
  fastTrackVotingDays: number;
};

function safeNum(x: any, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function useResolvedProjectId(projectIdProp: string | null) {
  const sp = useSearchParams();
  const fromQuery = sp?.get("projectId") || sp?.get("id") || null;

  const [resolved, setResolved] = useState<string | null>(projectIdProp ?? fromQuery);

  useEffect(() => {
    const ls =
      typeof window !== "undefined"
        ? window.localStorage.getItem("cerulea.activeProjectId") ||
          window.localStorage.getItem("cbc.activeProjectId")
        : null;

    setResolved(projectIdProp ?? fromQuery ?? ls);
  }, [projectIdProp, fromQuery]);

  useEffect(() => {
    if (!resolved) return;
    try {
      window.localStorage.setItem("cerulea.activeProjectId", resolved);
    } catch {}
  }, [resolved]);

  return resolved;
}

async function apiGetProject(projectId: string): Promise<ProjectRecord> {
  const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, { method: "GET" });
  if (!res.ok) throw new Error(`GET project failed (${res.status})`);
  return await res.json();
}

async function apiPatchEconomics(projectId: string, economics: any) {
  const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/economics`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ economics }),
  });
  if (!res.ok) throw new Error(`PATCH economics failed (${res.status})`);
  return await res.json();
}

const GLASS = {
  borderRadius: 5,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.12)",
  bgcolor: "rgba(10,12,18,0.38)",
  backdropFilter: "blur(18px)",
  boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
} as const;

const OPAQUE_MENU_PROPS = {
  PaperProps: {
    sx: {
      bgcolor: "rgba(10,12,18,0.995)",
      border: "1px solid rgba(255,255,255,0.12)",
      backdropFilter: "blur(10px)",
      borderRadius: 2,
    },
  },
};

const PANEL_TITLE_SX = { fontWeight: 900, pl: 0.75 } as const;

export default function Step3({ goPrev, goNext, projectId }: StepProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const resolvedProjectId = useResolvedProjectId(projectId);

  const handleBack = () => {
    if (goPrev) return goPrev();
    router.back();
  };

  const handleNext = async () => {
    await handleSave();
    if (goNext) return goNext();
    router.push("/studio/step4");
  };

  const [loading, setLoading] = useState(true);

  const [projectType, setProjectType] = useState<ProjectType>("dapp");
  const [moduleIds, setModuleIds] = useState<string[]>([]);

  const hasErc20 = useMemo(() => moduleIds.some((m) => m.toLowerCase().includes("erc20")), [moduleIds]);
  const hasNft = useMemo(
    () => moduleIds.some((m) => m.toLowerCase().includes("erc721") || m.toLowerCase().includes("nft")),
    [moduleIds]
  );
  const hasSubscriptions = useMemo(
    () => moduleIds.some((m) => m.toLowerCase().includes("subscription")),
    [moduleIds]
  );

  // Tabs
  const [tab, setTab] = useState<string>("rev");

  // Dapp state
  const [dappRevenue, setDappRevenue] = useState<DappRevenueModel>({
    modes: [],
    currencyMode: "both",
    primaryCurrency: { type: "fiat", fiat: "INR" },
    tiers: [],

    billingModel: "hybrid",
    trialEnabled: true,
    trialDays: 7,
    refundPolicy: "none",
    refundNotes: "",
  });

  const [dappAssets, setDappAssets] = useState<DappAssets>({
    erc20: {
      name: "MyToken",
      symbol: "MTK",
      decimals: 18,
      initialSupply: 1000000,
      mintable: false,
      burnable: false,
      restrictions: "",
      maxSupply: 0,
      transferEnabled: true,
      blacklistEnabled: false,
    },
    nft: {
      collectionName: "MyCollection",
      symbol: "MCOL",
      baseUri: "",
      mintPrice: 0,
      maxSupply: 10000,
      phases: [{ name: "Public", startsAt: "", price: 0, supply: 10000 }],
      revealEnabled: false,
      revealUri: "",
      allowlistEnabled: false,
    },
  });

  const [dappFees, setDappFees] = useState<DappFees>({
    platformFeePct: 0,
    referralFeePct: 0,
    creatorFeePct: 0,
    royaltyPct: 0,
    payoutAddressRules: "",
    minPayoutAmount: 0,
    payoutSchedule: "weekly",
    chargebackHandling: "manual-review",
  });

  const [dappPayments, setDappPayments] = useState<DappPayments>({
    fiatEnabled: true,
    fiatProvider: "Razorpay",
    cryptoEnabled: false,
    treasuryAddress: "",
    subscriptionsMode: "provider",
    trialDays: 7,
    graceDays: 3,

    webhookSecret: "",
    successUrl: "",
    cancelUrl: "",
  });

  const [dappCompliance, setDappCompliance] = useState<DappCompliance>({
    kycEnabled: false,
    restrictedRegions: [],
    taxMode: "none",
    ageGateEnabled: false,
    termsUrl: "",
    privacyUrl: "",
  });

  // Chain state
  const [chainTokenomics, setChainTokenomics] = useState<ChainTokenomics>({
    tokenName: "CeruleaToken",
    tokenSymbol: "CRL",
    decimals: 18,
    supplyModel: "fixed",
    totalSupply: 100000000,
    inflationPct: 5,
    rewardSplitValidatorsPct: 80,
    rewardSplitTreasuryPct: 20,
    genesisAllocations: [{ label: "Foundation", address: "", amount: 20000000 }],
    treasuryAddress: "",
    vestingEnabled: false,

    blockTimeSeconds: 6,
    existentialDeposit: 1,
    maxIssuancePerBlock: 0,
  });

  const [chainFees, setChainFees] = useState<ChainFees>({
    feeModel: "gas",
    baseFee: 1,
    dynamicBaseFee: true,
    burnPct: 10,
    validatorSharePct: 70,
    treasurySharePct: 20,
    minFee: 1,

    maxFee: 0,
    congestionMultiplier: 1,
  });

  const [chainStaking, setChainStaking] = useState<ChainStaking>({
    minStake: 1000,
    unbondingDays: 7,
    slashingEnabled: true,
    slashingPreset: "balanced",
    validatorLimit: 50,

    validatorCommissionPct: 10,
    commissionMinPct: 0,
    commissionMaxPct: 100,
  });

  const [chainGov, setChainGov] = useState<ChainGovernance>({
    enabled: true,
    votingModel: "token-weighted",
    deposit: 100,
    votingPeriodDays: 7,
    quorumPct: 10,

    proposalCooldownDays: 0,
    councilSize: 7,
    fastTrackEnabled: false,
    fastTrackVotingDays: 2,
  });

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

// Load project
useEffect(() => {
  let mounted = true;

  (async () => {
    // Track selection comes from Step 0 and is persisted in localStorage.
    // If no projectId (or project doesn't contain projectType yet), we still want
    // to show ONLY the correct track-specific content.
    const qTrack = (sp?.get("track") || sp?.get("projectType")) as ProjectType | null;
    const lsTrack =
      typeof window !== "undefined"
        ? ((window.localStorage.getItem("cerulea.projectType") ||
            window.localStorage.getItem("cbc.projectType")) as ProjectType | null)
        : null;

    const fallbackTrack = (qTrack || lsTrack) as ProjectType | null;

    if (!resolvedProjectId) {
      if (fallbackTrack === "dapp" || fallbackTrack === "blockchain") setProjectType(fallbackTrack);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const p = await apiGetProject(resolvedProjectId);
      if (!mounted) return;

      // Prefer project.projectType, but fall back to the Step 0 selection.
      const pt = ((p.projectType as ProjectType | undefined) ??
        (fallbackTrack === "dapp" || fallbackTrack === "blockchain" ? fallbackTrack : "dapp")) as ProjectType;

      setProjectType(pt);

      const mids = (p.blueprint?.modules ?? []).map((m) => m.moduleId).filter(Boolean);
      setModuleIds(mids);

      const econ = p.economics ?? {};
      if (pt === "dapp" && econ.dapp) {
        setDappRevenue((prev) => ({ ...prev, ...(econ.dapp.revenueModel ?? {}) }));
        setDappAssets((prev) => ({ ...prev, ...(econ.dapp.assets ?? {}) }));
        setDappFees((prev) => ({ ...prev, ...(econ.dapp.fees ?? {}) }));
        setDappPayments((prev) => ({ ...prev, ...(econ.dapp.payments ?? {}) }));
        setDappCompliance((prev) => ({ ...prev, ...(econ.dapp.compliance ?? {}) }));
      }
      if (pt === "blockchain" && econ.chain) {
        setChainTokenomics((prev) => ({ ...prev, ...(econ.chain.tokenomics ?? {}) }));
        setChainFees((prev) => ({ ...prev, ...(econ.chain.fees ?? {}) }));
        setChainStaking((prev) => ({ ...prev, ...(econ.chain.staking ?? {}) }));
        setChainGov((prev) => ({ ...prev, ...(econ.chain.governance ?? {}) }));
      }
    } catch {
      // Requirement: do not show a "Couldn't load project" banner here.
      // Keep defaults and allow Next.
    } finally {
      if (!mounted) return;
      setLoading(false);
    }
  })();

  return () => {
    mounted = false;
  };
}, [resolvedProjectId, sp]);

  // Tabs list depends on projectType
  const tabs = useMemo(() => {
    if (projectType === "dapp") {
      const t: Array<{ key: string; label: string; show?: boolean }> = [
        { key: "rev", label: "Revenue Model" },
        { key: "assets", label: "Tokens & Assets", show: hasErc20 || hasNft },
        { key: "fees", label: "Fees, Royalties & Splits" },
        { key: "pay", label: "Payments" },
        { key: "comp", label: "Compliance & Tax" },
      ];
      return t.filter((x) => x.show !== false);
    }
    return [
      { key: "tok", label: "Network Tokenomics" },
      { key: "fees", label: "Fees & Gas Policy" },
      { key: "stk", label: "Staking & Validators" },
      { key: "gov", label: "Governance (lite)" },
    ];
  }, [projectType, hasErc20, hasNft]);

  useEffect(() => {
    if (!tabs.some((t) => t.key === tab)) setTab(tabs[0]?.key ?? "rev");
  }, [tabs, tab]);

  const handleSave = useCallback(async () => {
    if (!resolvedProjectId) return;
    setSaving(true);
    setSaveErr(null);
    setSavedAt(null);
    try {
      const economics =
        projectType === "dapp"
          ? {
              dapp: {
                revenueModel: dappRevenue,
                assets: hasErc20 || hasNft ? dappAssets : undefined,
                fees: dappFees,
                payments: dappPayments,
                compliance: dappCompliance,
              },
            }
          : {
              chain: {
                tokenomics: chainTokenomics,
                fees: chainFees,
                staking: chainStaking,
                governance: chainGov,
              },
            };

      await apiPatchEconomics(resolvedProjectId, economics);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e: any) {
      setSaveErr(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }, [
    resolvedProjectId,
    projectType,
    dappRevenue,
    dappAssets,
    dappFees,
    dappPayments,
    dappCompliance,
    chainTokenomics,
    chainFees,
    chainStaking,
    chainGov,
    hasErc20,
    hasNft,
  ]);

  const revenueModeOptions = ["purchases", "subscriptions", "fees", "commission", "royalties", "ads"];
  const currencyModes: Array<DappRevenueModel["currencyMode"]> = ["crypto", "fiat", "both"];

  if (loading) {
    return (
      <Box sx={{ minHeight: "calc(100vh - 64px)", px: 4, py: 3 }}>
        <Typography>Loading…</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "calc(100vh - 64px)", px: 4, py: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton
            onClick={handleBack}
            sx={{
              border: "1px solid rgba(255,255,255,0.10)",
              bgcolor: "rgba(10,12,18,0.35)",
              backdropFilter: "blur(10px)",
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Monetization & Economics
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              Configure structured economics for your {projectType === "dapp" ? "dApp" : "chain"}.
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1.25} alignItems="center">
          <Button
            startIcon={<SaveIcon />}
            variant="outlined"
            onClick={handleSave}
            disabled={saving || !resolvedProjectId}
            sx={{
              borderRadius: 999,
              px: 2.5,
              fontWeight: 900,
              borderColor: "rgba(255,255,255,0.16)",
              bgcolor: "rgba(255,255,255,0.04)",
            }}
          >
            {saving ? "Saving…" : "Save"}
          </Button>

          <Button
            variant="outlined"
            onClick={handleNext}
            disabled={saving}
            sx={{
              borderRadius: 999,
              px: 3,
              fontWeight: 900,
              borderColor: "rgba(59,130,246,0.5)",
              bgcolor: "rgba(59,130,246,0.08)",
            }}
          >
            Next
          </Button>
        </Stack>
      </Stack>

      <Divider sx={{ mb: 2, opacity: 0.2 }} />

      {saveErr && (
        <Paper sx={{ p: 2, mb: 2, border: "1px solid rgba(255,80,80,0.35)", bgcolor: "rgba(255,80,80,0.06)" }}>
          <Typography sx={{ fontWeight: 900, mb: 0.5 }}>Save failed</Typography>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            {saveErr}
          </Typography>
        </Paper>
      )}

      {savedAt && (
        <Paper sx={{ p: 1.5, mb: 2, border: "1px solid rgba(80,255,140,0.25)", bgcolor: "rgba(80,255,140,0.05)" }}>
          <Typography variant="body2" sx={{ opacity: 0.85 }}>
            Saved at {savedAt}
          </Typography>
        </Paper>
      )}

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          "& .MuiTab-root": { textTransform: "none", fontWeight: 900 },
        }}
      >
        {tabs.map((t) => (
          <Tab key={t.key} value={t.key} label={t.label} />
        ))}
      </Tabs>

      <Divider sx={{ mt: 1.5, opacity: 0.18 }} />

      {/* DAPP: Revenue */}
      {projectType === "dapp" && tab === "rev" && (
        <Box sx={{ mt: 3 }}>
          <Stack direction="row" spacing={3}>
            <Box sx={{ width: 420, ...GLASS }}>
              <Box sx={{ px: 3, py: 2.25 }}>
                <Typography sx={{ ...PANEL_TITLE_SX, mb: 0.75 }}>Monetization Modes</Typography>
                <Typography variant="body2" sx={{ opacity: 0.75, mb: 1.5 }}>
                  Choose how this dApp makes money. You can enable multiple.
                </Typography>

                <FormControl fullWidth size="small">
                  <InputLabel>Modes</InputLabel>
                  <Select
                    multiple
                    label="Modes"
                    value={dappRevenue.modes}
                    onChange={(e) => setDappRevenue((p) => ({ ...p, modes: e.target.value as string[] }))}
                    input={<OutlinedInput label="Modes" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                        {(selected as string[]).map((v) => (
                          <Chip key={v} label={v} size="small" />
                        ))}
                      </Box>
                    )}
                    MenuProps={OPAQUE_MENU_PROPS as any}
                    sx={{ borderRadius: 3 }}
                  >
                    {revenueModeOptions.map((m) => (
                      <MenuItem key={m} value={m}>
                        <Checkbox checked={dappRevenue.modes.includes(m)} />
                        <Typography sx={{ fontWeight: 800 }}>{m}</Typography>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Divider sx={{ my: 2, opacity: 0.12 }} />

                <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                  <InputLabel>Currency Mode</InputLabel>
                  <Select
                    label="Currency Mode"
                    value={dappRevenue.currencyMode}
                    onChange={(e) => setDappRevenue((p) => ({ ...p, currencyMode: e.target.value as any }))}
                    MenuProps={OPAQUE_MENU_PROPS as any}
                    sx={{ borderRadius: 3 }}
                  >
                    {currencyModes.map((m) => (
                      <MenuItem key={m} value={m}>
                        {m}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Stack direction="row" spacing={1.25}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Primary Currency Type</InputLabel>
                    <Select
                      label="Primary Currency Type"
                      value={dappRevenue.primaryCurrency.type}
                      onChange={(e) =>
                        setDappRevenue((p) => ({
                          ...p,
                          primaryCurrency: { type: e.target.value as any, symbol: "", fiat: "INR" },
                        }))
                      }
                      MenuProps={OPAQUE_MENU_PROPS as any}
                      sx={{ borderRadius: 3 }}
                    >
                      <MenuItem value="fiat">fiat</MenuItem>
                      <MenuItem value="token">token</MenuItem>
                    </Select>
                  </FormControl>

                  {dappRevenue.primaryCurrency.type === "fiat" ? (
                    <TextField
                      label="Fiat (e.g., INR)"
                      size="small"
                      fullWidth
                      value={dappRevenue.primaryCurrency.fiat ?? ""}
                      onChange={(e) =>
                        setDappRevenue((p) => ({
                          ...p,
                          primaryCurrency: { ...p.primaryCurrency, fiat: e.target.value },
                        }))
                      }
                      sx={{ "& .MuiInputBase-root": { borderRadius: 3 } }}
                    />
                  ) : (
                    <TextField
                      label="Token Symbol"
                      size="small"
                      fullWidth
                      value={dappRevenue.primaryCurrency.symbol ?? ""}
                      onChange={(e) =>
                        setDappRevenue((p) => ({
                          ...p,
                          primaryCurrency: { ...p.primaryCurrency, symbol: e.target.value },
                        }))
                      }
                      sx={{ "& .MuiInputBase-root": { borderRadius: 3 } }}
                    />
                  )}
                </Stack>

                <Divider sx={{ my: 2, opacity: 0.12 }} />

                <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                  <InputLabel>Billing model</InputLabel>
                  <Select
                    label="Billing model"
                    value={dappRevenue.billingModel}
                    onChange={(e) => setDappRevenue((p) => ({ ...p, billingModel: e.target.value as any }))}
                    MenuProps={OPAQUE_MENU_PROPS as any}
                    sx={{ borderRadius: 3 }}
                  >
                    <MenuItem value="one-time">one-time</MenuItem>
                    <MenuItem value="recurring">recurring</MenuItem>
                    <MenuItem value="usage">usage</MenuItem>
                    <MenuItem value="hybrid">hybrid</MenuItem>
                  </Select>
                </FormControl>

                <FormControlLabel
                  control={
                    <Switch
                      checked={dappRevenue.trialEnabled}
                      onChange={(e) => setDappRevenue((p) => ({ ...p, trialEnabled: e.target.checked }))}
                    />
                  }
                  label="Trial enabled"
                />

                <TextField
                  label="Trial days"
                  size="small"
                  type="number"
                  value={dappRevenue.trialDays}
                  onChange={(e) => setDappRevenue((p) => ({ ...p, trialDays: safeNum(e.target.value) }))}
                  sx={{ mt: 1.25, "& .MuiInputBase-root": { borderRadius: 3 }, width: 180, display: dappRevenue.trialEnabled ? "block" : "none" }}
                />

                <FormControl fullWidth size="small" sx={{ mt: 1.5 }}>
                  <InputLabel>Refund policy</InputLabel>
                  <Select
                    label="Refund policy"
                    value={dappRevenue.refundPolicy}
                    onChange={(e) => setDappRevenue((p) => ({ ...p, refundPolicy: e.target.value as any }))}
                    MenuProps={OPAQUE_MENU_PROPS as any}
                    sx={{ borderRadius: 3 }}
                  >
                    <MenuItem value="none">none</MenuItem>
                    <MenuItem value="7-days">7-days</MenuItem>
                    <MenuItem value="14-days">14-days</MenuItem>
                    <MenuItem value="custom">custom</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Refund notes"
                  size="small"
                  value={dappRevenue.refundNotes}
                  onChange={(e) => setDappRevenue((p) => ({ ...p, refundNotes: e.target.value }))}
                  multiline
                  minRows={2}
                  sx={{ mt: 1.5, "& .MuiInputBase-root": { borderRadius: 3 }, display: dappRevenue.refundPolicy === "custom" ? "block" : "none" }}
                />
              </Box>
            </Box>

            {/* Pricing tiers */}
            <Box sx={{ flex: 1, ...GLASS }}>
              <Box sx={{ px: 3, py: 2.25 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography sx={{ ...PANEL_TITLE_SX }}>Pricing Tiers</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.75 }}>
                      Optional. Useful for subscriptions or paid plans.
                    </Typography>
                  </Box>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() =>
                      setDappRevenue((p) => ({
                        ...p,
                        tiers: [...(p.tiers ?? []), { name: "Starter", monthly: 0, annual: 0, features: [] }],
                      }))
                    }
                    sx={{
                      borderRadius: 999,
                      bgcolor: "rgba(59,130,246,0.18)",
                      border: "1px solid rgba(59,130,246,0.35)",
                      fontWeight: 900,
                      px: 2.25,
                    }}
                  >
                    Add Tier
                  </Button>
                </Stack>

                <Divider sx={{ my: 2, opacity: 0.12 }} />

                <Stack spacing={2}>
                  {(dappRevenue.tiers ?? []).length === 0 && (
                    <Typography variant="body2" sx={{ opacity: 0.7 }}>
                      No tiers yet.
                    </Typography>
                  )}

                  {(dappRevenue.tiers ?? []).map((t, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 2,
                        borderRadius: 4,
                        border: "1px solid rgba(255,255,255,0.12)",
                        bgcolor: "rgba(255,255,255,0.04)",
                      }}
                    >
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <TextField
                          label="Tier Name"
                          size="small"
                          fullWidth
                          value={t.name}
                          onChange={(e) =>
                            setDappRevenue((p) => {
                              const next = [...(p.tiers ?? [])];
                              next[idx] = { ...next[idx], name: e.target.value };
                              return { ...p, tiers: next };
                            })
                          }
                          sx={{ "& .MuiInputBase-root": { borderRadius: 3 } }}
                        />
                        <IconButton
                          onClick={() =>
                            setDappRevenue((p) => ({
                              ...p,
                              tiers: (p.tiers ?? []).filter((_, i) => i !== idx),
                            }))
                          }
                          sx={{
                            border: "1px solid rgba(255,255,255,0.10)",
                            bgcolor: "rgba(255,255,255,0.04)",
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>

                      <Stack direction="row" spacing={1.25} sx={{ mt: 1.5 }}>
                        <TextField
                          label="Monthly"
                          size="small"
                          type="number"
                          value={t.monthly}
                          onChange={(e) =>
                            setDappRevenue((p) => {
                              const next = [...(p.tiers ?? [])];
                              next[idx] = { ...next[idx], monthly: safeNum(e.target.value) };
                              return { ...p, tiers: next };
                            })
                          }
                          sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 180 }}
                        />
                        <TextField
                          label="Annual"
                          size="small"
                          type="number"
                          value={t.annual}
                          onChange={(e) =>
                            setDappRevenue((p) => {
                              const next = [...(p.tiers ?? [])];
                              next[idx] = { ...next[idx], annual: safeNum(e.target.value) };
                              return { ...p, tiers: next };
                            })
                          }
                          sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 180 }}
                        />
                        <TextField
                          label="Features (comma separated)"
                          size="small"
                          fullWidth
                          value={(t.features ?? []).join(", ")}
                          onChange={(e) =>
                            setDappRevenue((p) => {
                              const next = [...(p.tiers ?? [])];
                              next[idx] = {
                                ...next[idx],
                                features: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                              };
                              return { ...p, tiers: next };
                            })
                          }
                          sx={{ "& .MuiInputBase-root": { borderRadius: 3 } }}
                        />
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Box>
          </Stack>
        </Box>
      )}

      {/* DAPP: Assets */}
      {projectType === "dapp" && tab === "assets" && (
        <Box sx={{ mt: 3 }}>
          <Stack direction="row" spacing={3}>
            {/* ERC20 */}
            <Box sx={{ flex: 1, ...GLASS }}>
              <Box sx={{ px: 3, py: 2.25 }}>
                <Typography sx={{ ...PANEL_TITLE_SX, mb: 0.5 }}>ERC-20 Token</Typography>
                <Typography variant="body2" sx={{ opacity: 0.75, mb: 2 }}>
                  Configure ERC-20 basics if your modules include ERC-20 or token features.
                </Typography>

                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1.25}>
                    <TextField
                      label="Name"
                      size="small"
                      fullWidth
                      value={dappAssets.erc20?.name ?? ""}
                      onChange={(e) =>
                        setDappAssets((p) => ({
                          ...p,
                          erc20: { ...(p.erc20 ?? ({} as any)), name: e.target.value },
                        }))
                      }
                      sx={{ "& .MuiInputBase-root": { borderRadius: 3 } }}
                    />
                    <TextField
                      label="Symbol"
                      size="small"
                      value={dappAssets.erc20?.symbol ?? ""}
                      onChange={(e) =>
                        setDappAssets((p) => ({
                          ...p,
                          erc20: { ...(p.erc20 ?? ({} as any)), symbol: e.target.value },
                        }))
                      }
                      sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 180 }}
                    />
                    <TextField
                      label="Decimals"
                      size="small"
                      type="number"
                      value={dappAssets.erc20?.decimals ?? 18}
                      onChange={(e) =>
                        setDappAssets((p) => ({
                          ...p,
                          erc20: { ...(p.erc20 ?? ({} as any)), decimals: safeNum(e.target.value, 18) },
                        }))
                      }
                      sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 150 }}
                    />
                  </Stack>

                  <Stack direction="row" spacing={1.25}>
                    <TextField
                      label="Initial Supply"
                      size="small"
                      type="number"
                      value={dappAssets.erc20?.initialSupply ?? 0}
                      onChange={(e) =>
                        setDappAssets((p) => ({
                          ...p,
                          erc20: { ...(p.erc20 ?? ({} as any)), initialSupply: safeNum(e.target.value) },
                        }))
                      }
                      sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 220 }}
                    />
                    <TextField
                      label="Max Supply (0 = unlimited)"
                      size="small"
                      type="number"
                      value={dappAssets.erc20?.maxSupply ?? 0}
                      onChange={(e) =>
                        setDappAssets((p) => ({
                          ...p,
                          erc20: { ...(p.erc20 ?? ({} as any)), maxSupply: safeNum(e.target.value) },
                        }))
                      }
                      sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 260 }}
                    />
                  </Stack>

                  <Stack direction="row" spacing={1.25}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!dappAssets.erc20?.mintable}
                          onChange={(e) =>
                            setDappAssets((p) => ({
                              ...p,
                              erc20: { ...(p.erc20 ?? ({} as any)), mintable: e.target.checked },
                            }))
                          }
                        />
                      }
                      label="Mintable"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!dappAssets.erc20?.burnable}
                          onChange={(e) =>
                            setDappAssets((p) => ({
                              ...p,
                              erc20: { ...(p.erc20 ?? ({} as any)), burnable: e.target.checked },
                            }))
                          }
                        />
                      }
                      label="Burnable"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!dappAssets.erc20?.transferEnabled}
                          onChange={(e) =>
                            setDappAssets((p) => ({
                              ...p,
                              erc20: { ...(p.erc20 ?? ({} as any)), transferEnabled: e.target.checked },
                            }))
                          }
                        />
                      }
                      label="Transfers enabled"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!dappAssets.erc20?.blacklistEnabled}
                          onChange={(e) =>
                            setDappAssets((p) => ({
                              ...p,
                              erc20: { ...(p.erc20 ?? ({} as any)), blacklistEnabled: e.target.checked },
                            }))
                          }
                        />
                      }
                      label="Blacklist enabled"
                    />
                  </Stack>

                  <TextField
                    label="Restrictions / Notes"
                    size="small"
                    value={dappAssets.erc20?.restrictions ?? ""}
                    onChange={(e) =>
                      setDappAssets((p) => ({
                        ...p,
                        erc20: { ...(p.erc20 ?? ({} as any)), restrictions: e.target.value },
                      }))
                    }
                    multiline
                    minRows={3}
                    sx={{ "& .MuiInputBase-root": { borderRadius: 3 } }}
                  />
                </Stack>
              </Box>
            </Box>

            {/* NFT */}
            <Box sx={{ flex: 1, ...GLASS }}>
              <Box sx={{ px: 3, py: 2.25 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography sx={{ ...PANEL_TITLE_SX, mb: 0.5 }}>NFT Collection</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.75 }}>
                      Configure NFT mint settings if your modules include NFTs / ERC-721.
                    </Typography>
                  </Box>
                  <Tooltip title="Add mint phase">
                    <IconButton
                      onClick={() =>
                        setDappAssets((p) => ({
                          ...p,
                          nft: {
                            ...(p.nft ?? ({} as any)),
                            phases: [...((p.nft?.phases ?? []) as any[]), { name: "Phase", startsAt: "", price: 0, supply: 0 }],
                          },
                        }))
                      }
                      sx={{
                        border: "1px solid rgba(59,130,246,0.30)",
                        bgcolor: "rgba(59,130,246,0.14)",
                      }}
                    >
                      <AddIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>

                <Divider sx={{ my: 2, opacity: 0.12 }} />

                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1.25}>
                    <TextField
                      label="Collection Name"
                      size="small"
                      fullWidth
                      value={dappAssets.nft?.collectionName ?? ""}
                      onChange={(e) =>
                        setDappAssets((p) => ({
                          ...p,
                          nft: { ...(p.nft ?? ({} as any)), collectionName: e.target.value },
                        }))
                      }
                      sx={{ "& .MuiInputBase-root": { borderRadius: 3 } }}
                    />
                    <TextField
                      label="Symbol"
                      size="small"
                      value={dappAssets.nft?.symbol ?? ""}
                      onChange={(e) =>
                        setDappAssets((p) => ({
                          ...p,
                          nft: { ...(p.nft ?? ({} as any)), symbol: e.target.value },
                        }))
                      }
                      sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 180 }}
                    />
                  </Stack>

                  <TextField
                    label="Base URI"
                    size="small"
                    value={dappAssets.nft?.baseUri ?? ""}
                    onChange={(e) =>
                      setDappAssets((p) => ({
                        ...p,
                        nft: { ...(p.nft ?? ({} as any)), baseUri: e.target.value },
                      }))
                    }
                    sx={{ "& .MuiInputBase-root": { borderRadius: 3 } }}
                  />

                  <Stack direction="row" spacing={1.25}>
                    <TextField
                      label="Mint Price"
                      size="small"
                      type="number"
                      value={dappAssets.nft?.mintPrice ?? 0}
                      onChange={(e) =>
                        setDappAssets((p) => ({
                          ...p,
                          nft: { ...(p.nft ?? ({} as any)), mintPrice: safeNum(e.target.value) },
                        }))
                      }
                      sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 200 }}
                    />
                    <TextField
                      label="Max Supply"
                      size="small"
                      type="number"
                      value={dappAssets.nft?.maxSupply ?? 0}
                      onChange={(e) =>
                        setDappAssets((p) => ({
                          ...p,
                          nft: { ...(p.nft ?? ({} as any)), maxSupply: safeNum(e.target.value) },
                        }))
                      }
                      sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 200 }}
                    />
                  </Stack>

                  <Stack direction="row" spacing={1.25}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!dappAssets.nft?.allowlistEnabled}
                          onChange={(e) =>
                            setDappAssets((p) => ({
                              ...p,
                              nft: { ...(p.nft ?? ({} as any)), allowlistEnabled: e.target.checked },
                            }))
                          }
                        />
                      }
                      label="Allowlist enabled"
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={!!dappAssets.nft?.revealEnabled}
                          onChange={(e) =>
                            setDappAssets((p) => ({
                              ...p,
                              nft: { ...(p.nft ?? ({} as any)), revealEnabled: e.target.checked },
                            }))
                          }
                        />
                      }
                      label="Delayed reveal"
                    />
                  </Stack>

                  <TextField
                    label="Reveal URI"
                    size="small"
                    fullWidth
                    value={dappAssets.nft?.revealUri ?? ""}
                    onChange={(e) =>
                      setDappAssets((p) => ({
                        ...p,
                        nft: { ...(p.nft ?? ({} as any)), revealUri: e.target.value },
                      }))
                    }
                    sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, display: dappAssets.nft?.revealEnabled ? "block" : "none" }}
                  />

                  <Divider sx={{ my: 1, opacity: 0.12 }} />

                  <Typography sx={{ ...PANEL_TITLE_SX }}>Mint Phases</Typography>
                  <Stack spacing={1.25}>
                    {(dappAssets.nft?.phases ?? []).map((ph, i) => (
                      <Box
                        key={i}
                        sx={{
                          borderRadius: 4,
                          border: "1px solid rgba(255,255,255,0.12)",
                          bgcolor: "rgba(255,255,255,0.04)",
                          p: 1.5,
                        }}
                      >
                        <Stack direction="row" spacing={1.25} alignItems="center">
                          <TextField
  label="Name"
  size="small"
  value={ph.name}
  onChange={(e) =>
    setDappAssets((p) => {
      const phases = [...(p.nft?.phases ?? [])];
      phases[i] = { ...phases[i], name: e.target.value };
      return { ...p, nft: { ...(p.nft ?? ({} as any)), phases } };
    })
  }
  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 220 }}
/>
                          <TextField
                            label="Starts At (ISO)"
                            size="small"
                            fullWidth
                            value={ph.startsAt}
                            onChange={(e) =>
                              setDappAssets((p) => {
                                const phases = [...(p.nft?.phases ?? [])];
                                phases[i] = { ...phases[i], startsAt: e.target.value };
                                return { ...p, nft: { ...(p.nft ?? ({} as any)), phases } };
                              })
                            }
                            sx={{ "& .MuiInputBase-root": { borderRadius: 3 } }}
                          />
                          <IconButton
                            onClick={() =>
                              setDappAssets((p) => {
                                const phases = (p.nft?.phases ?? []).filter((_, idx) => idx !== i);
                                return { ...p, nft: { ...(p.nft ?? ({} as any)), phases } };
                              })
                            }
                            sx={{
                              border: "1px solid rgba(255,255,255,0.10)",
                              bgcolor: "rgba(255,255,255,0.04)",
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>

                        <Stack direction="row" spacing={1.25} sx={{ mt: 1.25 }}>
                          <TextField
                            label="Price"
                            size="small"
                            type="number"
                            value={ph.price}
                            onChange={(e) =>
                              setDappAssets((p) => {
                                const phases = [...(p.nft?.phases ?? [])];
                                phases[i] = { ...phases[i], price: safeNum(e.target.value) };
                                return { ...p, nft: { ...(p.nft ?? ({} as any)), phases } };
                              })
                            }
                            sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 180 }}
                          />
                          <TextField
                            label="Supply"
                            size="small"
                            type="number"
                            value={ph.supply}
                            onChange={(e) =>
                              setDappAssets((p) => {
                                const phases = [...(p.nft?.phases ?? [])];
                                phases[i] = { ...phases[i], supply: safeNum(e.target.value) };
                                return { ...p, nft: { ...(p.nft ?? ({} as any)), phases } };
                              })
                            }
                            sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 180 }}
                          />
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              </Box>
            </Box>
          </Stack>
        </Box>
      )}

      {/* DAPP: Fees */}
      {projectType === "dapp" && tab === "fees" && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ ...GLASS }}>
            <Box sx={{ px: 3, py: 2.25 }}>
              <Typography sx={{ ...PANEL_TITLE_SX }}>Fees, Royalties & Splits</Typography>
              <Typography variant="body2" sx={{ opacity: 0.75, mb: 2 }}>
                Configure platform and creator fee behavior.
              </Typography>

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                <TextField
                  label="Platform fee %"
                  size="small"
                  type="number"
                  value={dappFees.platformFeePct}
                  onChange={(e) => setDappFees((p) => ({ ...p, platformFeePct: safeNum(e.target.value) }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 220 }}
                />
                <TextField
                  label="Referral fee %"
                  size="small"
                  type="number"
                  value={dappFees.referralFeePct}
                  onChange={(e) => setDappFees((p) => ({ ...p, referralFeePct: safeNum(e.target.value) }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 220 }}
                />
                <TextField
                  label="Creator fee %"
                  size="small"
                  type="number"
                  value={dappFees.creatorFeePct}
                  onChange={(e) => setDappFees((p) => ({ ...p, creatorFeePct: safeNum(e.target.value) }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 220 }}
                />
                <TextField
                  label="Royalty %"
                  size="small"
                  type="number"
                  value={dappFees.royaltyPct}
                  onChange={(e) => setDappFees((p) => ({ ...p, royaltyPct: safeNum(e.target.value) }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 220 }}
                />
                <TextField
                  label="Min payout amount"
                  size="small"
                  type="number"
                  value={dappFees.minPayoutAmount}
                  onChange={(e) => setDappFees((p) => ({ ...p, minPayoutAmount: safeNum(e.target.value) }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 220 }}
                />
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel>Payout schedule</InputLabel>
                  <Select
                    label="Payout schedule"
                    value={dappFees.payoutSchedule}
                    onChange={(e) => setDappFees((p) => ({ ...p, payoutSchedule: e.target.value as any }))}
                    MenuProps={OPAQUE_MENU_PROPS as any}
                    sx={{ borderRadius: 3 }}
                  >
                    <MenuItem value="instant">instant</MenuItem>
                    <MenuItem value="daily">daily</MenuItem>
                    <MenuItem value="weekly">weekly</MenuItem>
                    <MenuItem value="monthly">monthly</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 260 }}>
                  <InputLabel>Chargeback handling</InputLabel>
                  <Select
                    label="Chargeback handling"
                    value={dappFees.chargebackHandling}
                    onChange={(e) => setDappFees((p) => ({ ...p, chargebackHandling: e.target.value as any }))}
                    MenuProps={OPAQUE_MENU_PROPS as any}
                    sx={{ borderRadius: 3 }}
                  >
                    <MenuItem value="none">none</MenuItem>
                    <MenuItem value="manual-review">manual-review</MenuItem>
                    <MenuItem value="auto-disable-user">auto-disable-user</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <TextField
                label="Payout address rules"
                size="small"
                value={dappFees.payoutAddressRules}
                onChange={(e) => setDappFees((p) => ({ ...p, payoutAddressRules: e.target.value }))}
                multiline
                minRows={4}
                sx={{ mt: 2, "& .MuiInputBase-root": { borderRadius: 3 } }}
              />
            </Box>
          </Box>
        </Box>
      )}

      {/* DAPP: Payments */}
      {projectType === "dapp" && tab === "pay" && (
        <Box sx={{ mt: 3 }}>
          <Stack direction="row" spacing={3}>
            <Box sx={{ width: 520, ...GLASS }}>
              <Box sx={{ px: 3, py: 2.25 }}>
                <Typography sx={{ ...PANEL_TITLE_SX }}>Fiat Payments</Typography>
                <Typography variant="body2" sx={{ opacity: 0.75, mb: 2 }}>
                  Enable fiat checkout and select provider.
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={dappPayments.fiatEnabled}
                      onChange={(e) => setDappPayments((p) => ({ ...p, fiatEnabled: e.target.checked }))}
                    />
                  }
                  label="Fiat payments enabled"
                />

                <FormControl fullWidth size="small" sx={{ mt: 1.5 }}>
                  <InputLabel>Provider</InputLabel>
                  <Select
                    label="Provider"
                    value={dappPayments.fiatProvider}
                    onChange={(e) => setDappPayments((p) => ({ ...p, fiatProvider: e.target.value as any }))}
                    MenuProps={OPAQUE_MENU_PROPS as any}
                    sx={{ borderRadius: 3 }}
                    disabled={!dappPayments.fiatEnabled}
                  >
                    <MenuItem value="Stripe">Stripe</MenuItem>
                    <MenuItem value="Razorpay">Razorpay</MenuItem>
                    <MenuItem value="Manual">Manual</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Webhook secret"
                  size="small"
                  fullWidth
                  value={dappPayments.webhookSecret}
                  onChange={(e) => setDappPayments((p) => ({ ...p, webhookSecret: e.target.value }))}
                  sx={{ mt: 1.5, "& .MuiInputBase-root": { borderRadius: 3 } }}
                  disabled={!dappPayments.fiatEnabled}
                />

                <Stack direction="row" spacing={1.25} sx={{ mt: 1.5 }}>
                  <TextField
                    label="Success URL"
                    size="small"
                    fullWidth
                    value={dappPayments.successUrl}
                    onChange={(e) => setDappPayments((p) => ({ ...p, successUrl: e.target.value }))}
                    sx={{ "& .MuiInputBase-root": { borderRadius: 3 } }}
                    disabled={!dappPayments.fiatEnabled}
                  />
                  <TextField
                    label="Cancel URL"
                    size="small"
                    fullWidth
                    value={dappPayments.cancelUrl}
                    onChange={(e) => setDappPayments((p) => ({ ...p, cancelUrl: e.target.value }))}
                    sx={{ "& .MuiInputBase-root": { borderRadius: 3 } }}
                    disabled={!dappPayments.fiatEnabled}
                  />
                </Stack>
              </Box>
            </Box>

            <Box sx={{ flex: 1, ...GLASS }}>
              <Box sx={{ px: 3, py: 2.25 }}>
                <Typography sx={{ ...PANEL_TITLE_SX }}>Crypto Payments</Typography>
                <Typography variant="body2" sx={{ opacity: 0.75, mb: 2 }}>
                  Enable crypto payments and configure treasury routing.
                </Typography>

                <FormControlLabel
                  control={
                    <Switch
                      checked={dappPayments.cryptoEnabled}
                      onChange={(e) => setDappPayments((p) => ({ ...p, cryptoEnabled: e.target.checked }))}
                    />
                  }
                  label="Crypto payments enabled"
                />

                <TextField
                  label="Treasury address"
                  size="small"
                  fullWidth
                  value={dappPayments.treasuryAddress}
                  onChange={(e) => setDappPayments((p) => ({ ...p, treasuryAddress: e.target.value }))}
                  sx={{ mt: 1.5, "& .MuiInputBase-root": { borderRadius: 3 } }}
                  disabled={!dappPayments.cryptoEnabled}
                />

                <Divider sx={{ my: 2, opacity: 0.12 }} />

                <Typography sx={{ ...PANEL_TITLE_SX }}>Subscriptions</Typography>
                <Typography variant="body2" sx={{ opacity: 0.75, mb: 1.5 }}>
                  {hasSubscriptions ? "Subscriptions module detected — configure mode." : "Configure subscription defaults (optional)."}
                </Typography>

                <FormControl fullWidth size="small">
                  <InputLabel>Subscriptions Mode</InputLabel>
                  <Select
                    label="Subscriptions Mode"
                    value={dappPayments.subscriptionsMode}
                    onChange={(e) => setDappPayments((p) => ({ ...p, subscriptionsMode: e.target.value as any }))}
                    MenuProps={OPAQUE_MENU_PROPS as any}
                    sx={{ borderRadius: 3 }}
                  >
                    <MenuItem value="provider">provider (Stripe/Razorpay)</MenuItem>
                    <MenuItem value="onchain">onchain</MenuItem>
                  </Select>
                </FormControl>

                <Stack direction="row" spacing={1.25} sx={{ mt: 1.5 }}>
                  <TextField
                    label="Trial (days)"
                    size="small"
                    type="number"
                    value={dappPayments.trialDays}
                    onChange={(e) => setDappPayments((p) => ({ ...p, trialDays: safeNum(e.target.value) }))}
                    sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 200 }}
                  />
                  <TextField
                    label="Grace (days)"
                    size="small"
                    type="number"
                    value={dappPayments.graceDays}
                    onChange={(e) => setDappPayments((p) => ({ ...p, graceDays: safeNum(e.target.value) }))}
                    sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 200 }}
                  />
                </Stack>
              </Box>
            </Box>
          </Stack>
        </Box>
      )}

      {/* DAPP: Compliance */}
      {projectType === "dapp" && tab === "comp" && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ ...GLASS }}>
            <Box sx={{ px: 3, py: 2.25 }}>
              <Typography sx={{ ...PANEL_TITLE_SX }}>Compliance & Tax (lite)</Typography>
              <Typography variant="body2" sx={{ opacity: 0.75, mb: 2 }}>
                Lightweight compliance switches to influence deploy configuration and UI defaults.
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={dappCompliance.kycEnabled}
                    onChange={(e) => setDappCompliance((p) => ({ ...p, kycEnabled: e.target.checked }))}
                  />
                }
                label="KYC enabled"
              />

              <FormControlLabel
                sx={{ mt: 0.5 }}
                control={
                  <Switch
                    checked={dappCompliance.ageGateEnabled}
                    onChange={(e) => setDappCompliance((p) => ({ ...p, ageGateEnabled: e.target.checked }))}
                  />
                }
                label="Age gate enabled"
              />

              <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                <InputLabel>Tax mode</InputLabel>
                <Select
                  label="Tax mode"
                  value={dappCompliance.taxMode}
                  onChange={(e) => setDappCompliance((p) => ({ ...p, taxMode: e.target.value as any }))}
                  MenuProps={OPAQUE_MENU_PROPS as any}
                  sx={{ borderRadius: 3 }}
                >
                  <MenuItem value="none">none</MenuItem>
                  <MenuItem value="gst">gst</MenuItem>
                  <MenuItem value="vat">vat</MenuItem>
                  <MenuItem value="custom">custom</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Restricted regions (comma separated)"
                size="small"
                fullWidth
                value={dappCompliance.restrictedRegions.join(", ")}
                onChange={(e) =>
                  setDappCompliance((p) => ({
                    ...p,
                    restrictedRegions: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  }))
                }
                sx={{ mt: 2, "& .MuiInputBase-root": { borderRadius: 3 } }}
              />

              <Stack direction="row" spacing={1.25} sx={{ mt: 2 }}>
                <TextField
                  label="Terms URL"
                  size="small"
                  fullWidth
                  value={dappCompliance.termsUrl}
                  onChange={(e) => setDappCompliance((p) => ({ ...p, termsUrl: e.target.value }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 } }}
                />
                <TextField
                  label="Privacy URL"
                  size="small"
                  fullWidth
                  value={dappCompliance.privacyUrl}
                  onChange={(e) => setDappCompliance((p) => ({ ...p, privacyUrl: e.target.value }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 } }}
                />
              </Stack>
            </Box>
          </Box>
        </Box>
      )}

      {/* CHAIN: Tokenomics */}
      {projectType === "blockchain" && tab === "tok" && (
        <Box sx={{ mt: 3 }}>
          <Stack direction="row" spacing={3}>
            <Box sx={{ flex: 1, ...GLASS }}>
              <Box sx={{ px: 3, py: 2.25 }}>
                <Typography sx={{ ...PANEL_TITLE_SX }}>Token Info</Typography>
                <Typography variant="body2" sx={{ opacity: 0.75, mb: 2 }}>
                  Define chain token properties and supply model.
                </Typography>

                <Stack direction="row" spacing={1.25}>
                  <TextField
                    label="Token name"
                    size="small"
                    fullWidth
                    value={chainTokenomics.tokenName}
                    onChange={(e) => setChainTokenomics((p) => ({ ...p, tokenName: e.target.value }))}
                    sx={{ "& .MuiInputBase-root": { borderRadius: 3 } }}
                  />
                  <TextField
                    label="Symbol"
                    size="small"
                    value={chainTokenomics.tokenSymbol}
                    onChange={(e) => setChainTokenomics((p) => ({ ...p, tokenSymbol: e.target.value }))}
                    sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 180 }}
                  />
                  <TextField
                    label="Decimals"
                    size="small"
                    type="number"
                    value={chainTokenomics.decimals}
                    onChange={(e) => setChainTokenomics((p) => ({ ...p, decimals: safeNum(e.target.value, 18) }))}
                    sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 140 }}
                  />
                </Stack>

                <Divider sx={{ my: 2, opacity: 0.12 }} />

                <FormControl fullWidth size="small">
                  <InputLabel>Supply model</InputLabel>
                  <Select
                    label="Supply model"
                    value={chainTokenomics.supplyModel}
                    onChange={(e) => setChainTokenomics((p) => ({ ...p, supplyModel: e.target.value as any }))}
                    MenuProps={OPAQUE_MENU_PROPS as any}
                    sx={{ borderRadius: 3 }}
                  >
                    <MenuItem value="fixed">fixed</MenuItem>
                    <MenuItem value="inflationary">inflationary</MenuItem>
                  </Select>
                </FormControl>

                <Stack direction="row" spacing={1.25} sx={{ mt: 1.5 }}>
                  <TextField
                    label="Total supply"
                    size="small"
                    type="number"
                    value={chainTokenomics.totalSupply}
                    onChange={(e) => setChainTokenomics((p) => ({ ...p, totalSupply: safeNum(e.target.value) }))}
                    sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 220 }}
                  />
                  <TextField
                    label="Inflation %"
                    size="small"
                    type="number"
                    value={chainTokenomics.inflationPct}
                    onChange={(e) => setChainTokenomics((p) => ({ ...p, inflationPct: safeNum(e.target.value) }))}
                    sx={{
                      "& .MuiInputBase-root": { borderRadius: 3 },
                      width: 220,
                      display: chainTokenomics.supplyModel === "inflationary" ? "block" : "none",
                    }}
                  />
                </Stack>

                <Stack direction="row" spacing={1.25} sx={{ mt: 1.5 }}>
                  <TextField
                    label="Reward split: validators %"
                    size="small"
                    type="number"
                    value={chainTokenomics.rewardSplitValidatorsPct}
                    onChange={(e) => setChainTokenomics((p) => ({ ...p, rewardSplitValidatorsPct: safeNum(e.target.value) }))}
                    sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 260 }}
                  />
                  <TextField
                    label="Reward split: treasury %"
                    size="small"
                    type="number"
                    value={chainTokenomics.rewardSplitTreasuryPct}
                    onChange={(e) => setChainTokenomics((p) => ({ ...p, rewardSplitTreasuryPct: safeNum(e.target.value) }))}
                    sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 260 }}
                  />
                </Stack>

                <Divider sx={{ my: 2, opacity: 0.12 }} />

                <Stack direction="row" spacing={1.25}>
                  <TextField
                    label="Block time (seconds)"
                    size="small"
                    type="number"
                    value={chainTokenomics.blockTimeSeconds}
                    onChange={(e) => setChainTokenomics((p) => ({ ...p, blockTimeSeconds: safeNum(e.target.value, 6) }))}
                    sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 220 }}
                  />
                  <TextField
                    label="Existential deposit"
                    size="small"
                    type="number"
                    value={chainTokenomics.existentialDeposit}
                    onChange={(e) => setChainTokenomics((p) => ({ ...p, existentialDeposit: safeNum(e.target.value) }))}
                    sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 240 }}
                  />
                  <TextField
                    label="Max issuance / block (0 = none)"
                    size="small"
                    type="number"
                    value={chainTokenomics.maxIssuancePerBlock}
                    onChange={(e) => setChainTokenomics((p) => ({ ...p, maxIssuancePerBlock: safeNum(e.target.value) }))}
                    sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 260 }}
                  />
                </Stack>

                <TextField
                  label="Treasury address"
                  size="small"
                  fullWidth
                  value={chainTokenomics.treasuryAddress}
                  onChange={(e) => setChainTokenomics((p) => ({ ...p, treasuryAddress: e.target.value }))}
                  sx={{ mt: 2, "& .MuiInputBase-root": { borderRadius: 3 } }}
                />

                <FormControlLabel
                  sx={{ mt: 1 }}
                  control={
                    <Switch
                      checked={chainTokenomics.vestingEnabled}
                      onChange={(e) => setChainTokenomics((p) => ({ ...p, vestingEnabled: e.target.checked }))}
                    />
                  }
                  label="Vesting enabled"
                />
              </Box>
            </Box>

            <Box sx={{ width: 560, ...GLASS }}>
              <Box sx={{ px: 3, py: 2.25 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography sx={{ ...PANEL_TITLE_SX }}>Genesis Allocations</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.75 }}>
                      Pre-allocate token supply at genesis.
                    </Typography>
                  </Box>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() =>
                      setChainTokenomics((p) => ({
                        ...p,
                        genesisAllocations: [...p.genesisAllocations, { label: "Allocation", address: "", amount: 0 }],
                      }))
                    }
                    sx={{
                      borderRadius: 999,
                      bgcolor: "rgba(59,130,246,0.18)",
                      border: "1px solid rgba(59,130,246,0.35)",
                      fontWeight: 900,
                      px: 2.25,
                    }}
                  >
                    Add
                  </Button>
                </Stack>

                <Divider sx={{ my: 2, opacity: 0.12 }} />

                <Stack spacing={1.25}>
                  {chainTokenomics.genesisAllocations.map((ga, i) => (
                    <Box
                      key={i}
                      sx={{
                        borderRadius: 4,
                        border: "1px solid rgba(255,255,255,0.12)",
                        bgcolor: "rgba(255,255,255,0.04)",
                        p: 1.5,
                      }}
                    >
                      <Stack direction="row" spacing={1.25} alignItems="center">
                        <TextField
                          label="Label"
                          size="small"
                          value={ga.label}
                          onChange={(e) =>
                            setChainTokenomics((p) => {
                              const next = [...p.genesisAllocations];
                              next[i] = { ...next[i], label: e.target.value };
                              return { ...p, genesisAllocations: next };
                            })
                          }
                          sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 200 }}
                        />
                        <TextField
                          label="Address"
                          size="small"
                          fullWidth
                          value={ga.address}
                          onChange={(e) =>
                            setChainTokenomics((p) => {
                              const next = [...p.genesisAllocations];
                              next[i] = { ...next[i], address: e.target.value };
                              return { ...p, genesisAllocations: next };
                            })
                          }
                          sx={{ "& .MuiInputBase-root": { borderRadius: 3 } }}
                        />
                        <TextField
                          label="Amount"
                          size="small"
                          type="number"
                          value={ga.amount}
                          onChange={(e) =>
                            setChainTokenomics((p) => {
                              const next = [...p.genesisAllocations];
                              next[i] = { ...next[i], amount: safeNum(e.target.value) };
                              return { ...p, genesisAllocations: next };
                            })
                          }
                          sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 180 }}
                        />
                        <IconButton
                          onClick={() =>
                            setChainTokenomics((p) => ({
                              ...p,
                              genesisAllocations: p.genesisAllocations.filter((_, idx) => idx !== i),
                            }))
                          }
                          sx={{
                            border: "1px solid rgba(255,255,255,0.10)",
                            bgcolor: "rgba(255,255,255,0.04)",
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Box>
          </Stack>
        </Box>
      )}

      {/* CHAIN: Fees */}
      {projectType === "blockchain" && tab === "fees" && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ ...GLASS }}>
            <Box sx={{ px: 3, py: 2.25 }}>
              <Typography sx={{ ...PANEL_TITLE_SX }}>Fees & Gas Policy</Typography>
              <Typography variant="body2" sx={{ opacity: 0.75, mb: 2 }}>
                Define fee model and revenue distribution.
              </Typography>

              <Box sx={{
    display: "flex",
    flexWrap: "wrap",
    gap: 1.25,
    alignItems: "center",
  }}>
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel>Fee model</InputLabel>
                  <Select
                    label="Fee model"
                    value={chainFees.feeModel}
                    onChange={(e) => setChainFees((p) => ({ ...p, feeModel: e.target.value as any }))}
                    MenuProps={OPAQUE_MENU_PROPS as any}
                    sx={{ borderRadius: 3 }}
                  >
                    <MenuItem value="flat">flat</MenuItem>
                    <MenuItem value="gas">gas</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Base fee"
                  size="small"
                  type="number"
                  value={chainFees.baseFee}
                  onChange={(e) => setChainFees((p) => ({ ...p, baseFee: safeNum(e.target.value) }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 220 }}
                />

                <FormControlLabel
sx={{ flex: "0 0 auto", ml: 0.25 }}				
                  control={
                    <Switch
                      checked={chainFees.dynamicBaseFee}
                      onChange={(e) => setChainFees((p) => ({ ...p, dynamicBaseFee: e.target.checked }))}
                    />
                  }
                  label="Dynamic base fee"
                />

                <TextField
                  label="Burn %"
                  size="small"
                  type="number"
                  value={chainFees.burnPct}
                  onChange={(e) => setChainFees((p) => ({ ...p, burnPct: safeNum(e.target.value) }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 160 }}
                />
                <TextField
                  label="Validator share %"
                  size="small"
                  type="number"
                  value={chainFees.validatorSharePct}
                  onChange={(e) => setChainFees((p) => ({ ...p, validatorSharePct: safeNum(e.target.value) }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 200 }}
                />
                <TextField
                  label="Treasury share %"
                  size="small"
                  type="number"
                  value={chainFees.treasurySharePct}
                  onChange={(e) => setChainFees((p) => ({ ...p, treasurySharePct: safeNum(e.target.value) }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 200 }}
                />
                <TextField
                  label="Min fee"
                  size="small"
                  type="number"
                  value={chainFees.minFee}
                  onChange={(e) => setChainFees((p) => ({ ...p, minFee: safeNum(e.target.value) }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 160 }}
                />
                <TextField
                  label="Max fee (0 = none)"
                  size="small"
                  type="number"
                  value={chainFees.maxFee}
                  onChange={(e) => setChainFees((p) => ({ ...p, maxFee: safeNum(e.target.value) }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 200 }}
                />
                <TextField
                  label="Congestion multiplier"
                  size="small"
                  type="number"
                  value={chainFees.congestionMultiplier}
                  onChange={(e) => setChainFees((p) => ({ ...p, congestionMultiplier: safeNum(e.target.value, 1) }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 240 }}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      )}

      {/* CHAIN: Staking */}
      {projectType === "blockchain" && tab === "stk" && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ ...GLASS }}>
            <Box sx={{ px: 3, py: 2.25 }}>
              <Typography sx={{ ...PANEL_TITLE_SX }}>Staking & Validators</Typography>
              <Typography variant="body2" sx={{ opacity: 0.75, mb: 2 }}>
                Configure staking thresholds and validator limits.
              </Typography>

              <Stack direction="row" spacing={1.25} sx={{ flexWrap: "wrap" }}>
                <TextField
                  label="Min stake"
                  size="small"
                  type="number"
                  value={chainStaking.minStake}
                  onChange={(e) => setChainStaking((p) => ({ ...p, minStake: safeNum(e.target.value) }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 200 }}
                />
                <TextField
                  label="Unbonding days"
                  size="small"
                  type="number"
                  value={chainStaking.unbondingDays}
                  onChange={(e) => setChainStaking((p) => ({ ...p, unbondingDays: safeNum(e.target.value) }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 220 }}
                />
                <TextField
                  label="Validator limit"
                  size="small"
                  type="number"
                  value={chainStaking.validatorLimit}
                  onChange={(e) => setChainStaking((p) => ({ ...p, validatorLimit: safeNum(e.target.value) }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 220 }}
                />
              </Stack>

              <Divider sx={{ my: 2, opacity: 0.12 }} />

              <FormControlLabel
                control={
                  <Switch
                    checked={chainStaking.slashingEnabled}
                    onChange={(e) => setChainStaking((p) => ({ ...p, slashingEnabled: e.target.checked }))}
                  />
                }
                label="Slashing enabled"
              />

              <FormControl size="small" sx={{ minWidth: 260, mt: 1.5 }}>
                <InputLabel>Slashing preset</InputLabel>
                <Select
                  label="Slashing preset"
                  value={chainStaking.slashingPreset}
                  onChange={(e) => setChainStaking((p) => ({ ...p, slashingPreset: e.target.value as any }))}
                  MenuProps={OPAQUE_MENU_PROPS as any}
                  sx={{ borderRadius: 3 }}
                  disabled={!chainStaking.slashingEnabled}
                >
                  <MenuItem value="lite">lite</MenuItem>
                  <MenuItem value="balanced">balanced</MenuItem>
                  <MenuItem value="strict">strict</MenuItem>
                </Select>
              </FormControl>

              <Divider sx={{ my: 2, opacity: 0.12 }} />

              <Stack direction="row" spacing={1.25} sx={{ flexWrap: "wrap" }}>
                <TextField
                  label="Validator commission %"
                  size="small"
                  type="number"
                  value={chainStaking.validatorCommissionPct}
                  onChange={(e) => setChainStaking((p) => ({ ...p, validatorCommissionPct: safeNum(e.target.value) }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 240 }}
                />
                <TextField
                  label="Commission min %"
                  size="small"
                  type="number"
                  value={chainStaking.commissionMinPct}
                  onChange={(e) => setChainStaking((p) => ({ ...p, commissionMinPct: safeNum(e.target.value) }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 220 }}
                />
                <TextField
                  label="Commission max %"
                  size="small"
                  type="number"
                  value={chainStaking.commissionMaxPct}
                  onChange={(e) => setChainStaking((p) => ({ ...p, commissionMaxPct: safeNum(e.target.value) }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 220 }}
                />
              </Stack>
            </Box>
          </Box>
        </Box>
      )}

      {/* CHAIN: Governance */}
      {projectType === "blockchain" && tab === "gov" && (
        <Box sx={{ mt: 3 }}>
          <Box sx={{ ...GLASS }}>
            <Box sx={{ px: 3, py: 2.25 }}>
              <Typography sx={{ ...PANEL_TITLE_SX }}>Governance (lite)</Typography>
              <Typography variant="body2" sx={{ opacity: 0.75, mb: 2 }}>
                Basic governance parameters (no AI automation here).
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={chainGov.enabled}
                    onChange={(e) => setChainGov((p) => ({ ...p, enabled: e.target.checked }))}
                  />
                }
                label="Governance enabled"
              />

              <Stack direction="row" spacing={1.25} sx={{ mt: 2, flexWrap: "wrap" }}>
                <FormControl size="small" sx={{ minWidth: 260 }}>
                  <InputLabel>Voting model</InputLabel>
                  <Select
                    label="Voting model"
                    value={chainGov.votingModel}
                    onChange={(e) => setChainGov((p) => ({ ...p, votingModel: e.target.value as any }))}
                    MenuProps={OPAQUE_MENU_PROPS as any}
                    sx={{ borderRadius: 3 }}
                    disabled={!chainGov.enabled}
                  >
                    <MenuItem value="token-weighted">token-weighted</MenuItem>
                    <MenuItem value="one-person-one-vote">one-person-one-vote</MenuItem>
                    <MenuItem value="council">council</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Deposit"
                  size="small"
                  type="number"
                  value={chainGov.deposit}
                  onChange={(e) => setChainGov((p) => ({ ...p, deposit: safeNum(e.target.value) }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 220 }}
                  disabled={!chainGov.enabled}
                />
                <TextField
                  label="Voting period (days)"
                  size="small"
                  type="number"
                  value={chainGov.votingPeriodDays}
                  onChange={(e) => setChainGov((p) => ({ ...p, votingPeriodDays: safeNum(e.target.value) }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 240 }}
                  disabled={!chainGov.enabled}
                />
                <TextField
                  label="Quorum %"
                  size="small"
                  type="number"
                  value={chainGov.quorumPct}
                  onChange={(e) => setChainGov((p) => ({ ...p, quorumPct: safeNum(e.target.value) }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 200 }}
                  disabled={!chainGov.enabled}
                />
              </Stack>

              <Divider sx={{ my: 2, opacity: 0.12 }} />

              <Stack direction="row" spacing={1.25} sx={{ flexWrap: "wrap" }}>
                <TextField
                  label="Proposal cooldown (days)"
                  size="small"
                  type="number"
                  value={chainGov.proposalCooldownDays}
                  onChange={(e) => setChainGov((p) => ({ ...p, proposalCooldownDays: safeNum(e.target.value) }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 260 }}
                  disabled={!chainGov.enabled}
                />
                <TextField
                  label="Council size"
                  size="small"
                  type="number"
                  value={chainGov.councilSize}
                  onChange={(e) => setChainGov((p) => ({ ...p, councilSize: safeNum(e.target.value) }))}
                  sx={{ "& .MuiInputBase-root": { borderRadius: 3 }, width: 220 }}
                  disabled={!chainGov.enabled || chainGov.votingModel !== "council"}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={chainGov.fastTrackEnabled}
                      onChange={(e) => setChainGov((p) => ({ ...p, fastTrackEnabled: e.target.checked }))}
                      disabled={!chainGov.enabled}
                    />
                  }
                  label="Fast-track enabled"
                />
                <TextField
                  label="Fast-track voting (days)"
                  size="small"
                  type="number"
                  value={chainGov.fastTrackVotingDays}
                  onChange={(e) => setChainGov((p) => ({ ...p, fastTrackVotingDays: safeNum(e.target.value) }))}
                  sx={{
                    "& .MuiInputBase-root": { borderRadius: 3 },
                    width: 260,
                    display: chainGov.fastTrackEnabled ? "block" : "none",
                  }}
                  disabled={!chainGov.enabled}
                />
              </Stack>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
