'use client';

// apps/frontend/src/components/studio/steps/step2.tsx
// Step 3 of 6, Data schema.
// Production's layout stands: a tab bar across the top, the module and entity
// sidebar with the field editor, the access pills, the logic cards and the
// exposure table, the floating dock below. Behind every panel sits the typed
// twelve section Blueprint. Every edit writes a section; after a short pause
// the step saves the touched sections through Cerulea APIs as one new version.
// The relationship canvas, the logic canvas and the workflow canvas draw over
// the same document. The Blueprint level reads and edits the document itself.
// Without this step a system would keep records nobody may read.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, styled, useTheme } from '@mui/material/styles';
import { useRouter } from 'next/navigation';
import ArrowBackIcon from '@mui/icons-material/KeyboardArrowLeft';
import ArrowForwardIcon from '@mui/icons-material/KeyboardArrowRight';
import AddIcon from '@mui/icons-material/Add';
import StorageIcon from '@mui/icons-material/Storage';
import SecurityIcon from '@mui/icons-material/Security';
import BoltIcon from '@mui/icons-material/Bolt';
import PublicIcon from '@mui/icons-material/Public';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

import StepGuidance from '@/components/studio/StepGuidance';
import RelationshipCanvas from '@/components/studio/relationships/RelationshipCanvas';
import { ENTITY_PRESETS, composeSections, toIdentifier, toReadable } from '@/lib/blueprint/compose';
import { removeCollection } from '@/lib/blueprint/edit';
import type { Blueprint } from '@/lib/blueprint/types';
import EntitySidebar from './step2-EntitySidebar';
import EntityFieldEditor from './step2-EntityFieldEditor';
import GovernancePanel from './step2-GovernancePanel';
import BehaviorPanel from './step2-BehaviorPanel';
import ExposurePanel from './step2-ExposurePanel';
import WorkflowPanel from './step2-WorkflowPanel';
import LevelFour from './step2-LevelFour';
import { CUSTOM_MODULE, groupCollections, moduleInfo, moduleOf, newCollection, presetCollectionIds } from './step2-model';
import { useSchemaStep } from './step2-state';
import type { Phase } from './step2-types';

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

const PHASES: { id: Phase; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'data', label: 'Data Model', icon: <StorageIcon sx={{ fontSize: 22 }} />, color: '#4F46E5' },
  { id: 'governance', label: 'Access & Roles', icon: <SecurityIcon sx={{ fontSize: 22 }} />, color: '#8b5cf6' },
  { id: 'behavior', label: 'Logic', icon: <BoltIcon sx={{ fontSize: 22 }} />, color: '#06b6d4' },
  { id: 'exposure', label: 'API Schema', icon: <PublicIcon sx={{ fontSize: 22 }} />, color: '#10b981' },
  { id: 'workflows', label: 'Workflows', icon: <AccountTreeIcon sx={{ fontSize: 22 }} />, color: '#f59e0b' },
];

const HELP: Record<Phase, { title: string; body: string; tip: string }> = {
  data: {
    title: 'Entities Guide',
    body: 'Entities are the records the system keeps. Each module from the Blueprint step brings its entities with their fields. Click an entity to edit its fields, its privacy class, its retention and its purpose. Add More Entities opens the catalogue of presets. Relationships draws the links between entities; each link is a reference field in the Blueprint.',
    tip: 'A core entity came with a module and stays while the module stays. A custom entity is one we added by hand.',
  },
  governance: {
    title: 'Access Control Guide',
    body: 'Roles come from the Identities section. Each pill gives one role one capability on one entity: Create, Read, Update or Delete. Narrow limits a role to named fields and to the rows a person owns. A role reaches nothing until a pill says so.',
    tip: 'Start by giving each role Read on the entities it needs, then add Create and Update where the role does the work.',
  },
  behavior: {
    title: 'Logic & Triggers Guide',
    body: 'A rule states what the system refuses, with a formula Cerulea checks as we type. An action states what the system does and declares the records it reads and writes, which is its Access Manifest. Visual mode draws a flow from the palette of 52 blocks; each flow writes one action with its rules and events.',
    tip: 'Every value block raises the action to the financial class, so a payment commits only when more validators agree.',
  },
  exposure: {
    title: 'API & Visibility Guide',
    body: 'The privacy class states how much of a record the Blockchain holds in the open. Published opens an entity to anyone through the generated interface. Signed in readers follow the Access & Roles tab.',
    tip: 'Keep personal values in a sealed entity. A reader then needs the key as well as the permission.',
  },
  workflows: {
    title: 'Workflows Guide',
    body: 'A workflow moves one record through named states. Drag between states to add a way out, then choose the action that moves the record and the roles that must approve it. A deadline moves a record on by itself.',
    tip: 'Mark the state that closes the work as an end, or the workflow never finishes.',
  },
};

