'use client';

// apps/frontend/src/components/studio/steps/step1.tsx
// Step 2 of 6, Blueprint.
// The production canvas stays: cards on an infinite surface, a search that
// adds a part, an inspector, undo and redo, the help, the assistant actions.
// Outcomes decide which parts are present. Cerulea resolves the dependency
// closure and reports conflicts. Four link types draw distinctly, two derived
// and two chosen from valid pairs. Removing a part asks first. Every change
// saves the graph with its positions and writes the typed Blueprint through
// Cerulea APIs, so every level reads one document.

import * as React from 'react';
import StepGuidance from '@/components/studio/StepGuidance';
import { useTheme, alpha, styled } from '@mui/material/styles';
import {
  Box, Stack, Paper, Typography, TextField, Chip, Button, Divider, Alert, AlertTitle,
  IconButton, Tooltip, Fade, Dialog, DialogContent, DialogTitle, DialogActions, Snackbar, CircularProgress,
} from '@mui/material';

import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import SearchIcon from '@mui/icons-material/Search';
import LayersIcon from '@mui/icons-material/Layers';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import ChecklistIcon from '@mui/icons-material/Checklist';
import HubIcon from '@mui/icons-material/Hub';

import ReactFlow, {
  ReactFlowProvider, useReactFlow, Background, BackgroundVariant, MiniMap, Controls,
  useNodesState, type Node, type Edge, type Connection, type NodeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useStudio } from '@/context/StudioContext';
import { getClientDivision } from '@/lib/division-client';
import { api } from '@/lib/apiClient';
import { describeSaveFailure, type SaveFailure } from '@/lib/studio/project-state';
import type { CatalogueModule, CatalogueTemplate, ProjectTrack } from '@/lib/catalogue/types';
import {
  EMPTY_SELECTION,
  buildCanvasModel,
  drawableKinds,
  layoutPositions,
  moduleIdOfNode,
  nodeIdFor,
  openingSelection,
  prepareCatalogue,
  readSavedGraph,
  removalQuestion,
  savedGraphOf,
  withFeedsAnswer,
  withModule,
  withModuleRemoved,
  withOutcome,
  withTrigger,
  withoutLink,
  withoutOutcome,
  type CanvasSelection,
  type CardSettings,
  type Position,
  type PreparedCatalogue,
} from '@/lib/map/canvas';
import type { MapLink } from '@/lib/map/links';
import type { TriggerPair } from '@/lib/map/triggers';
import { applyRemoveOutcomes, detectConflicts, type Conflict, type ConflictFix } from '@/lib/outcomes/conflicts';
import type { RemovalImpact } from '@/lib/outcomes/resolve';
import { nodeTypes, edgeTypes, type ModuleNodeData, type LinkEdgeData } from './step1-canvas-parts';
import { CardInspector, InspectorIsland, LinkInspector, RemovalDialog } from './step1-Inspector';
import SidePanel, { type SidePanelTab } from './step1-SidePanel';

/* ---------------- Styled Components ---------------- */

