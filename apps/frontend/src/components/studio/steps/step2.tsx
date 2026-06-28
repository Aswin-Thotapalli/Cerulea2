'use client';

import React, { useEffect, useMemo, useState } from "react";
import StepGuidance from '@/components/studio/StepGuidance';
import {
  Box, Stack, Paper, Typography, TextField, Button, IconButton,
  Divider, Select, MenuItem, Tooltip, Fade, Chip, Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment,
  Accordion, AccordionSummary, AccordionDetails,
} from "@mui/material";
import { useTheme, styled, alpha } from "@mui/material/styles";
import { useStudio } from "@/context/StudioContext";
import { useRouter } from "next/navigation";

// Icons
import ArrowBackIcon from "@mui/icons-material/KeyboardArrowLeft";
import ArrowForwardIcon from "@mui/icons-material/KeyboardArrowRight";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import StorageIcon from "@mui/icons-material/Storage";
import SecurityIcon from "@mui/icons-material/Security";
import BoltIcon from "@mui/icons-material/Bolt";
import PublicIcon from "@mui/icons-material/Public";
import CodeIcon from "@mui/icons-material/Code";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import KeyIcon from '@mui/icons-material/Key';
import CloseIcon from '@mui/icons-material/Close';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SearchIcon from "@mui/icons-material/Search";
import HexagonOutlinedIcon from "@mui/icons-material/HexagonOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

// Data
import ENTITY_PRESETS_RAW from "@/data/module-entity-presets.json";
import MODULES_SEED_RAW from "@/data/modules.seed.json";

// Internal Components
import RelationshipCanvas, { RelationshipDef as Relationship } from "../logic/RelationshipCanvas";
import LogicCanvas from "../logic/LogicCanvas";
import CustomScriptPanel from "../custom/CustomScriptPanel";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */
type Phase = "data" | "governance" | "behavior" | "exposure";

type DataType =
  | "uuid" | "string" | "text" | "boolean" | "int" | "float"
  | "datetime" | "json"
  | "address" | "uint256" | "bytes32" | "ipfs-hash";

type StorageStrategy = "database" | "on-chain" | "ipfs";

type Field = {
  id: string;
  name: string;
  type: DataType;
  storage: StorageStrategy;
  required: boolean;
  unique: boolean;
  indexed: boolean;
  encrypted: boolean;
  description?: string;
  defaultValue?: string;
};

type Entity = {
  id: string;
  name: string;
  description?: string;
  fields: Field[];
  isCore?: boolean;
  access?: { create: string; read: string; update: string; delete: string };
  onChain?: boolean;
  apiPublic?: boolean;
  encryptionLevel?: string;
};

type ModuleInfo = { id: string; label: string; category?: string };

function uid() { return Math.random().toString(36).slice(2, 10); }

/* ------------------------------------------------------------------ */
/* Helpers: map JSON preset field → Field type                        */
/* ------------------------------------------------------------------ */
function mapFieldType(f: any): DataType {
  if (f.format === "eth-address") return "address";
  if (f.type === "uuid") return "uuid";
  if (f.type === "string") return "string";
  if (f.type === "text") return "text";
  if (f.type === "boolean") return "boolean";
  if (f.type === "integer" || f.type === "int") return "int";
  if (f.type === "float" || f.type === "number") return "float";
  if (f.type === "datetime") return "datetime";
  if (f.type === "json") return "json";
  if (f.type === "address") return "address";
  if (f.type === "uint256") return "uint256";
  if (f.type === "bytes32") return "bytes32";
  if (f.type === "ipfs-hash") return "ipfs-hash";
  return "string";
}

function mapStorage(f: any): StorageStrategy {
  if (f.type === "ipfs-hash") return "ipfs";
  if (f.format === "eth-address" || f.type === "address" || f.type === "uint256" || f.type === "bytes32") return "on-chain";
  return "database";
}

