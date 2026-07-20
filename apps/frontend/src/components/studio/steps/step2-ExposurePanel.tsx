'use client';

import React from "react";
import {
  Box, Stack, Typography, Chip, Switch, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Accordion, AccordionSummary, AccordionDetails,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import PublicIcon from "@mui/icons-material/Public";
import HexagonOutlinedIcon from "@mui/icons-material/HexagonOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { Entity, ModuleInfo } from './step2-types';

interface ExposurePanelProps {
  blueprintModules: ModuleInfo[];
  moduleEntities: Record<string, Entity[]>;
  onUpdateEntity: (modId: string, entId: string, patch: Partial<Entity>) => void;
}

export default function ExposurePanel({ blueprintModules, moduleEntities, onUpdateEntity }: ExposurePanelProps) {
  const theme = useTheme();

  return (
    <Box sx={{ p: 4, height: '100%', overflowY: 'auto', display: 'flex', justifyContent: 'center', bgcolor: 'background.default' }}>
      <Box sx={{ width: '100%', maxWidth: 1000 }}>
        <Typography variant="h5" fontWeight={800}>API &amp; Visibility</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, mt: 0.5 }}>
          On-chain means data lives on the blockchain (auditable, immutable, costs gas). API Public means Cerulea generates REST/GraphQL endpoints for this entity. Encryption adds at-rest encryption for sensitive fields.
        </Typography>

        {blueprintModules.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10, opacity: 0.5 }}>
            <PublicIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography>No entities yet. Add modules in the Blueprint Builder first.</Typography>
          </Box>
        ) : (
          blueprintModules.map((mod) => {
            const modEnts = moduleEntities[mod.id] || [];
            if (!modEnts.length) return null;
            return (
              <Accordion
                key={mod.id}
                defaultExpanded
                variant="outlined"
                sx={{ mb: 1.5, borderRadius: '4px !important', overflow: 'hidden', '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{
                  bgcolor: theme.palette.mode === 'dark'
                    ? alpha(theme.palette.primary.main, 0.08)
                    : alpha(theme.palette.primary.main, 0.04),
                  borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <HexagonOutlinedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                    <Typography variant="subtitle2" fontWeight={800}>{mod.label}</Typography>
                    {mod.category && (
                      <Chip label={mod.category} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 16 }} />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {modEnts.length} {modEnts.length === 1 ? 'entity' : 'entities'}
                    </Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ bgcolor: alpha(theme.palette.action.hover, 0.05) }}>
                        <TableRow>
                          <TableCell width="30%">ENTITY</TableCell>
                          <TableCell width="20%" align="center">
                            ON-CHAIN
                            <Tooltip title="Data stored on the blockchain: immutable, auditable, and visible to all validators. Incurs gas costs on write." arrow>
                              <InfoOutlinedIcon sx={{ fontSize: 11, color: 'text.secondary', ml: 0.5, cursor: 'help', verticalAlign: 'middle' }} />
                            </Tooltip>
                          </TableCell>
                          <TableCell width="20%" align="center">
                            API PUBLIC
                            <Tooltip title="Cerulea auto-generates REST and GraphQL endpoints for this entity. Turn off to keep the entity internal-only." arrow>
                              <InfoOutlinedIcon sx={{ fontSize: 11, color: 'text.secondary', ml: 0.5, cursor: 'help', verticalAlign: 'middle' }} />
                            </Tooltip>
                          </TableCell>
                          <TableCell width="30%" align="center">
                            ENCRYPTION
                            <Tooltip title="At-rest encryption: sensitive field values are encrypted in the database. Transparent to your app, adds a layer of security." arrow>
                              <InfoOutlinedIcon sx={{ fontSize: 11, color: 'text.secondary', ml: 0.5, cursor: 'help', verticalAlign: 'middle' }} />
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {modEnts.map((ent) => (
                          <TableRow key={ent.id}>
                            <TableCell sx={{ fontWeight: 700 }}>{ent.name}</TableCell>
                            <TableCell align="center">
                              <Switch
                                size="small"
                                checked={ent.onChain ?? false}
                                onChange={(e) => onUpdateEntity(mod.id, ent.id, { onChain: e.target.checked })}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Switch
                                size="small"
                                checked={ent.apiPublic ?? true}
                                onChange={(e) => onUpdateEntity(mod.id, ent.id, { apiPublic: e.target.checked })}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Chip label={ent.encryptionLevel || 'At Rest'} size="small" variant="outlined" />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            );
          })
        )}
      </Box>
    </Box>
  );
}