export default function Step2({
  goPrev,
  goNext,
  projectId = null,
  disclosureLevel,
}: {
  goPrev?: () => void;
  goNext?: () => void;
  projectId?: string | null;
  /** The disclosure level the shell shows. Four opens the Blueprint view of this step. */
  disclosureLevel?: 1 | 2 | 3 | 4;
}) {
  const theme = useTheme();
  const router = useRouter();
  const step = useSchemaStep(projectId);

  const [phase, setPhase] = useState<Phase>('data');
  const [level, setLevel] = useState<'designer' | 'blueprint'>(disclosureLevel === 4 ? 'blueprint' : 'designer');

  useEffect(() => {
    if (disclosureLevel === 4) setLevel('blueprint');
    if (disclosureLevel === 3) setLevel('designer');
  }, [disclosureLevel]);
  const [dataView, setDataView] = useState<'fields' | 'relationships'>('fields');
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [entitySearch, setEntitySearch] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);

  const { blueprint, moduleIds, schemaLayout } = step;
  const grouping = useMemo(
    () => groupCollections(blueprint, moduleIds, schemaLayout.placement),
    [blueprint, moduleIds, schemaLayout.placement],
  );
  const coreIds = useMemo(
    () => new Set(moduleIds.flatMap((moduleId) => presetCollectionIds(moduleId))),
    [moduleIds],
  );
  const isCore = useCallback((collection: { id: string }) => coreIds.has(collection.id), [coreIds]);

  // The first module and its first entity open selected, as production did.
  useEffect(() => {
    if (step.loading) return;
    if (selectedModuleId && grouping.byModule[selectedModuleId]) {
      if (selectedCollectionId && blueprint.collections.some((entry) => entry.id === selectedCollectionId)) return;
      const first = grouping.byModule[selectedModuleId][0];
      setSelectedCollectionId(first?.id ?? null);
      return;
    }
    const firstModule = grouping.modules.find((mod) => (grouping.byModule[mod.id] ?? []).length > 0) ?? grouping.modules[0];
    setSelectedModuleId(firstModule?.id ?? null);
    setSelectedCollectionId(firstModule ? (grouping.byModule[firstModule.id]?.[0]?.id ?? null) : null);
  }, [blueprint.collections, grouping, selectedCollectionId, selectedModuleId, step.loading]);

  const selectedCollection = blueprint.collections.find((entry) => entry.id === selectedCollectionId) ?? null;
  const retentionDays = blueprint.collections[0]?.retention.period_days ?? 3650;

  const place = (collectionId: string, moduleId: string) =>
    step.changeSchemaLayout((held) => ({ ...held, placement: { ...held.placement, [collectionId]: moduleId } }));

  const addBlank = () => {
    let count = 1;
    while (blueprint.collections.some((entry) => entry.id === toIdentifier(`New entity ${count}`))) count += 1;
    const outcome = newCollection(blueprint, `New entity ${count}`, retentionDays);
    if (!outcome.collection) return;
    step.change(outcome.blueprint);
    place(outcome.collection.id, selectedModuleId ?? CUSTOM_MODULE.id);
    setSelectedCollectionId(outcome.collection.id);
    setDataView('fields');
  };

  const removeEntity = (collectionId: string) => {
    step.change(removeCollection(blueprint, collectionId));
    step.changeSchemaLayout((held) => {
      const placement = { ...held.placement };
      delete placement[collectionId];
      const positions = { ...held.positions };
      delete positions[collectionId];
      return { placement, positions };
    });
    if (selectedCollectionId === collectionId) setSelectedCollectionId(null);
  };

  const addFromCatalogue = (moduleId: string, entityName: string) => {
    const collectionId = toIdentifier(entityName);
    if (blueprint.collections.some((entry) => entry.id === collectionId)) {
      setSelectedCollectionId(collectionId);
      setCatalogueOpen(false);
      return;
    }
    const composed = composeSections([moduleId], { retentionDays });
    const collection = composed.collections.find((entry) => entry.id === collectionId);
    if (!collection) return;
    const typeIds = new Set(blueprint.types.map((entry) => entry.id));
    const neededTypes = composed.types.filter(
      (entry) =>
        typeIds.has(entry.id) === false &&
        (entry.id === collection.record_type || entry.id.startsWith(`${collectionId}_`)),
    );
    const next: Blueprint = {
      ...blueprint,
      types: [...blueprint.types, ...neededTypes],
      collections: [...blueprint.collections, collection],
    };
    step.change(next);
    place(collectionId, selectedModuleId ?? CUSTOM_MODULE.id);
    setSelectedCollectionId(collectionId);
    setCatalogueOpen(false);
    setEntitySearch('');
  };

  const catalogueGroups = useMemo(() => {
    const held = new Set(blueprint.collections.map((entry) => entry.id));
    const query = entitySearch.trim().toLowerCase();
    const groups: { moduleId: string; label: string; entries: string[] }[] = [];
    for (const [moduleId, entities] of Object.entries(ENTITY_PRESETS)) {
      const label = moduleInfo(moduleId).label;
      const entries = entities
        .map((entity) => entity.name)
        .filter((name) => held.has(toIdentifier(name)) === false)
        .filter((name) => query.length === 0 || name.toLowerCase().includes(query) || label.toLowerCase().includes(query));
      if (entries.length > 0) groups.push({ moduleId, label, entries });
    }
    return groups;
  }, [blueprint.collections, entitySearch]);

  const handleSave = async () => {
    const saved = await step.saveNow();
    if (saved && goNext) goNext();
  };

  const statusText =
    step.status === 'saving'
      ? 'Saving to Cerulea APIs'
      : step.status === 'failed'
        ? 'Save held back'
        : step.pending > 0
          ? 'Saving in a moment'
          : step.status === 'saved'
            ? `Saved as version ${step.version}`
            : `Version ${step.version}`;

  return (
    <Box
      sx={{ width: '100%', height: '100%', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', position: 'relative' }}
      data-testid="step-data-schema"
    >
      <StepGuidance
        stepKey="step2"
        title="Data schema"
        subtitle="Step 3 of 6"
        description="We define the records the system keeps, who reaches each one, the rules and actions behind them, and the workflows that move them. Every panel writes the typed Blueprint. The modules chosen in the Blueprint step bring their entities already filled."
        steps={[
          { first: 'Review entities', next: 'Each module brings its entities. Click a module in the left column to see them, and an entity to open its fields.' },
          { first: 'Draw relationships', next: 'Open Relationships beside the fields and drag between two entities. Each link becomes a reference field.' },
          { first: 'Set access rules', next: 'Switch to Access & Roles and give each role the capabilities it needs on each entity.' },
          { first: 'Write the logic', next: 'Add rules with a formula and actions with their effects, or draw a flow from the 52 blocks in Visual mode.' },
          { first: 'Give records an order', next: 'Open Workflows and draw the states a record moves through.' },
        ]}
        tip="The Blueprint level, top right, shows the typed document every panel writes. We can read it back at any time and edit it directly."
      />

      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0.5,
          zIndex: -1,
          backgroundImage:
            theme.palette.mode === 'light'
              ? 'radial-gradient(rgba(79,70,229,0.07) 1px, transparent 1px)'
              : 'radial-gradient(rgba(79,70,229,0.13) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <Box
        sx={{
          display: 'flex',
          gap: 1,
          px: 3,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          flexShrink: 0,
          alignItems: 'center',
        }}
      >
        {PHASES.map((entry) => {
          const isActive = phase === entry.id && level === 'designer';
          return (
            <Box
              key={entry.id}
              role="tab"
              aria-selected={isActive}
              aria-label={`${entry.label} tab`}
              tabIndex={0}
              onClick={() => {
                setPhase(entry.id);
                setLevel('designer');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  setPhase(entry.id);
                  setLevel('designer');
                }
              }}
              sx={{
                px: 2,
                py: 1,
                borderRadius: 2,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                fontSize: '0.82rem',
                fontWeight: isActive ? 700 : 400,
                transition: 'all 0.15s',
                bgcolor: isActive ? alpha(entry.color, 0.12) : 'transparent',
                color: isActive ? entry.color : 'text.secondary',
                border: `1px solid ${isActive ? alpha(entry.color, 0.3) : 'transparent'}`,
                '&:hover': {
                  bgcolor: alpha(entry.color, isActive ? 0.15 : 0.06),
                  color: entry.color,
                  border: `1px solid ${alpha(entry.color, isActive ? 0.35 : 0.15)}`,
                },
              }}
            >
              {entry.icon}
              {entry.label}
            </Box>
          );
        })}
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color={step.status === 'failed' ? 'error.main' : 'text.secondary'} data-testid="save-status">
          {statusText}
        </Typography>
        <Tooltip title="The Designer level edits the Blueprint through panels. The Blueprint level shows the typed document itself.">
          <ToggleButtonGroup
            size="small"
            exclusive
            value={level}
            onChange={(_event, next) => {
              if (next) setLevel(next);
            }}
            aria-label="Disclosure level"
          >
            <ToggleButton value="designer" aria-label="Level 3, Designer">
              Designer
            </ToggleButton>
            <ToggleButton value="blueprint" aria-label="Level 4, Blueprint">
              Blueprint
            </ToggleButton>
          </ToggleButtonGroup>
        </Tooltip>
      </Box>

      {step.failure && (
        <Alert
          severity={step.loading ? 'error' : 'warning'}
          sx={{ mx: 3, mt: 1.5, flexShrink: 0 }}
          data-testid="step-failure"
          action={
            <Button color="inherit" size="small" onClick={() => (step.loading || blueprint.collections.length === 0 ? step.readAgain() : void step.saveNow())}>
              {step.status === 'failed' ? 'Save again' : 'Read again'}
            </Button>
          }
        >
          <AlertTitle>{step.failure.message}</AlertTitle>
          {step.failure.fix}
          {step.failure.faults.length > 0 && (
            <Box component="ul" sx={{ m: 0, mt: 1, pl: 2.5 }}>
              {step.failure.faults.slice(0, 6).map((fault) => (
                <li key={`${fault.path}:${fault.message}`}>
                  <Typography variant="body2">
                    {fault.path || 'The document'}: {fault.message} {fault.fix}
                  </Typography>
                </li>
              ))}
            </Box>
          )}
        </Alert>
      )}

      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
        {step.loading ? (
          <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}>
            <Typography color="text.secondary">Cerulea is opening the data schema.</Typography>
          </Box>
        ) : level === 'blueprint' ? (
          <Box sx={{ width: '100%', height: '100%', overflow: 'hidden' }}>
            <LevelFour blueprint={blueprint} version={step.version} saving={step.status === 'saving'} onSave={step.saveDocument} />
          </Box>
        ) : (
          <>
            {phase === 'data' && (
              <Box sx={{ width: '100%', height: '100%', display: 'flex', overflow: 'hidden' }}>
                <EntitySidebar
                  grouping={grouping}
                  selectedModuleId={selectedModuleId}
                  selectedCollectionId={selectedCollectionId}
                  isCore={isCore}
                  onSelectModule={(moduleId) => {
                    setSelectedModuleId(moduleId);
                    const first = grouping.byModule[moduleId]?.[0];
                    setSelectedCollectionId(first?.id ?? null);
                  }}
                  onSelectCollection={(moduleId, collectionId) => {
                    setSelectedModuleId(moduleId);
                    setSelectedCollectionId(collectionId);
                    setDataView('fields');
                  }}
                  onRemoveCollection={removeEntity}
                  onOpenCatalogue={() => setCatalogueOpen(true)}
                  onAddBlank={addBlank}
                />
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ px: 3, py: 1, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: 'background.paper' }}
                  >
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      value={dataView}
                      onChange={(_event, next) => {
                        if (next) setDataView(next);
                      }}
                      aria-label="Data model view"
                    >
                      <ToggleButton value="fields" aria-label="Fields view">
                        Fields
                      </ToggleButton>
                      <ToggleButton value="relationships" aria-label="Relationships view">
                        Relationships
                      </ToggleButton>
                    </ToggleButtonGroup>
                    <Typography variant="caption" color="text.secondary">
                      {dataView === 'fields'
                        ? 'The fields of one entity and the settings of its collection.'
                        : 'The links between entities. Each link is a reference field in the Blueprint.'}
                    </Typography>
                  </Stack>
                  <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
                    {dataView === 'fields' ? (
                      <EntityFieldEditor
                        blueprint={blueprint}
                        collection={selectedCollection}
                        isCore={selectedCollection ? isCore(selectedCollection) : false}
                        onChange={step.change}
                      />
                    ) : (
                      <Box sx={{ flex: 1, minHeight: 0 }}>
                        <RelationshipCanvas
                          blueprint={blueprint}
                          positions={schemaLayout.positions}
                          onChange={step.change}
                          onChangePositions={(positions) => step.changeSchemaLayout((held) => ({ ...held, positions }))}
                        />
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            )}
            {phase === 'governance' && (
              <Box sx={{ width: '100%', height: '100%' }}>
                <GovernancePanel blueprint={blueprint} grouping={grouping} onChange={step.change} />
              </Box>
            )}
            {phase === 'behavior' && (
              <Box sx={{ width: '100%', height: '100%' }}>
                <BehaviorPanel
                  blueprint={blueprint}
                  grouping={grouping}
                  track={step.track}
                  layout={step.logicLayout}
                  onChange={step.change}
                  onChangeLayout={step.changeLogicLayout}
                />
              </Box>
            )}
            {phase === 'exposure' && (
              <Box sx={{ width: '100%', height: '100%' }}>
                <ExposurePanel blueprint={blueprint} grouping={grouping} onChange={step.change} />
              </Box>
            )}
            {phase === 'workflows' && (
              <Box sx={{ width: '100%', height: '100%' }}>
                <WorkflowPanel blueprint={blueprint} layout={step.logicLayout} onChange={step.change} onChangeLayout={step.changeLogicLayout} />
              </Box>
            )}
          </>
        )}
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'center',
          py: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.mode === 'light' ? 'rgba(255,255,255,0.95)' : 'rgba(8,14,36,0.95)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <FloatingIsland elevation={6}>
          <Tooltip title="Back">
            <IconButton onClick={goPrev || (() => router.back())} size="small" sx={{ border: '1px solid', borderColor: 'divider' }} aria-label="Back">
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />
          <Tooltip title="Help & Guide">
            <IconButton size="small" color="primary" onClick={() => setHelpOpen(true)} aria-label="Help and guide">
              <QuestionMarkIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />
          <Button
            variant="contained"
            onClick={() => void handleSave()}
            endIcon={<ArrowForwardIcon />}
            disabled={step.status === 'saving'}
            sx={{ borderRadius: 1, px: 3, fontWeight: 700 }}
          >
            Save &amp; Next
          </Button>
        </FloatingIsland>
      </Box>

      <Dialog
        open={catalogueOpen}
        onClose={() => {
          setCatalogueOpen(false);
          setEntitySearch('');
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 1, height: '75vh' } }}
      >
        <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              Add More Entities
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Browse the entity presets of every module. A chosen entity joins{' '}
              <strong>{grouping.modules.find((mod) => mod.id === selectedModuleId)?.label || 'the current module'}</strong> as a
              Blueprint collection.
            </Typography>
          </Box>
          <IconButton
            onClick={() => {
              setCatalogueOpen(false);
              setEntitySearch('');
            }}
            aria-label="Close the catalogue"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
          <TextField
            placeholder="Search entities by name or module"
            size="small"
            value={entitySearch}
            onChange={(event) => setEntitySearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16 }} />
                </InputAdornment>
              ),
            }}
            inputProps={{ 'aria-label': 'Search entities' }}
            autoFocus
          />
          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {catalogueGroups.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">
                  {entitySearch ? 'No entity matches.' : 'Every entity of the catalogue is already in the Blueprint.'}
                </Typography>
              </Box>
            ) : (
              catalogueGroups.map((group) => (
                <Accordion
                  key={group.moduleId}
                  defaultExpanded={catalogueGroups.length <= 3}
                  disableGutters
                  elevation={0}
                  sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: '4px !important', mb: 1, '&:before': { display: 'none' } }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 44, py: 0 }}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      {group.label}
                    </Typography>
                    <Chip label={group.entries.length} size="small" sx={{ ml: 1, height: 18, fontSize: '0.65rem' }} />
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0, pb: 1 }}>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {group.entries.map((name) => (
                        <Chip
                          key={`${group.moduleId}-${name}`}
                          label={name}
                          onClick={() => addFromCatalogue(group.moduleId, name)}
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
          <Button
            onClick={() => {
              setCatalogueOpen(false);
              setEntitySearch('');
            }}
            sx={{ borderRadius: 1 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 1 } }}>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 3 }}>
          <Typography variant="h6" fontWeight={800}>
            {HELP[phase].title}
          </Typography>
          <IconButton onClick={() => setHelpOpen(false)} aria-label="Close the help">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 4 }}>
          <Typography variant="body1" color="text.secondary" paragraph>
            {HELP[phase].body}
          </Typography>
          <Box
            bgcolor={alpha(theme.palette.primary.main, 0.08)}
            p={2}
            borderRadius={2}
            border={`1px solid ${alpha(theme.palette.primary.main, 0.15)}`}
          >
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Worth knowing
            </Typography>
            <Typography variant="body2" fontSize={13}>
              {HELP[phase].tip}
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export { moduleOf };
