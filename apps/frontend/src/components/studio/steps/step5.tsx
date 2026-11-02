'use client';

// apps/frontend/src/components/studio/steps/step5.tsx
// Deploy & UI, first sub-step: Interface.
// On entry Cerulea generates the application from the model through the
// frontend engine inside Cerulea APIs: a list screen, a detail screen, the add
// and change forms for every collection, and an approval screen where a
// workflow asks for one. The production drag and drop builder opens over that
// generated application. A person rearranges, hides, renames, binds controls to
// fields through the binding picker, adds components from the engine component
// set and adds screens. Every edit lands in the Views section of the Blueprint
// through Cerulea APIs and reads back on the next open.
// The preview frame shows the real application the engine renders. The
// accessibility check runs on the screens and blocks publication on a failure,
// naming what to fix in plain words.
// Without this screen a person would write an interface by hand.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import GridLayout, { type Layout, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import StepGuidance from '@/components/studio/StepGuidance';
import { useStudio } from '@/context/StudioContext';
import { StudioRouteError } from '@/lib/apiClient';
import {
  GROUP_WORDS,
  componentsByGroup,
  openingSentence,
  translationCoverage,
  widthWords,
} from '@/lib/interface/authoring';
import {
  DEFAULT_BREAKPOINT,
  addComponent,
  addScreen,
  applyGrid,
  breakpointNamed,
  bodyOf,
  findNode,
  gridFor,
  hiddenBody,
  kindWords,
  placementAt,
  removeNode,
  removeScreen,
  renameNode,
  renameScreen,
  sameSection,
  sentenceFor,
  setBinding,
  setProperty,
  setSpan,
  setThemeToken,
  setVisible,
  withScreen,
} from '@/lib/interface/edit';
import {
  type InterfaceWorkspace,
  checkSectionAccessibility,
  readInterfacePreview,
  readInterfaceWorkspace,
  resetInterfaceSection,
  saveInterfaceSection,
} from '@/lib/interface/studio';
import type {
  AccessibilityOutcome,
  Binding,
  BindingChoice,
  ComponentEntry,
  ComponentNode,
  EngineFault,
  InterfaceSection,
  PreviewOutcome,
  Screen,
  ThemeTokens,
} from '@/lib/interface/types';
import AccessibilityReport from './step5-AccessibilityReport';
import BindingPicker from './step5-BindingPicker';
import PreviewFrame from './step5-PreviewFrame';

const RGL = WidthProvider(GridLayout);

type Panel = 'canvas' | 'preview' | 'theme' | 'accessibility' | 'endpoints' | 'translation';

const PANELS: { id: Panel; label: string }[] = [
  { id: 'canvas', label: 'Canvas' },
  { id: 'preview', label: 'Preview' },
  { id: 'theme', label: 'Theme' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'endpoints', label: 'Endpoints' },
  { id: 'translation', label: 'Translation' },
];

const THEME_GROUPS: { group: keyof ThemeTokens; label: string }[] = [
  { group: 'colour_light', label: 'Colour, light theme' },
  { group: 'colour_dark', label: 'Colour, dark mode' },
  { group: 'type_scale', label: 'Type' },
  { group: 'spacing', label: 'Spacing' },
];

/** The time the builder waits after the last edit before it saves. */
export const AUTOSAVE_DELAY_MS = 1500;

export type Step5Props = {
  goPrev?: () => void;
  goNext?: () => void;
  projectId: string | null;
  /** True when the sub-step sits inside Deploy & UI, which owns the dock. */
  embedded?: boolean;
  /** Called after every save, with the Blueprint version the save produced. */
  onSaved?: (version: number) => void;
};

/** Writes one binding as the words a person reads. */
export function bindingWords(binding: Binding | undefined): string {
  if (binding === undefined) return 'Bound to nothing yet';
  const held = binding as Record<string, unknown>;
  switch (binding.kind) {
    case 'Collection':
      return `Collection ${String(held.collection)}`;
    case 'Field':
      return `Field ${String(held.collection)}.${String(held.field)}`;
    case 'Parameter':
      return `Parameter ${String(held.action)}.${String(held.parameter)}`;
    case 'Action':
      return `Action ${String(held.action)}`;
    case 'Workflow':
      return `Workflow ${String(held.workflow)}`;
    case 'View':
      return `View ${String(held.view)}`;
    case 'Event':
      return `Event ${String(held.event)}`;
    default:
      return String(binding.kind);
  }
}

/**
 * The corrections the builder finds before the engine sees the section.
 * A component that reads the model needs a binding before it saves.
 */
