'use client';

import React from "react";
import { Box, Stack, Typography, Button, IconButton } from "@mui/material";
import { useTheme, styled, alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import HexagonOutlinedIcon from "@mui/icons-material/HexagonOutlined";
import { Entity, ModuleInfo } from './step2-types';

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

interface EntitySidebarProps {
  blueprintModules: ModuleInfo[];
  moduleEntities: Record<string, Entity[]>;
  selectedModuleId: string | null;
  selectedEntityId: string | null;
  onSelectModule: (modId: string) => void;
  onSelectEntity: (modId: string, entId: string) => void;
  onDeleteEntity: (modId: string, entId: string) => void;
  onOpenCatalog: () => void;
  onAddBlank: () => void;
}

export default function EntitySidebar({
  blueprintModules,
  moduleEntities,
  selectedModuleId,
  selectedEntityId,
  onSelectModule,
  onSelectEntity,
  onDeleteEntity,
  onOpenCatalog,
  onAddBlank,
}: EntitySidebarProps) {
  const theme = useTheme();

  return (
    <EntityPanel>
      <Box sx={{
        px: 2, py: 1.5,
        borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
        flexShrink: 0,
      }}>
        <Typography variant="overline" fontWeight={800} fontSize="0.6rem" color="primary.main" sx={{ letterSpacing: 1 }}>
          MODULES &amp; ENTITIES
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', py: 0.5 }}>
        {blueprintModules.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="caption" color="text.disabled">
              Add modules in Blueprint Builder first.
            </Typography>
          </Box>
        ) : (
          blueprintModules.map((mod) => {
            const modEnts = moduleEntities[mod.id] || [];
            const isModActive = selectedModuleId === mod.id;
            return (
              <Box key={mod.id}>
                <Box
                  onClick={() => onSelectModule(mod.id)}
                  sx={{
                    px: 2, py: 1, cursor: 'pointer',
                    bgcolor: alpha('#4F46E5', 0.06),
                    borderLeft: `3px solid ${isModActive ? theme.palette.primary.main : 'transparent'}`,
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                    '&:hover': { bgcolor: alpha('#4F46E5', 0.1) },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={0.75}>
                    <HexagonOutlinedIcon sx={{ fontSize: 12, color: isModActive ? 'primary.main' : 'text.secondary', flexShrink: 0 }} />
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
                    {modEnts.length} {modEnts.length === 1 ? 'entity' : 'entities'}
                  </Typography>
                </Box>

                {modEnts.map((ent) => {
                  const isActive = selectedEntityId === ent.id;
                  return (
                    <Box
                      key={ent.id}
                      onClick={() => onSelectEntity(mod.id, ent.id)}
                      sx={{
                        pl: 3.5, pr: 1.5, py: 0.75, cursor: 'pointer',
                        bgcolor: isActive ? alpha(theme.palette.primary.main, 0.12) : 'transparent',
                        borderLeft: `3px solid ${isActive ? theme.palette.primary.main : 'transparent'}`,
                        transition: 'all 0.15s',
                        '&:hover': {
                          bgcolor: isActive ? alpha(theme.palette.primary.main, 0.15) : alpha(theme.palette.primary.main, 0.04),
                        },
                      }}
                    >
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          <Box sx={{
                            width: 10, height: 10, borderRadius: 0.5,
                            border: `1.5px solid ${isActive ? theme.palette.primary.main : alpha(theme.palette.text.secondary, 0.4)}`,
                            flexShrink: 0,
                          }} />
                          <Typography
                            variant="caption"
                            fontWeight={isActive ? 700 : 500}
                            color={isActive ? 'primary.main' : 'text.secondary'}
                            sx={{ fontSize: '0.78rem', lineHeight: 1.3 }}
                          >
                            {ent.name}
                          </Typography>
                        </Stack>
                        {!ent.isCore && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(ev) => { ev.stopPropagation(); onDeleteEntity(mod.id, ent.id); }}
                            sx={{ p: 0.25, opacity: 0, '&:hover': { opacity: 1 }, '.MuiBox-root:hover &': { opacity: 0.6 } }}
                          >
                            <DeleteOutlineIcon sx={{ fontSize: 12 }} />
                          </IconButton>
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

      {selectedModuleId && (
        <Box sx={{ p: 1.5, borderTop: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`, flexShrink: 0 }}>
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            size="small"
            fullWidth
            onClick={onOpenCatalog}
            sx={{
              borderRadius: 2, mb: 0.75, fontWeight: 700,
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
      )}
    </EntityPanel>
  );
}