function presetToEntity(preset: any): Entity {
  return {
    id: uid(),
    name: preset.name,
    description: preset.description || "",
    isCore: true,
    fields: (preset.fields || []).map((f: any): Field => ({
      id: uid(),
      name: f.name,
      type: mapFieldType(f),
      storage: mapStorage(f),
      required: f.nullable === false || f.name === "id",
      unique: f.name === "id" || !!f.unique,
      indexed: f.name === "id" || (f.name || "").endsWith("Id") || f.format === "eth-address",
      encrypted: f.name === "email" || f.name === "password" || f.name === "privateKey",
      defaultValue: (f.name === "createdAt" || f.name === "updatedAt") ? "now()" : undefined,
      description: f.description,
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Catalog helpers                                                     */
/* ------------------------------------------------------------------ */
const PRESETS = (ENTITY_PRESETS_RAW as any).presets as Record<string, any[]>;

const MODULE_LABELS: Record<string, string> = {};
((MODULES_SEED_RAW as any).modules || []).forEach((m: any) => {
  MODULE_LABELS[m.moduleId] = m.title;
});

const MODULE_CATEGORIES: Record<string, string> = {};
((MODULES_SEED_RAW as any).modules || []).forEach((m: any) => {
  MODULE_CATEGORIES[m.moduleId] = m.category || "other";
});

/* ------------------------------------------------------------------ */
/* Styled Components                                                   */
/* ------------------------------------------------------------------ */
const FloatingIsland = styled(Paper)(({ theme }) => ({
  background: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.95)' : 'rgba(8,14,36,0.95)',
  backdropFilter: 'blur(16px)',
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: '0 20px 40px -8px rgba(0,0,0,0.3)',
  borderRadius: 100,
  padding: '8px 24px',
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  zIndex: 1000,
  pointerEvents: 'auto',
}));

const StepPill = styled(Paper)(({ theme }) => ({
  background: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.9)' : 'rgba(8,14,36,0.9)',
  backdropFilter: 'blur(10px)',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 100,
  padding: '8px 20px',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  pointerEvents: 'auto',
}));

const PhaseSidebar = styled(Box)(({ theme }) => ({
  width: 220,
  height: '100%',
  borderRight: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  flexDirection: 'column',
  background: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.5)' : 'rgba(8,14,36,0.4)',
  backdropFilter: 'blur(20px)',
  paddingTop: 16,
  overflowY: 'auto',
}));

const PhaseItem = styled(Box, { shouldForwardProp: (p) => p !== 'active' })<{ active?: boolean }>(({ theme, active }) => ({
  padding: '12px 20px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  borderLeft: `3px solid ${active ? theme.palette.primary.main : 'transparent'}`,
  background: active ? alpha(theme.palette.primary.main, 0.05) : 'transparent',
  color: active ? theme.palette.primary.main : theme.palette.text.secondary,
  transition: 'all 0.2s ease',
  '&:hover': {
    background: active ? alpha(theme.palette.primary.main, 0.08) : alpha(theme.palette.action.hover, 0.5),
    color: active ? theme.palette.primary.main : theme.palette.text.primary,
  },
}));

const Workspace = styled(Box)(() => ({
  flex: 1,
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  paddingTop: 0,
}));

const OPAQUE_MENU_PROPS = {
  PaperProps: {
    sx: {
      backgroundImage: 'none',
      backgroundColor: (t: any) => t.palette.mode === 'light' ? '#ffffff' : '#0D1535',
      border: '1px solid',
      borderColor: 'divider',
      boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    },
  },
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* Fallback entity generator for modules without preset data          */
/* ------------------------------------------------------------------ */
function generateFallbackEntities(mod: ModuleInfo): Entity[] {
  const label = mod.label || mod.id;

  const makeFields = (...extra: Omit<Field, 'id'>[]): Field[] => [
    { id: uid(), name: 'id', type: 'uuid', storage: 'database', required: true, unique: true, indexed: true, encrypted: false },
    { id: uid(), name: 'createdAt', type: 'datetime', storage: 'database', required: false, unique: false, indexed: true, encrypted: false, defaultValue: 'now()' },
    { id: uid(), name: 'updatedAt', type: 'datetime', storage: 'database', required: false, unique: false, indexed: false, encrypted: false, defaultValue: 'now()' },
    ...extra.map(f => ({ ...f, id: uid() })),
  ];

  return [
    {
      id: uid(),
      name: label,
      description: `Core data model for ${label}`,
      isCore: true,
      fields: makeFields(
        { name: 'name', type: 'string', storage: 'database', required: true, unique: false, indexed: true, encrypted: false },
        { name: 'status', type: 'string', storage: 'database', required: true, unique: false, indexed: true, encrypted: false, defaultValue: 'active' },
        { name: 'ownerId', type: 'uuid', storage: 'database', required: true, unique: false, indexed: true, encrypted: false },
        { name: 'metadata', type: 'json', storage: 'database', required: false, unique: false, indexed: false, encrypted: false },
      ),
    },
    {
      id: uid(),
      name: `${label}Event`,
      description: `Blockchain events emitted by ${label}`,
      isCore: true,
      fields: makeFields(
        { name: 'eventType', type: 'string', storage: 'database', required: true, unique: false, indexed: true, encrypted: false },
        { name: 'actor', type: 'address', storage: 'on-chain', required: true, unique: false, indexed: true, encrypted: false },
        { name: 'payload', type: 'json', storage: 'database', required: false, unique: false, indexed: false, encrypted: false },
        { name: 'blockNumber', type: 'int', storage: 'on-chain', required: false, unique: false, indexed: true, encrypted: false },
      ),
    },
    {
      id: uid(),
      name: `${label}Config`,
      description: `Configuration settings for ${label}`,
      isCore: true,
      fields: makeFields(
        { name: 'key', type: 'string', storage: 'database', required: true, unique: true, indexed: true, encrypted: false },
        { name: 'value', type: 'text', storage: 'database', required: false, unique: false, indexed: false, encrypted: false },
        { name: 'isActive', type: 'boolean', storage: 'database', required: true, unique: false, indexed: false, encrypted: false, defaultValue: 'true' },
        { name: 'expiresAt', type: 'datetime', storage: 'database', required: false, unique: false, indexed: false, encrypted: false },
      ),
    },
    {
      id: uid(),
      name: `${label}Permission`,
      description: `Role-based access control for ${label}`,
      isCore: false,
      fields: makeFields(
        { name: 'role', type: 'string', storage: 'database', required: true, unique: false, indexed: true, encrypted: false },
        { name: 'walletAddress', type: 'address', storage: 'on-chain', required: true, unique: false, indexed: true, encrypted: false },
        { name: 'canRead', type: 'boolean', storage: 'database', required: true, unique: false, indexed: false, encrypted: false, defaultValue: 'true' },
        { name: 'canWrite', type: 'boolean', storage: 'database', required: true, unique: false, indexed: false, encrypted: false, defaultValue: 'false' },
        { name: 'grantedAt', type: 'datetime', storage: 'database', required: false, unique: false, indexed: false, encrypted: false, defaultValue: 'now()' },
      ),
    },
    {
      id: uid(),
      name: `${label}AuditLog`,
      description: `Immutable audit trail for ${label} operations`,
      isCore: false,
      fields: makeFields(
        { name: 'action', type: 'string', storage: 'database', required: true, unique: false, indexed: true, encrypted: false },
        { name: 'actor', type: 'string', storage: 'database', required: true, unique: false, indexed: true, encrypted: false },
        { name: 'resourceId', type: 'uuid', storage: 'database', required: true, unique: false, indexed: true, encrypted: false },
        { name: 'changes', type: 'json', storage: 'database', required: false, unique: false, indexed: false, encrypted: false },
        { name: 'ipAddress', type: 'string', storage: 'database', required: false, unique: false, indexed: false, encrypted: false },
      ),
    },
  ];
}

export default function Step2({ goPrev, goNext }: { goPrev?: () => void; goNext?: () => void }) {
  const theme = useTheme();
  const { setStudioState, selectedModules: ctxModules } = useStudio() as any;
  const router = useRouter();

  /* ---------- phase navigation ---------- */
  const [phase, setPhase] = useState<Phase>("data");

  /* ---------- entity state ---------- */
  // Per-module entity storage: Record<moduleId, Entity[]>
  const [moduleEntities, setModuleEntities] = useState<Record<string, Entity[]>>({});
  // Modules list from Blueprint (step1)
  const [blueprintModules, setBlueprintModules] = useState<ModuleInfo[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [addEntityOpen, setAddEntityOpen] = useState(false);
  const [entitySearch, setEntitySearch] = useState('');
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [logicMode, setLogicMode] = useState<'visual' | 'code'>('visual');
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  /* ---------- derived ---------- */
  const allEntities = useMemo(
    () => Object.values(moduleEntities).flat(),
    [moduleEntities]
  );
  const currentModuleEntities = useMemo(
    () => (selectedModuleId ? (moduleEntities[selectedModuleId] || []) : []),
    [moduleEntities, selectedModuleId]
  );
  const selectedEntity = useMemo(
    () => allEntities.find((e) => e.id === selectedEntityId) || null,
    [allEntities, selectedEntityId]
  );

  // Which module owns the selected entity
  const selectedEntityModuleId = useMemo(() => {
    if (!selectedEntityId) return null;
    return Object.entries(moduleEntities).find(([, ents]) =>
      ents.some((e) => e.id === selectedEntityId)
    )?.[0] || null;
  }, [selectedEntityId, moduleEntities]);

  /* ---------- seeding ---------- */
  useEffect(() => {
    try {
      let mods: ModuleInfo[] = [];

      // Priority 1: StudioContext selectedModules — always wins if present
      if (Array.isArray(ctxModules) && ctxModules.length > 0) {
        mods = ctxModules.map((id: string) => ({
          id,
          label: MODULE_LABELS[id] || id,
          category: MODULE_CATEGORIES[id],
        }));
      }

      // Priority 2: localStorage step1 graph
      if (mods.length === 0) {
        const step1Raw = localStorage.getItem('cerulea.step1.graph');
        const step1Graph = step1Raw ? JSON.parse(step1Raw) : null;
        if (step1Graph?.nodes) {
          const seen = new Set<string>();
          step1Graph.nodes.forEach((n: any) => {
            const mid = n.data?.moduleId;
            if (mid && mid !== '_custom' && !seen.has(mid)) {
              seen.add(mid);
              mods.push({
                id: mid,
                label: n.data?.label || MODULE_LABELS[mid] || mid,
                category: MODULE_CATEGORIES[mid],
              });
            }
          });
        }
      }

      // Priority 3: template modules
      if (mods.length === 0) {
        const tplRaw = localStorage.getItem('cerulea.templateModules');
        if (tplRaw) {
          const ids: string[] = JSON.parse(tplRaw);
          mods = ids.filter((id) => id !== '_custom').map((id) => ({
            id,
            label: MODULE_LABELS[id] || id,
            category: MODULE_CATEGORIES[id],
          }));
        }
      }

      // Priority 4: saved draft — only if it has real module IDs (not _custom stale data)
      if (mods.length === 0) {
        try {
          const raw = localStorage.getItem('draft:local:3');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.data?.moduleEntities) {
              const draftMods = Object.keys(parsed.data.moduleEntities).filter((id) => id !== '_custom');
              if (draftMods.length > 0) {
                setModuleEntities(parsed.data.moduleEntities);
                setRelationships(parsed.data.relationships || []);
                setBlueprintModules(
                  draftMods.map((id) => ({
                    id,
                    label: MODULE_LABELS[id] || id,
                    category: MODULE_CATEGORIES[id],
                  }))
                );
                setSelectedModuleId(draftMods[0]);
                const firstEnt = parsed.data.moduleEntities[draftMods[0]]?.[0];
                if (firstEnt) setSelectedEntityId(firstEnt.id);
                return;
              }
            }
          }
        } catch { /* ignore */ }
      }

      // Priority 5: minimum fallback
      if (mods.length === 0) {
        mods = [{ id: 'user-auth', label: 'User Authentication', category: 'identity' }];
      }

      setBlueprintModules(mods);
      setSelectedModuleId(mods[0].id);

      // Try to merge saved per-module entity edits from draft (only for matching module IDs)
      let savedEntities: Record<string, Entity[]> = {};
      try {
        const raw = localStorage.getItem('draft:local:3');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.data?.moduleEntities) savedEntities = parsed.data.moduleEntities;
          if (parsed.data?.relationships) setRelationships(parsed.data.relationships);
        }
      } catch { /* ignore */ }

      // Seed entities: use saved edits if present for this module, else presets, else fallback
      const seeded: Record<string, Entity[]> = {};
      mods.forEach((mod) => {
        if (savedEntities[mod.id]?.length > 0) {
          seeded[mod.id] = savedEntities[mod.id];
        } else {
          const preset = PRESETS[mod.id] || [];
          seeded[mod.id] = preset.length > 0
            ? preset.map(presetToEntity)
            : generateFallbackEntities(mod);
        }
      });

      setModuleEntities(seeded);
      const firstEnt = seeded[mods[0].id]?.[0];
      if (firstEnt) setSelectedEntityId(firstEnt.id);
    } catch (e) {
      console.warn('Step2 seeding error:', e);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- save ---------- */
  const handleSave = () => {
    const snapshot = { moduleEntities, relationships };
    localStorage.setItem('draft:local:3', JSON.stringify({ data: snapshot, t: Date.now() }));
    setStudioState({ schemaJson: snapshot } as any);
    if (goNext) goNext();
  };

  /* ---------- entity actions ---------- */
  const addBlankEntity = () => {
    if (!selectedModuleId) return;
    const id = uid();
    const newEnt: Entity = {
      id, name: 'NewEntity', description: '', isCore: false,
      fields: [{ id: uid(), name: 'id', type: 'uuid', storage: 'database', required: true, unique: true, indexed: true, encrypted: false }],
    };
    setModuleEntities((prev) => ({
      ...prev,
      [selectedModuleId]: [...(prev[selectedModuleId] || []), newEnt],
    }));
    setSelectedEntityId(id);
  };

  const deleteEntity = (modId: string, entId: string) => {
    setModuleEntities((prev) => ({
      ...prev,
      [modId]: (prev[modId] || []).filter((e) => e.id !== entId),
    }));
    if (selectedEntityId === entId) setSelectedEntityId(null);
  };

  const updateEntity = (modId: string, entId: string, patch: Partial<Entity>) => {
    setModuleEntities((prev) => ({
      ...prev,
      [modId]: (prev[modId] || []).map((e) => (e.id === entId ? { ...e, ...patch } : e)),
    }));
  };

  const addField = () => {
    if (!selectedEntity || !selectedEntityModuleId) return;
    const newField: Field = {
      id: uid(), name: 'newField', type: 'string', storage: 'database',
      required: false, unique: false, indexed: false, encrypted: false,
    };
    updateEntity(selectedEntityModuleId, selectedEntity.id, {
      fields: [...selectedEntity.fields, newField],
    });
  };

  const updateField = (fieldId: string, patch: Partial<Field>) => {
    if (!selectedEntity || !selectedEntityModuleId) return;
    updateEntity(selectedEntityModuleId, selectedEntity.id, {
      fields: selectedEntity.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
    });
  };

  const deleteField = (fieldId: string) => {
    if (!selectedEntity || !selectedEntityModuleId) return;
    updateEntity(selectedEntityModuleId, selectedEntity.id, {
      fields: selectedEntity.fields.filter((f) => f.id !== fieldId),
    });
  };

  const addEntityFromCatalog = (preset: any) => {
    if (!selectedModuleId) return;
    const ent = presetToEntity({ ...preset, isCore: false });
    ent.isCore = false;
    setModuleEntities((prev) => ({
      ...prev,
      [selectedModuleId]: [...(prev[selectedModuleId] || []), ent],
    }));
    setSelectedEntityId(ent.id);
    setAddEntityOpen(false);
  };

  /* ---------- catalog for "Add More Entities" dialog ---------- */
  const catalogEntries = useMemo(() => {
    const currentNames = new Set(currentModuleEntities.map((e) => e.name.toLowerCase()));
    const entries: Array<{ moduleId: string; moduleLabel: string; entity: any }> = [];
    Object.entries(PRESETS).forEach(([moduleId, ents]) => {
      ents.forEach((ent) => {
        if (!currentNames.has(ent.name.toLowerCase())) {
          entries.push({
            moduleId,
            moduleLabel: MODULE_LABELS[moduleId] || moduleId,
            entity: ent,
          });
        }
      });
    });
    return entries;
  }, [currentModuleEntities]);

  const filteredCatalog = useMemo(() => {
    if (!entitySearch) return catalogEntries;
    const q = entitySearch.toLowerCase();
    return catalogEntries.filter(
      (e) =>
        e.entity.name.toLowerCase().includes(q) ||
        e.moduleLabel.toLowerCase().includes(q)
    );
  }, [catalogEntries, entitySearch]);

  // Group by module label for display
  const catalogGroups = useMemo(() => {
    const groups: Record<string, typeof filteredCatalog> = {};
    filteredCatalog.forEach((e) => {
      const key = e.moduleLabel;
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });
    return groups;
  }, [filteredCatalog]);

  /* ---------------------------------------------------------------- */
  /* Render: DATA LAYER (3-column)                                    */
  /* ---------------------------------------------------------------- */
  const renderDataLayer = () => (
    <Box sx={{ height: '100%', display: 'flex', overflow: 'hidden' }}>

      {/* COLUMN 1: Blueprint Modules */}
      <Box
        sx={{
          width: 200, flexShrink: 0,
          borderRight: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.background.default, 0.4),
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
        }}
      >
        <Box sx={{ p: 2, pb: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Stack direction="row" alignItems="center" spacing={0.5} mb={0.25}>
            <HexagonOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="overline" fontWeight={800} fontSize="0.6rem" color="text.secondary">
              BLUEPRINT MODULES
            </Typography>
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
            Entities pre-filled from your Blueprint selections.
          </Typography>
        </Box>
        <Box sx={{ flex: 1, py: 1 }}>
          {blueprintModules.length === 0 ? (
            <Box sx={{ p: 2 }}>
              <Typography variant="caption" color="text.disabled">
                Add modules in Blueprint Builder (Step 2) first.
              </Typography>
            </Box>
          ) : (
            blueprintModules.map((mod) => {
              const count = moduleEntities[mod.id]?.length || 0;
              const isActive = selectedModuleId === mod.id;
              return (
                <Box
                  key={mod.id}
                  onClick={() => {
                    setSelectedModuleId(mod.id);
                    const first = moduleEntities[mod.id]?.[0];
                    if (first) setSelectedEntityId(first.id);
                  }}
                  sx={{
                    mx: 1, mb: 0.5, px: 1.5, py: 1.25, borderRadius: 2, cursor: 'pointer',
                    bgcolor: isActive ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                    border: `1px solid ${isActive ? alpha(theme.palette.primary.main, 0.3) : 'transparent'}`,
                    '&:hover': { bgcolor: isActive ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.action.hover, 0.5) },
                  }}
                >
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color={isActive ? 'primary.main' : 'text.primary'}
                    sx={{ lineHeight: 1.3 }}
                  >
                    {mod.label}
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={0.5} mt={0.25}>
                    <Typography variant="caption" color="text.secondary">
                      {count} {count === 1 ? 'entity' : 'entities'}
                    </Typography>
                    {mod.category && (
                      <Chip
                        label={mod.category.replace(/-/g, ' ')}
                        size="small"
                        sx={{ height: 14, fontSize: '0.55rem', fontWeight: 700, opacity: 0.7 }}
                      />
                    )}
                  </Stack>
                </Box>
              );
            })
          )}
        </Box>
      </Box>

      {/* COLUMN 2: Entity List for selected module */}
      <Box
        sx={{
          width: 260, flexShrink: 0,
          borderRight: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.background.default, 0.2),
          display: 'flex', flexDirection: 'column', overflowY: 'auto',
        }}
      >
        <Box sx={{ p: 2, pb: 1, borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="overline" fontWeight={800} fontSize="0.6rem" color="text.secondary">
            ENTITIES
          </Typography>
          <Tooltip
            title="An entity is a entity representing a core object in your app (like User, Token, or Order). Each entity becomes a database table or smart contract struct."
            placement="right"
            arrow
          >
            <InfoOutlinedIcon sx={{ fontSize: 12, color: 'text.secondary', ml: 0.5, cursor: 'help', verticalAlign: 'middle' }} />
          </Tooltip>
          {selectedModuleId && blueprintModules.find((m) => m.id === selectedModuleId) && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
              {blueprintModules.find((m) => m.id === selectedModuleId)?.label}
            </Typography>
          )}
        </Box>

        <Box sx={{ flex: 1, py: 1 }}>
          {currentModuleEntities.length === 0 && selectedModuleId ? (
            <Box sx={{ p: 2 }}>
              <Typography variant="caption" color="text.disabled">
                No entities yet. Add one below.
              </Typography>
            </Box>
          ) : (
            currentModuleEntities.map((ent) => {
              const isActive = selectedEntityId === ent.id;
              return (
                <Box
                  key={ent.id}
                  onClick={() => setSelectedEntityId(ent.id)}
                  sx={{
                    mx: 1, mb: 0.5, px: 1.5, py: 1, borderRadius: 2, cursor: 'pointer',
                    bgcolor: isActive ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                    border: `1px solid ${isActive ? alpha(theme.palette.primary.main, 0.3) : 'transparent'}`,
                    '&:hover': { bgcolor: isActive ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.action.hover, 0.4) },
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <StorageIcon sx={{ fontSize: 14, color: isActive ? 'primary.main' : 'text.secondary' }} />
                      <Box>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          color={isActive ? 'primary.main' : 'text.primary'}
                        >
                          {ent.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ent.fields.length} fields
                          {ent.isCore && (
                            <Chip
                              label="Core"
                              size="small"
                              sx={{ ml: 0.5, height: 14, fontSize: '0.55rem', fontWeight: 700, bgcolor: alpha(theme.palette.success.main, 0.12), color: 'success.main' }}
                            />
                          )}
                        </Typography>
                      </Box>
                    </Stack>
                    {!ent.isCore && (
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(ev) => { ev.stopPropagation(); deleteEntity(selectedModuleId!, ent.id); }}
                        sx={{ opacity: 0, '.MuiBox-root:hover > * > &': { opacity: 1 } }}
                      >
                        <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    )}
                  </Stack>
                </Box>
              );
            })
          )}
        </Box>

        {selectedModuleId && (
          <Box sx={{ p: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              size="small"
              fullWidth
              onClick={() => setAddEntityOpen(true)}
              sx={{ borderRadius: 2, mb: 0.75, fontWeight: 700 }}
            >
              Add More Entities
            </Button>
            <Button
              startIcon={<AddIcon />}
              size="small"
              fullWidth
              onClick={addBlankEntity}
              sx={{ borderRadius: 2, color: 'text.secondary' }}
            >
              Add Custom Entity
            </Button>
          </Box>
        )}
      </Box>

      {/* COLUMN 3: Field Editor */}
      {selectedEntity ? (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Entity Header */}
          <Box
            sx={{
              px: 3, py: 2, borderBottom: `1px solid ${theme.palette.divider}`,
              bgcolor: alpha(theme.palette.background.paper, 0.6), flexShrink: 0,
            }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <TextField
                variant="standard"
                value={selectedEntity.name}
                onChange={(e) => updateEntity(selectedEntityModuleId!, selectedEntity.id, { name: e.target.value })}
                InputProps={{
                  disableUnderline: true,
                  style: { fontSize: '1.3rem', fontWeight: 800 },
                }}
              />
              <Chip
                label={selectedEntity.isCore ? 'Core Entity' : 'Custom Entity'}
                size="small"
                color={selectedEntity.isCore ? 'primary' : 'default'}
                variant="outlined"
              />
            </Stack>
            <TextField
              variant="standard"
              placeholder="Add a description..."
              value={selectedEntity.description || ''}
              onChange={(e) => updateEntity(selectedEntityModuleId!, selectedEntity.id, { description: e.target.value })}
              InputProps={{ disableUnderline: true, style: { fontSize: '0.82rem' } }}
              fullWidth
              sx={{ mt: 0.5 }}
            />
          </Box>

          {/* Fields Table */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
              <Typography variant="subtitle2" fontWeight={800}>
                Fields
                <Tooltip title="A field is a single piece of data on this entity (like a name, email address, or token balance). Each field has a type, storage location, and constraints." arrow>
                  <InfoOutlinedIcon sx={{ fontSize: 13, color: 'text.secondary', ml: 0.5, cursor: 'help', verticalAlign: 'middle' }} />
                </Tooltip>
              </Typography>
              <Button startIcon={<AddIcon />} size="small" onClick={addField} sx={{ borderRadius: 2 }}>
                Add Field
              </Button>
            </Stack>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: alpha(theme.palette.action.hover, 0.05) }}>
                  <TableRow>
                    <TableCell width="22%">
                      Field Name
                    </TableCell>
                    <TableCell width="16%">
                      Type
                      <Tooltip title="The data type: UUID (unique ID), String (text), Int (number), Address (crypto wallet), Uint256 (large number for token amounts), DateTime, Boolean (true/false), JSON (structured data)." arrow>
                        <InfoOutlinedIcon sx={{ fontSize: 11, color: 'text.secondary', ml: 0.5, cursor: 'help', verticalAlign: 'middle' }} />
                      </Tooltip>
                    </TableCell>
                    <TableCell width="16%">
                      Storage
                      <Tooltip title="Database: stored off-chain in your app's database (free, fast). On-Chain: stored on the blockchain (costs gas, immutable, auditable). IPFS: stored on a decentralized file system (for files and metadata)." arrow>
                        <InfoOutlinedIcon sx={{ fontSize: 11, color: 'text.secondary', ml: 0.5, cursor: 'help', verticalAlign: 'middle' }} />
                      </Tooltip>
                    </TableCell>
                    <TableCell width="28%">
                      Constraints
                      <Tooltip title="Req = Required (can't be empty). Unq = Unique (no two records can have the same value). Priv = Private (data is encrypted at rest)." arrow>
                        <InfoOutlinedIcon sx={{ fontSize: 11, color: 'text.secondary', ml: 0.5, cursor: 'help', verticalAlign: 'middle' }} />
                      </Tooltip>
                    </TableCell>
                    <TableCell width="13%">Default</TableCell>
                    <TableCell width="5%"></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedEntity.fields.map((f) => (
                    <TableRow key={f.id} hover>
                      <TableCell>
                        <TextField
                          size="small" fullWidth value={f.name} variant="standard"
                          onChange={(e) => updateField(f.id, { name: e.target.value })}
                          InputProps={{
                            disableUnderline: true,
                            startAdornment: f.name === 'id'
                              ? <KeyIcon sx={{ fontSize: 14, color: 'warning.main', mr: 0.5 }} />
                              : null,
                            style: { fontWeight: 600 },
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          size="small" fullWidth value={f.type} variant="standard" disableUnderline
                          onChange={(e) => updateField(f.id, { type: e.target.value as DataType })}
                          MenuProps={OPAQUE_MENU_PROPS as any}
                        >
                          <MenuItem value="uuid">UUID</MenuItem>
                          <MenuItem value="string">String</MenuItem>
                          <MenuItem value="text">Text</MenuItem>
                          <MenuItem value="int">Integer</MenuItem>
                          <MenuItem value="float">Float</MenuItem>
                          <MenuItem value="boolean">Boolean</MenuItem>
                          <MenuItem value="datetime">DateTime</MenuItem>
                          <MenuItem value="json">JSON</MenuItem>
                          <Divider />
                          <MenuItem value="address">Address</MenuItem>
                          <MenuItem value="uint256">Uint256</MenuItem>
                          <MenuItem value="bytes32">Bytes32</MenuItem>
                          <MenuItem value="ipfs-hash">IPFS Hash</MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          size="small" fullWidth value={f.storage} variant="standard" disableUnderline
                          onChange={(e) => updateField(f.id, { storage: e.target.value as StorageStrategy })}
                          MenuProps={OPAQUE_MENU_PROPS as any}
                          sx={{ color: f.storage === 'on-chain' ? 'warning.main' : f.storage === 'ipfs' ? 'info.main' : 'text.primary' }}
                        >
                          <MenuItem value="database">Database</MenuItem>
                          <MenuItem value="on-chain">On-Chain</MenuItem>
                          <MenuItem value="ipfs">IPFS</MenuItem>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Chip
                            label="Req" size="small" clickable
                            onClick={() => updateField(f.id, { required: !f.required })}
                            color={f.required ? "primary" : "default"}
                            variant={f.required ? "filled" : "outlined"}
                          />
                          <Chip
                            label="Unq" size="small" clickable
                            onClick={() => updateField(f.id, { unique: !f.unique })}
                            color={f.unique ? "secondary" : "default"}
                            variant={f.unique ? "filled" : "outlined"}
                          />
                          <Chip
                            label="Priv" size="small" clickable
                            onClick={() => updateField(f.id, { encrypted: !f.encrypted })}
                            color={f.encrypted ? "success" : "default"}
                            variant={f.encrypted ? "filled" : "outlined"}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small" fullWidth placeholder="-"
                          value={f.defaultValue || ''}
                          onChange={(e) => updateField(f.id, { defaultValue: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" color="error" onClick={() => deleteField(f.id)}>
                          <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1, opacity: 0.5 }}>
          <StorageIcon sx={{ fontSize: 40 }} />
          <Typography variant="body2">Select an entity to edit its fields</Typography>
        </Box>
      )}
    </Box>
  );

  /* ---------------------------------------------------------------- */
  /* Render: GOVERNANCE                                               */
  /* ---------------------------------------------------------------- */
  const renderGovernance = () => (
    <Box sx={{ p: 4, height: '100%', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', maxWidth: 1000 }}>
        <Typography variant="h5" fontWeight={800}>Access Control Rules</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, mt: 0.5 }}>
          Define who can perform each action on your data. "Public" means anyone. "Owner" means only the record's creator. "Admin" means only privileged users.
        </Typography>

        {blueprintModules.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10, opacity: 0.5 }}>
            <SecurityIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography>No entities yet. Add modules in the Blueprint Builder first.</Typography>
          </Box>
        ) : (
          blueprintModules.map((mod) => {
            const modEnts = moduleEntities[mod.id] || [];
            if (!modEnts.length) return null;
            return (
              <Accordion
                key={mod.id}
                defaultExpanded
                variant="outlined"
                sx={{ mb: 1.5, borderRadius: '12px !important', overflow: 'hidden', '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <HexagonOutlinedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                    <Typography variant="subtitle2" fontWeight={800}>{mod.label}</Typography>
                    {mod.category && (
                      <Chip label={mod.category} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 16 }} />
                    )}
                    <Typography variant="caption" color="text.secondary">{modEnts.length} {modEnts.length === 1 ? 'entity' : 'entities'}</Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ bgcolor: alpha(theme.palette.action.hover, 0.05) }}>
                        <TableRow>
                          <TableCell width="25%">ENTITY</TableCell>
                          <TableCell width="20%">CREATE</TableCell>
                          <TableCell width="20%">READ</TableCell>
                          <TableCell width="20%">UPDATE</TableCell>
                          <TableCell width="15%">DELETE</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {modEnts.map((ent) => (
                          <TableRow key={ent.id}>
                            <TableCell sx={{ fontWeight: 700 }}>{ent.name}</TableCell>
                            {(['create', 'read', 'update', 'delete'] as const).map((action, i) => (
                              <TableCell key={action}>
                                <Select
                                  size="small" fullWidth
                                  value={ent.access?.[action] ?? (i === 1 ? 'public' : i === 3 ? 'admin' : 'owner')}
                                  onChange={(e) => updateEntity(mod.id, ent.id, {
                                    access: {
                                      create: ent.access?.create ?? 'owner',
                                      read: ent.access?.read ?? 'public',
                                      update: ent.access?.update ?? 'owner',
                                      delete: ent.access?.delete ?? 'admin',
                                      [action]: e.target.value as string,
                                    },
                                  })}
                                  MenuProps={OPAQUE_MENU_PROPS as any} sx={{ borderRadius: 2 }}>
                                  <MenuItem value="public">Public</MenuItem>
                                  <MenuItem value="auth">Auth User</MenuItem>
                                  <MenuItem value="owner">Owner</MenuItem>
                                  <MenuItem value="admin">Admin</MenuItem>
                                </Select>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            );
          })
        )}
      </Box>
    </Box>
  );

  /* ---------------------------------------------------------------- */
  /* Render: BEHAVIOR / LOGIC                                        */
  /* ---------------------------------------------------------------- */

  // Pre-seeded trigger templates per module type
  const TRIGGER_SEEDS: Record<string, Array<{ event: string; action: string; description: string; color: string }>> = {
    /* ── Generic catalog modules ── */
    'user-auth': [
      { event: 'User.Created', action: 'Send Welcome Email', description: 'Fire when a new user account is created.', color: '#3b82f6' },
      { event: 'User.LoginFailed (3x)', action: 'Lock Account + Alert', description: 'Prevent brute-force by locking after 3 failed attempts.', color: '#ef4444' },
    ],
    'token-erc20': [
      { event: 'Transfer.Completed', action: 'Update Balance Cache', description: 'Keep off-chain balance cache in sync after every transfer.', color: '#8b5cf6' },
      { event: 'Token.Minted', action: 'Emit Notification', description: 'Notify the recipient wallet when tokens are minted to them.', color: '#10b981' },
    ],
    'governance': [
      { event: 'Proposal.Created', action: 'Notify Voters', description: 'Alert all eligible voters when a new proposal is submitted.', color: '#f59e0b' },
      { event: 'Vote.Deadline.Reached', action: 'Finalize Proposal', description: 'Auto-execute the winning outcome when voting ends.', color: '#06b6d4' },
    ],
    /* ── Blockchain Infrastructure ── */
    'consensus': [
      { event: 'BlockProposal.Created', action: 'Validate Proposer Signature', description: 'Verify the proposer is in the active validator set before propagating the block.', color: '#6366f1' },
      { event: 'FinalityRecord.Created', action: 'Broadcast Finality Proof', description: 'Distribute the 2/3-supermajority finality proof to all connected peer nodes.', color: '#8b5cf6' },
      { event: 'ConsensusNode.Slashed', action: 'Emit Slash Event + Update Stake', description: 'Reduce on-chain stake balance and push alert to the validator dashboard.', color: '#ef4444' },
    ],
    'evm-config': [
      { event: 'EVMParameter.Updated', action: 'Redeploy Contract Factory', description: 'Rebuild and redeploy factory contracts to apply the new EVM configuration.', color: '#f59e0b' },
      { event: 'EVMUpgrade.Proposed', action: 'Notify All Node Operators', description: 'Alert all node operators to download and prepare the new protocol version.', color: '#06b6d4' },
    ],
    'genesis': [
      { event: 'GenesisBlock.Initialized', action: 'Bootstrap Validator Set', description: 'Populate the initial validator set from genesis allocations and start block production.', color: '#10b981' },
      { event: 'GenesisConfig.Validated', action: 'Lock Genesis Parameters', description: 'Freeze genesis configuration and mark the chain as fully bootstrapped.', color: '#3b82f6' },
    ],
    'p2p': [
      { event: 'PeerDiscovery.Completed', action: 'Update Peer Routing Table', description: 'Refresh the Kademlia routing table with newly discovered peer addresses.', color: '#06b6d4' },
      { event: 'PeerSession.Disconnected', action: 'Trigger Reconnect Logic', description: 'Attempt reconnection within 30 s if the connected-peer count drops below the minimum threshold.', color: '#f59e0b' },
    ],
    'p2p-tls': [
      { event: 'TLSCertificate.Expiring', action: 'Rotate mTLS Certificate', description: 'Auto-rotate the node mTLS certificate before expiry using the ACME provisioning flow.', color: '#10b981' },
      { event: 'PeerHandshake.Failed', action: 'Log + Temp-Ban Peer', description: 'Record the failed handshake and apply a 10-minute cooldown ban on that peer address.', color: '#ef4444' },
    ],
    'node-permissioning': [
      { event: 'AllowlistedNode.Added', action: 'Propagate Allow-List', description: 'Push the updated node allowlist to all active validators via the permissioning contract.', color: '#3b82f6' },
      { event: 'NodePermission.Revoked', action: 'Disconnect + Alert Admin', description: 'Immediately drop the revoked node connection and alert PLATFORM_ADMIN.', color: '#ef4444' },
    ],
    'validators': [
      { event: 'ValidatorDelegation.Staked', action: 'Update Voting Power', description: 'Recalculate and publish the validator\'s voting power based on total delegated stake.', color: '#8b5cf6' },
      { event: 'ValidatorUptime.ThresholdMissed', action: 'Jail Validator', description: 'Automatically jail a validator that misses 1,000 of the last 10,000 blocks.', color: '#ef4444' },
    ],
    'tokenomics': [
      { event: 'BlockReward.Issued', action: 'Distribute to Validators', description: 'Split the AGT block reward proportionally across active validators by staked weight.', color: '#10b981' },
      { event: 'InflationMint.Triggered', action: 'Transfer to Reward Pool', description: 'Move the 5% annual inflation mint into the validator rewards pool for next-cycle distribution.', color: '#f59e0b' },
    ],
    'fees': [
      { event: 'BaseFee.Adjusted', action: 'Update Fee Oracle', description: 'Publish the new EIP-1559 base fee to the RPC fee oracle so clients quote accurate gas prices.', color: '#06b6d4' },
      { event: 'GaslessTx.Submitted', action: 'Deduct from Sponsor Pool', description: 'Verify role eligibility and deduct the gas cost from the ecosystemFarmerFund sponsor balance.', color: '#10b981' },
    ],
    'rpc': [
      { event: 'RateLimitExceeded.Detected', action: 'Throttle + Log IP', description: 'Return HTTP 429 and log the offending IP to the rate-limit registry for monitoring.', color: '#ef4444' },
      { event: 'BatchRPC.Received', action: 'Queue + Process Async', description: 'Enqueue the batch RPC call and push results back through the async response handler.', color: '#3b82f6' },
    ],
    'graphql-gateway': [
      { event: 'IntrospectionAttempt.Blocked', action: 'Log Security Event', description: 'Record unauthorized schema introspection attempts with requester IP for audit.', color: '#ef4444' },
      { event: 'QueryDepth.Exceeded', action: 'Reject + Log Abuse', description: 'Block queries with depth > 8 and log the request for abuse monitoring dashboards.', color: '#f59e0b' },
    ],
    'ws-subscriptions': [
      { event: 'LotStageEvent.Emitted', action: 'Fan-out to Subscribers', description: 'Push lot stage-transition payload in real-time to all WebSocket clients subscribed to that lot.', color: '#8b5cf6' },
      { event: 'IoTBreachAlert.Emitted', action: 'Broadcast Breach Alert', description: 'Instantly broadcast temperature breach alerts to all subscribed dashboard connections.', color: '#ef4444' },
    ],
    'api-gateway': [
      { event: 'JWTToken.Expired', action: 'Return 401 + Invalidate Session', description: 'Clear the server-side session and return 401 so the client re-authenticates cleanly.', color: '#f59e0b' },
      { event: 'FraudRule.Triggered', action: 'Block Request + Alert Admin', description: 'Immediately block the inbound request and notify PLATFORM_ADMIN of the fraud signal.', color: '#ef4444' },
    ],
    'metrics-dashboards': [
      { event: 'ValidatorDowntime.Detected', action: 'Fire PagerDuty Critical Alert', description: 'Trigger a PagerDuty critical incident when validator uptime drops below SLA threshold.', color: '#ef4444' },
      { event: 'BlockTimeAnomaly.Detected', action: 'Create Incident + Annotate Grafana', description: 'Log the block-time anomaly for ops review and add a Grafana annotation on the timeline.', color: '#f59e0b' },
    ],
    'log-shipping': [
      { event: 'AuditLog.Written', action: 'Ship to CloudWatch + ELK', description: 'Forward each tamper-evident log entry to both CloudWatch and the ELK search index.', color: '#06b6d4' },
      { event: 'ShipmentFailed.Detected', action: 'Retry with Exponential Backoff', description: 'Apply exponential backoff retry and alert ops on 3 consecutive delivery failures.', color: '#f59e0b' },
    ],
    'backups-restore': [
      { event: 'BackupSchedule.Triggered', action: 'Snapshot + Upload to S3', description: 'Create an incremental DB snapshot and upload to S3 bucket with SSE-KMS encryption.', color: '#10b981' },
      { event: 'RestoreRequest.Created', action: 'Validate Hash + Restore', description: 'Verify the backup integrity hash before initiating the restore procedure.', color: '#3b82f6' },
    ],
    /* ── Identity & Access ── */
    'wallet-auth': [
      { event: 'WalletProfile.Created', action: 'Trigger AML Screening', description: 'Run Chainalysis KYT check on the new wallet address before granting platform access.', color: '#8b5cf6' },
      { event: 'AuthSession.Expired', action: 'Invalidate Session Keys', description: 'Revoke all session keys bound to this expired authentication session.', color: '#ef4444' },
    ],
    'session-keys': [
      { event: 'SessionKey.Created', action: 'Bind to Device Fingerprint', description: 'Register the device fingerprint and bind the key to prevent cross-device reuse.', color: '#3b82f6' },
      { event: 'SessionKey.Revoked', action: 'Cascade Revocation to Pending Txs', description: 'Cancel any in-flight gasless transactions signed with the revoked key.', color: '#ef4444' },
    ],
    'rbac': [
      { event: 'RoleAssignment.Created', action: 'Write On-chain + Propagate', description: 'Anchor the role grant on-chain and propagate the change to all enforcement middleware.', color: '#10b981' },
      { event: 'Permission.Changed', action: 'Flush Cache + Notify User', description: 'Invalidate the permission cache for the affected user and send a security notification.', color: '#f59e0b' },
    ],
    'org-accounts': [
      { event: 'OrgMember.Invited', action: 'Send Invitation Email', description: 'Send an org-invite email with onboarding link and a temporary access token.', color: '#3b82f6' },
      { event: 'OrgMember.Removed', action: 'Revoke All Access', description: 'Strip RBAC roles, invalidate sessions, and remove from the gasless sponsor allowlist.', color: '#ef4444' },
    ],
    'kyc': [
      { event: 'KYCDocument.Submitted', action: 'Queue for Verification', description: 'Route to Sumsub (non-APEDA actors) or APEDA AgriExchange registry check queue.', color: '#06b6d4' },
      { event: 'KYCVerification.Failed', action: 'Notify + Suspend Actor', description: 'Send rejection notification and set Actor.verificationStatus = SUSPENDED on-chain.', color: '#ef4444' },
    ],
    'device-trust': [
      { event: 'DeviceTrust.Created', action: 'Issue HMAC Device Token', description: 'Generate an HMAC secret for this IoT device to authenticate temperature batch ingestion.', color: '#10b981' },
      { event: 'DeviceTrust.Revoked', action: 'Block All Device Transactions', description: 'Reject all future HMAC payloads from this device ID immediately.', color: '#ef4444' },
    ],
    'gasless-relayer': [
      { event: 'GaslessSubmission.Received', action: 'Verify Cap + Relay', description: 'Check the user\'s daily cap, verify the meta-tx signature, then relay to chain via admin wallet.', color: '#10b981' },
      { event: 'DailyCap.Exceeded', action: 'Return 429 + Log Usage', description: 'Block further gasless transactions for today and log usage to analytics.', color: '#f59e0b' },
    ],
    'did-vc-ledger': [
      { event: 'DIDDocument.Created', action: 'Anchor Hash On-chain', description: 'Write the DID document hash to the on-chain DID registry for public verification.', color: '#8b5cf6' },
      { event: 'VerifiableCredential.Issued', action: 'Emit VC Proof On-chain', description: 'Anchor the VC proof hash on-chain and notify the credential holder.', color: '#10b981' },
    ],
    'aml-screening': [
      { event: 'AMLFlagRecord.Created', action: 'Suspend Actor + Alert Admin', description: 'Immediately set Actor.verificationStatus = SUSPENDED and alert PLATFORM_ADMIN.', color: '#ef4444' },
      { event: 'AMLScreening.Passed', action: 'Mark Actor Verified', description: 'Update Actor.verificationStatus = VERIFIED and log the screening result for audit.', color: '#10b981' },
    ],
    /* ── Supply Chain Domain ── */
    'traceability-ledger': [
      { event: 'MangoLot.Created', action: 'Assign Lot Number On-chain', description: 'Generate lotNumber (AT-{VAR3}-{YYYY}-{SEQ5}) and write the MangoLot record to chain.', color: '#10b981' },
      { event: 'LotStageTransition.Emitted', action: 'Notify Stage Stakeholders', description: 'Push notification to all role-holders responsible for the newly entered stage.', color: '#3b82f6' },
      { event: 'LotStageTransition.REJECTED', action: 'Halt Lot + Alert', description: 'Block all further stage events for this lot and alert FARMER + APEDA_OFFICER.', color: '#ef4444' },
    ],
    'cold-chain-monitoring': [
      { event: 'IoTDeviceSession.Created', action: 'Begin Temperature Monitoring', description: 'Start accepting HMAC-validated temperature batches from the paired IoT device every 5 minutes.', color: '#06b6d4' },
      { event: 'TemperatureReading.Breach', action: 'Create BreachAlert On-chain', description: 'Write IoTBreachAlert, push notifications to operators, and fire PagerDuty if > threshold + 5°C.', color: '#ef4444' },
    ],
    'port-customs-events': [
      { event: 'ShippingBill.Filed', action: 'Validate via ICEGATE API', description: 'Verify shippingBillNumber format and existence against the ICEGATE API.', color: '#8b5cf6' },
      { event: 'LEOStatus.Received', action: 'Advance Lot to Cold Storage', description: 'Set MangoLot.currentStage = COLD_STORAGE when LEO is granted by customs.', color: '#10b981' },
    ],
    'quality-recall-ledger': [
      { event: 'RecallEvent.Created', action: 'Broadcast Recall Alert', description: 'Push urgent notification and email to all role-holders linked to the recalled lot.', color: '#ef4444' },
      { event: 'QualityViolation.Detected', action: 'Create ComplianceViolation On-chain', description: 'Write ComplianceViolation record and halt lot progression until remediation is recorded.', color: '#f59e0b' },
    ],
    'evidence-chain': [
      { event: 'DocumentHash.Created', action: 'Anchor On-chain + Pin to IPFS', description: 'Write hash to on-chain registry and pin the referenced PDF to IPFS via Pinata.', color: '#8b5cf6' },
      { event: 'EvidenceItem.Challenged', action: 'Lock Chain + Notify Arbitrator', description: 'Lock the evidence chain for this lot and alert the assigned arbitrator for review.', color: '#ef4444' },
    ],
    'trade-finance-docs': [
      { event: 'CertificateOfOrigin.Created', action: 'Validate via APEDA AgriExchange', description: 'Call APEDA AgriExchange API to verify exporter registration and CoO details.', color: '#10b981' },
      { event: 'BillOfLading.Created', action: 'Validate ISO 6346 + Activate Tracking', description: 'Check containerNumber format and activate the in-transit IoT monitoring session.', color: '#3b82f6' },
    ],
    'compliance-attestations': [
      { event: 'ComplianceAttestation.Created', action: 'Anchor + Mint Certificate NFT', description: 'Write attestation hash on-chain and mint a soulbound CertificateNFT to the issuing authority.', color: '#8b5cf6' },
      { event: 'AttestationExpiry.Approaching', action: 'Alert Issuing Authority', description: 'Send a 7-day advance warning to APEDA_OFFICER and NPPO_INSPECTOR for renewal.', color: '#f59e0b' },
    ],
    'provenance-notary': [
      { event: 'ProvenanceRecord.Created', action: 'Pin to IPFS + Anchor On-chain', description: 'Pin the document to IPFS via Pinata and anchor its hash to the on-chain provenance registry.', color: '#10b981' },
      { event: 'TrustAnchor.Revoked', action: 'Cascade Revoke Downstream Certs', description: 'Invalidate all CertificateNFTs whose trust anchor is this revoked provenance record.', color: '#ef4444' },
    ],
    /* ── Data & IoT ── */
    'onchain-data': [
      { event: 'OnChainEvent.Emitted', action: 'Index in Subgraph', description: 'Forward the event to the Subgraph Indexer for efficient off-chain query access.', color: '#6366f1' },
      { event: 'OnChainEvent.Emitted', action: 'Ship to ELK Stack', description: 'Forward the on-chain event log to the ELK stack for full-text search and long-term audit.', color: '#06b6d4' },
    ],
    'oracles': [
      { event: 'OracleDataFeed.Updated', action: 'Push to Smart Contract Consumers', description: 'Propagate the latest oracle value to all on-chain consumers subscribed to this feed.', color: '#f59e0b' },
      { event: 'OracleFeed.StaleDetected', action: 'Alert + Switch to Backup Source', description: 'Alert PLATFORM_ADMIN and automatically switch to the configured backup data provider.', color: '#ef4444' },
    ],
    'webhooks-inbound': [
      { event: 'WebhookPayload.Received', action: 'Validate HMAC Signature', description: 'Reject the payload immediately if the HMAC-SHA256 signature does not match the shared secret.', color: '#8b5cf6' },
      { event: 'IoTBatch.Received', action: 'Queue for Dedup + Threshold Check', description: 'Enqueue the IoT batch for deduplication and breach-threshold evaluation.', color: '#06b6d4' },
    ],
    'webhooks-outbound': [
      { event: 'OutboundWebhook.Triggered', action: 'Sign Payload + Dispatch', description: 'Sign the outbound payload with the platform key and deliver to the subscriber endpoint.', color: '#3b82f6' },
      { event: 'DeliveryFailed (3x)', action: 'Mark Dead + Alert Admin', description: 'After 3 exponential-backoff retries, mark the webhook dead and notify PLATFORM_ADMIN.', color: '#ef4444' },
    ],
    'subgraph-indexer': [
      { event: 'BlockIndexed.Completed', action: 'Refresh GraphQL Query Cache', description: 'Invalidate and warm the GraphQL query cache with the latest indexed block data.', color: '#10b981' },
      { event: 'IndexLag.Detected', action: 'Alert + Trigger Re-index', description: 'Alert ops when subgraph lag exceeds 100 blocks and restart indexing from the last checkpoint.', color: '#ef4444' },
    ],
    /* ── Operations ── */
    'notifications': [
      { event: 'PushNotification.Created', action: 'Dispatch by Channel + Role', description: 'Route the notification to the correct channel (push, in-app, WhatsApp) based on actor role preference.', color: '#3b82f6' },
      { event: 'NotificationDelivery.Failed', action: 'Retry + Fallback Channel', description: 'Retry 3 times then failover to the secondary channel (e.g., SMS if push fails).', color: '#f59e0b' },
    ],
    'emails': [
      { event: 'Email.Created', action: 'Send via Resend', description: 'Submit to the Resend API from agrotrace.in sender domain and track delivery status.', color: '#10b981' },
      { event: 'ResendDelivery.Failed', action: 'Fallback to SendGrid', description: 'Retry once on Resend then transparently switch to SendGrid as backup provider.', color: '#f59e0b' },
    ],
    'audit-logs': [
      { event: 'AuditEntry.Written', action: 'Compute SHA-256 Chain Hash', description: 'Append a SHA-256 hash linking each entry to the previous one to prevent log tampering.', color: '#8b5cf6' },
      { event: 'AuditExport.Requested', action: 'Generate Signed PDF', description: 'Assemble chronological event timeline and sign the PDF with the AWS KMS platform key.', color: '#3b82f6' },
    ],
    'audit-export': [
      { event: 'AuditTrailExport.Requested', action: 'Compile + KMS-Sign PDF', description: 'Compile all LotStageTransitions in chronological order and sign the PDF with the KMS platform key.', color: '#6366f1' },
      { event: 'ExportCompleted', action: 'Upload to S3 + Email Download Link', description: 'Upload the signed PDF to S3 and email the secure download link to the requestor.', color: '#10b981' },
    ],
    /* ── Compliance & Legal ── */
    'produce-grades': [
      { event: 'GradeStandard.Updated', action: 'Propagate to Active Lots', description: 'Push updated APEDA grading criteria to all lots currently in the PACKHOUSE stage.', color: '#f59e0b' },
      { event: 'GradeViolation.Detected', action: 'Block Lot Advance', description: 'Prevent the lot from progressing to TREATMENT until a grade re-assessment is recorded.', color: '#ef4444' },
    ],
    'document-signing': [
      { event: 'SignRequest.Created', action: 'Check Signer Capability', description: 'Route to on-chain wallet signature if available, otherwise delegate to DocuSign for small farmers.', color: '#8b5cf6' },
      { event: 'SignatureComplete', action: 'Anchor Document Hash On-chain', description: 'Write the document hash and signer wallet address to the on-chain ProvenanceRecord.', color: '#10b981' },
    ],
    'fraud-rules': [
      { event: 'DuplicateLot.Detected', action: 'Block + Create Fraud Alert', description: 'Block the FarmRegistration immediately and alert PLATFORM_ADMIN with duplicate lot details.', color: '#ef4444' },
      { event: 'RoleMismatch.Detected', action: 'Reject Action + Log Violation', description: 'Reject the attempted action and write a ComplianceViolation on-chain for audit.', color: '#f59e0b' },
    ],
    'privacy-compliance': [
      { event: 'ConsentRecord.Revoked', action: 'Anonymize Linked PII', description: 'Trigger the PDPB data-minimization pipeline to anonymize all PII records linked to this consent.', color: '#8b5cf6' },
      { event: 'DataRetention.Expired', action: 'Schedule Secure Deletion', description: 'Queue expired personal data for PDPB-compliant secure deletion from all storage tiers.', color: '#ef4444' },
    ],
    /* ── Financial ── */
    'treasury': [
      { event: 'FeeCollection.Received', action: 'Split Across Treasury Accounts', description: 'Distribute the per-lot fee: 60% platform, 20% validators, 10% ecosystem fund, 10% reserve.', color: '#10b981' },
      { event: 'ValidatorReward.Pending', action: 'Distribute Per-block Proportionally', description: 'Release staking rewards to validators each block, proportional to delegated stake weight.', color: '#f59e0b' },
    ],
    'escrow-settlement': [
      { event: 'EscrowRecord.Created', action: 'Lock Funds in Smart Contract', description: 'Lock buyer payment in the escrow contract pending successful lot delivery and acceptance.', color: '#8b5cf6' },
      { event: 'BuyerReceipt.Accepted', action: 'Release Funds to Exporter', description: 'Trigger EscrowRecord release and send payment notification to the FARMER.', color: '#10b981' },
      { event: 'BuyerReceipt.Rejected', action: 'Hold Escrow + Open Dispute', description: 'Keep funds locked and auto-trigger the dispute evidence assembly workflow.', color: '#ef4444' },
    ],
    'invoices-billing': [
      { event: 'Invoice.Created', action: 'Email PDF to Buyer', description: 'Send the invoice PDF (AGT-INV prefix, INR + 18% GST) to the buyer contact on record.', color: '#3b82f6' },
      { event: 'Invoice.Overdue', action: 'Send Reminder + Suspend Lot', description: 'Email a payment reminder and suspend lot progression until payment is confirmed.', color: '#f59e0b' },
    ],
    'razorpay-adapter': [
      { event: 'PaymentOrder.Created', action: 'Generate Razorpay Checkout', description: 'Create a Razorpay order with INR amount + 18% GST and return the checkout URL to the payer.', color: '#06b6d4' },
      { event: 'Payment.Confirmed', action: 'Mark Invoice PAID + Release Gate', description: 'Update Invoice.status = PAID and trigger the lot-release gate for the next stage.', color: '#10b981' },
    ],
    /* ── Credentials & Tokens ── */
    'soulbound-token': [
      { event: 'SoulboundToken.Minted', action: 'Register in DID Ledger', description: 'Link the new soulbound token to the holder\'s DID document on-chain for verifiable binding.', color: '#8b5cf6' },
      { event: 'SoulboundToken.RevocationRequested', action: 'Verify Authority + Revoke', description: 'Confirm the requestor holds the APEDA_OFFICER role before executing on-chain revocation.', color: '#ef4444' },
    ],
    'erc721': [
      { event: 'NFTToken.Minted', action: 'Pin Metadata to IPFS', description: 'Upload certificate metadata JSON to IPFS via Pinata and set the on-chain tokenURI.', color: '#8b5cf6' },
      { event: 'NFTToken.TransferAttempted', action: 'Enforce Soulbound Rule', description: 'Block the transfer and revert with SOULBOUND_NON_TRANSFERABLE if the token was minted as soulbound.', color: '#ef4444' },
    ],
    /* ── Fallback ── */
    '_default': [
      { event: 'Record.Created', action: 'Index for Search', description: 'Update the search index when a new record is added.', color: '#3b82f6' },
      { event: 'Record.Updated', action: 'Write Audit Log', description: 'Track all changes in the audit log for compliance.', color: '#10b981' },
    ],
  };

  const [triggerModeMap, setTriggerModeMap] = useState<Record<string, 'cards' | 'visual' | 'code'>>({});
  const getTriggerMode = (modId: string) => triggerModeMap[modId] || 'cards';
  const setTriggerMode = (modId: string, mode: 'cards' | 'visual' | 'code') =>
    setTriggerModeMap((prev) => ({ ...prev, [modId]: mode }));

  const renderBehavior = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Header */}
      <Box sx={{
        px: 4, py: 2.5, borderBottom: `1px solid ${theme.palette.divider}`,
        bgcolor: 'background.paper', flexShrink: 0,
      }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
              <BoltIcon sx={{ color: 'warning.main', fontSize: 20 }} />
              <Typography variant="h6" fontWeight={800}>Logic &amp; Triggers</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Define what happens automatically when events occur in your app. Each trigger connects an event (e.g., "User created") to one or more actions (e.g., "Send email"). Pre-filled triggers are recommended best-practices for your modules.
            </Typography>
          </Box>
          <Tooltip
            title="Triggers fire automatically when entity events occur. Example: when a Payment is Created, run SendEmail and MintNFT. No backend code needed."
            placement="left" arrow
            componentsProps={{ tooltip: { sx: { bgcolor: 'background.paper', color: 'text.primary', border: '1px solid', borderColor: 'divider', boxShadow: '0 8px 32px rgba(0,0,0,0.25)', borderRadius: 2, p: 1.5, maxWidth: 300, fontSize: '0.8rem' } } }}
          >
            <Chip
              label="How triggers work"
              size="small" variant="outlined"
              icon={<AutoFixHighIcon sx={{ fontSize: '0.9rem !important' }} />}
              sx={{ fontWeight: 600, fontSize: '0.72rem', cursor: 'help', flexShrink: 0, mt: 0.5 }}
            />
          </Tooltip>
        </Stack>
      </Box>

      {/* Per-module trigger cards */}
      <Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
        {blueprintModules.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 12, opacity: 0.5 }}>
            <BoltIcon sx={{ fontSize: 48, mb: 1 }} />
            <Typography>No modules yet. Add modules in the Blueprint Builder first.</Typography>
          </Box>
        ) : (
          <Stack spacing={2.5}>
            {blueprintModules.map((mod) => {
              const mode = getTriggerMode(mod.id);
              const seeds = TRIGGER_SEEDS[mod.id] || TRIGGER_SEEDS['_default'];
              return (
                <Paper
                  key={mod.id}
                  variant="outlined"
                  sx={{ borderRadius: 3, overflow: 'hidden' }}
                >
                  {/* Module header */}
                  <Box sx={{
                    px: 3, py: 2, borderBottom: `1px solid ${theme.palette.divider}`,
                    bgcolor: alpha(theme.palette.primary.main, 0.03),
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <HexagonOutlinedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                      <Typography variant="subtitle2" fontWeight={800}>{mod.label}</Typography>
                      {mod.category && (
                        <Chip label={mod.category} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 16 }} />
                      )}
                    </Stack>
                    <Stack direction="row" spacing={0.75}>
                      {(['cards', 'visual', 'code'] as const).map((m) => (
                        <Paper
                          key={m}
                          variant="outlined"
                          onClick={() => setTriggerMode(mod.id, m)}
                          sx={{
                            px: 1.5, py: 0.5, borderRadius: 999, cursor: 'pointer',
                            fontWeight: 700, fontSize: '0.7rem',
                            bgcolor: mode === m ? 'primary.main' : 'background.paper',
                            color: mode === m ? 'white' : 'text.secondary',
                            borderColor: mode === m ? 'primary.main' : 'divider',
                            display: 'flex', alignItems: 'center', gap: 0.5,
                          }}
                          elevation={0}
                        >
                          {m === 'cards' && <BoltIcon sx={{ fontSize: 12 }} />}
                          {m === 'visual' && <AccountTreeIcon sx={{ fontSize: 12 }} />}
                          {m === 'code' && <CodeIcon sx={{ fontSize: 12 }} />}
                          {m === 'cards' ? 'Rules' : m === 'visual' ? 'Visual' : 'Script'}
                        </Paper>
                      ))}
                    </Stack>
                  </Box>

                  {/* Content area */}
                  <Box sx={{ p: mode === 'cards' ? 2.5 : 0 }}>
                    {mode === 'cards' && (
                      <Stack spacing={1.5}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
                          RECOMMENDED TRIGGERS FOR {mod.label.toUpperCase()}
                        </Typography>
                        <Stack spacing={1}>
                          {seeds.map((t, i) => (
                            <Paper
                              key={i}
                              variant="outlined"
                              sx={{
                                p: 2, borderRadius: 2,
                                borderColor: alpha(t.color, 0.3),
                                bgcolor: alpha(t.color, 0.03),
                              }}
                            >
                              <Stack direction="row" alignItems="flex-start" spacing={2}>
                                {/* Event */}
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 0.5 }}>WHEN</Typography>
                                  <Paper
                                    variant="outlined"
                                    sx={{
                                      mt: 0.5, px: 1.5, py: 0.75, borderRadius: 1.5,
                                      display: 'inline-flex', alignItems: 'center', gap: 0.75,
                                      bgcolor: alpha(t.color, 0.08), borderColor: alpha(t.color, 0.4),
                                    }}
                                    elevation={0}
                                  >
                                    <BoltIcon sx={{ fontSize: 13, color: t.color }} />
                                    <Typography variant="body2" fontWeight={700} sx={{ color: t.color, fontFamily: 'monospace', fontSize: '0.78rem' }}>
                                      {t.event}
                                    </Typography>
                                  </Paper>
                                </Box>

                                {/* Arrow */}
                                <Box sx={{ mt: 2.5, color: 'text.disabled', fontWeight: 900, fontSize: '1.2rem', flexShrink: 0 }}>→</Box>

                                {/* Action */}
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 0.5 }}>THEN</Typography>
                                  <Paper
                                    variant="outlined"
                                    sx={{
                                      mt: 0.5, px: 1.5, py: 0.75, borderRadius: 1.5,
                                      display: 'inline-flex', alignItems: 'center', gap: 0.75,
                                      bgcolor: alpha(theme.palette.success.main, 0.08), borderColor: alpha(theme.palette.success.main, 0.3),
                                    }}
                                    elevation={0}
                                  >
                                    <AutoFixHighIcon sx={{ fontSize: 13, color: 'success.main' }} />
                                    <Typography variant="body2" fontWeight={700} sx={{ color: 'success.main', fontFamily: 'monospace', fontSize: '0.78rem' }}>
                                      {t.action}
                                    </Typography>
                                  </Paper>
                                </Box>

                                {/* Description */}
                                <Box sx={{ flex: 1.5 }}>
                                  <Typography variant="caption" fontWeight={800} color="text.secondary" sx={{ letterSpacing: 0.5 }}>WHY</Typography>
                                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.4 }}>{t.description}</Typography>
                                </Box>
                              </Stack>
                            </Paper>
                          ))}
                        </Stack>
                        <Button
                          startIcon={<AddIcon />}
                          variant="outlined"
                          size="small"
                          sx={{ borderRadius: 2, alignSelf: 'flex-start', mt: 0.5, fontWeight: 700 }}
                        >
                          Add Custom Trigger
                        </Button>
                      </Stack>
                    )}
                    {mode === 'visual' && (
                      <Box sx={{ height: 380 }}>
                        <LogicCanvas />
                      </Box>
                    )}
                    {mode === 'code' && (
                      <Box sx={{ height: 380, bgcolor: theme.palette.mode === 'dark' ? '#080E24' : '#1e1e1e' }}>
                        <CustomScriptPanel projectId="" />
                      </Box>
                    )}
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );

  /* ---------------------------------------------------------------- */
  /* Render: EXPOSURE                                                 */
  /* ---------------------------------------------------------------- */
  const renderExposure = () => (
    <Box sx={{ p: 4, height: '100%', overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
      <Box sx={{ width: '100%', maxWidth: 1000 }}>
        <Typography variant="h5" fontWeight={800}>API &amp; Visibility</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, mt: 0.5 }}>
          On-chain means data lives on the blockchain (auditable, immutable, costs gas). API Public means Cerulea generates REST/GraphQL endpoints for this entity. Encryption adds at-rest encryption for sensitive fields.
        </Typography>

        {blueprintModules.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10, opacity: 0.5 }}>
            <PublicIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography>No entities yet. Add modules in the Blueprint Builder first.</Typography>
          </Box>
        ) : (
          blueprintModules.map((mod) => {
            const modEnts = moduleEntities[mod.id] || [];
            if (!modEnts.length) return null;
            return (
              <Accordion
                key={mod.id}
                defaultExpanded
                variant="outlined"
                sx={{ mb: 1.5, borderRadius: '12px !important', overflow: 'hidden', '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <HexagonOutlinedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                    <Typography variant="subtitle2" fontWeight={800}>{mod.label}</Typography>
                    {mod.category && (
                      <Chip label={mod.category} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 16 }} />
                    )}
                    <Typography variant="caption" color="text.secondary">{modEnts.length} {modEnts.length === 1 ? 'entity' : 'entities'}</Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ bgcolor: alpha(theme.palette.action.hover, 0.05) }}>
                        <TableRow>
                          <TableCell width="30%">ENTITY</TableCell>
                          <TableCell width="20%" align="center">
                            ON-CHAIN
                            <Tooltip title="Data stored on the blockchain: immutable, auditable, and visible to all validators. Incurs gas costs on write." arrow>
                              <InfoOutlinedIcon sx={{ fontSize: 11, color: 'text.secondary', ml: 0.5, cursor: 'help', verticalAlign: 'middle' }} />
                            </Tooltip>
                          </TableCell>
                          <TableCell width="20%" align="center">
                            API PUBLIC
                            <Tooltip title="Cerulea auto-generates REST and GraphQL endpoints for this entity. Turn off to keep the entity internal-only." arrow>
                              <InfoOutlinedIcon sx={{ fontSize: 11, color: 'text.secondary', ml: 0.5, cursor: 'help', verticalAlign: 'middle' }} />
                            </Tooltip>
                          </TableCell>
                          <TableCell width="30%" align="center">
                            ENCRYPTION
                            <Tooltip title="At-rest encryption: sensitive field values are encrypted in the database. Transparent to your app, adds a layer of security." arrow>
                              <InfoOutlinedIcon sx={{ fontSize: 11, color: 'text.secondary', ml: 0.5, cursor: 'help', verticalAlign: 'middle' }} />
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {modEnts.map((ent) => (
                          <TableRow key={ent.id}>
                            <TableCell sx={{ fontWeight: 700 }}>{ent.name}</TableCell>
                            <TableCell align="center">
                              <Switch
                                size="small"
                                checked={ent.onChain ?? false}
                                onChange={(e) => updateEntity(mod.id, ent.id, { onChain: e.target.checked })}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Switch
                                size="small"
                                checked={ent.apiPublic ?? true}
                                onChange={(e) => updateEntity(mod.id, ent.id, { apiPublic: e.target.checked })}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={ent.encryptionLevel || 'At Rest'} size="small" variant="outlined" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            );
          })
        )}
      </Box>
    </Box>
  );

  /* ---------------------------------------------------------------- */
  /* Main render                                                      */
  /* ---------------------------------------------------------------- */
  return (
    <Box sx={{ width: '100%', height: '100%', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>

      <StepGuidance
        stepKey="step2"
        title="Data & Logic"
        subtitle="Step 3 of 6"
        description="Define the data models (entities) your app will store and the access rules that control who can read or write each record. Pre-filled entities are generated from your Blueprint modules."
        steps={[
          { first: 'Review entities', next: 'Each Blueprint module has pre-filled entities. Click a module in the left column to see its entities.' },
          { first: 'Add or remove fields', next: 'Click any entity to open the field editor. Add custom fields or adjust types and constraints to match your schema.' },
          { first: 'Set access rules', next: 'Switch to the Access Rules tab to define who can create, read, update, or delete each entity.' },
        ]}
        tip="Entities map directly to database tables and smart contract structs. The storage column controls whether a field lives on-chain (immutable, auditable) or off-chain (fast, cheap)."
      />

      {/* Background dot grid */}
      <Box sx={{
        position: 'absolute', inset: 0, opacity: 0.5, zIndex: -1,
        backgroundImage: theme.palette.mode === 'light' ? 'radial-gradient(rgba(79,70,229,0.07) 1px, transparent 1px)' : 'radial-gradient(rgba(79,70,229,0.13) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />

      {/* Layout: sidebar + workspace */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT NAVIGATION SIDEBAR */}
        <PhaseSidebar>
          <Box sx={{ px: 2.5, pb: 2 }}>
            <Typography variant="subtitle1" fontWeight={800}>Data &amp; Logic</Typography>
            <Typography variant="caption" color="text.secondary">Define what your app stores and how it behaves.</Typography>
          </Box>
          <Stack spacing={0.5} sx={{ px: 1.5 }}>
            <PhaseItem active={phase === 'data'} onClick={() => setPhase('data')}>
              <StorageIcon fontSize="small" />
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>Entities</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                  {allEntities.length} entities across {blueprintModules.length} modules
                </Typography>
              </Box>
            </PhaseItem>
            <PhaseItem active={phase === 'governance'} onClick={() => setPhase('governance')}>
              <SecurityIcon fontSize="small" />
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>Access Rules</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>Who can read / write data</Typography>
              </Box>
            </PhaseItem>
            <PhaseItem active={phase === 'behavior'} onClick={() => setPhase('behavior')}>
              <BoltIcon fontSize="small" />
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>Logic &amp; Triggers</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>Automate actions on events</Typography>
              </Box>
            </PhaseItem>
            <PhaseItem active={phase === 'exposure'} onClick={() => setPhase('exposure')}>
              <PublicIcon fontSize="small" />
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>API &amp; Visibility</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>On-chain vs database exposure</Typography>
              </Box>
            </PhaseItem>
          </Stack>
        </PhaseSidebar>

        {/* MAIN WORKSPACE */}
        <Workspace>
          <Fade in={phase === 'data'} mountOnEnter unmountOnExit><Box height="100%">{renderDataLayer()}</Box></Fade>
          <Fade in={phase === 'governance'} mountOnEnter unmountOnExit><Box height="100%">{renderGovernance()}</Box></Fade>
          <Fade in={phase === 'behavior'} mountOnEnter unmountOnExit><Box height="100%">{renderBehavior()}</Box></Fade>
          <Fade in={phase === 'exposure'} mountOnEnter unmountOnExit><Box height="100%">{renderExposure()}</Box></Fade>
        </Workspace>
      </Box>

      {/* FLOATING DOCK */}
      <Box sx={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 100 }}>
        <FloatingIsland elevation={6}>
          <Tooltip title="Back">
            <IconButton onClick={goPrev || (() => router.back())} size="small" sx={{ border: '1px solid', borderColor: 'divider' }}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />
          <Tooltip title="Help & Guide">
            <IconButton size="small" color="primary" onClick={() => setIsHelpOpen(true)}>
              <QuestionMarkIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />
          <Button variant="contained" onClick={handleSave} endIcon={<ArrowForwardIcon />} sx={{ borderRadius: 100, px: 3, fontWeight: 700 }}>
            Save &amp; Next
          </Button>
        </FloatingIsland>
      </Box>

      {/* ADD MORE ENTITIES DIALOG */}
      <Dialog
        open={addEntityOpen}
        onClose={() => { setAddEntityOpen(false); setEntitySearch(''); }}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, height: '75vh' } }}
      >
        <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" fontWeight={800}>Add More Entities</Typography>
            <Typography variant="caption" color="text.secondary">
              Browse entities from all modules. Selected entities will be added to{' '}
              <strong>{blueprintModules.find((m) => m.id === selectedModuleId)?.label || 'the current module'}</strong>.
            </Typography>
          </Box>
          <IconButton onClick={() => { setAddEntityOpen(false); setEntitySearch(''); }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
          <TextField
            placeholder="Search entities by name or module..."
            size="small"
            value={entitySearch}
            onChange={(e) => setEntitySearch(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 16 }} /></InputAdornment>,
            }}
            autoFocus
          />
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {Object.keys(catalogGroups).length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">
                  {entitySearch ? 'No matching entities found.' : 'All available entities are already added.'}
                </Typography>
              </Box>
            ) : (
              Object.entries(catalogGroups).map(([groupLabel, entries]) => (
                <Accordion key={groupLabel} defaultExpanded={Object.keys(catalogGroups).length <= 3} disableGutters elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '8px !important', mb: 1, '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 44, py: 0 }}>
                    <Typography variant="subtitle2" fontWeight={700}>{groupLabel}</Typography>
                    <Chip label={entries.length} size="small" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {entries.map((e) => (
                        <Chip
                          key={`${e.moduleId}-${e.entity.name}`}
                          label={e.entity.name}
                          onClick={() => addEntityFromCatalog(e.entity)}
                          variant="outlined"
                          clickable
                          icon={<AddIcon sx={{ fontSize: '0.9rem !important' }} />}
                          sx={{ fontWeight: 600 }}
                        />
                      ))}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setAddEntityOpen(false); setEntitySearch(''); }} sx={{ borderRadius: 999 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* HELP DIALOG */}
      <Dialog open={isHelpOpen} onClose={() => setIsHelpOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
          <Typography variant="h6" fontWeight={800}>
            {phase === 'data' && 'Entities Guide'}
            {phase === 'governance' && 'Access Control Guide'}
            {phase === 'behavior' && 'Logic & Triggers Guide'}
            {phase === 'exposure' && 'API & Visibility Guide'}
          </Typography>
          <IconButton onClick={() => setIsHelpOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4 }}>
          <Typography variant="body1" color="text.secondary" paragraph>
            {phase === 'data' && "Entities are your app's core objects. Each module from your Blueprint has 5+ pre-filled entities with all recommended fields. Click any entity to see and edit its fields. Use 'Add More Entities' to browse the full catalog."}
            {phase === 'governance' && "Set the rules for who can interact with your data. Access Control Rules (ACR) determine who can Create, Read, Update, or Delete records for each entity."}
            {phase === 'behavior' && "Design the logic of your application. Triggers allow you to automate workflows, like sending an email when a user signs up or minting an NFT when a payment is received."}
            {phase === 'exposure' && "Control the interface of your application. Toggle which APIs are generated (GraphQL/REST) and ensure sensitive data is encrypted."}
          </Typography>
          <Box bgcolor={alpha(theme.palette.info.main, 0.1)} p={2} borderRadius={2}>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>Pro Tip</Typography>
            <Typography variant="body2" fontSize={13}>
              {phase === 'data' && "Core entities (green badge) come from your module presets and are pre-configured. Custom entities (no badge) are entities you created manually."}
              {phase === 'governance' && "Start with 'Owner Only' for critical data to prevent unauthorized access."}
              {phase === 'behavior' && "Visual flows are great for high-level logic. Switch to 'Script' for complex calculations."}
              {phase === 'exposure' && "Always encrypt PII (Personally Identifiable Information) before storing it."}
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
