'use client';

// apps/frontend/src/components/studio/steps/step1-SidePanel.tsx
// The side panel of the Blueprint canvas.
// Three tabs sit beside the production canvas. Outcomes holds the catalogue of
// plain statements that decide which parts are present. Links holds the three
// pickers: the guided feeds picker, the triggers picker of valid pairs and the
// permission matrix behind the governs lines, with the list of every link.
// Check holds the conflict report with its fixes.

import * as React from 'react';
import { Alert, Box, IconButton, Stack, Tab, Tabs, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';

import type { CatalogueModule, ProjectTrack } from '@/lib/catalogue/types';
import type { CanvasModel, CanvasSelection } from '@/lib/map/canvas';
import { feedsAnswers } from '@/lib/map/canvas';
import type { MapLink } from '@/lib/map/links';
import type { TriggerPair } from '@/lib/map/triggers';
import type { Conflict, ConflictFix } from '@/lib/outcomes/conflicts';
import OutcomeCatalogue from '@/components/studio/outcomes/OutcomeCatalogue';
import ConflictReport from '@/components/studio/outcomes/ConflictReport';
import FeedsPicker from '@/components/studio/map/FeedsPicker';
import TriggersPicker from '@/components/studio/map/TriggersPicker';
import GovernsMatrix from '@/components/studio/map/GovernsMatrix';
import LinkList from '@/components/studio/map/LinkList';

export type SidePanelTab = 'outcomes' | 'links' | 'check';

export type SidePanelProps = {
  tab: SidePanelTab;
  onTabChange: (tab: SidePanelTab) => void;
  onClose: () => void;
  modules: CatalogueModule[];
  /** The plain name of every part, the bridge runtime included. */
  titleById: Record<string, string>;
  track: ProjectTrack;
  selection: CanvasSelection;
  model: CanvasModel;
  conflicts: Conflict[];
  onOutcomesChange: (next: string[]) => void;
  onFeedsAnswer: (to: string, sources: string[]) => void;
  onTriggerToggle: (pair: TriggerPair, next: boolean) => void;
  onLinkDelete: (link: MapLink) => void;
  onApplyFix: (conflict: Conflict, fix: ConflictFix) => void;
  /** The notes the last save returned about links that wrote no event. */
  saveNotes: string[];
};

export default function SidePanel({
  tab,
  onTabChange,
  onClose,
  modules,
  titleById,
  track,
  selection,
  model,
  conflicts,
  onOutcomesChange,
  onFeedsAnswer,
  onTriggerToggle,
  onLinkDelete,
  onApplyFix,
  saveNotes,
}: SidePanelProps) {
  const theme = useTheme();
  const chosenTriggers = selection.chosenLinks
    .filter((link) => link.kind === 'triggers')
    .map((link) => `${link.from}->${link.to}`);
  const blocking = conflicts.filter((conflict) => conflict.severity === 'blocking').length;

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 80,
        left: 20,
        bottom: 110,
        width: 420,
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        background: theme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.97)' : 'rgba(8, 14, 36, 0.97)',
        backdropFilter: 'blur(20px) saturate(180%)',
        border: `0.5px solid ${theme.palette.divider}`,
        boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, theme.palette.mode === 'light' ? 0.08 : 0.18)}`,
        borderRadius: 4,
        overflow: 'hidden',
      }}
      data-testid="canvas-side-panel"
    >
      <Stack direction="row" alignItems="center" sx={{ borderBottom: '1px solid', borderColor: 'divider', pr: 1 }}>
        <Tabs value={tab} onChange={(_event, next) => onTabChange(next as SidePanelTab)} sx={{ flex: 1, minHeight: 44 }}>
          <Tab value="outcomes" label={`Outcomes (${model.presentOutcomeIds.length})`} sx={{ minHeight: 44, textTransform: 'none', fontWeight: 600 }} />
          <Tab value="links" label={`Links (${model.links.length})`} sx={{ minHeight: 44, textTransform: 'none', fontWeight: 600 }} />
          <Tab value="check" label={blocking > 0 ? `Check (${blocking})` : 'Check'} sx={{ minHeight: 44, textTransform: 'none', fontWeight: 600, color: blocking > 0 ? 'error.main' : undefined }} />
        </Tabs>
        <IconButton size="small" onClick={onClose} aria-label="Close the panel"><CloseIcon fontSize="small" /></IconButton>
      </Stack>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {tab === 'outcomes' && (
          <OutcomeCatalogue modules={modules} track={track} selected={selection.outcomeIds} onSelectedChange={onOutcomesChange} />
        )}

        {tab === 'links' && (
          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>Feeds, where more than one source exists</Typography>
              <FeedsPicker questions={model.feedsQuestions} answers={feedsAnswers(selection)} onAnswerChange={onFeedsAnswer} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>Triggers, from the valid pairs</Typography>
              <TriggersPicker pairs={model.triggerPairs} chosen={chosenTriggers} onToggle={onTriggerToggle} />
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>Governs, from the permission matrix</Typography>
              <GovernsMatrix matrix={model.matrix} modules={modules} />
            </Box>
            {saveNotes.length > 0 && (
              <Alert severity="info" variant="outlined" data-testid="save-notes">
                {saveNotes.map((note) => (
                  <Typography key={note} variant="caption" sx={{ display: 'block' }}>{note}</Typography>
                ))}
              </Alert>
            )}
            <Box>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>Every link on the canvas</Typography>
              <LinkList
                links={model.links}
                titleById={titleById}
                onDelete={onLinkDelete}
              />
            </Box>
          </Stack>
        )}

        {tab === 'check' && <ConflictReport conflicts={conflicts} onApplyFix={onApplyFix} />}
      </Box>
    </Box>
  );
}
