'use client';

import React from "react";
import {
  Box, Stack, Typography, Chip,
  Accordion, AccordionSummary, AccordionDetails,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import SecurityIcon from "@mui/icons-material/Security";
import HexagonOutlinedIcon from "@mui/icons-material/HexagonOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Entity, ModuleInfo } from './step2-types';

const ROLE_ORDER = ['public', 'auth', 'owner', 'admin'] as const;
type RoleVal = 'public' | 'auth' | 'owner' | 'admin';

const ROLE_META: Record<RoleVal, { color: string; label: string }> = {
  public: { color: '#10b981', label: 'Public' },
  auth:   { color: '#3b82f6', label: 'Auth User' },
  owner:  { color: '#8b5cf6', label: 'Owner' },
  admin:  { color: '#ef4444', label: 'Admin' },
};

const ACTION_DEFAULTS: Record<string, RoleVal> = {
  create: 'owner', read: 'public', update: 'owner', delete: 'admin',
};

function cycleRole(cur: string): RoleVal {
  const idx = ROLE_ORDER.indexOf(cur as RoleVal);
  return ROLE_ORDER[(idx + 1) % ROLE_ORDER.length];
}

interface GovernancePanelProps {
  blueprintModules: ModuleInfo[];
  moduleEntities: Record<string, Entity[]>;
  onUpdateEntity: (modId: string, entId: string, patch: Partial<Entity>) => void;
}

export default function GovernancePanel({ blueprintModules, moduleEntities, onUpdateEntity }: GovernancePanelProps) {
  const theme = useTheme();

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', bgcolor: 'background.default' }}>
      <Box sx={{ maxWidth: 1000, mx: 'auto', p: 4 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
              <SecurityIcon sx={{ fontSize: 20, color: '#8b5cf6' }} />
              <Typography variant="h5" fontWeight={800}>Access Control Rules</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Click any role pill to cycle it: <b style={{ color: '#10b981' }}>Public</b> → <b style={{ color: '#3b82f6' }}>Auth User</b> → <b style={{ color: '#8b5cf6' }}>Owner</b> → <b style={{ color: '#ef4444' }}>Admin</b>
            </Typography>
          </Box>
        </Stack>

        {blueprintModules.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10, opacity: 0.5 }}>
            <SecurityIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography>No entities yet. Add modules in the Blueprint Builder first.</Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {blueprintModules.map((mod) => {
              const modEnts = moduleEntities[mod.id] || [];
              if (!modEnts.length) return null;
              return (
                <Accordion key={mod.id} defaultExpanded variant="outlined"
                  sx={{ borderRadius: '4px !important', overflow: 'hidden', '&:before': { display: 'none' }, borderColor: alpha('#8b5cf6', 0.15) }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{
                    bgcolor: alpha('#8b5cf6', theme.palette.mode === 'dark' ? 0.08 : 0.04),
                    borderBottom: `1px solid ${alpha('#8b5cf6', 0.12)}`,
                    minHeight: 48,
                  }}>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: alpha('#8b5cf6', 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <HexagonOutlinedIcon sx={{ fontSize: 14, color: '#8b5cf6' }} />
                      </Box>
                      <Typography variant="subtitle2" fontWeight={800}>{mod.label}</Typography>
                      {mod.category && <Chip label={mod.category} size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: alpha('#8b5cf6', 0.08), color: '#8b5cf6', border: 'none' }} />}
                      <Chip label={`${modEnts.length} ${modEnts.length === 1 ? 'entity' : 'entities'}`} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    <Box sx={{
                      display: 'grid', gridTemplateColumns: '1.5fr repeat(4, 1fr)',
                      px: 3, py: 1.25,
                      bgcolor: alpha(theme.palette.action.hover, 0.03),
                      borderBottom: `1px solid ${theme.palette.divider}`,
                    }}>
                      {['Entity', 'Create', 'Read', 'Update', 'Delete'].map(h => (
                        <Typography key={h} variant="caption" fontWeight={800} sx={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: 0.7, color: 'text.disabled' }}>{h}</Typography>
                      ))}
                    </Box>
                    {modEnts.map((ent, i) => (
                      <Box key={ent.id} sx={{
                        display: 'grid', gridTemplateColumns: '1.5fr repeat(4, 1fr)',
                        alignItems: 'center', px: 3, py: 1.5, minHeight: 52,
                        borderBottom: i < modEnts.length - 1 ? `1px solid ${theme.palette.divider}` : 'none',
                        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
                      }}>
                        <Box>
                          <Typography variant="body2" fontWeight={700}>{ent.name}</Typography>
                          {ent.description && (
                            <Typography variant="caption" color="text.disabled" noWrap sx={{ fontSize: '0.68rem', display: 'block' }}>
                              {ent.description}
                            </Typography>
                          )}
                        </Box>
                        {(['create', 'read', 'update', 'delete'] as const).map((action) => {
                          const val: RoleVal = (ent.access?.[action] as RoleVal) ?? ACTION_DEFAULTS[action];
                          const meta = ROLE_META[val];
                          return (
                            <Box key={action}>
                              <Box
                                onClick={() => onUpdateEntity(mod.id, ent.id, {
                                  access: {
                                    create: ent.access?.create ?? 'owner',
                                    read: ent.access?.read ?? 'public',
                                    update: ent.access?.update ?? 'owner',
                                    delete: ent.access?.delete ?? 'admin',
                                    [action]: cycleRole(val),
                                  },
                                })}
                                sx={{
                                  display: 'inline-flex', alignItems: 'center',
                                  px: 1.5, py: 0.5, borderRadius: 2, cursor: 'pointer',
                                  fontSize: '0.75rem', fontWeight: 700, userSelect: 'none',
                                  color: meta.color,
                                  bgcolor: alpha(meta.color, 0.1),
                                  border: `1px solid ${alpha(meta.color, 0.25)}`,
                                  transition: 'all 0.12s',
                                  '&:hover': { bgcolor: alpha(meta.color, 0.2), borderColor: alpha(meta.color, 0.45) },
                                }}
                              >
                                {meta.label}
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    ))}
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
