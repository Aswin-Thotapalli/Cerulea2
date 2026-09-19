'use client';

// apps/frontend/src/components/studio/interface/Step5Interface.tsx
// Step 5 Interface. The generated application and its authoring.
// Cerulea generates a complete working application from the model on entry.
// A person opens a finished thing and edits it. This screen shows the screens
// the engine generated, the component set, the bindings each role may legally
// reach, the theme tokens, the preview as any role and the accessibility gate.
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

import { CeruleaApiError } from '@/lib/cerulea-api';
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
  generateInterface,
  readAccessibility,
  readComponentCatalogue,
  readPreview,
  readPreviewRoles,
} from '@/lib/interface/client';
import type {
  AccessibilityOutcome,
  ComponentCatalogue,
  ComponentEntry,
  GeneratedInterface,
  PreviewOutcome,
  PreviewRole,
} from '@/lib/interface/types';
import AccessibilityReport from './AccessibilityReport';
import BindingPicker from './BindingPicker';
import ComponentPalette from './ComponentPalette';
import PreviewFrame from './PreviewFrame';

export type Step5InterfaceProps = {
  /** The Blueprint the project holds. */
  document: unknown;
  accessToken?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  /** Called once the engine answers, so the project records the section. */
  onGenerated?: (generated: GeneratedInterface) => void;
};

type Panel = 'screens' | 'components' | 'theme' | 'preview' | 'accessibility' | 'translation';

const PANELS: { id: Panel; label: string }[] = [
  { id: 'screens', label: 'Screens' },
  { id: 'components', label: 'Components' },
  { id: 'theme', label: 'Theme' },
  { id: 'preview', label: 'Preview' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'translation', label: 'Translation' },
];

/** The failure shape every panel reads. */
function failureOf(error: unknown, fallbackFix: string): { message: string; fix: string } {
  if (error instanceof CeruleaApiError) {
    return { message: error.message, fix: error.fix };
  }
  return { message: 'Cerulea did not answer.', fix: fallbackFix };
}

export default function Step5Interface({
  document,
  accessToken,
  baseUrl,
  fetchImpl,
  onGenerated,
}: Step5InterfaceProps) {
  const options = useMemo(
    () => ({ accessToken, baseUrl, fetchImpl }),
    [accessToken, baseUrl, fetchImpl],
  );
  const [panel, setPanel] = useState<Panel>('screens');
  const [generated, setGenerated] = useState<GeneratedInterface | null>(null);
  const [catalogue, setCatalogue] = useState<ComponentCatalogue | null>(null);
  const [roles, setRoles] = useState<PreviewRole[]>([]);
  const [failure, setFailure] = useState<{ message: string; fix: string } | null>(null);
  const [chosenScreen, setChosenScreen] = useState<string>('');
  const [chosenComponent, setChosenComponent] = useState<ComponentEntry | null>(null);
  const [role, setRole] = useState<string>('');
  const [width, setWidth] = useState<string>('desktop');
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [preview, setPreview] = useState<PreviewOutcome | null>(null);
  const [accessibility, setAccessibility] = useState<AccessibilityOutcome | null>(null);

  useEffect(() => {
    let live = true;
    Promise.all([
      generateInterface({ document }, options),
      readComponentCatalogue(options),
      readPreviewRoles({ document }, options),
    ])
      .then(([held, set, previewRoles]) => {
        if (!live) {
          return;
        }
        setGenerated(held);
        setCatalogue(set);
        setRoles(previewRoles.roles);
        setChosenScreen(held.section.screens[0]?.id ?? '');
        setRole(previewRoles.roles[0]?.role ?? '');
        onGenerated?.(held);
      })
      .catch((error: unknown) => {
        if (live) {
          setFailure(
            failureOf(error, 'Open Step 5 again once Cerulea APIs answers.'),
          );
        }
      });
    return () => {
      live = false;
    };
  }, [document, options, onGenerated]);

  const loadPreview = useCallback(() => {
    if (generated === null || role === '') {
      return;
    }
    readPreview(
      { document, section: generated.section, role, breakpoint: width, mode },
      options,
    )
      .then(setPreview)
      .catch((error: unknown) =>
        setFailure(failureOf(error, 'Choose a role the model declares, then read the preview again.')),
      );
  }, [document, generated, role, width, mode, options]);

  useEffect(() => {
    loadPreview();
  }, [loadPreview]);

  useEffect(() => {
    if (generated === null) {
      return;
    }
    let live = true;
    readAccessibility({ section: generated.section }, options)
      .then((held) => {
        if (live) {
          setAccessibility(held);
        }
      })
      .catch((error: unknown) => {
        if (live) {
          setFailure(failureOf(error, 'Read the accessibility report again.'));
        }
      });
    return () => {
      live = false;
    };
  }, [generated, options]);

  if (failure !== null && generated === null) {
    return (
      <Alert severity="error" data-testid="step5-failure">
        <AlertTitle>Cerulea generated no application</AlertTitle>
        {failure.message} {failure.fix}
      </Alert>
    );
  }

  if (generated === null || catalogue === null) {
    return (
      <Stack direction="row" spacing={2} alignItems="center" data-testid="step5-reading">
        <CircularProgress size={22} />
        <Typography>Cerulea is generating the application from the model.</Typography>
      </Stack>
    );
  }

  const section = generated.section;
  const screen = section.screens.find((held) => held.id === chosenScreen);

  return (
    <Box data-testid="step5-interface">
      <Typography variant="h5" component="h2">
        Interface
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        {openingSentence(section)}
      </Typography>

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
                        secondary={describeScreen(held)}
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
                <Typography variant="body2">{describeScreen(screen)}</Typography>
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
                document={document}
                role={role}
                component={chosenComponent.kind}
                binds={chosenComponent.binds}
                accessToken={accessToken}
                baseUrl={baseUrl}
                fetchImpl={fetchImpl}
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
                    <ListItemText
                      key={token.name}
                      primary={token.name}
                      secondary={token.value}
                    />
                  ))}
                </List>
              </Grid>
            ))}
          </Grid>
        </Box>
      ) : null}

      {panel === 'preview' ? (
        <Box data-testid="panel-preview">
          <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
            <TextField
              select
              size="small"
              label="Role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              sx={{ minWidth: 220 }}
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
          {preview === null ? (
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
    </Box>
  );
}
