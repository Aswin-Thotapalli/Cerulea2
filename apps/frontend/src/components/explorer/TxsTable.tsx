'use client';

import {
  Table, TableHead, TableRow, TableCell, TableBody,
  Typography, Skeleton, keyframes,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import Link from 'next/link';
import type { ExtrinsicSummary, ChainSlug } from '@cerulea/types';
import HashChip from './HashChip';
import TimestampCell from './TimestampCell';
import StatusBadge from './StatusBadge';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

interface TxsTableProps {
  chain: ChainSlug;
  txs: ExtrinsicSummary[];
  loading?: boolean;
  newHashes?: Set<string>;
  showBlock?: boolean;
}

export default function TxsTable({
  chain,
  txs,
  loading = false,
  newHashes,
  showBlock = true,
}: TxsTableProps) {
  const theme = useTheme();

  return (
    <Table size="small" sx={{ tableLayout: 'fixed' }}>
      <TableHead>
        <TableRow>
          <TableCell sx={{ width: '22%', fontWeight: 700 }}>Tx Hash</TableCell>
          {showBlock && <TableCell sx={{ width: '10%', fontWeight: 700 }}>Block</TableCell>}
          <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>From</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>To</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
          <TableCell sx={{ fontWeight: 700 }}>Age</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {loading
          ? Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: showBlock ? 7 : 6 }).map((__, j) => (
                  <TableCell key={j}><Skeleton /></TableCell>
                ))}
              </TableRow>
            ))
          : txs.map((tx) => {
              const isNew = newHashes?.has(tx.hash);
              return (
                <TableRow
                  key={tx.hash}
                  hover
                  sx={{
                    animation: isNew ? `${fadeIn} 0.35s ease-out` : undefined,
                    bgcolor: isNew
                      ? alpha(theme.palette.primary.main, 0.06)
                      : undefined,
                  }}
                >
                  <TableCell>
                    <Typography
                      component={Link}
                      href={`/explorer/${chain}/txs/${tx.hash}`}
                      variant="body2"
                      sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    >
                      <HashChip value={tx.hash} compact />
                    </Typography>
                  </TableCell>
                  {showBlock && (
                    <TableCell>
                      <Typography
                        component={Link}
                        href={`/explorer/${chain}/blocks/${tx.blockNumber}`}
                        variant="body2"
                        fontWeight={600}
                        sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                      >
                        #{tx.blockNumber}
                      </Typography>
                    </TableCell>
                  )}
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                      {tx.section}.{tx.method}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {tx.from ? (
                      <HashChip value={tx.from} head={6} tail={4} />
                    ) : (
                      <Typography variant="body2" color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {tx.to ? (
                      <HashChip value={tx.to} head={6} tail={4} />
                    ) : (
                      <Typography variant="body2" color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={tx.status} />
                  </TableCell>
                  <TableCell>
                    <TimestampCell tsMs={tx.timestamp} />
                  </TableCell>
                </TableRow>
              );
            })}
      </TableBody>
    </Table>
  );
}
