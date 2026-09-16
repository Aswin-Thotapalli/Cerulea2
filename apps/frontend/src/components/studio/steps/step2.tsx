'use client';

import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import StepGuidance from '@/components/studio/StepGuidance';
import {
  Box, Stack, Paper, Typography, TextField, Button, IconButton,
  Divider, Fade, Chip, Tooltip,
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
import StorageIcon from "@mui/icons-material/Storage";
import SecurityIcon from "@mui/icons-material/Security";
import BoltIcon from "@mui/icons-material/Bolt";
import PublicIcon from "@mui/icons-material/Public";
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from "@mui/icons-material/Search";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// Data
import ENTITY_PRESETS_RAW from "@/data/module-entity-presets.json";
import MODULES_SEED_RAW from "@/data/modules.seed.json";

// Relationship type (state only — canvas component not used in this step)
import { RelationshipDef as Relationship } from "../logic/RelationshipCanvas";

// Sub-components
import EntitySidebar from './step2-EntitySidebar';
import EntityFieldEditor from './step2-EntityFieldEditor';
import GovernancePanel from './step2-GovernancePanel';
import BehaviorPanel from './step2-BehaviorPanel';
import ExposurePanel from './step2-ExposurePanel';

// Shared types
import { Phase, DataType, StorageStrategy, Field, Entity, ModuleInfo } from './step2-types';

/* ------------------------------------------------------------------ */
/* Utilities                                                           */
/* ------------------------------------------------------------------ */
function uid() { return Math.random().toString(36).slice(2, 10); }

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
/* Catalog data                                                        */
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
/* Fallback entity generator                                          */
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
      id: uid(), name: label, description: `Core data model for ${label}`, isCore: true,
      fields: makeFields(
        { name: 'name', type: 'string', storage: 'database', required: true, unique: false, indexed: true, encrypted: false },
        { name: 'status', type: 'string', storage: 'database', required: true, unique: false, indexed: true, encrypted: false, defaultValue: 'active' },
        { name: 'ownerId', type: 'uuid', storage: 'database', required: true, unique: false, indexed: true, encrypted: false },
        { name: 'metadata', type: 'json', storage: 'database', required: false, unique: false, indexed: false, encrypted: false },
      ),
    },
    {
      id: uid(), name: `${label}Event`, description: `Blockchain events emitted by ${label}`, isCore: true,
      fields: makeFields(
        { name: 'eventType', type: 'string', storage: 'database', required: true, unique: false, indexed: true, encrypted: false },
        { name: 'actor', type: 'address', storage: 'on-chain', required: true, unique: false, indexed: true, encrypted: false },
        { name: 'payload', type: 'json', storage: 'database', required: false, unique: false, indexed: false, encrypted: false },
        { name: 'blockNumber', type: 'int', storage: 'on-chain', required: false, unique: false, indexed: true, encrypted: false },
      ),
    },
    {
      id: uid(), name: `${label}Config`, description: `Configuration settings for ${label}`, isCore: true,
      fields: makeFields(
        { name: 'key', type: 'string', storage: 'database', required: true, unique: true, indexed: true, encrypted: false },
        { name: 'value', type: 'text', storage: 'database', required: false, unique: false, indexed: false, encrypted: false },
        { name: 'isActive', type: 'boolean', storage: 'database', required: true, unique: false, indexed: false, encrypted: false, defaultValue: 'true' },
        { name: 'expiresAt', type: 'datetime', storage: 'database', required: false, unique: false, indexed: false, encrypted: false },
      ),
    },
    {
      id: uid(), name: `${label}Permission`, description: `Role-based access control for ${label}`, isCore: false,
      fields: makeFields(
        { name: 'role', type: 'string', storage: 'database', required: true, unique: false, indexed: true, encrypted: false },
        { name: 'walletAddress', type: 'address', storage: 'on-chain', required: true, unique: false, indexed: true, encrypted: false },
        { name: 'canRead', type: 'boolean', storage: 'database', required: true, unique: false, indexed: false, encrypted: false, defaultValue: 'true' },
        { name: 'canWrite', type: 'boolean', storage: 'database', required: true, unique: false, indexed: false, encrypted: false, defaultValue: 'false' },
        { name: 'grantedAt', type: 'datetime', storage: 'database', required: false, unique: false, indexed: false, encrypted: false, defaultValue: 'now()' },
      ),
    },
    {
      id: uid(), name: `${label}AuditLog`, description: `Immutable audit trail for ${label} operations`, isCore: false,
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

/* ------------------------------------------------------------------ */
/* Styled components                                                   */
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

/* ------------------------------------------------------------------ */
/* Phase tab definitions                                              */
/* ------------------------------------------------------------------ */
const PHASES = [
  { id: 'data' as Phase, label: 'Data Model', icon: <StorageIcon sx={{ fontSize: 22 }} />, color: '#4F46E5' },
  { id: 'governance' as Phase, label: 'Access & Roles', icon: <SecurityIcon sx={{ fontSize: 22 }} />, color: '#8b5cf6' },
  { id: 'behavior' as Phase, label: 'Logic', icon: <BoltIcon sx={{ fontSize: 22 }} />, color: '#06b6d4' },
  { id: 'exposure' as Phase, label: 'API Schema', icon: <PublicIcon sx={{ fontSize: 22 }} />, color: '#10b981' },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export default function Step2({ goPrev, goNext }: { goPrev?: () => void; goNext?: () => void }) {
  const theme = useTheme();
  const { setStudioState, selectedModules: ctxModules } = useStudio() as any;
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("data");
  const [moduleEntities, setModuleEntities] = useState<Record<string, Entity[]>>({});
  const [blueprintModules, setBlueprintModules] = useState<ModuleInfo[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [addEntityOpen, setAddEntityOpen] = useState(false);
  const [entitySearch, setEntitySearch] = useState('');
  const [relationships, setRelationships] = useState<Relationship[]>([]);
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

      if (Array.isArray(ctxModules) && ctxModules.length > 0) {
        mods = ctxModules.map((id: string) => ({
          id,
          label: MODULE_LABELS[id] || id,
          category: MODULE_CATEGORIES[id],
        }));
      }

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

      if (mods.length === 0) {
        mods = [{ id: 'user-auth', label: 'User Authentication', category: 'identity' }];
      }

      setBlueprintModules(mods);
      setSelectedModuleId(mods[0].id);

      let savedEntities: Record<string, Entity[]> = {};
      try {
        const raw = localStorage.getItem('draft:local:3');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.data?.moduleEntities) savedEntities = parsed.data.moduleEntities;
          if (parsed.data?.relationships) setRelationships(parsed.data.relationships);
        }
      } catch { /* ignore */ }

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

  /* ---------- persist (localStorage + the project record) ---------- */
  // Entities, fields, relationships and access rules are written back to the
  // project so they survive reopening it (loadProject re-hydrates from the DB).
  const hydratedRef = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => { hydratedRef.current = true; }, 0);
    return () => clearTimeout(t);
  }, []);
  const persistSchema = useCallback(async (mods: Record<string, Entity[]>, rels: Relationship[]) => {
    if (typeof window === 'undefined') return;
    const snapshot = { moduleEntities: mods, relationships: rels };
    localStorage.setItem('draft:local:3', JSON.stringify({ data: snapshot, t: Date.now() }));
    const projectId = localStorage.getItem('cerulea.projectId');
    if (!projectId) return;
    const track = localStorage.getItem('cerulea.projectType') === 'blockchain' ? 'blockchain' : 'dapp';
    const entities = Object.entries(mods).flatMap(([moduleId, ents]) => (ents || []).map((e) => ({ ...e, moduleId })));
    try {
      await fetch(`/api/projects/${projectId}/schema`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entities, relationships: rels, track }),
      });
    } catch (err) { console.warn('schema persist failed', err); }
  }, []);
  useEffect(() => {
    if (!hydratedRef.current) return;
    const t = setTimeout(() => { void persistSchema(moduleEntities, relationships); }, 1200);
    return () => clearTimeout(t);
  }, [moduleEntities, relationships, persistSchema]);

  /* ---------- save ---------- */
  const handleSave = () => {
    const snapshot = { moduleEntities, relationships };
    void persistSchema(moduleEntities, relationships);
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
  /* Main render                                                      */
  /* ---------------------------------------------------------------- */
  return (
    <Box sx={{ width: '100%', height: '100%', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', position: 'relative' }}>

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

      {/* Horizontal phase tab bar */}
      <Box sx={{
        display: 'flex', gap: 1, px: 3, py: 1.5,
        borderBottom: '1px solid', borderColor: 'divider',
        bgcolor: 'background.paper',
        flexShrink: 0,
      }}>
        {PHASES.map((p) => {
          const isActive = phase === p.id;
          return (
            <Box
              key={p.id}
              onClick={() => setPhase(p.id)}
              sx={{
                px: 2, py: 1, borderRadius: 2, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 1,
                fontSize: '0.82rem', fontWeight: isActive ? 700 : 400,
                transition: 'all 0.15s',
                bgcolor: isActive ? alpha(p.color, 0.12) : 'transparent',
                color: isActive ? p.color : 'text.secondary',
                border: `1px solid ${isActive ? alpha(p.color, 0.3) : 'transparent'}`,
                '&:hover': {
                  bgcolor: alpha(p.color, isActive ? 0.15 : 0.06),
                  color: p.color,
                  border: `1px solid ${alpha(p.color, isActive ? 0.35 : 0.15)}`,
                },
              }}
            >
              {p.icon}
              {p.label}
            </Box>
          );
        })}
      </Box>

      {/* Content area */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Fade in={phase === 'data'} mountOnEnter unmountOnExit>
          <Box sx={{ width: '100%', height: '100%', display: 'flex', overflow: 'hidden' }}>
            <EntitySidebar
              blueprintModules={blueprintModules}
              moduleEntities={moduleEntities}
              selectedModuleId={selectedModuleId}
              selectedEntityId={selectedEntityId}
              onSelectModule={(modId) => {
                setSelectedModuleId(modId);
                const first = moduleEntities[modId]?.[0];
                if (first) setSelectedEntityId(first.id);
              }}
              onSelectEntity={(modId, entId) => {
                setSelectedModuleId(modId);
                setSelectedEntityId(entId);
              }}
              onDeleteEntity={deleteEntity}
              onOpenCatalog={() => setAddEntityOpen(true)}
              onAddBlank={addBlankEntity}
            />
            <EntityFieldEditor
              selectedEntity={selectedEntity}
              selectedEntityModuleId={selectedEntityModuleId}
              onUpdateEntity={updateEntity}
              onAddField={addField}
              onUpdateField={updateField}
              onDeleteField={deleteField}
            />
          </Box>
        </Fade>
        <Fade in={phase === 'governance'} mountOnEnter unmountOnExit>
          <Box sx={{ width: '100%', height: '100%' }}>
            <GovernancePanel
              blueprintModules={blueprintModules}
              moduleEntities={moduleEntities}
              onUpdateEntity={updateEntity}
            />
          </Box>
        </Fade>
        <Fade in={phase === 'behavior'} mountOnEnter unmountOnExit>
          <Box sx={{ width: '100%', height: '100%' }}>
            <BehaviorPanel blueprintModules={blueprintModules} />
          </Box>
        </Fade>
        <Fade in={phase === 'exposure'} mountOnEnter unmountOnExit>
          <Box sx={{ width: '100%', height: '100%' }}>
            <ExposurePanel
              blueprintModules={blueprintModules}
              moduleEntities={moduleEntities}
              onUpdateEntity={updateEntity}
            />
          </Box>
        </Fade>
      </Box>

      {/* DOCK */}
      <Box sx={{
        flexShrink: 0, display: 'flex', justifyContent: 'center', py: 2,
        borderTop: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.95)' : 'rgba(8,14,36,0.95)',
        backdropFilter: 'blur(12px)',
      }}>
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
          <Button variant="contained" onClick={handleSave} endIcon={<ArrowForwardIcon />} sx={{ borderRadius: 1, px: 3, fontWeight: 700 }}>
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
        PaperProps={{ sx: { borderRadius: 1, height: '75vh' } }}
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
                <Accordion key={groupLabel} defaultExpanded={Object.keys(catalogGroups).length <= 3} disableGutters elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '4px !important', mb: 1, '&:before': { display: 'none' } }}>
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
          <Button onClick={() => { setAddEntityOpen(false); setEntitySearch(''); }} sx={{ borderRadius: 1 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* HELP DIALOG */}
      <Dialog open={isHelpOpen} onClose={() => setIsHelpOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 1 } }}>
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
          <Box bgcolor={alpha(theme.palette.primary.main, 0.08)} p={2} borderRadius={2} border={`1px solid ${alpha(theme.palette.primary.main, 0.15)}`}>
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
