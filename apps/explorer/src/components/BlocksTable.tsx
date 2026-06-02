'use client';

import {
  Table, TableHead, TableRow, TableCell, TableBody,
  Typography, Skeleton, Box, keyframes,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import Link from 'next/link';
import type { BlockSummary, ChainSlug } from '@cerulea/types';
import HashChip from './HashChip';
import TimestampCell from './TimestampCell';
import { formatNumber } from '@/lib/format';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

interface BlocksTableProps {
  chain: ChainSlug;
  blocks: BlockSummary[];
  loading?: boolean;
  animateNew?: boolean;
  /** Set of block numbers that are "new" and should animate in */
  newNumbers?: Set<number>;
}

export default function BlocksTable({
  chain,
  blocks,
  loading = false,
  newNumbers,
}: BlocksTableProps) {
  const theme = useTheme();

  return (
    <Table size="small" sx={{ tableLayout: 'fixed' }}>
      <TableHead>
        <TableRow>
          <TableCell sx={{ width: '10%', fontWeight: 700 }}>Block</TableCell>
          <TableCell sx={{ width: '25%', fontWeight: 700 }}>Hash</TableCell>
          <TableCell sx={{ width: '20%', fontWeight: 700 }}>Validator</TableCell>
          <TableCell sx={{ width: '12%', fontWeight: 700 }}>Txns</TableCell>
          <TableCell sx={{ width: '18%', fontWeight: 700 }}>Age</TableCell>
          <TableCell sx={{ width: '15%', fontWeight: 700 }}>Block Time</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {loading
          ? Array.from({ length: 10 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 6 }).map((__, j) => (
                  <TableCell key={j}><Skeleton /></TableCell>
                ))}
              </TableRow>
            ))
          : blocks.map((block) => {
              const isNew = newNumbers?.has(block.number);
              return (
                <TableRow
                  key={block.number}
                  hover
                  sx={{
                    animation: isNew ? `${fadeIn} 0.35s ease-out` : undefined,
                    bgcolor: isNew
                      ? alpha(theme.palette.primary.main, 0.06)
                      : undefined,
                    '&:hover': { bgcolor: alpha(theme.palette.action.hover, 0.5) },
                  }}
                >
                  <TableCell>
                    <Typography
                      component={Link}
                      href={`/${chain}/blocks/${block.number}`}
                      variant="body2"
                      fontWeight={700}
                      sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    >
                      #{formatNumber(block.number)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <HashChip value={block.hash} head={8} tail={6} />
                  </TableCell>
                  <TableCell>
                    {block.author ? (
                      <HashChip value={block.author} head={6} tail={4} />
                    ) : (
                      <Typography variant="body2" color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{block.txCount}</Typography>
                  </TableCell>
                  <TableCell>
                    <TimestampCell tsMs={block.timestamp} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {block.blockTime != null ? `${(block.blockTime / 1000).toFixed(2)}s` : '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}
      </TableBody>
    </Table>
  );
}
