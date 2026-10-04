'use client';

// apps/frontend/src/components/studio/steps/step6-RecommendationGaps.tsx
// Gap detection from the recommendation lists.
// The catalogue recommends parts beside the parts already installed. This
// surface reports every recommended part still missing, with the reason each
// one is recommended and the screen that installs it.
// Without this surface a person would deploy without the part the catalogue
// recommends for every project like theirs.

import { useMemo } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import { CATALOGUE_MODULES, gapHeadline, gapsForModules } from '@/lib/manifest/gaps';

export default function RecommendationGaps({
  moduleIds,
  onOpenScreen,
}: {
  /** The parts this deployment installs. */
  moduleIds: string[];
  onOpenScreen?: (screen: string) => void;
}) {
  const gaps = useMemo(() => gapsForModules(moduleIds, CATALOGUE_MODULES), [moduleIds]);

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }} data-testid="recommendation-gaps">
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
        Parts the catalogue recommends
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} data-testid="gap-headline">
        {gapHeadline(gaps)}
      </Typography>

      {gaps.length === 0 ? (
        <Alert severity="success">
          <AlertTitle>Nothing the catalogue recommends is missing</AlertTitle>
          Every part recommended beside the parts already installed is present.
        </Alert>
      ) : (
        <List dense disablePadding>
          {gaps.map((gap) => (
            <ListItem
              key={gap.moduleId}
              disableGutters
              alignItems="flex-start"
              data-gap={gap.moduleId}
              secondaryAction={
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onOpenScreen?.(gap.screen)}
                  disabled={onOpenScreen === undefined}
                >
                  {gap.screen}
                </Button>
              }
            >
              <ListItemText
                primary={
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {gap.title}
                    </Typography>
                    {gap.recommendedBy.map((entry) => (
                      <Chip key={entry.moduleId} size="small" label={entry.title} />
                    ))}
                  </Stack>
                }
                secondary={
                  <Box component="span" sx={{ display: 'block' }}>
                    <Typography component="span" variant="body2" display="block">
                      {gap.reason}
                    </Typography>
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      {gap.contributes}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
}
