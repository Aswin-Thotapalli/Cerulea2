'use client';

// apps/frontend/src/components/studio/steps/step2-EntitySidebar.tsx
// The left column of the Data schema step: the modules of the Blueprint step
// with the collections each one brought, as production drew it. A collection
// a module brought stays; a collection added by hand can be removed. The
// buttons at the foot open the entity catalogue and add a blank collection.
// Without this column a person has no way to move between collections.

import React from 'react';
import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, styled, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import HexagonOutlinedIcon from '@mui/icons-material/HexagonOutlined';

import { toReadable } from '@/lib/blueprint/compose';
import type { Collection } from '@/lib/blueprint/types';
import type { Grouping } from './step2-model';

const EntityPanel = styled(Box)(({ theme }) => ({
  width: 240,
  flexShrink: 0,
  height: '100%',
  borderRight: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  background: theme.palette.mode === 'dark' ? 'rgba(8,14,36,0.8)' : theme.palette.background.paper,
}));

export type EntitySidebarProps = {
  grouping: Grouping;
  selectedModuleId: string | null;
  selectedCollectionId: string | null;
  /** The collections a module brought, which stay while the module stays. */
  isCore: (collection: Collection) => boolean;
  onSelectModule: (moduleId: string) => void;
  onSelectCollection: (moduleId: string, collectionId: string) => void;
  onRemoveCollection: (collectionId: string) => void;
  onOpenCatalogue: () => void;
  onAddBlank: () => void;
};

export default function EntitySidebar({
  grouping,
  selectedModuleId,
  selectedCollectionId,
  isCore,
  onSelectModule,
  onSelectCollection,
  onRemoveCollection,
  onOpenCatalogue,
  onAddBlank,
}: EntitySidebarProps) {
  const theme = useTheme();

  return (
    <EntityPanel data-testid="entity-sidebar">
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
          flexShrink: 0,
        }}
      >
        <Typography
          variant="overline"
          fontWeight={800}
          fontSize="0.6rem"
          color="primary.main"
          sx={{ letterSpacing: 1 }}
        >
          MODULES &amp; ENTITIES
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', py: 0.5 }}>
        {grouping.modules.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="caption" color="text.disabled">
              Add modules in the Blueprint step first.
            </Typography>
          </Box>
        ) : (
          grouping.modules.map((mod) => {
            const collections = grouping.byModule[mod.id] ?? [];
            const isModActive = selectedModuleId === mod.id;
            return (
              <Box key={mod.id}>
                <Box
                  onClick={() => onSelectModule(mod.id)}
                  role="button"
                  aria-label={`Module ${mod.label}`}
                  sx={{
                    px: 2,
                    py: 1,
                    cursor: 'pointer',
                    bgcolor: alpha('#4F46E5', 0.06),
                    borderLeft: `3px solid ${isModActive ? theme.palette.primary.main : 'transparent'}`,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                    '&:hover': { bgcolor: alpha('#4F46E5', 0.1) },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={0.75}>
                    <HexagonOutlinedIcon
                      sx={{
                        fontSize: 12,
                        color: isModActive ? 'primary.main' : 'text.secondary',
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      color={isModActive ? 'primary.main' : 'text.primary'}
                      sx={{ lineHeight: 1.3, fontSize: '0.75rem' }}
                    >
                      {mod.label}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ pl: 2.5, fontSize: '0.65rem' }}>
                    {collections.length} {collections.length === 1 ? 'entity' : 'entities'}
                  </Typography>
                </Box>

                {collections.map((collection) => {
                  const isActive = selectedCollectionId === collection.id;
                  const core = isCore(collection);
                  return (
                    <Box
                      key={collection.id}
                      onClick={() => onSelectCollection(mod.id, collection.id)}
                      role="button"
                      aria-label={`Entity ${toReadable(collection.id)}`}
                      aria-pressed={isActive}
                      sx={{
                        pl: 3.5,
                        pr: 1.5,
                        py: 0.75,
                        cursor: 'pointer',
                        bgcolor: isActive ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
                        borderLeft: `3px solid ${isActive ? theme.palette.primary.main : 'transparent'}`,
                        transition: 'all 0.15s',
                        '&:hover': {
                          bgcolor: isActive
                            ? alpha(theme.palette.primary.main, 0.15)
                            : alpha(theme.palette.primary.main, 0.04),
                        },
                        '&:hover .remove-entity': { opacity: 0.7 },
                      }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: 0.5,
                              border: `1.5px solid ${
                                isActive
                                  ? theme.palette.primary.main
                                  : alpha(theme.palette.text.secondary, 0.4)
                              }`,
                              flexShrink: 0,
                            }}
                          />
                          <Typography
                            variant="caption"
                            fontWeight={isActive ? 700 : 500}
                            color={isActive ? 'primary.main' : 'text.secondary'}
                            sx={{ fontSize: '0.78rem', lineHeight: 1.3 }}
                          >
                            {toReadable(collection.id)}
                          </Typography>
                        </Stack>
                        {core === false && (
                          <Tooltip title="Remove this collection and what depends on it">
                            <IconButton
                              className="remove-entity"
                              size="small"
                              color="error"
                              aria-label={`Remove ${toReadable(collection.id)}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                onRemoveCollection(collection.id);
                              }}
                              sx={{ p: 0.25, opacity: 0, '&:hover': { opacity: 1 } }}
                            >
                              <DeleteOutlineIcon sx={{ fontSize: 12 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </Box>
                  );
                })}
              </Box>
            );
          })
        )}
      </Box>

      <Box
        sx={{
          p: 1.5,
          borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
          flexShrink: 0,
        }}
      >
        <Button
          startIcon={<AddIcon />}
          variant="outlined"
          size="small"
          fullWidth
          onClick={onOpenCatalogue}
          sx={{
            borderRadius: 2,
            mb: 0.75,
            fontWeight: 700,
            borderColor: alpha(theme.palette.primary.main, 0.4),
            color: 'primary.main',
            '&:hover': {
              borderColor: theme.palette.primary.main,
              bgcolor: alpha(theme.palette.primary.main, 0.06),
            },
          }}
        >
          Add More Entities
        </Button>
        <Button
          startIcon={<AddIcon />}
          size="small"
          fullWidth
          onClick={onAddBlank}
          sx={{
            borderRadius: 2,
            color: 'primary.main',
            opacity: 0.75,
            '&:hover': { opacity: 1, bgcolor: alpha(theme.palette.primary.main, 0.06) },
          }}
        >
          Add Custom Entity
        </Button>
      </Box>
    </EntityPanel>
  );
}
