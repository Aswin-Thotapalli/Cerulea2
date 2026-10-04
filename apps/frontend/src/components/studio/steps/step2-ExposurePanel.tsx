'use client';

// apps/frontend/src/components/studio/steps/step2-ExposurePanel.tsx
// The API Schema tab of the Data schema step.
// One table per module, one row per collection, as production drew it. The
// row carries the privacy class of the collection (how much of a record the
// Blockchain holds in the open) and whether anyone may read it through the
// published interface. Publishing gives the Anyone role Read on the
// collection, so the Permissions section carries the choice and the generated
// interface reads it from there.
// Without this tab a person reads the privacy of each collection one by one.

import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  MenuItem,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import PublicIcon from '@mui/icons-material/Public';
import HexagonOutlinedIcon from '@mui/icons-material/HexagonOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import ControlMirror from '@/components/studio/common/ControlMirror';
import { toReadable } from '@/lib/blueprint/compose';
import { PRIVACY_MEANING, putCollection } from '@/lib/blueprint/edit';
import type { Blueprint, PrivacyClass } from '@/lib/blueprint/types';
import { isPublished, setPublished, type Grouping } from './step2-model';

export type ExposurePanelProps = {
  blueprint: Blueprint;
  grouping: Grouping;
  onChange: (next: Blueprint) => void;
};

export default function ExposurePanel({ blueprint, grouping, onChange }: ExposurePanelProps) {
  const theme = useTheme();
  const modules = grouping.modules.filter((mod) => (grouping.byModule[mod.id] ?? []).length > 0);

  return (
    <Box
      sx={{
        p: 4,
        height: '100%',
        overflowY: 'auto',
        display: 'flex',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
      data-testid="exposure-panel"
    >
      <Box sx={{ width: '100%', maxWidth: 1000 }}>
        <Typography variant="h5" fontWeight={800}>
          API &amp; Visibility
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, mt: 0.5 }}>
          The privacy class states how much of a record the Blockchain holds in the open. Published
          means anyone reaches the records through the generated interface. Readers who are signed in
          follow the Access &amp; Roles tab.
        </Typography>
        <Box sx={{ mb: 3 }}>
          <ControlMirror controlId="blueprint.collection_privacy" dense />
        </Box>

        {modules.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 10, opacity: 0.5 }}>
            <PublicIcon sx={{ fontSize: 40, mb: 1 }} />
            <Typography>No entities yet. Add a collection on the Data Model tab first.</Typography>
          </Box>
        ) : (
          modules.map((mod) => {
            const collections = grouping.byModule[mod.id] ?? [];
            return (
              <Accordion
                key={mod.id}
                defaultExpanded
                variant="outlined"
                sx={{ mb: 1.5, borderRadius: '4px !important', overflow: 'hidden', '&:before': { display: 'none' } }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    bgcolor:
                      theme.palette.mode === 'dark'
                        ? alpha(theme.palette.primary.main, 0.08)
                        : alpha(theme.palette.primary.main, 0.04),
                    borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    <HexagonOutlinedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                    <Typography variant="subtitle2" fontWeight={800}>
                      {mod.label}
                    </Typography>
                    {mod.category && (
                      <Chip label={mod.category} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 16 }} />
                    )}
                    <Typography variant="caption" color="text.secondary">
                      {collections.length} {collections.length === 1 ? 'entity' : 'entities'}
                    </Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <TableContainer>
                    <Table>
                      <TableHead sx={{ bgcolor: alpha(theme.palette.action.hover, 0.05) }}>
                        <TableRow>
                          <TableCell width="30%">ENTITY</TableCell>
                          <TableCell width="30%" align="center">
                            PRIVACY
                            <Tooltip title="Open publishes every field. Fingerprint keeps a hash and the value stays outside. Sealed keeps the value encrypted. Outside keeps a reference to another system." arrow>
                              <InfoOutlinedIcon sx={{ fontSize: 11, color: 'text.secondary', ml: 0.5, cursor: 'help', verticalAlign: 'middle' }} />
                            </Tooltip>
                          </TableCell>
                          <TableCell width="20%" align="center">
                            PUBLISHED
                            <Tooltip title="Anyone reaches the records through the generated interface. Off keeps the collection to the roles on the Access & Roles tab." arrow>
                              <InfoOutlinedIcon sx={{ fontSize: 11, color: 'text.secondary', ml: 0.5, cursor: 'help', verticalAlign: 'middle' }} />
                            </Tooltip>
                          </TableCell>
                          <TableCell width="20%" align="center">
                            KEPT FOR
                            <Tooltip title="How long a record stays provable against the chain, and what Cerulea does once the period ends." arrow>
                              <InfoOutlinedIcon sx={{ fontSize: 11, color: 'text.secondary', ml: 0.5, cursor: 'help', verticalAlign: 'middle' }} />
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {collections.map((collection) => (
                          <TableRow key={collection.id}>
                            <TableCell sx={{ fontWeight: 700 }}>{toReadable(collection.id)}</TableCell>
                            <TableCell align="center">
                              <Select
                                size="small"
                                value={collection.privacy}
                                onChange={(event) =>
                                  onChange(
                                    putCollection(blueprint, {
                                      ...collection,
                                      privacy: event.target.value as PrivacyClass,
                                    }),
                                  )
                                }
                                inputProps={{ 'aria-label': `Privacy of ${toReadable(collection.id)}` }}
                                sx={{ minWidth: 150, fontSize: '0.8rem' }}
                              >
                                {(Object.keys(PRIVACY_MEANING) as PrivacyClass[]).map((entry) => (
                                  <MenuItem key={entry} value={entry}>
                                    <Tooltip title={PRIVACY_MEANING[entry]} placement="right">
                                      <span>{entry}</span>
                                    </Tooltip>
                                  </MenuItem>
                                ))}
                              </Select>
                              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, maxWidth: 260, mx: 'auto' }}>
                                {PRIVACY_MEANING[collection.privacy]}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Switch
                                size="small"
                                checked={isPublished(blueprint, collection.id)}
                                onChange={(event) =>
                                  onChange(setPublished(blueprint, collection.id, event.target.checked))
                                }
                                inputProps={{ 'aria-label': `Published read of ${toReadable(collection.id)}` }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`${collection.retention.period_days} days, then ${collection.retention.on_expiry.toLowerCase()}`}
                                size="small"
                                variant="outlined"
                              />
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
