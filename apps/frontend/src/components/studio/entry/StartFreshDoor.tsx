'use client';

// The start fresh door.
// An experienced user names the project, picks the network and starts.
// The project still opens on a working foundation, so no canvas ever opens
// empty. Every part of the foundation states what it contributes.

import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import DesignServicesIcon from '@mui/icons-material/DesignServices';

import { loadCatalogue } from '@/lib/catalogue/load';
import type { Catalogue, ProjectTrack } from '@/lib/catalogue/types';
import { buildFoundation, type Foundation } from '@/lib/entry/foundation';
import { TRACK_LABEL } from '@/lib/templates/gallery';

const SurfaceCard = styled(Paper)(({ theme }) => ({
  padding: 24,
  borderRadius: 16,
  border: `1px solid ${theme.palette.divider}`,
  background: theme.palette.background.paper,
}));

const PartRow = styled(Box)(({ theme }) => ({
  padding: '12px 16px',
  borderRadius: 10,
  marginBottom: 8,
  border: `1px solid ${theme.palette.divider}`,
}));

export type StartFreshChoice = {
  name: string;
  track: ProjectTrack;
  templateId: string;
  moduleIds: string[];
};

export type StartFreshDoorProps = {
  onStart?: (choice: StartFreshChoice) => void;
  /** Supplies the catalogue instead of reading it from the catalogue routes. Tests use this. */
  catalogue?: Catalogue;
};

export default function StartFreshDoor({ onStart, catalogue: supplied }: StartFreshDoorProps) {
  const [catalogue, setCatalogue] = React.useState<Catalogue | null>(supplied ?? null);
  const [loadProblem, setLoadProblem] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  const [track, setTrack] = React.useState<ProjectTrack>('dapp');

  React.useEffect(() => {
    if (supplied) return;
    let live = true;
    loadCatalogue()
      .then((next) => {
        if (live) setCatalogue(next);
      })
      .catch((error: Error) => {
        if (live) setLoadProblem(error.message);
      });
    return () => {
      live = false;
    };
  }, [supplied]);

  const foundation: Foundation | null = React.useMemo(
    () => (catalogue ? buildFoundation(track, catalogue.templates, catalogue.modules) : null),
    [catalogue, track],
  );

  const start = React.useCallback(() => {
    if (!foundation) return;
    onStart?.({
      name: name.trim(),
      track,
      templateId: foundation.sourceTemplate.id,
      moduleIds: foundation.parts.map((part) => part.moduleId),
    });
  }, [foundation, name, onStart, track]);

  if (loadProblem) {
    return (
      <Alert severity="error" variant="outlined">
        <AlertTitle>Cerulea could not read the catalogue</AlertTitle>
        {loadProblem}
      </Alert>
    );
  }

  if (!catalogue) {
    return (
      <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 4 }}>
        <CircularProgress size={22} />
        <Typography variant="body2" color="text.secondary">
          Reading the Cerulea catalogue.
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <SurfaceCard>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: 'primary.main', color: 'common.white', display: 'flex' }}>
            <DesignServicesIcon />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={800}>
              Start fresh
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Name the project and pick the network. Cerulea opens a working foundation we then
              shape.
            </Typography>
          </Box>
        </Stack>

        <TextField
          fullWidth
          label="Project name"
          placeholder="Shipment trace"
          value={name}
          onChange={(event) => setName(event.target.value)}
          inputProps={{ 'aria-label': 'Project name' }}
          helperText="The name appears on the project, on the manifest and on the deployment record."
        />

        <Typography variant="overline" fontWeight={800} color="text.secondary" sx={{ display: 'block', mt: 3 }}>
          The network
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          A private Blockchain network keeps every record inside our organisation. The public-access
          chain lets anyone verify a record. We change this at any time.
        </Typography>
        <RadioGroup value={track} onChange={(event) => setTrack(event.target.value as ProjectTrack)}>
          <FormControlLabel value="blockchain" control={<Radio />} label={TRACK_LABEL.blockchain} />
          <FormControlLabel value="dapp" control={<Radio />} label={TRACK_LABEL.dapp} />
        </RadioGroup>
      </SurfaceCard>

      {foundation && (
        <SurfaceCard>
          <Typography variant="overline" fontWeight={800} color="text.secondary" sx={{ display: 'block' }}>
            What the project opens with
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 2 }}>
            {foundation.provenance} Remove any of them once the project is open.
          </Typography>
          {foundation.parts.map((part) => (
            <PartRow key={part.moduleId} data-testid="foundation-part">
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  {part.title}
                </Typography>
                {part.requiredBy.length > 0 && (
                  <Chip size="small" variant="outlined" label={`Needed by ${part.requiredBy.join(', ')}`} />
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {part.contribution}
              </Typography>
              {part.reason && (
                <Typography variant="caption" color="primary.main" sx={{ display: 'block', mt: 0.5 }}>
                  {part.reason}
                </Typography>
              )}
            </PartRow>
          ))}
        </SurfaceCard>
      )}

      {!foundation && (
        <Alert severity="warning" variant="outlined">
          <AlertTitle>Cerulea holds no template for this network yet</AlertTitle>
          Pick the other network, or open the gallery and start from a template there.
        </Alert>
      )}

      <Stack direction="row" spacing={2} alignItems="center">
        <Button
          variant="contained"
          size="large"
          disabled={name.trim().length === 0 || !foundation}
          onClick={start}
        >
          Open the workspace
        </Button>
        <Typography variant="caption" color="text.secondary">
          A name is what Cerulea saves the project under.
        </Typography>
      </Stack>
    </Stack>
  );
}
