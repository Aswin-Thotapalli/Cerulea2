'use client';

// apps/frontend/src/components/studio/interface/Step5Interface.tsx
// Step 5 Interface. The generated application and its authoring.
// Cerulea generates a complete working application from the model on entry.
// A person opens a finished thing and edits it. This screen shows the screens
// the engine generated, the endpoints beside them, the component set, the
// bindings each role may legally reach, the theme tokens, the preview as any
// role and the accessibility gate.
// Every read passes through a Studio route, so the browser holds no access
// token and no Blueprint document.
// Without this screen a person would write an interface by hand.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';

import { StudioRouteError } from '@/lib/apiClient';
import {
  describeScreen,
  componentCount,
  openingSentence,
  screensOfCollection,
  sentenceFor,
  collectionsShown,
  translationCoverage,
  widthWords,
} from '@/lib/interface/authoring';
import {
  type InterfaceWorkspace,
  markInterfaceAuthored,
  readInterfaceAccessibility,
  readInterfacePreview,
  readInterfaceWorkspace,
} from '@/lib/interface/studio';
import type { AccessibilityOutcome, ComponentEntry, PreviewOutcome } from '@/lib/interface/types';
import AccessibilityReport from './AccessibilityReport';
import BindingPicker from './BindingPicker';
import ComponentPalette from './ComponentPalette';
import PreviewFrame from './PreviewFrame';

export type Step5InterfaceProps = {
  projectId: string;
  /** Called once the person marks the application checked. */
  onContinue?: () => void;
};

type Panel =
  | 'screens'
  | 'endpoints'
  | 'components'
  | 'theme'
  | 'preview'
  | 'accessibility'
  | 'translation';

const PANELS: { id: Panel; label: string }[] = [
  { id: 'screens', label: 'Screens' },
  { id: 'endpoints', label: 'Endpoints' },
  { id: 'components', label: 'Components' },
  { id: 'theme', label: 'Theme' },
  { id: 'preview', label: 'Preview' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'translation', label: 'Translation' },
];

/**
 * The words a person reads for who reaches an endpoint.
 * The manifest names the roles by their identifiers. The person reads the names.
 */
export function reachedBy(visibility: string, roleNames: Readonly<Record<string, string>>): string {
  if (visibility.trim().length === 0 || visibility === 'every role') return 'every role';
  return visibility
    .split(',')
    .map((role) => role.trim())
    .filter((role) => role.length > 0)
    .map((role) => roleNames[role] ?? role)
    .join(', ');
}

/** The failure shape every panel reads. */
function failureOf(error: unknown, fallbackFix: string): { message: string; fix: string } {
  if (error instanceof StudioRouteError) {
    return { message: error.message.replace(` ${error.fix}`, ''), fix: error.fix };
  }
  return { message: 'Cerulea did not answer.', fix: fallbackFix };
}

/** Reports whether an answer carries everything Step 5 draws. */
export function readableWorkspace(held: unknown): held is InterfaceWorkspace {
  if (held === null || typeof held !== 'object') return false;
  const answer = held as Partial<InterfaceWorkspace>;
  return (
    Array.isArray(answer.generated?.section?.screens) &&
    Array.isArray(answer.catalogue?.components) &&
    Array.isArray(answer.roles) &&
    Array.isArray(answer.endpoints)
  );
}

