'use client';

// apps/frontend/src/components/studio/variants/ApplicationChoice.tsx
// The application a workspace serves.
// One Studio codebase serves three applications. Each one carries its own part
// subset, its own language and its own commercial gates. The choice is made
// when a workspace opens, and every project inside carries it.
// Without this choice a public body would meet parts built for a token
// marketplace.

import { useMemo, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';

import ControlMirror from '@/components/studio/common/ControlMirror';
import { SEED_MODULES } from '@/lib/catalogue/seed';
import { APPLICATION_VARIANTS, partsFor, variantFor } from '@/lib/variants/application';
import { TRACK_LABEL, type Application } from '@/lib/track/derive';

export default function ApplicationChoice({
  application,
  onApplicationChange,
  saving = false,
}: {
  application: Application;
  onApplicationChange?: (next: Application) => void;
  saving?: boolean;
}) {
  const [chosen, setChosen] = useState<Application>(application);
  const variant = useMemo(() => variantFor(chosen), [chosen]);
  const offered = useMemo(() => partsFor(chosen, SEED_MODULES).length, [chosen]);

  return (
    <Stack spacing={3} data-testid="application-choice">
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
          Which Cerulea this workspace serves
        </Typography>
        <Typography variant="body2" color="text.secondary">
          One Cerulea codebase serves three audiences. Each one offers its own parts, its own
          words and its own commercial gates.
        </Typography>
        <ControlMirror controlId="workspace.application" />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
        }}
      >
        {Object.values(APPLICATION_VARIANTS).map((entry) => {
          const selected = entry.application === chosen;
          return (
            <Card
              key={entry.application}
              variant="outlined"
              data-application={entry.application}
              sx={{ borderColor: selected ? 'primary.main' : undefined, borderWidth: selected ? 2 : 1 }}
            >
              <CardActionArea
                onClick={() => setChosen(entry.application)}
                sx={{ height: '100%' }}
                aria-label={entry.label}
              >
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                      {entry.label}
                    </Typography>
                    {selected && <Chip size="small" label="Chosen" />}
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {entry.audience}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {entry.serves}
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="caption" display="block">
                    Starts on the {TRACK_LABEL[entry.defaultTrack].toLowerCase()}.
                  </Typography>
                  <Typography variant="caption" display="block">
                    {partsFor(entry.application, SEED_MODULES).length} parts offered.
                  </Typography>
                  <Typography variant="caption" display="block">
                    {entry.tiers.length} {entry.tiers.length === 1 ? 'tier' : 'tiers'}.
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>

      <Box data-testid="variant-detail">
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
          What {variant.label} offers
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          <AlertTitle>
            {offered} parts, and the word {variant.words.project} for a piece of work
          </AlertTitle>
          {variant.bothTracks
            ? 'Both networks are available. The starting network is set on the foundation screen.'
            : `Every ${variant.words.project} runs on a private Blockchain network. The question never appears.`}
        </Alert>
        <List dense disablePadding>
          {variant.tiers.map((tier) => (
            <ListItem key={tier.id} disableGutters data-tier={tier.id}>
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {tier.label}
                    </Typography>
                    {tier.airGapped && <Chip size="small" label="Air-gapped" />}
                    {tier.residencyLock && <Chip size="small" label="Residency lock" />}
                  </Stack>
                }
                secondary={tier.admits}
              />
            </ListItem>
          ))}
        </List>
      </Box>

      {onApplicationChange && (
        <Box>
          <Button
            variant="contained"
            disabled={saving || chosen === application}
            onClick={() => onApplicationChange(chosen)}
          >
            {saving ? 'Saving' : `Serve ${variant.label}`}
          </Button>
        </Box>
      )}
    </Stack>
  );
}
