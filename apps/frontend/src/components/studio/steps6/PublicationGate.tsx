'use client';

// apps/frontend/src/components/studio/steps6/PublicationGate.tsx
// The publication gate.
// Cerulea checks the generated application against the Web Content
// Accessibility Guidelines version 2.2 level AA. A failure blocks publication,
// so a screen nobody can use never reaches a person.
// Every finding names the screen, the component, the problem and the fix.
// Without this gate a deployment would publish a screen a person cannot reach.

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';

import { StudioRouteError, api } from '@/lib/apiClient';
import { GUIDELINE_LEVEL } from '@/lib/accessibility/audit';

export type EngineFinding = {
  area: string;
  severity: string;
  guideline: string;
  screen: string;
  component: string;
  problem: string;
  fix: string;
};

export type EngineReport = {
  version: number;
  passes: boolean;
  headline: string;
  findings: EngineFinding[];
  publication?: { blocked: true; message: string; fix: string };
};

/** Reports whether a report holds publication back. */
export function publicationBlocked(report: EngineReport | null): boolean {
  if (report === null) return true;
  if (report.publication?.blocked === true) return true;
  return report.passes === false;
}

/** One sentence stating what the gate decided. */
export function gateStatement(report: EngineReport | null): string {
  if (report === null) {
    return `Cerulea has not checked this application against the ${GUIDELINE_LEVEL} yet.`;
  }
  if (publicationBlocked(report)) {
    return (
      report.publication?.message ??
      `This application holds ${report.findings.length} faults against the ${GUIDELINE_LEVEL}. Deployment waits until they are corrected.`
    );
  }
  return `This application meets the ${GUIDELINE_LEVEL}. Nothing holds deployment back.`;
}

export default function PublicationGate({
  projectId,
  onDecision,
}: {
  projectId: string;
  /** Answers with whether deployment may go ahead. */
  onDecision?: (allowed: boolean) => void;
}) {
  const [report, setReport] = useState<EngineReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<{ message: string; fix: string } | null>(null);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const held = await api<EngineReport>(
        `/api/projects/${encodeURIComponent(projectId)}/accessibility`,
      );
      if (typeof held?.passes !== 'boolean' || Array.isArray(held.findings) === false) {
        setReport(null);
        setFailure({
          message: 'Cerulea answered with no accessibility report for this project.',
          fix: 'Check the application again. Report the problem to the Cerulea operator when it repeats.',
        });
        if (onDecision) onDecision(false);
        return;
      }
      setReport(held);
      setFailure(null);
      if (onDecision) onDecision(publicationBlocked(held) === false);
    } catch (cause) {
      setReport(null);
      setFailure({
        message: cause instanceof Error ? cause.message : String(cause),
        fix:
          cause instanceof StudioRouteError
            ? cause.fix
            : 'Make the corrections the checklist names, then check the application again.',
      });
      if (onDecision) onDecision(false);
    } finally {
      setLoading(false);
    }
  }, [onDecision, projectId]);

  useEffect(() => {
    void check();
  }, [check]);

  const blocked = publicationBlocked(report);

  return (
    <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }} data-testid="publication-gate">
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          Everybody reaches this application
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            size="small"
            color={blocked ? 'warning' : 'success'}
            label={blocked ? 'Deployment waits' : 'Ready to deploy'}
            data-testid="gate-state"
          />
          <Button size="small" onClick={() => void check()} disabled={loading}>
            Check again
          </Button>
        </Stack>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }} data-testid="gate-statement">
        {gateStatement(report)}
      </Typography>

      {loading && report === null && failure === null && (
        <Stack direction="row" spacing={2} alignItems="center">
          <CircularProgress size={18} />
          <Typography variant="body2">
            Cerulea is checking the application against the guidelines.
          </Typography>
        </Stack>
      )}

      {failure && (
        <Alert severity="error" data-testid="gate-failure">
          <AlertTitle>{failure.message}</AlertTitle>
          {failure.fix}
        </Alert>
      )}

      {report && report.findings.length === 0 && failure === null && (
        <Alert severity="success">
          <AlertTitle>Nothing holds deployment back</AlertTitle>
          Contrast, focus order, labelling, keyboard reach and target size all pass.
        </Alert>
      )}

      {report && report.findings.length > 0 && (
        <Box data-testid="gate-findings">
          <Alert severity="warning" sx={{ mb: 2 }}>
            <AlertTitle>Deployment waits until these are corrected</AlertTitle>
            {report.publication?.fix ??
              'Open the screen each line names and make the correction beside it.'}
          </Alert>
          <List dense disablePadding>
            {report.findings.map((finding, index) => (
              <ListItem
                key={`${finding.area}-${finding.component}-${index}`}
                disableGutters
                alignItems="flex-start"
                data-finding={finding.area}
              >
                <ListItemText
                  primary={
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {finding.problem}
                      </Typography>
                      <Chip size="small" label={finding.screen} />
                      <Chip size="small" variant="outlined" label={finding.guideline} />
                    </Stack>
                  }
                  secondary={
                    <Box component="span" sx={{ display: 'block' }}>
                      <Typography component="span" variant="body2" display="block">
                        {finding.fix}
                      </Typography>
                      <Typography
                        component="span"
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        {finding.component}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}
    </Paper>
  );
}