export function localFaults(
  section: InterfaceSection,
  catalogue: readonly ComponentEntry[],
): EngineFault[] {
  const needs = new Map(catalogue.map((entry) => [entry.kind, entry.binds] as const));
  const faults: EngineFault[] = [];
  for (const screen of section.screens) {
    for (const node of bodyOf(screen)) {
      const binds = needs.get(node.component) ?? 'nothing';
      if (binds !== 'nothing' && node.binding === undefined) {
        faults.push({
          area: 'binding',
          screen: screen.id,
          component: node.id,
          problem: `The ${kindWords(node.component).toLowerCase()} reads ${binds === 'action' ? 'an' : 'a'} ${binds} and holds no binding.`,
          fix: 'Choose a binding in the inspector, or remove the component.',
        });
      }
    }
  }
  return faults;
}

/** The failure shape every panel reads. */
function failureOf(error: unknown, fallbackFix: string): { message: string; fix: string } {
  if (error instanceof StudioRouteError) {
    return { message: error.message.replace(` ${error.fix}`, ''), fix: error.fix };
  }
  return { message: error instanceof Error ? error.message : 'Cerulea did not answer.', fix: fallbackFix };
}

/** Reads the project identifier the shell, the context or the browser holds. */
function useResolvedProjectId(projectId: string | null): string | null {
  const { projectId: contextId } = useStudio();
  const [held, setHeld] = useState<string | null>(projectId ?? contextId ?? null);
  useEffect(() => {
    if (projectId) setHeld(projectId);
    else if (contextId) setHeld(contextId);
    else if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('cerulea.projectId');
      if (stored) setHeld(stored);
    }
  }, [projectId, contextId]);
  return held;
}

/** Keeps the arrow keys inside a text field from moving the shell between steps. */
function holdArrowKeys(event: React.KeyboardEvent): void {
  const target = event.target as HTMLElement | null;
  const typing =
    target !== null &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
  if (typing && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) event.stopPropagation();
}

