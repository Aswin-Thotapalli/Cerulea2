'use client';

// apps/frontend/src/app/admin/blockchain/page.tsx
// The Blockchain screen of the Cerulea operator.
// The node identity, the height, the peers and every validator come from the
// node itself. The operator reads this to decide whether to upgrade or to hold.
// Without this screen the operator cannot judge the state of the network.

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
      kind: string;
      peers: number;
      isSyncing: boolean;
      shouldHavePeers: boolean;
      observedAt: string;
    };
    head: { number: number; hash: string };
    finalizedBlock: number;
    finalityLag: number;
    epoch: number;
    round: number;
    validatorSetId: number;
    activeValidators: number;
    totalValidators: number;
    consensusHealth: string;
    healthy: boolean;
    issues: string[];
  };
  validators: {
    profile: {
      account: string;
      state: string;
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

export default function OperatorBlockchainScreen() {
  const reading = usePanelData<NodesView>('/api/dashboard/nodes', 10000);

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
        Blockchain
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        A lapsed licence stops block production. Every existing record stays readable and
        exportable throughout.
      </Typography>

      <PanelBody reading={reading} subject="the node and the validator set">
        {(view) => (
          <Stack spacing={4}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {view.network.node.systemName} {view.network.node.systemVersion}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Chip size="small" label={view.network.node.chainName} />
                  <Chip size="small" label={`${view.network.node.kind} node`} />
                  <Chip
                    size="small"
                    color={view.network.healthy ? 'success' : 'warning'}
                    label={`Agreement ${view.network.consensusHealth}`}
                  />
                </Stack>
              </Stack>
              <Stack direction="row" spacing={4} flexWrap="wrap" useFlexGap>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Newest block
                  </Typography>
                  <Typography variant="h6">{view.network.head.number}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Irreversible height
                  </Typography>
                  <Typography variant="h6">{view.network.finalizedBlock}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Distance to irreversible
                  </Typography>
                  <Typography variant="h6">{view.network.finalityLag}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Peers
                  </Typography>
                  <Typography variant="h6">{view.network.node.peers}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Epoch and set
                  </Typography>
                  <Typography variant="h6">
                    {view.network.epoch} and {view.network.validatorSetId}
                  </Typography>
                </Box>
              </Stack>
              {view.network.issues.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2">Open items</Typography>
                  {view.network.issues.map((issue) => (
                    <Typography key={issue} variant="body2" color="text.secondary">
                      {issue}
                    </Typography>
                  ))}
                </Box>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Validators
              </Typography>
              {view.validators.length === 0 ? (
                <PanelEmpty
                  heading="No validator answers yet"
                  explanation="Start a validator process and join it to this network."
                />
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Validator</TableCell>
                      <TableCell>State</TableCell>
                      <TableCell align="right">Trust Score</TableCell>
                      <TableCell align="right">Standing</TableCell>
                      <TableCell align="right">Performance</TableCell>
                      <TableCell align="right">Custody</TableCell>
                      <TableCell align="right">Verification</TableCell>
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
                          <Chip size="small" label={entry.profile.state} />
                        </TableCell>
                        <TableCell align="right">{entry.trust.total}</TableCell>
                        <TableCell align="right">{entry.trust.standing}</TableCell>
                        <TableCell align="right">{entry.trust.performance}</TableCell>
                        <TableCell align="right">{entry.trust.custody}</TableCell>
                        <TableCell align="right">{entry.trust.verification}</TableCell>
                        <TableCell align="right" sx={{ width: 140 }}>
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
