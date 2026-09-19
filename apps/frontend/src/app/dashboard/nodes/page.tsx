'use client';

// apps/frontend/src/app/dashboard/nodes/page.tsx
// The Nodes panel.
// Every node value comes from the node itself. Every validator figure comes
// from the framework pallet through Cerulea APIs, including the Trust Score
// and the four parts it is made of.
// Without this panel an operator cannot tell who is authoring blocks.

import {
  Box,
  Chip,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';

import { PanelBody, PanelEmpty, usePanelData } from '@/components/dashboard/PanelState';
import { participationPercent, shortAccount } from '@/components/dashboard/wording';

type NodesView = {
  network: {
    node: {
      systemName: string;
      systemVersion: string;
      chainName: string;
      kind: 'local' | 'live';
      peers: number;
      isSyncing: boolean;
      shouldHavePeers: boolean;
      observedAt: string;
    };
    head: { number: number };
    finalizedBlock: number;
    epoch: number;
    activeValidators: number;
    totalValidators: number;
  };
  validators: {
    profile: {
      account: string;
      stake: string;
      standingScore: number;
      trustScore: number;
      state: 'Active' | 'Inactive' | 'Slashed';
      authoredBlocks: number;
      missedBlocks: number;
    };
    trust: {
      total: number;
      standing: number;
      performance: number;
      custody: number;
      verification: number;
    };
  }[];
};

export default function NodesPanel() {
  const reading = usePanelData<NodesView>('/api/dashboard/nodes', 12000);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        Nodes
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        We read the node this deployment is joined to, and every validator taking part in
        agreement.
      </Typography>

      <PanelBody reading={reading} subject="the node and the validator set">
        {(view) => (
          <Stack spacing={4}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {view.network.node.systemName} {view.network.node.systemVersion}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip size="small" label={view.network.node.chainName} />
                  <Chip
                    size="small"
                    color={view.network.node.isSyncing ? 'warning' : 'success'}
                    label={view.network.node.isSyncing ? 'Catching up' : 'In step'}
                  />
                </Stack>
              </Stack>
              <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Peers
                  </Typography>
                  <Typography variant="h6">{view.network.node.peers}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Other nodes this one is joined to.
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Block height
                  </Typography>
                  <Typography variant="h6">{view.network.head.number}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Irreversible to {view.network.finalizedBlock}.
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Epoch
                  </Typography>
                  <Typography variant="h6">{view.network.epoch}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    The validator set rotates at the end of each epoch.
                  </Typography>
                </Box>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
                Validators
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                The Trust Score decides how often a validator is drawn to author a block. Standing
                comes from service, performance from measurement, custody from history challenges
                and verification from sampling.
              </Typography>
              {view.validators.length === 0 ? (
                <PanelEmpty
                  heading="No validator answers yet"
                  explanation="Start a validator process and join it to this network. Every validator that answers appears here."
                />
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Validator</TableCell>
                      <TableCell>State</TableCell>
                      <TableCell align="right">Trust Score</TableCell>
                      <TableCell align="right">Authored</TableCell>
                      <TableCell align="right">Missed</TableCell>
                      <TableCell align="right">Turns taken</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {view.validators.map((entry) => (
                      <TableRow key={entry.profile.account}>
                        <TableCell>
                          <Tooltip title={entry.profile.account}>
                            <span>{shortAccount(entry.profile.account)}</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={
                              entry.profile.state === 'Active'
                                ? 'success'
                                : entry.profile.state === 'Slashed'
                                  ? 'error'
                                  : 'default'
                            }
                            label={entry.profile.state}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip
                            title={`Standing ${entry.trust.standing}, performance ${entry.trust.performance}, custody ${entry.trust.custody}, verification ${entry.trust.verification}`}
                          >
                            <span>{entry.trust.total}</span>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right">{entry.profile.authoredBlocks}</TableCell>
                        <TableCell align="right">{entry.profile.missedBlocks}</TableCell>
                        <TableCell align="right" sx={{ width: 160 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <LinearProgress
                              variant="determinate"
                              value={participationPercent(
                                entry.profile.authoredBlocks,
                                entry.profile.missedBlocks,
                              )}
                              sx={{ flex: 1, height: 6, borderRadius: 3 }}
                            />
                            <Typography variant="caption">
                              {participationPercent(
                                entry.profile.authoredBlocks,
                                entry.profile.missedBlocks,
                              )}
                              %
                            </Typography>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Paper>
          </Stack>
        )}
      </PanelBody>
    </Box>
  );
}