const FloatingIsland = styled(Paper)(({ theme }) => ({
  background: theme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.96)' : 'rgba(8, 14, 36, 0.96)',
  backdropFilter: 'blur(20px) saturate(180%)',
  border: `0.5px solid ${theme.palette.divider}`,
  boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.08 : 0.18)}`,
  borderRadius: 24,
  overflow: 'hidden',
  transition: 'all 0.3s ease',
}));

const SpotlightDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    background: theme.palette.mode === 'light' ? '#fff' : '#0D1535',
    borderRadius: 20,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
    width: '100%',
    maxWidth: 600,
    margin: 16,
    position: 'absolute',
    top: 100,
  },
}));

const HelpDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialog-paper': {
    background: theme.palette.mode === 'light' ? '#ffffff' : '#121212',
    backgroundImage: 'none',
    borderRadius: 16,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
  },
}));

const ScrollBox = styled(Box)(({ theme }) => ({
  overflowY: 'auto',
  '&::-webkit-scrollbar': { width: '6px' },
  '&::-webkit-scrollbar-track': { background: 'transparent' },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
    borderRadius: '3px',
  },
}));

/* ---------------- Types ---------------- */

type HistoryEntry = { selection: CanvasSelection; positions: Record<string, Position>; settings: Record<string, CardSettings> };

type GraphReply = {
  ok: true;
  blueprint: unknown;
  compose: { outcomeIds: string[]; moduleIds: string[]; removedModuleIds: string[]; chosenLinks: CanvasSelection['chosenLinks'] };
  foundation: { track: ProjectTrack; templateId: string; historyRetentionDays: number };
};

type SaveReply = {
  ok: true;
  moduleIds: string[];
  blueprintVersion?: number;
  linksWithoutEvent?: Array<{ linkId: string; reason: string }>;
  bridgesWithoutEndpoint?: Array<{ outcomeId: string; reason: string }>;
};

/** The modules one template installs, under either seed field name. */
function templateModuleIds(template: CatalogueTemplate | undefined): string[] {
  if (!template) return [];
  return Array.from(new Set(template.modules ?? template.preinstalledModules ?? []));
}

/** The assistant action the production drawer dispatches on the window. */
type AssistantAction =
  | { type: 'add_module'; moduleId: string }
  | { type: 'remove_module'; moduleId: string }
  | { type: 'connect_modules'; sourceId: string; targetId: string; rel?: string };

/* =======================
   Step 2 Logic
======================= */

function Step1Inner({ goPrev, goNext, projectId: givenProjectId }: { goPrev?: () => void; goNext?: () => void; projectId?: string | null }) {
  const theme = useTheme();
  const studio = useStudio();
  const rf = useReactFlow();
  const division = React.useMemo(() => getClientDivision(), []);
  const projectId =
    givenProjectId ??
    studio.projectId ??
    (typeof window !== 'undefined' ? localStorage.getItem('cerulea.projectId') : null);

  /* ---- The catalogue and the saved graph ---- */
  const [prepared, setPrepared] = React.useState<PreparedCatalogue | null>(null);
  const [modules, setModules] = React.useState<CatalogueModule[]>([]);
  const [track, setTrack] = React.useState<ProjectTrack>((studio.projectType as ProjectTrack | null) ?? 'dapp');
  const [retentionDays, setRetentionDays] = React.useState<number | undefined>(undefined);
  const [loadProblem, setLoadProblem] = React.useState<SaveFailure | null>(null);
  const [loaded, setLoaded] = React.useState(false);

  /* ---- What the person decided ---- */
  const [selection, setSelection] = React.useState<CanvasSelection>(EMPTY_SELECTION);
  const [positions, setPositions] = React.useState<Record<string, Position>>({});
  const [settings, setSettings] = React.useState<Record<string, CardSettings>>({});

  /* ---- Screen state ---- */
  const [nodes, setNodes, onNodesChange] = useNodesState<ModuleNodeData>([]);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = React.useState<string | null>(null);
  const [panelOpen, setPanelOpen] = React.useState(true);
  const [panelTab, setPanelTab] = React.useState<SidePanelTab>('outcomes');
  const [isSpotlightOpen, setIsSpotlightOpen] = React.useState(false);
  const [isHelpOpen, setIsHelpOpen] = React.useState(false);
  const [clearAsked, setClearAsked] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [removal, setRemoval] = React.useState<RemovalImpact | null>(null);
  const [linkChoice, setLinkChoice] = React.useState<{ from: string; to: string; kinds: Array<'feeds' | 'triggers'> } | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [saveState, setSaveState] = React.useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [saveFailure, setSaveFailure] = React.useState<SaveFailure | null>(null);
  const [saveNotes, setSaveNotes] = React.useState<string[]>([]);
  const [blueprintVersion, setBlueprintVersion] = React.useState<number | null>(null);

  /* ---- Undo and redo over every decision ---- */
  const historyRef = React.useRef<HistoryEntry[]>([]);
  const historyIndexRef = React.useRef(-1);
  const [historyMark, setHistoryMark] = React.useState(0);

  const pushHistory = React.useCallback((entry: HistoryEntry) => {
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(JSON.parse(JSON.stringify(entry)) as HistoryEntry);
    if (historyRef.current.length > 50) historyRef.current = historyRef.current.slice(-50);
    historyIndexRef.current = historyRef.current.length - 1;
    setHistoryMark((mark) => mark + 1);
  }, []);

  /** Applies one decision and records it for undo. */
  const decide = React.useCallback(
    (next: Partial<HistoryEntry>) => {
      const entry: HistoryEntry = {
        selection: next.selection ?? selection,
        positions: next.positions ?? positions,
        settings: next.settings ?? settings,
      };
      setSelection(entry.selection);
      setPositions(entry.positions);
      setSettings(entry.settings);
      pushHistory(entry);
    },
    [positions, pushHistory, selection, settings],
  );

  const restore = React.useCallback((entry: HistoryEntry) => {
    setSelection(entry.selection);
    setPositions(entry.positions);
    setSettings(entry.settings);
    setHistoryMark((mark) => mark + 1);
  }, []);

  const undo = React.useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    restore(historyRef.current[historyIndexRef.current]);
  }, [restore]);

  const redo = React.useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    restore(historyRef.current[historyIndexRef.current]);
  }, [restore]);

  /* ---- Load ---- */
  React.useEffect(() => {
    let live = true;
    (async () => {
      try {
        const graph = projectId
          ? await api<GraphReply>(`/api/projects/${encodeURIComponent(projectId)}/blueprint`)
          : null;
        const projectTrack: ProjectTrack = graph?.foundation.track ?? track;
        const suffix = `?projectType=${projectTrack}${division ? `&division=${division}` : ''}`;
        const [moduleList, templateList] = await Promise.all([
          api<CatalogueModule[]>(`/api/modules${suffix}`),
          api<CatalogueTemplate[]>(`/api/templates${suffix}`),
        ]);
        if (!live) return;
        const catalogue = prepareCatalogue({ modules: moduleList, templates: templateList });
        const saved = readSavedGraph(graph?.blueprint ?? null);
        const template = templateList.find((entry) => entry.id === graph?.foundation.templateId);
        const opening = openingSelection(
          saved,
          graph?.compose ?? { outcomeIds: [], moduleIds: [], removedModuleIds: [], chosenLinks: [] },
          templateModuleIds(template),
          catalogue,
        );
        setModules(moduleList);
        setTrack(projectTrack);
        setRetentionDays(graph?.foundation.historyRetentionDays);
        setPrepared(catalogue);
        setSelection(opening);
        setPositions(saved.positions);
        setSettings(saved.settings);
        historyRef.current = [{ selection: opening, positions: saved.positions, settings: saved.settings }];
        historyIndexRef.current = 0;
        setLoaded(true);
        if (opening.outcomeIds.length === 0) setIsHelpOpen(true);
      } catch (cause) {
        if (live) setLoadProblem(describeSaveFailure(cause));
      }
    })();
    return () => { live = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  /* ---- The model, derived from the decisions ---- */
  const model = React.useMemo(
    () => (prepared ? buildCanvasModel(selection, prepared) : null),
    [prepared, selection],
  );

  const conflicts: Conflict[] = React.useMemo(
    () => (prepared && model ? detectConflicts(model.resolution, { track, outcomes: prepared.outcomes, modules: prepared.withBridges }) : []),
    [model, prepared, track],
  );

  const laidOut = React.useMemo(
    () => (model ? layoutPositions(model.installed, positions) : {}),
    [model, positions],
  );

  // The cards follow the model. A position a person set stays.
  React.useEffect(() => {
    if (!model) return;
    setNodes(
      model.cards.map((card) => ({
        id: nodeIdFor(card.moduleId),
        type: 'module',
        position: laidOut[card.moduleId],
        selected: selectedNodeId === nodeIdFor(card.moduleId),
        data: {
          moduleId: card.moduleId,
          title: card.title,
          area: card.area,
          blurb: card.blurb,
          tags: card.tags,
          group: settings[card.moduleId]?.group,
          config: settings[card.moduleId]?.config,
          contribution: card.contribution,
          causedBy: card.causedBy,
          chosenDirectly: card.chosenDirectly,
          removalConsequence: card.removalConsequence,
        },
      })),
    );
  }, [model, laidOut, settings, selectedNodeId, setNodes]);

  const edges: Edge<LinkEdgeData>[] = React.useMemo(
    () =>
      (model?.links ?? []).map((link) => ({
        id: link.linkId,
        source: nodeIdFor(link.from),
        target: nodeIdFor(link.to),
        type: 'link',
        selected: selectedEdgeId === link.linkId,
        data: { linkType: link.type, origin: link.origin, reason: link.reason, removable: link.removable },
      })),
    [model, selectedEdgeId],
  );

  /* ---- Autosave: the graph with positions, and the typed Blueprint ---- */
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const persist = React.useCallback(async () => {
    if (!projectId || !model) return;
    setSaveState('saving');
    try {
      const body = savedGraphOf(model, selection, laidOut, settings);
      const reply = await api<SaveReply>(`/api/projects/${encodeURIComponent(projectId)}/blueprint`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setSaveState('saved');
      setSaveFailure(null);
      if (reply.blueprintVersion !== undefined) setBlueprintVersion(reply.blueprintVersion);
      setSaveNotes([
        ...(reply.linksWithoutEvent ?? []).map((entry) => entry.reason),
        ...(reply.bridgesWithoutEndpoint ?? []).map((entry) => entry.reason),
      ]);
      studio.setStudioState({ selectedModules: model.installed });
      if (typeof window !== 'undefined') {
        localStorage.setItem('cerulea.step1.graph', JSON.stringify(body.graph));
        localStorage.setItem('cerulea.templateModules', JSON.stringify(model.installed));
      }
    } catch (cause) {
      setSaveState('failed');
      setSaveFailure(describeSaveFailure(cause));
    }
  }, [laidOut, model, projectId, selection, settings, studio]);

  React.useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void persist(); }, 2000);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, selection, positions, settings]);

  /* ---- Canvas handlers ---- */
  const onNodeDragStop = React.useCallback(() => {
    const moved: Record<string, Position> = { ...laidOut };
    for (const node of rf.getNodes()) moved[moduleIdOfNode(node.id)] = { x: node.position.x, y: node.position.y };
    decide({ positions: moved });
  }, [decide, laidOut, rf]);

  const handleNodesChange = React.useCallback(
    (changes: NodeChange[]) => {
      // Removal goes through the question, so the canvas drops no card on its own.
      onNodesChange(changes.filter((change) => change.type !== 'remove'));
    },
    [onNodesChange],
  );

  const onConnect = React.useCallback(
    (connection: Connection) => {
      if (!model || !connection.source || !connection.target) return;
      const from = moduleIdOfNode(connection.source);
      const to = moduleIdOfNode(connection.target);
      const kinds = drawableKinds(from, to, model);
      const fromTitle = prepared?.titleById[from] ?? from;
      const toTitle = prepared?.titleById[to] ?? to;
      if (kinds.length === 0) {
        setNotice(`Cerulea holds no feeds or triggers relation between ${fromTitle} and ${toTitle}. The Links panel lists every pair that works.`);
        return;
      }
      if (kinds.length === 1) {
        decide({
          selection:
            kinds[0] === 'triggers'
              ? withTrigger(selection, { from, to }, true)
              : withFeedsAnswer(selection, to, Array.from(new Set([...(selection.chosenLinks.filter((l) => l.kind === 'feeds' && l.to === to).map((l) => l.from)), from]))),
        });
        return;
      }
      setLinkChoice({ from, to, kinds });
    },
    [decide, model, prepared, selection],
  );

  const chooseLinkKind = (kind: 'feeds' | 'triggers') => {
    if (!linkChoice) return;
    const { from, to } = linkChoice;
    decide({
      selection:
        kind === 'triggers'
          ? withTrigger(selection, { from, to }, true)
          : withFeedsAnswer(selection, to, Array.from(new Set([...selection.chosenLinks.filter((l) => l.kind === 'feeds' && l.to === to).map((l) => l.from), from]))),
    });
    setLinkChoice(null);
  };

  const focusModule = React.useCallback(
    (moduleId: string) => {
      const id = nodeIdFor(moduleId);
      setSelectedEdgeId(null);
      setSelectedNodeId(id);
      rf.fitView({ nodes: [{ id }], duration: 600, padding: 2 });
    },
    [rf],
  );

  const addModule = React.useCallback(
    (moduleId: string) => {
      if (!prepared?.index.has(moduleId)) {
        setNotice('Cerulea holds no part under that name in this catalogue.');
        return;
      }
      if (model?.installed.includes(moduleId)) {
        setIsSpotlightOpen(false);
        focusModule(moduleId);
        return;
      }
      decide({ selection: withModule(selection, moduleId) });
      setIsSpotlightOpen(false);
      setSelectedNodeId(nodeIdFor(moduleId));
    },
    [decide, focusModule, model, prepared, selection],
  );

  const askRemoval = React.useCallback(
    (moduleId: string) => {
      if (!model || !prepared) return;
      setRemoval(removalQuestion(moduleId, model, prepared));
    },
    [model, prepared],
  );

  const confirmRemoval = () => {
    if (!removal) return;
    decide({ selection: withModuleRemoved(selection, removal.moduleId, removal) });
    setSelectedNodeId(null);
    setRemoval(null);
  };

  const applyFix = (conflict: Conflict, fix: ConflictFix) => {
    if (fix.kind === 'remove-outcomes') {
      decide({ selection: { ...selection, outcomeIds: applyRemoveOutcomes(selection.outcomeIds, fix) } });
    } else if (fix.kind === 'add-modules') {
      let next = selection;
      for (const moduleId of fix.moduleIds) next = withModule(next, moduleId);
      decide({ selection: next });
    } else if (fix.kind === 'change-track') {
      setNotice(`The network is set in the Foundation step. Open it and choose the ${fix.track === 'blockchain' ? 'private Blockchain network' : 'public-access chain'}.`);
    } else {
      setNotice(`${conflict.title}. ${fix.label}.`);
    }
  };

  const onDeleteLink = (link: MapLink) => {
    if (!link.removable) {
      setNotice('Cerulea draws this link itself. Add or remove an outcome, or change the permission matrix, to change it.');
      return;
    }
    decide({ selection: withoutLink(selection, link.linkId) });
    setSelectedEdgeId(null);
  };

  const clearCanvas = () => {
    decide({ selection: EMPTY_SELECTION, positions: {}, settings: {} });
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setClearAsked(false);
  };

  /* ---- Keyboard ---- */
  const undoRef = React.useRef(undo);
  const redoRef = React.useRef(redo);
  undoRef.current = undo;
  redoRef.current = redo;
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const inInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (inInput) return;
      if (event.ctrlKey && event.key === 'z' && !event.shiftKey) { event.preventDefault(); undoRef.current(); }
      if ((event.ctrlKey && event.key === 'y') || (event.ctrlKey && event.shiftKey && event.key === 'z')) { event.preventDefault(); redoRef.current(); }
      if (event.ctrlKey && event.key === 'k') { event.preventDefault(); setIsSpotlightOpen(true); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  /* ---- Assistant actions ---- */
  const addModuleRef = React.useRef(addModule);
  const askRemovalRef = React.useRef(askRemoval);
  const connectRef = React.useRef(onConnect);
  addModuleRef.current = addModule;
  askRemovalRef.current = askRemoval;
  connectRef.current = onConnect;
  React.useEffect(() => {
    function onAgentAction(event: Event) {
      const action = (event as CustomEvent<AssistantAction>).detail;
      if (!action?.type) return;
      if (action.type === 'add_module') addModuleRef.current(action.moduleId);
      else if (action.type === 'remove_module') askRemovalRef.current(action.moduleId);
      else if (action.type === 'connect_modules') {
        connectRef.current({ source: nodeIdFor(action.sourceId), target: nodeIdFor(action.targetId), sourceHandle: null, targetHandle: null });
      }
    }
    window.addEventListener('cerulea:action', onAgentAction);
    return () => window.removeEventListener('cerulea:action', onAgentAction);
  }, []);

  /* ---- Selectors ---- */
  const selectedCard = React.useMemo(
    () => (selectedNodeId && model ? model.cards.find((card) => nodeIdFor(card.moduleId) === selectedNodeId) ?? null : null),
    [model, selectedNodeId],
  );
  const selectedLink = React.useMemo(
    () => (selectedEdgeId && model ? model.links.find((link) => link.linkId === selectedEdgeId) ?? null : null),
    [model, selectedEdgeId],
  );
  const selectedNeeds = React.useMemo(() => {
    if (!selectedCard || !model || !prepared) return [];
    return model.links
      .filter((link) => link.type === 'requires' && link.from === selectedCard.moduleId)
      .map((link) => ({ moduleId: link.to, title: prepared.titleById[link.to] ?? link.to, reason: link.reason }));
  }, [model, prepared, selectedCard]);

  const filteredLibrary = React.useMemo(() => {
    const held = query.trim().toLowerCase();
    const list = prepared?.withBridges ?? [];
    if (!held) return list;
    return list.filter((part) => `${part.title} ${part.moduleId} ${part.blurb ?? ''}`.toLowerCase().includes(held));
  }, [prepared, query]);

  const handleNext = async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await persist();
    if (goNext) goNext();
  };

  const saveText = saveState === 'saving' ? 'Saving' : saveState === 'saved' ? `Saved${blueprintVersion !== null ? ` · Blueprint v${blueprintVersion}` : ''}` : saveState === 'failed' ? 'Save failed' : '';
  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;
  void historyMark;

  if (loadProblem) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" variant="outlined">
          <AlertTitle>{loadProblem.message}</AlertTitle>
          {loadProblem.fix}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', position: 'absolute', inset: 0, overflow: 'hidden', bgcolor: 'background.default' }}>
      <StepGuidance
        stepKey="step1"
        title="Blueprint"
        subtitle="Step 2 of 6"
        description="Choose what the system should do. Cerulea places the parts each outcome needs on the canvas, links them and explains every card."
        steps={[
          { first: 'Choose outcomes', next: 'Tick plain statements in the Outcomes panel. Cerulea installs the parts each one needs, dependencies included.' },
          { first: 'Read the links', next: 'A solid line means one part needs another. An arrow means records flow. A dashed arrow means one part starts work in another. A dotted line means one part decides access.' },
          { first: 'Adjust and connect', next: 'Add a single part with the search (Ctrl+K). Drag between two cards to add a feeds or triggers link where the catalogue records the pair. Click a card to read why it is here and set its parameters.' },
        ]}
        tip="Removing a card asks first and names what stops working. Undo covers every change."
      />

      <ReactFlow
        nodes={nodes as Node<ModuleNodeData>[]}
        edges={edges}
        onNodesChange={handleNodesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onNodeClick={(_event, node) => { setSelectedEdgeId(null); setSelectedNodeId(node.id); }}
        onEdgeClick={(_event, edge) => { setSelectedNodeId(null); setSelectedEdgeId(edge.id); }}
        onPaneClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[20, 20]}
        minZoom={0.2}
        maxZoom={2}
        deleteKeyCode={null}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color={theme.palette.mode === 'light' ? 'rgba(79,70,229,0.12)' : 'rgba(79,70,229,0.18)'} />
        <Controls position="top-left" style={{ marginTop: 80, marginLeft: panelOpen ? 460 : 20 }} />
        <MiniMap position="top-right" style={{ marginTop: 80, marginRight: selectedCard || selectedLink ? 380 : 20, borderRadius: 12, overflow: 'hidden' }} zoomable pannable />
      </ReactFlow>

      {!loaded && !loadProblem && (
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
          <Stack alignItems="center" spacing={1.5}>
            <CircularProgress size={26} />
            <Typography variant="body2" color="text.secondary">Cerulea is reading the catalogue and the project.</Typography>
          </Stack>
        </Box>
      )}

      {loaded && model && model.cards.length === 0 && (
        <Box sx={{ position: 'absolute', top: '50%', left: panelOpen ? 'calc(50% + 210px)' : '50%', transform: 'translate(-50%, -50%)', zIndex: 5, pointerEvents: 'none', textAlign: 'center' }}>
          <Box sx={{ p: 3, borderRadius: 3, background: (t) => t.palette.mode === 'dark' ? 'rgba(8,14,36,0.7)' : 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', border: (t) => `1px dashed ${alpha(t.palette.primary.main, 0.3)}`, maxWidth: 400 }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>Build the Blueprint</Typography>
            <Typography variant="body2" sx={{ opacity: 0.7, lineHeight: 1.6 }}>
              Tick an outcome in the panel on the left, or add a part with the search below. Each one becomes a card on this canvas, with every part it needs.
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 1.5, opacity: 0.5 }}>
              Drag cards to arrange them. Drag between two cards to link them where the catalogue allows.
            </Typography>
          </Box>
        </Box>
      )}

      {/* The side panel */}
      {loaded && prepared && model && panelOpen && (
        <SidePanel
          tab={panelTab}
          onTabChange={setPanelTab}
          onClose={() => setPanelOpen(false)}
          modules={modules}
          titleById={prepared.titleById}
          track={track}
          selection={selection}
          model={model}
          conflicts={conflicts}
          onOutcomesChange={(next) => {
            const added = next.filter((id) => !selection.outcomeIds.includes(id));
            const removed = selection.outcomeIds.filter((id) => !next.includes(id));
            let following = selection;
            for (const id of added) following = withOutcome(following, id);
            for (const id of removed) following = withoutOutcome(following, id);
            // A statement chosen again brings back the parts it needs.
            if (added.length > 0) {
              const anchors = new Set(prepared.outcomes.filter((o) => added.includes(o.outcomeId)).map((o) => o.anchorModuleId));
              following = { ...following, removedModuleIds: following.removedModuleIds.filter((id) => !anchors.has(id)) };
            }
            decide({ selection: following });
          }}
          onFeedsAnswer={(to, sources) => decide({ selection: withFeedsAnswer(selection, to, sources) })}
          onTriggerToggle={(pair: TriggerPair, next: boolean) => decide({ selection: withTrigger(selection, pair, next) })}
          onLinkDelete={onDeleteLink}
          onApplyFix={applyFix}
          saveNotes={saveNotes}
        />
      )}

      {/* The floating dock */}
      <Box sx={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}>
        <FloatingIsland sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, borderRadius: 100 }}>
          <Tooltip title="Back">
            <IconButton onClick={goPrev ? goPrev : () => window.history.back()} size="small" sx={{ border: '1px solid', borderColor: 'divider' }} aria-label="Back">
              <KeyboardArrowLeftIcon />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />

          <Tooltip title="Undo (Ctrl+Z)">
            <span>
              <IconButton size="small" onClick={undo} disabled={!canUndo} aria-label="Undo"><UndoIcon fontSize="small" /></IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Y)">
            <span>
              <IconButton size="small" onClick={redo} disabled={!canRedo} aria-label="Redo"><RedoIcon fontSize="small" /></IconButton>
            </span>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />

          <Tooltip title="Outcomes, links and the check">
            <IconButton size="small" color={panelOpen ? 'primary' : 'default'} onClick={() => setPanelOpen((open) => !open)} aria-label="Outcomes panel">
              <ChecklistIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsSpotlightOpen(true)}
            data-testid="add-part"
            sx={{ borderRadius: 1, px: 3, py: 1, fontWeight: 700, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)' }}
          >
            Add a part
          </Button>

          <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />

          <Tooltip title="Clear the canvas">
            <IconButton size="small" onClick={() => setClearAsked(true)} color="error" aria-label="Clear the canvas"><DeleteOutlineIcon /></IconButton>
          </Tooltip>
          <Tooltip title="Help">
            <IconButton size="small" onClick={() => setIsHelpOpen(true)} color="primary" aria-label="Help"><QuestionMarkIcon fontSize="small" /></IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ height: 20, my: 'auto' }} />

          {saveText && (
            <Typography sx={{ fontSize: '0.68rem', color: saveState === 'failed' ? 'error.main' : 'text.secondary' }} data-testid="canvas-save-state">
              {saveText}
            </Typography>
          )}

          <Button variant="text" endIcon={<KeyboardArrowRightIcon />} onClick={() => void handleNext()} sx={{ fontWeight: 700, color: 'text.primary' }}>
            Next
          </Button>
        </FloatingIsland>
      </Box>

      {saveFailure && (
        <Box sx={{ position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)', zIndex: 50, maxWidth: 560 }}>
          <Alert severity="error" variant="outlined" onClose={() => setSaveFailure(null)}>
            {saveFailure.message} {saveFailure.fix}
          </Alert>
        </Box>
      )}

      {/* The search that adds one part */}
      <SpotlightDialog open={isSpotlightOpen} onClose={() => setIsSpotlightOpen(false)} transitionDuration={200}>
        <Box sx={{ p: 2 }}>
          <TextField
            autoFocus
            fullWidth
            placeholder="Search the parts"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            inputProps={{ 'aria-label': 'Search the parts' }}
            InputProps={{ startAdornment: <SearchIcon sx={{ mr: 2, color: 'text.secondary' }} />, sx: { fontSize: '1.2rem', '& fieldset': { border: 'none' } } }}
          />
        </Box>
        <Divider />
        <DialogContent sx={{ p: 0, height: 400 }}>
          <ScrollBox sx={{ height: '100%' }}>
            {filteredLibrary.map((part) => (
              <Box
                key={part.moduleId}
                onClick={() => addModule(part.moduleId)}
                data-testid="spotlight-part"
                sx={{ p: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08) }, borderBottom: '1px solid', borderColor: 'divider' }}
              >
                <Box sx={{ p: 1, borderRadius: 1, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}><LayersIcon /></Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>{part.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{part.blurb ?? part.longDescription?.[0] ?? part.title}</Typography>
                </Box>
                <Box sx={{ ml: 'auto' }}>
                  <Chip label={model?.installed.includes(part.moduleId) ? 'On the canvas' : 'Add'} size="small" clickable />
                </Box>
              </Box>
            ))}
          </ScrollBox>
        </DialogContent>
      </SpotlightDialog>

      {/* Help */}
      <HelpDialog open={isHelpOpen} onClose={() => setIsHelpOpen(false)} PaperProps={{ sx: { borderRadius: 1, maxWidth: 520 } }}>
        <Box sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h6" fontWeight={800}>How the Blueprint canvas works</Typography>
            <IconButton onClick={() => setIsHelpOpen(false)} size="small" aria-label="Close the help"><CloseIcon /></IconButton>
          </Stack>
          <Stack spacing={2} sx={{ color: 'text.secondary' }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={700} color="text.primary">1. Outcomes</Typography>
              <Typography variant="body2">Tick plain statements in the panel. Cerulea installs the parts each statement needs, every dependency included, and places them as cards.</Typography>
            </Box>
            <Divider />
            <Box>
              <Typography variant="subtitle2" fontWeight={700} color="text.primary">2. The four links</Typography>
              <Typography variant="body2">A solid line means one part needs another. A solid arrow means records flow from one part to another. A dashed arrow means one part starts work in another. A dotted line means one part decides who may use another. Cerulea draws the first and the last. We choose the middle two from valid pairs.</Typography>
            </Box>
            <Divider />
            <Box>
              <Typography variant="subtitle2" fontWeight={700} color="text.primary">3. Cards</Typography>
              <Typography variant="body2">Click a card to read why it is here, what it contributes and what stops working after removal, and to set its parameters. Removing a card asks first.</Typography>
            </Box>
          </Stack>
          <Button fullWidth variant="contained" size="large" onClick={() => setIsHelpOpen(false)} sx={{ mt: 3, borderRadius: 2 }}>
            Understood
          </Button>
        </Box>
      </HelpDialog>

      {/* The inspector */}
      <Fade in={!!selectedCard || !!selectedLink} mountOnEnter unmountOnExit>
        <Box>
          {selectedCard && prepared && (
            <InspectorIsland title="This part" onClose={() => setSelectedNodeId(null)}>
              <CardInspector
                card={selectedCard}
                group={settings[selectedCard.moduleId]?.group ?? ''}
                config={settings[selectedCard.moduleId]?.config ?? {}}
                needs={selectedNeeds}
                onGroupChange={(group) => decide({ settings: { ...settings, [selectedCard.moduleId]: { ...settings[selectedCard.moduleId], group } } })}
                onConfigChange={(patch) => decide({ settings: { ...settings, [selectedCard.moduleId]: { ...settings[selectedCard.moduleId], config: { ...(settings[selectedCard.moduleId]?.config ?? {}), ...patch } } } })}
                onRemove={() => askRemoval(selectedCard.moduleId)}
                onFocus={focusModule}
              />
            </InspectorIsland>
          )}
          {selectedLink && prepared && (
            <InspectorIsland title="This link" onClose={() => setSelectedEdgeId(null)}>
              <LinkInspector link={selectedLink} titleById={prepared.titleById} onDelete={() => onDeleteLink(selectedLink)} />
            </InspectorIsland>
          )}
        </Box>
      </Fade>

      <RemovalDialog impact={removal} onKeep={() => setRemoval(null)} onRemove={confirmRemoval} />

      {/* Two kinds are valid between the two parts, so the person chooses. */}
      <Dialog open={linkChoice !== null} onClose={() => setLinkChoice(null)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Which link</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            The catalogue records both a feeds and a triggers relation between {prepared?.titleById[linkChoice?.from ?? ''] ?? ''} and {prepared?.titleById[linkChoice?.to ?? ''] ?? ''}.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<HubIcon />} onClick={() => chooseLinkKind('feeds')}>Feeds, records flow</Button>
            <Button variant="outlined" startIcon={<HubIcon />} onClick={() => chooseLinkKind('triggers')}>Triggers, work starts</Button>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setLinkChoice(null)}>Cancel</Button></DialogActions>
      </Dialog>

      {/* Clearing asks first. */}
      <Dialog open={clearAsked} onClose={() => setClearAsked(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Clear the canvas</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Every outcome, every part and every link leaves the canvas. Undo brings them back until the step closes.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearAsked(false)}>Keep them</Button>
          <Button color="error" variant="contained" onClick={clearCanvas} sx={{ boxShadow: 'none' }}>Clear</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={notice !== null} autoHideDuration={6000} onClose={() => setNotice(null)} message={notice ?? ''} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} />
    </Box>
  );
}

export default function Step1(props: { goPrev?: () => void; goNext?: () => void; projectId?: string | null }) {
  return (
    <ReactFlowProvider>
      <Step1Inner {...props} />
    </ReactFlowProvider>
  );
}
