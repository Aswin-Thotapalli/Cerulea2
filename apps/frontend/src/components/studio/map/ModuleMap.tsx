'use client';

// The module map.
// Cerulea assembled these parts. The map explains why each one is here.
// Every card names the outcome that caused it, what the part contributes and
// what stops working after removal.
// Removal asks first, and the question lists everything the removal takes.

import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

import type { CatalogueModule } from '@/lib/catalogue/types';
import { removalImpact, type OutcomeResolution, type RemovalImpact } from '@/lib/outcomes/resolve';
import { buildModuleMap, nodesByDepth, type MapNode } from '@/lib/map/graph';
import { deriveRequiresLinks, type MapLink } from '@/lib/map/links';
import LinkList from './LinkList';

const Layer = styled(Paper)(({ theme }) => ({
  padding: 16,
  borderRadius: 14,
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.default,
}));

const Card = styled(Paper, { shouldForwardProp: (prop) => prop !== 'direct' })<{ direct?: boolean }>(
  ({ theme, direct }) => ({
    padding: 16,
    borderRadius: 12,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    border: `1px solid ${direct ? theme.palette.primary.main : theme.palette.divider}`,
    background: theme.palette.background.paper,
  }),
);

export type ModuleMapProps = {
  resolution: OutcomeResolution;
  modules: CatalogueModule[];
  /** Receives the module a user removed, once the question is answered. */
  onRemoveModule?: (moduleId: string) => void;
  /** The links a user drew. Cerulea adds the derived links to these. */
  userLinks?: MapLink[];
  onDeleteLink?: (link: MapLink) => void;
};

export default function ModuleMap({
  resolution,
  modules,
  onRemoveModule,
  userLinks = [],
  onDeleteLink,
}: ModuleMapProps) {
  const map = React.useMemo(() => buildModuleMap(resolution, modules), [modules, resolution]);
  const layers = React.useMemo(() => nodesByDepth(map), [map]);
  const [pending, setPending] = React.useState<RemovalImpact | null>(null);

  const links = React.useMemo(
    () => [...deriveRequiresLinks(resolution.installOrder, modules), ...userLinks],
    [modules, resolution.installOrder, userLinks],
  );

  const titleById = React.useMemo(
    () => Object.fromEntries(map.nodes.map((node) => [node.moduleId, node.title])),
    [map.nodes],
  );

  const ask = React.useCallback(
    (node: MapNode) => setPending(removalImpact(node.moduleId, resolution, modules)),
    [modules, resolution],
  );

  const confirm = React.useCallback(() => {
    if (pending) onRemoveModule?.(pending.moduleId);
    setPending(null);
  }, [onRemoveModule, pending]);

  if (map.nodes.length === 0) {
    return (
      <Alert severity="info" variant="outlined">
        <AlertTitle>The map fills once we choose an outcome</AlertTitle>
        Pick one line from the outcome catalogue. Cerulea installs the parts it needs and draws them
        here.
      </Alert>
    );
  }

  return (
    <Stack spacing={3}>
      <Paper sx={{ p: 3, borderRadius: 4 }} variant="outlined">
        <Typography variant="h6" fontWeight={800}>
          What Cerulea assembled
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {map.nodes.length} parts across {layers.length} layers. A part sits above the parts it
          needs. Every card names the outcome that put it here.
        </Typography>
      </Paper>

      {layers.map((layer, depth) => (
        <Layer key={depth} data-testid="map-layer">
          <Typography variant="overline" fontWeight={800} color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {depth === 0 ? 'Parts that need nothing else' : `Parts that build on layer ${depth}`}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' },
            }}
          >
            {layer.map((node) => (
              <Card key={node.moduleId} direct={node.chosenDirectly} data-testid="map-card">
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Typography variant="subtitle1" fontWeight={800}>
                    {node.title}
                  </Typography>
                  <Chip size="small" label={node.area} />
                  {node.chosenDirectly && <Chip size="small" color="primary" variant="outlined" label="We asked for this" />}
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  {node.contribution}
                </Typography>

                <Typography variant="caption" color="primary.main" data-testid="map-card-cause">
                  {node.chosenDirectly
                    ? `This is here because we chose: ${node.causedBy.join('. ')}`
                    : `This is here because ${node.requiredBy.join(', ')} needs it, for: ${node.causedBy.join('. ')}`}
                </Typography>

                <Typography variant="caption" color="warning.main" data-testid="map-card-removal">
                  {node.removalConsequence}
                </Typography>

                <Button
                  sx={{ mt: 'auto', alignSelf: 'flex-start' }}
                  size="small"
                  color="warning"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={() => ask(node)}
                >
                  Remove {node.title}
                </Button>
              </Card>
            ))}
          </Box>
        </Layer>
      ))}

      <Paper sx={{ p: 3, borderRadius: 4 }} variant="outlined">
        <Typography variant="h6" fontWeight={800} sx={{ mb: 1 }}>
          How the parts connect
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Cerulea draws each kind of link in its own shape, so one glance tells them apart.
        </Typography>
        <LinkList links={links} titleById={titleById} onDelete={onDeleteLink} />
      </Paper>

      <Dialog open={pending !== null} onClose={() => setPending(null)}>
        <DialogTitle>Remove {pending?.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{pending?.summary}</DialogContentText>
          {(pending?.dependants.length ?? 0) > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="overline" fontWeight={800} color="text.secondary">
                These parts stop working
              </Typography>
              {pending?.dependants.map((entry) => (
                <Box key={entry.moduleId} sx={{ mt: 1 }} data-testid="removal-dependant">
                  <Typography variant="body2" fontWeight={700}>
                    {entry.title}
                  </Typography>
                  {entry.reason && (
                    <Typography variant="caption" color="text.secondary">
                      {entry.reason}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPending(null)}>Keep it</Button>
          <Button color="warning" variant="contained" onClick={confirm}>
            Remove it anyway
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