export default function Step5Interface({ projectId, onContinue }: Step5InterfaceProps) {
  const [panel, setPanel] = useState<Panel>('screens');
  const [workspace, setWorkspace] = useState<InterfaceWorkspace | null>(null);
  const [failure, setFailure] = useState<{ message: string; fix: string } | null>(null);
  const [chosenScreen, setChosenScreen] = useState<string>('');
  const [chosenComponent, setChosenComponent] = useState<ComponentEntry | null>(null);
  const [role, setRole] = useState<string>('');
  const [width, setWidth] = useState<string>('desktop');
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [preview, setPreview] = useState<PreviewOutcome | null>(null);
  const [accessibility, setAccessibility] = useState<AccessibilityOutcome | null>(null);
  const [marking, setMarking] = useState(false);
  const [marked, setMarked] = useState(false);

  useEffect(() => {
    let live = true;
    setWorkspace(null);
    setFailure(null);
    readInterfaceWorkspace(projectId)
      .then((held) => {
        if (!live) return;
        if (!readableWorkspace(held)) {
          setFailure({
            message: 'Cerulea answered with no generated application for this project.',
            fix: 'Open Step 5 again. Report the problem to the Cerulea operator when it repeats.',
          });
          return;
        }
        setWorkspace(held);
        setChosenScreen(held.generated.section.screens[0]?.id ?? '');
        setRole(held.roles[0]?.role ?? '');
      })
      .catch((error: unknown) => {
        if (live) setFailure(failureOf(error, 'Open Step 5 again once Cerulea APIs answers.'));
      });
    return () => {
      live = false;
    };
  }, [projectId]);

  const loadPreview = useCallback(() => {
    if (workspace === null || role === '') return;
    setPreview(null);
    readInterfacePreview(projectId, { role, breakpoint: width, mode })
      .then(setPreview)
      .catch((error: unknown) =>
        setFailure(
          failureOf(error, 'Choose a role the model declares, then read the preview again.'),
        ),
      );
  }, [projectId, workspace, role, width, mode]);

  useEffect(() => {
    if (panel === 'preview') loadPreview();
  }, [panel, loadPreview]);

  useEffect(() => {
    if (workspace === null || panel !== 'accessibility' || accessibility !== null) return;
    let live = true;
    readInterfaceAccessibility(projectId)
      .then((held) => {
        if (live) setAccessibility(held);
      })
      .catch((error: unknown) => {
        if (live) setFailure(failureOf(error, 'Read the accessibility report again.'));
      });
    return () => {
      live = false;
    };
  }, [projectId, workspace, panel, accessibility]);

  const roleNames = useMemo(
    () => Object.fromEntries((workspace?.roles ?? []).map((held) => [held.role, held.name])),
    [workspace],
  );

  const markChecked = async () => {
    setMarking(true);
    try {
      await markInterfaceAuthored(projectId);
      setMarked(true);
      onContinue?.();
    } catch (error) {
      setFailure(failureOf(error, 'Mark the application checked again.'));
    } finally {
      setMarking(false);
    }
  };

  if (failure !== null && workspace === null) {
    return (
      <Box sx={{ px: 4, py: 3 }}>
        <Alert severity="error" data-testid="step5-failure">
          <AlertTitle>Cerulea generated no application</AlertTitle>
          {failure.message} {failure.fix}
        </Alert>
      </Box>
    );
  }

  if (workspace === null) {
    return (
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        sx={{ px: 4, py: 3 }}
        data-testid="step5-reading"
      >
        <CircularProgress size={22} />
        <Typography>Cerulea is generating the application from the model.</Typography>
      </Stack>
    );
  }

  const { generated, catalogue, roles, endpoints } = workspace;
  const section = generated.section;
  const screen = section.screens.find((held) => held.id === chosenScreen);

  return (
    <Box data-testid="step5-interface" sx={{ px: 4, py: 3 }}>
      <Typography variant="h5" component="h2">
        Interface
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        {openingSentence(section)}
      </Typography>

      {failure === null ? null : (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFailure(null)}>
          {failure.message} {failure.fix}
        </Alert>
      )}

      {generated.omissions.length === 0 ? null : (
        <Alert severity="info" sx={{ mb: 2 }} data-testid="step5-omissions">
          <AlertTitle>What Cerulea left out</AlertTitle>
          <List dense disablePadding>
            {generated.omissions.map((held) => (
              <ListItemText key={held} primary={held} />
            ))}
          </List>
        </Alert>
      )}

      {generated.faults.length === 0 ? null : (
        <Alert severity="warning" sx={{ mb: 2 }} data-testid="step5-faults">
          <AlertTitle>Corrections to make</AlertTitle>
          {generated.faults.map((fault, position) => (
            <Typography key={`${fault.component}-${position}`} variant="body2">
              {fault.screen} · {fault.component}. {fault.problem} {fault.fix}
            </Typography>
          ))}
        </Alert>
      )}

      <Tabs
        value={panel}
        onChange={(_event, held: Panel) => setPanel(held)}
        aria-label="Interface panels"
        variant="scrollable"
        sx={{ mb: 2 }}
      >
        {PANELS.map((entry) => (
          <Tab key={entry.id} value={entry.id} label={entry.label} />
        ))}
      </Tabs>

      {panel === 'screens' ? (
        <Grid container spacing={2} data-testid="panel-screens">
          <Grid size={{ xs: 12, md: 5 }}>
            {collectionsShown(section).map((collection) => (
              <Paper key={collection} variant="outlined" sx={{ p: 1, mb: 1 }}>
                <Typography variant="subtitle2" component="h3">
                  {collection}
                </Typography>
                <List dense aria-label={`${collection} screens`}>
                  {screensOfCollection(section, collection).map((held) => (
                    <ListItemButton
                      key={held.id}
                      selected={held.id === chosenScreen}
                      onClick={() => setChosenScreen(held.id)}
                    >
                      <ListItemText
                        primary={sentenceFor(section, held.title_key)}
                        secondary={describeScreen(held, roleNames)}
                      />
                      <Chip size="small" label={`${componentCount(held)} components`} />
                    </ListItemButton>
                  ))}
                </List>
              </Paper>
            ))}
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            {screen === undefined ? (
              <Typography>Choose a screen to see what it shows.</Typography>
            ) : (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="h6" component="h3">
                  {sentenceFor(section, screen.title_key)}
                </Typography>
                <Typography variant="body2">{describeScreen(screen, roleNames)}</Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body2">
                  {screen.offline_capture
                    ? 'This screen captures records without a connection.'
                    : 'This screen reads records and writes nothing.'}
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      ) : null}

      {panel === 'endpoints' ? (
        <Box data-testid="panel-endpoints">
          <Typography variant="body2" sx={{ mb: 1 }}>
            Another system reaches the deployment through these addresses. Each one answers with
            the records the caller may read, and a call outside the permission matrix meets a
            refusal.
          </Typography>
          {endpoints.length === 0 ? (
            <Alert severity="info">
              {workspace.endpointsNote.length > 0
                ? workspace.endpointsNote
                : 'This deployment publishes no endpoint yet. Add an action or a view in Step 3, and the endpoints appear here.'}
            </Alert>
          ) : (
            <List dense aria-label="Endpoints">
              {endpoints.map((held) => (
                <ListItem key={`${held.method} ${held.path}`} disableGutters>
                  <ListItemText
                    primary={`${held.method} ${held.path}`}
                    secondary={`Takes ${held.parameters.length === 0 ? 'no value' : held.parameters.join(', ')}. Answers with ${held.response}. Reached by ${reachedBy(held.visibility, roleNames)}.`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      ) : null}

      {panel === 'components' ? (
        <Grid container spacing={2} data-testid="panel-components">
          <Grid size={{ xs: 12, md: 6 }}>
            <ComponentPalette
              components={catalogue.components}
              chosen={chosenComponent?.kind}
              onChoose={setChosenComponent}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            {chosenComponent === null ? (
              <Typography>Choose a component to see the bindings it may read.</Typography>
            ) : (
              <BindingPicker
                projectId={projectId}
                role={role}
                roleName={roleNames[role] ?? role}
                component={chosenComponent.kind}
                binds={chosenComponent.binds}
              />
            )}
          </Grid>
        </Grid>
      ) : null}

      {panel === 'theme' ? (
        <Box data-testid="panel-theme">
          <Typography variant="body2" sx={{ mb: 1 }}>
            One token set drives every screen. A change to a value reaches every screen at once.
          </Typography>
          <Grid container spacing={2}>
            {(
              [
                ['colour_light', 'Colour, light theme'],
                ['colour_dark', 'Colour, dark mode'],
                ['type_scale', 'Type'],
                ['spacing', 'Spacing'],
              ] as const
            ).map(([group, label]) => (
              <Grid size={{ xs: 12, md: 6 }} key={group}>
                <Typography variant="subtitle2" component="h3">
                  {label}
                </Typography>
                <List dense aria-label={label}>
                  {section.theme[group].map((token) => (
                    <ListItemText key={token.name} primary={token.name} secondary={token.value} />
                  ))}
                </List>
              </Grid>
            ))}
          </Grid>
        </Box>
      ) : null}

      {panel === 'preview' ? (
        <Box data-testid="panel-preview">
          <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            <TextField
              select
              size="small"
              label="Role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              sx={{ minWidth: 220 }}
              helperText="The preview shows what a person holding this role reaches."
            >
              {roles.map((held) => (
                <MenuItem key={held.role} value={held.role}>
                  {held.name} · {held.screens} screens
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Width"
              value={width}
              onChange={(event) => setWidth(event.target.value)}
              sx={{ minWidth: 160 }}
            >
              {section.breakpoints.map((held) => (
                <MenuItem key={held.id} value={held.id}>
                  {widthWords(held.id)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Mode"
              value={mode}
              onChange={(event) => setMode(event.target.value as 'light' | 'dark')}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="light">Light theme</MenuItem>
              <MenuItem value="dark">Dark mode</MenuItem>
            </TextField>
            <Button onClick={loadPreview}>Read the preview again</Button>
          </Stack>
          {roles.length === 0 ? (
            <Alert severity="info">
              The model declares no role yet. Add a role in Step 3, and the preview shows what the
              role reaches.
            </Alert>
          ) : preview === null ? (
            <CircularProgress size={22} aria-label="Cerulea is rendering the preview" />
          ) : (
            <PreviewFrame preview={preview} screen={chosenScreen} />
          )}
        </Box>
      ) : null}

      {panel === 'accessibility' ? (
        <Box data-testid="panel-accessibility">
          {accessibility === null ? (
            <CircularProgress size={22} aria-label="Cerulea is checking the screens" />
          ) : (
            <AccessibilityReport outcome={accessibility} />
          )}
        </Box>
      ) : null}

      {panel === 'translation' ? (
        <Box data-testid="panel-translation">
          <Typography variant="body2" sx={{ mb: 1 }}>
            Every sentence a screen shows sits in the file beside the application. A translator
            works on the file and touches no screen.
          </Typography>
          <List dense aria-label="Translation files">
            {translationCoverage(section).map((held) => (
              <ListItemText
                key={held.language}
                primary={`strings.${held.language}.json`}
                secondary={
                  held.missing === 0
                    ? `${held.held} sentences. Every key the screens name carries words.`
                    : `${held.held} sentences. ${held.missing} keys still need this language.`
                }
              />
            ))}
          </List>
        </Box>
      ) : null}

      <Divider sx={{ my: 3 }} />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <Button
          variant="contained"
          onClick={() => void markChecked()}
          disabled={marking}
          data-testid="step5-continue"
        >
          Mark the application checked
        </Button>
        <Typography variant="body2" color="text.secondary">
          {marked
            ? 'Cerulea recorded the check. The readiness checklist shows Step 5 as done.'
            : 'The readiness checklist shows Step 5 as done once the application is checked. Deployment waits for every step.'}
        </Typography>
      </Stack>
    </Box>
  );
}