export default function Step5({ goPrev, goNext, projectId, embedded = false, onSaved }: Step5Props) {
  const resolvedId = useResolvedProjectId(projectId);
  const [workspace, setWorkspace] = useState<InterfaceWorkspace | null>(null);
  const [failure, setFailure] = useState<{ message: string; fix: string } | null>(null);
  const [section, setSection] = useState<InterfaceSection | null>(null);
  const [savedSection, setSavedSection] = useState<InterfaceSection | null>(null);
  const [version, setVersion] = useState<number>(0);
  const [engineFaults, setEngineFaults] = useState<EngineFault[]>([]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle');
  const [chosenScreenId, setChosenScreenId] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [breakpointId, setBreakpointId] = useState(DEFAULT_BREAKPOINT);
  const [panel, setPanel] = useState<Panel>('canvas');
  const [role, setRole] = useState('');
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [preview, setPreview] = useState<PreviewOutcome | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [accessibility, setAccessibility] = useState<AccessibilityOutcome | null>(null);
  const [checking, setChecking] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteGroup, setPaletteGroup] = useState('all');
  const [toast, setToast] = useState<{ open: boolean; text: string; kind: 'success' | 'error' | 'info' }>({
    open: false,
    text: '',
    kind: 'info',
  });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);

  const load = useCallback(async () => {
    if (!resolvedId) return;
    setWorkspace(null);
    setFailure(null);
    try {
      const held = await readInterfaceWorkspace(resolvedId);
      setWorkspace(held);
      setSection(held.generated.section);
      setSavedSection(held.generated.section);
      setVersion(held.version);
      setEngineFaults(held.generated.faults);
      setChosenScreenId((current) =>
        held.generated.section.screens.some((screen) => screen.id === current)
          ? current
          : (held.generated.section.screens[0]?.id ?? ''),
      );
      setRole((current) => (current.length > 0 ? current : (held.roles[0]?.role ?? '')));
      setAccessibility(null);
      setPreview(null);
    } catch (error) {
      setFailure(failureOf(error, 'Open the Interface sub-step again once Cerulea APIs answers.'));
    }
  }, [resolvedId]);

  useEffect(() => {
    void load();
  }, [load]);

  const screen = useMemo(
    () => section?.screens.find((held) => held.id === chosenScreenId) ?? section?.screens[0],
    [section, chosenScreenId],
  );
  const breakpoint = useMemo(
    () => (section ? breakpointNamed(section, breakpointId) : null),
    [section, breakpointId],
  );
  const catalogue = workspace?.catalogue.components ?? [];
  const roleNames = useMemo(
    () => Object.fromEntries((workspace?.roles ?? []).map((held) => [held.role, held.name])),
    [workspace],
  );
  const dirty = section !== null && savedSection !== null && !sameSection(section, savedSection);
  const faults = useMemo(
    () => (section ? [...localFaults(section, catalogue), ...engineFaults] : []),
    [section, catalogue, engineFaults],
  );
  const blocking = useMemo(() => (section ? localFaults(section, catalogue) : []), [section, catalogue]);

  /** Applies one change to the working section and clears the engine faults it may have fixed. */
  const change = useCallback((next: (held: InterfaceSection) => InterfaceSection) => {
    setSection((held) => (held === null ? held : next(held)));
    setEngineFaults([]);
  }, []);

  const changeScreen = useCallback(
    (next: (held: Screen) => Screen) => {
      if (!screen) return;
      change((held) => withScreen(held, next(screen)));
    },
    [screen, change],
  );

  const save = useCallback(async () => {
    if (!resolvedId || !section || saving.current) return;
    if (blocking.length > 0) {
      setSaveState('failed');
      return;
    }
    saving.current = true;
    setSaveState('saving');
    try {
      const outcome = await saveInterfaceSection(resolvedId, { section, expectedVersion: version });
      setSavedSection(section);
      setVersion(outcome.version);
      setEngineFaults([]);
      setSaveState('saved');
      setAccessibility(null);
      onSaved?.(outcome.version);
    } catch (error) {
      setSaveState('failed');
      const held = failureOf(error, 'Save again. Report the problem to the Cerulea operator when it repeats.');
      setToast({ open: true, text: `${held.message} ${held.fix}`, kind: 'error' });
      if (error instanceof StudioRouteError && error.code === 'interface.version_moved') {
        setFailure(held);
      }
      if (error instanceof StudioRouteError && error.code === 'interface.faults') {
        const details = (error as { details?: { faults?: unknown } }).details;
        if (Array.isArray(details?.faults)) setEngineFaults(details.faults as EngineFault[]);
      }
    } finally {
      saving.current = false;
    }
  }, [resolvedId, section, version, blocking.length, onSaved]);

  // Every edit saves on its own after a short pause, so the Blueprint holds what the canvas shows.
  useEffect(() => {
    if (!dirty || blocking.length > 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [dirty, blocking.length, section, save]);

  const regenerate = useCallback(async () => {
    if (!resolvedId) return;
    try {
      const outcome = await resetInterfaceSection(resolvedId);
      setToast({ open: true, text: `Cerulea generated the screens from the model again as version ${outcome.version}.`, kind: 'success' });
      onSaved?.(outcome.version);
      await load();
    } catch (error) {
      const held = failureOf(error, 'Generate again once Cerulea APIs answers.');
      setToast({ open: true, text: `${held.message} ${held.fix}`, kind: 'error' });
    }
  }, [resolvedId, load, onSaved]);

  const loadPreview = useCallback(async () => {
    if (!resolvedId || !section || role === '') return;
    setPreviewBusy(true);
    try {
      setPreview(
        await readInterfacePreview(resolvedId, {
          role,
          breakpoint: breakpointId,
          mode,
          screen: screen?.id,
          section,
        }),
      );
    } catch (error) {
      setFailure(failureOf(error, 'Choose a role the model declares, then read the preview again.'));
    } finally {
      setPreviewBusy(false);
    }
  }, [resolvedId, section, role, breakpointId, mode, screen?.id]);

  useEffect(() => {
    if (panel === 'preview') void loadPreview();
    // The preview reads again when the panel opens or its choices change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, role, breakpointId, mode, screen?.id]);

  const runAccessibility = useCallback(async () => {
    if (!resolvedId || !section) return;
    setChecking(true);
    try {
      setAccessibility(await checkSectionAccessibility(resolvedId, section));
    } catch (error) {
      setFailure(failureOf(error, 'Run the accessibility check again.'));
    } finally {
      setChecking(false);
    }
  }, [resolvedId, section]);

  useEffect(() => {
    if (panel === 'accessibility' && accessibility === null) void runAccessibility();
  }, [panel, accessibility, runAccessibility]);

  const palette = useMemo(() => {
    const query = paletteQuery.trim().toLowerCase();
    return componentsByGroup(catalogue)
      .filter((group) => paletteGroup === 'all' || group.group === paletteGroup)
      .flatMap((group) => group.entries)
      .filter((entry) =>
        query.length === 0
          ? true
          : `${entry.kind} ${entry.summary} ${entry.group}`.toLowerCase().includes(query),
      );
  }, [catalogue, paletteQuery, paletteGroup]);

  const onDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination || !section || !screen) return;
      if (source.droppableId !== 'palette' || destination.droppableId !== 'canvas') return;
      const entry = catalogue.find((held) => held.kind === draggableId);
      if (!entry) return;
      const placed = addComponent(section, screen, entry, undefined, kindWords(entry.kind));
      setSection(placed.section);
      setEngineFaults([]);
      setSelectedId(placed.nodeId);
      setPanel('canvas');
    },
    [section, screen, catalogue],
  );

  const onLayoutChange = useCallback(
    (layout: Layout[]) => {
      if (!screen || !breakpoint || !section) return;
      const next = applyGrid(screen, breakpoint, layout);
      const rewritten = withScreen(section, next);
      if (sameSection(rewritten, section)) return;
      setSection(rewritten);
      setEngineFaults([]);
    },
    [screen, breakpoint, section],
  );

  const selected = screen && selectedId ? findNode(screen, selectedId) : undefined;
  const selectedEntry = selected ? catalogue.find((held) => held.kind === selected.component) : undefined;
  const screenRole = screen?.roles.includes(role) ? role : (screen?.roles[0] ?? role);

  const addPage = () => {
    if (!section) return;
    const name = `Screen ${section.screens.length + 1}`;
    const grown = addScreen(section, name);
    setSection(grown.section);
    setEngineFaults([]);
    setChosenScreenId(grown.screen.id);
    setSelectedId(null);
  };

  const deletePage = () => {
    if (!section || !screen || section.screens.length <= 1) return;
    const next = removeScreen(section, screen.id);
    setSection(next);
    setEngineFaults([]);
    setChosenScreenId(next.screens[0]?.id ?? '');
    setSelectedId(null);
  };

  if (!resolvedId) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="info">
          <AlertTitle>Open a project first</AlertTitle>
          The Interface sub-step generates the application from a saved project. Finish Step 1
          Foundation, and the screens appear here.
        </Alert>
      </Box>
    );
  }

  if (failure !== null && workspace === null) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" data-testid="step5-failure">
          <AlertTitle>Cerulea generated no application</AlertTitle>
          {failure.message} {failure.fix}
        </Alert>
        <Button sx={{ mt: 2 }} variant="outlined" onClick={() => void load()}>
          Read again
        </Button>
      </Box>
    );
  }

  if (workspace === null || section === null || !screen || !breakpoint) {
    return (
      <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 4 }} data-testid="step5-reading">
        <CircularProgress size={22} />
        <Typography>Cerulea is generating the application from the model.</Typography>
      </Stack>
    );
  }

  const cells = gridFor(screen, breakpoint);
  const hidden = hiddenBody(screen, breakpoint);
  const saveWords =
    saveState === 'saving'
      ? 'Saving into the Blueprint'
      : blocking.length > 0
        ? 'Waiting for a binding before the save'
        : dirty
          ? 'Changes wait to save'
          : saveState === 'failed'
            ? 'The last save failed'
            : `Saved as Blueprint version ${version}`;

  return (
    <Box sx={{ minHeight: embedded ? 'auto' : 'calc(100vh - 64px)', px: 1, pb: embedded ? 2 : 0 }} onKeyDown={holdArrowKeys} data-testid="step5-interface">
      {!embedded && (
        <StepGuidance
          stepKey="step5"
          title="Interface"
          subtitle="Step 6 of 6, Interface"
          description="Cerulea generated a working application from the model. Rearrange, hide, rename and bind its screens, or add components from the Cerulea component set. Every change saves into the Blueprint."
          steps={[
            { first: 'Open a screen', next: 'Each collection has a list, a detail and the add and change forms. A workflow with an approval has an approval screen.' },
            { first: 'Drag a component onto the canvas', next: 'The component set holds layout, data, input, Blockchain, chrome and feedback components. Choose a binding in the inspector.' },
            { first: 'Check the application', next: 'The preview shows what each role sees. The accessibility check names what to fix before publication.' },
          ]}
          tip="The screens come from the data model. A change in Data schema reaches the generated screens on the next open."
        />
      )}

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          {!embedded && (
            <IconButton onClick={goPrev} aria-label="Back">
              <ArrowBackIcon />
            </IconButton>
          )}
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900, lineHeight: 1.1 }}>
              Design the interface
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {openingSentence(section)} Drag components from the left panel onto the canvas. Select a component to edit its name, its place and its binding on the right.
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" color="text.secondary" data-testid="step5-save-state">
            {saveWords}
          </Typography>
          <Tooltip title="Throw the edits away and generate the screens from the model again">
            <Button variant="text" startIcon={<RefreshIcon />} onClick={() => void regenerate()} sx={{ borderRadius: 1 }}>
              Regenerate
            </Button>
          </Tooltip>
          <Button variant="outlined" startIcon={<SaveIcon />} onClick={() => void save()} disabled={!dirty || saveState === 'saving'} sx={{ borderRadius: 1 }}>
            Save
          </Button>
          {!embedded && (
            <Button variant="contained" onClick={goNext} sx={{ borderRadius: 1 }} disabled={!goNext}>
              Next
            </Button>
          )}
        </Stack>
      </Stack>

      {failure !== null && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFailure(null)}>
          {failure.message} {failure.fix}
          {failure.message.includes('moved to version') && (
            <Button size="small" sx={{ ml: 1 }} onClick={() => void load()}>
              Read the newest version
            </Button>
          )}
        </Alert>
      )}

      {workspace.generated.omissions.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }} data-testid="step5-omissions">
          <AlertTitle>What Cerulea left out</AlertTitle>
          {workspace.generated.omissions.map((held) => (
            <Typography key={held} variant="body2">
              {held}
            </Typography>
          ))}
        </Alert>
      )}

      {faults.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} data-testid="step5-faults">
          <AlertTitle>Corrections to make before the screens save</AlertTitle>
          {faults.map((fault, position) => (
            <Typography key={`${fault.screen}-${fault.component}-${position}`} variant="body2">
              {sentenceFor(section, section.screens.find((held) => held.id === fault.screen)?.title_key)} · {fault.component}. {fault.problem} {fault.fix}
            </Typography>
          ))}
        </Alert>
      )}

      <Tabs value={panel} onChange={(_event, next: Panel) => setPanel(next)} variant="scrollable" sx={{ mb: 1.5, minHeight: 36, '& .MuiTab-root': { minHeight: 36, textTransform: 'none' } }} aria-label="Interface panels">
        {PANELS.map((entry) => (
          <Tab key={entry.id} value={entry.id} label={entry.label} />
        ))}
      </Tabs>

      {panel === 'canvas' && (
        <DragDropContext onDragEnd={onDragEnd}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch' }}>
            {/* Left: the component set */}
            <Paper sx={{ width: 240, minWidth: 240, borderRadius: 1, p: 1.5, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }} data-testid="step5-palette">
              <Stack spacing={1.2}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <SearchIcon sx={{ opacity: 0.7 }} />
                  <TextField value={paletteQuery} onChange={(event) => setPaletteQuery(event.target.value)} placeholder="Search" size="small" fullWidth inputProps={{ 'aria-label': 'Search the component set' }} />
                </Stack>
                <Select size="small" value={paletteGroup} onChange={(event) => setPaletteGroup(String(event.target.value))} inputProps={{ 'aria-label': 'Component group' }}>
                  <MenuItem value="all">Every group</MenuItem>
                  {componentsByGroup(catalogue).map((group) => (
                    <MenuItem key={group.group} value={group.group}>
                      {group.label}
                    </MenuItem>
                  ))}
                </Select>
                <Divider sx={{ opacity: 0.25 }} />
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Drag onto the canvas ({palette.length})
                </Typography>
                <Droppable droppableId="palette" isDropDisabled={true}>
                  {(provided) => (
                    <Box ref={provided.innerRef} {...provided.droppableProps} sx={{ maxHeight: '64vh', overflow: 'auto', pr: 0.5 }}>
                      <Stack spacing={1}>
                        {palette.map((entry, index) => (
                          <Draggable key={entry.kind} draggableId={entry.kind} index={index}>
                            {(dragged, snapshot) => (
                              <Paper
                                ref={dragged.innerRef}
                                {...dragged.draggableProps}
                                {...dragged.dragHandleProps}
                                sx={{ p: 1.2, borderRadius: 2, border: '1px solid', borderColor: snapshot.isDragging ? 'primary.main' : 'divider', cursor: 'grab' }}
                                data-testid={`palette-${entry.kind}`}
                              >
                                <Stack direction="row" alignItems="center" justifyContent="space-between">
                                  <Typography sx={{ fontWeight: 800, fontSize: 13 }}>{kindWords(entry.kind)}</Typography>
                                  <Chip size="small" label={GROUP_WORDS[entry.group] ?? entry.group} />
                                </Stack>
                                <Typography variant="caption" color="text.secondary">
                                  {entry.summary}
                                </Typography>
                                {entry.binds !== 'nothing' && (
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    Reads {entry.binds === 'action' ? 'an' : 'a'} {entry.binds}.
                                  </Typography>
                                )}
                              </Paper>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </Stack>
                    </Box>
                  )}
                </Droppable>
              </Stack>
            </Paper>

            {/* Centre: the canvas over the generated screen */}
            <Paper sx={{ flex: 1, borderRadius: 1, p: 1.5, border: '1px solid', borderColor: 'divider', overflow: 'hidden', minHeight: '70vh', minWidth: 0 }} data-testid="step5-canvas">
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                  <Typography sx={{ fontWeight: 900 }}>Canvas</Typography>
                  <Select size="small" value={screen.id} onChange={(event) => { setChosenScreenId(String(event.target.value)); setSelectedId(null); }} inputProps={{ 'aria-label': 'Screen' }} sx={{ minWidth: 220 }}>
                    {section.screens.map((held) => (
                      <MenuItem key={held.id} value={held.id}>
                        {sentenceFor(section, held.title_key)} · {held.kind}
                      </MenuItem>
                    ))}
                  </Select>
                  <ToggleButtonGroup size="small" exclusive value={breakpointId} onChange={(_event, next: string | null) => next && setBreakpointId(next)} aria-label="Width">
                    {section.breakpoints.map((held) => (
                      <ToggleButton key={held.id} value={held.id} sx={{ textTransform: 'none' }}>
                        {widthWords(held.id)}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addPage} sx={{ borderRadius: 1 }}>
                    Add Page
                  </Button>
                  <TextField size="small" value={sentenceFor(section, screen.title_key)} onChange={(event) => change((held) => renameScreen(held, screen, event.target.value))} sx={{ width: 200 }} inputProps={{ 'aria-label': 'Screen title' }} />
                  <Tooltip title={section.screens.length <= 1 ? 'An application keeps at least one screen' : 'Delete this screen'}>
                    <span>
                      <IconButton onClick={deletePage} disabled={section.screens.length <= 1} aria-label="Delete this screen">
                        <DeleteIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                {screen.route} · opens for {screen.roles.map((held) => roleNames[held] ?? held).join(', ')} · {widthWords(breakpoint.id)} shows {breakpoint.columns} columns
              </Typography>
              <Divider sx={{ opacity: 0.18, mb: 1.5 }} />

              <Droppable droppableId="canvas">
                {(provided, snapshot) => (
                  <Box
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    sx={{ minHeight: 'calc(70vh - 120px)', borderRadius: 1, border: '1px dashed', borderColor: snapshot.isDraggingOver ? 'primary.main' : 'divider', bgcolor: snapshot.isDraggingOver ? 'action.hover' : 'transparent', overflow: 'auto', p: 1.5 }}
                  >
                    {cells.length === 0 && (
                      <Stack alignItems="center" justifyContent="center" sx={{ py: 6, opacity: 0.75 }} spacing={1}>
                        <Typography sx={{ fontWeight: 900 }}>This screen shows nothing at this width</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Drop a component here, or show one of the hidden components below.
                        </Typography>
                      </Stack>
                    )}
                    <Box sx={{ width: '100%' }}>
                      <RGL className="layout" layout={cells} cols={breakpoint.columns} rowHeight={26} onLayoutChange={onLayoutChange} draggableHandle=".cerulea-drag-handle" compactType="vertical" preventCollision={false}>
                        {cells.map((cell) => {
                          const node = findNode(screen, cell.i) as ComponentNode;
                          const chosen = node.id === selectedId;
                          return (
                            <Box key={cell.i} sx={{ height: '100%' }}>
                              <Paper
                                onClick={() => setSelectedId(node.id)}
                                data-testid={`canvas-${node.id}`}
                                sx={{ height: '100%', borderRadius: 1, p: 1.2, border: '1px solid', borderColor: chosen ? 'primary.main' : 'divider', bgcolor: chosen ? 'action.selected' : 'background.paper', overflow: 'hidden', position: 'relative' }}
                              >
                                <Box className="cerulea-drag-handle" sx={{ position: 'absolute', left: 10, top: 6, fontSize: 11, opacity: 0.75, cursor: 'move', userSelect: 'none' }}>
                                  {kindWords(node.component)}
                                </Box>
                                <Box sx={{ pt: 2.5 }}>
                                  <Typography sx={{ fontWeight: 700, fontSize: 13 }} noWrap>
                                    {sentenceFor(section, node.label_key) || kindWords(node.component)}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" display="block" noWrap>
                                    {bindingWords(node.binding)}
                                  </Typography>
                                  {node.children.length > 0 && (
                                    <Typography variant="caption" color="text.secondary">
                                      {node.children.length} component{node.children.length === 1 ? '' : 's'} inside
                                    </Typography>
                                  )}
                                </Box>
                              </Paper>
                            </Box>
                          );
                        })}
                      </RGL>
                    </Box>
                    {provided.placeholder}
                  </Box>
                )}
              </Droppable>

              {hidden.length > 0 && (
                <Box sx={{ mt: 1.5 }} data-testid="step5-hidden">
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    Hidden at {widthWords(breakpoint.id).toLowerCase()}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                    {hidden.map((node) => (
                      <Chip key={node.id} label={sentenceFor(section, node.label_key) || kindWords(node.component)} onClick={() => setSelectedId(node.id)} onDelete={() => changeScreen((held) => setVisible(held, node.id, breakpoint, true))} deleteIcon={<AddIcon />} variant="outlined" />
                    ))}
                  </Stack>
                </Box>
              )}
            </Paper>

            {/* Right: the inspector */}
            <Paper sx={{ width: 380, minWidth: 380, borderRadius: 1, p: 1.5, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }} data-testid="step5-inspector">
              <Typography sx={{ fontWeight: 900, mb: 1 }}>Inspector</Typography>
              <Divider sx={{ opacity: 0.18, mb: 1.5 }} />
              {!selected ? (
                <Stack spacing={1}>
                  <Typography variant="body2" color="text.secondary">
                    Select a component on the canvas to edit its name, its place at each width, its binding and its properties.
                  </Typography>
                  <Divider sx={{ opacity: 0.18 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                    This screen
                  </Typography>
                  <Typography variant="body2">
                    {sentenceFor(section, screen.title_key)} is a {screen.kind} screen at {screen.route}.
                    {screen.collection ? ` It shows the ${screen.collection} collection.` : ''}
                    {screen.offline_capture ? ' It captures records without a connection.' : ' It reads records when a connection is open.'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {bodyOf(screen).length} components sit in its main band. Hidden ones appear under the canvas.
                  </Typography>
                </Stack>
              ) : (
                <Stack spacing={1.4} sx={{ maxHeight: '66vh', overflow: 'auto', pr: 0.5 }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography sx={{ fontWeight: 900 }}>{kindWords(selected.component)}</Typography>
                    <Button size="small" variant="outlined" color="error" onClick={() => { changeScreen((held) => removeNode(held, selected.id)); setSelectedId(null); }} startIcon={<DeleteIcon />} sx={{ borderRadius: 1 }}>
                      Delete
                    </Button>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {selectedEntry?.summary ?? ''}
                  </Typography>
                  <TextField label="Name" size="small" fullWidth value={sentenceFor(section, selected.label_key)} onChange={(event) => change((held) => renameNode(held, screen, selected.id, event.target.value))} helperText="The words a person reads over this component. A translator works on the file beside the application." />
                  <Divider sx={{ opacity: 0.18 }} />
                  <Typography sx={{ fontWeight: 800 }}>Place at {widthWords(breakpoint.id).toLowerCase()}</Typography>
                  <FormControlLabel control={<Switch checked={placementAt(selected, breakpoint).visible} onChange={(event) => changeScreen((held) => setVisible(held, selected.id, breakpoint, event.target.checked))} />} label="Shown at this width" />
                  <TextField label={`Columns of ${breakpoint.columns}`} size="small" type="number" value={placementAt(selected, breakpoint).span} onChange={(event) => changeScreen((held) => setSpan(held, selected.id, breakpoint, Number(event.target.value)))} inputProps={{ min: 1, max: breakpoint.columns }} helperText="The width of the band this component covers. Drag its right edge on the canvas for the same change." />
                  <Divider sx={{ opacity: 0.18 }} />
                  <Typography sx={{ fontWeight: 800 }}>Binding</Typography>
                  <Typography variant="body2" data-testid="inspector-binding">{bindingWords(selected.binding)}</Typography>
                  {selectedEntry && selectedEntry.binds !== 'nothing' && (
                    <>
                      {screen.roles.length > 1 && (
                        <Select size="small" value={screenRole} onChange={(event) => setRole(String(event.target.value))} inputProps={{ 'aria-label': 'Role the binding is checked for' }}>
                          {screen.roles.map((held) => (
                            <MenuItem key={held} value={held}>
                              {roleNames[held] ?? held}
                            </MenuItem>
                          ))}
                        </Select>
                      )}
                      <BindingPicker projectId={resolvedId} role={screenRole} roleName={roleNames[screenRole] ?? screenRole} component={selected.component} binds={selectedEntry.binds} onChoose={(choice: BindingChoice) => changeScreen((held) => setBinding(held, selected.id, choice.binding as Binding))} />
                    </>
                  )}
                  <Divider sx={{ opacity: 0.18 }} />
                  <Typography sx={{ fontWeight: 800 }}>Properties</Typography>
                  {selected.properties.length === 0 && (
                    <Typography variant="caption" color="text.secondary">
                      This component carries no property beyond its binding.
                    </Typography>
                  )}
                  {selected.properties.map((property) => (
                    <TextField key={property.name} label={kindWords(property.name)} size="small" fullWidth value={property.value} onChange={(event) => changeScreen((held) => setProperty(held, selected.id, property.name, event.target.value))} />
                  ))}
                  {(selectedEntry?.properties ?? []).filter((name) => !selected.properties.some((held) => held.name === name)).map((name) => (
                    <Button key={name} size="small" variant="text" onClick={() => changeScreen((held) => setProperty(held, selected.id, name, 'true'))} sx={{ justifyContent: 'flex-start', textTransform: 'none' }}>
                      Add {kindWords(name).toLowerCase()}
                    </Button>
                  ))}
                </Stack>
              )}
            </Paper>
          </Box>
        </DragDropContext>
      )}

      {panel === 'preview' && (
        <Box data-testid="panel-preview">
          <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            <TextField select size="small" label="Role" value={role} onChange={(event) => setRole(event.target.value)} sx={{ minWidth: 220 }} helperText="The preview shows what a person holding this role reaches.">
              {workspace.roles.map((held) => (
                <MenuItem key={held.role} value={held.role}>
                  {held.name} · {held.screens} screens
                </MenuItem>
              ))}
            </TextField>
            <TextField select size="small" label="Width" value={breakpointId} onChange={(event) => setBreakpointId(event.target.value)} sx={{ minWidth: 160 }}>
              {section.breakpoints.map((held) => (
                <MenuItem key={held.id} value={held.id}>
                  {widthWords(held.id)}
                </MenuItem>
              ))}
            </TextField>
            <TextField select size="small" label="Mode" value={mode} onChange={(event) => setMode(event.target.value as 'light' | 'dark')} sx={{ minWidth: 160 }}>
              <MenuItem value="light">Light theme</MenuItem>
              <MenuItem value="dark">Dark mode</MenuItem>
            </TextField>
            <Button onClick={() => void loadPreview()} disabled={previewBusy}>
              Read the preview again
            </Button>
          </Stack>
          {workspace.roles.length === 0 ? (
            <Alert severity="info">The model declares no role yet. Add a role in Step 3 Data schema, and the preview shows what the role reaches.</Alert>
          ) : preview === null || previewBusy ? (
            <CircularProgress size={22} aria-label="Cerulea is rendering the preview" />
          ) : (
            <PreviewFrame preview={preview} screen={screen.id} />
          )}
        </Box>
      )}

      {panel === 'theme' && (
        <Box data-testid="panel-theme">
          <Typography variant="body2" sx={{ mb: 1 }}>
            One token set drives every screen. A change to a value reaches every screen at once and saves with the rest.
          </Typography>
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            {THEME_GROUPS.map(({ group, label }) => (
              <Paper key={group} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
                  {label}
                </Typography>
                <Stack spacing={1}>
                  {section.theme[group].map((token) => (
                    <TextField key={token.name} size="small" label={kindWords(token.name)} value={token.value} onChange={(event) => change((held) => setThemeToken(held, group, token.name, event.target.value))} />
                  ))}
                </Stack>
              </Paper>
            ))}
          </Box>
        </Box>
      )}

      {panel === 'accessibility' && (
        <Box data-testid="panel-accessibility">
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
            <Button variant="outlined" onClick={() => void runAccessibility()} disabled={checking}>
              Check again
            </Button>
            <Typography variant="body2" color="text.secondary">
              Cerulea checks contrast, focus order, labelling, keyboard reach and target size against the Web Content Accessibility Guidelines version 2.2 level AA. A failure blocks publication.
            </Typography>
          </Stack>
          {accessibility === null || checking ? <CircularProgress size={22} aria-label="Cerulea is checking the screens" /> : <AccessibilityReport outcome={accessibility} />}
        </Box>
      )}

      {panel === 'endpoints' && (
        <Box data-testid="panel-endpoints">
          <Typography variant="body2" sx={{ mb: 1 }}>
            Another system reaches the deployment through these addresses. Each one answers with the records the caller may read, and a call outside the permission matrix meets a refusal.
          </Typography>
          {workspace.endpoints.length === 0 ? (
            <Alert severity="info">{workspace.endpointsNote.length > 0 ? workspace.endpointsNote : 'This deployment publishes no endpoint yet. Add an action or a view in Step 3 Data schema, and the endpoints appear here.'}</Alert>
          ) : (
            <List dense aria-label="Endpoints">
              {workspace.endpoints.map((held) => (
                <ListItem key={`${held.method} ${held.path}`} disableGutters>
                  <ListItemText primary={`${held.method} ${held.path}`} secondary={`Takes ${held.parameters.length === 0 ? 'no value' : held.parameters.join(', ')}. Answers with ${held.response}. Reached by ${held.visibility.trim().length === 0 ? 'every role' : held.visibility.split(',').map((entry) => roleNames[entry.trim()] ?? entry.trim()).join(', ')}.`} />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      )}

      {panel === 'translation' && (
        <Box data-testid="panel-translation">
          <Typography variant="body2" sx={{ mb: 1 }}>
            Every sentence a screen shows sits in the file beside the application. A translator works on the file and touches no screen.
          </Typography>
          <List dense aria-label="Translation files">
            {translationCoverage(section).map((held) => (
              <ListItemText key={held.language} primary={`strings.${held.language}.json`} secondary={held.missing === 0 ? `${held.held} sentences. Every key the screens name carries words.` : `${held.held} sentences. ${held.missing} keys still need this language.`} />
            ))}
          </List>
        </Box>
      )}

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast((held) => ({ ...held, open: false }))}>
        <Alert severity={toast.kind} variant="filled" sx={{ width: '100%' }}>
          {toast.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}
