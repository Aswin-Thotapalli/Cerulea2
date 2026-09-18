import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import modulesSeed from '@/data/modules.seed.json';
import type { CatalogueModule } from '@/lib/catalogue/types';
import { deriveOutcomes } from '@/lib/outcomes/catalogue';
import { resolveOutcomeSelection } from '@/lib/outcomes/resolve';
import { detectConflicts, type Conflict, type ConflictFix } from '@/lib/outcomes/conflicts';
import ConflictReport from './ConflictReport';

const modules = (modulesSeed as { modules: CatalogueModule[] }).modules;
const outcomes = deriveOutcomes(modules);
const outcomeFor = (moduleId: string) =>
  outcomes.find((outcome) => outcome.anchorModuleId === moduleId)?.outcomeId as string;

describe('the conflict report', () => {
  it('states that nothing blocks a clean project', () => {
    render(<ConflictReport conflicts={[]} />);
    expect(screen.getByText('Nothing blocks this project')).toBeInTheDocument();
  });

  it('states every conflict and marks the blocking ones', () => {
    const resolution = resolveOutcomeSelection([outcomeFor('rbac')], outcomes, modules);
    const conflicts = detectConflicts(resolution, { track: 'blockchain', outcomes, modules });
    render(<ConflictReport conflicts={conflicts} />);
    expect(screen.getAllByTestId('conflict').length).toBe(conflicts.length);
    expect(screen.getAllByText('Stops deployment').length).toBeGreaterThan(0);
    expect(screen.getByText(/Deployment waits until every blocking line below is cleared/)).toBeInTheDocument();
  });

  it('hands the chosen fix back to the caller', async () => {
    const resolution = resolveOutcomeSelection([outcomeFor('rbac')], outcomes, modules);
    const conflicts = detectConflicts(resolution, { track: 'blockchain', outcomes, modules });
    const applied: Array<{ conflict: Conflict; fix: ConflictFix }> = [];
    render(
      <ConflictReport
        conflicts={conflicts}
        onApplyFix={(conflict, fix) => applied.push({ conflict, fix })}
      />,
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Remove the outcomes that belong to the other network/ }),
    );
    expect(applied).toHaveLength(1);
    expect(applied[0].fix.kind).toBe('remove-outcomes');
  });

  it('leaves a line with no action to apply disabled', () => {
    const conflicts: Conflict[] = [
      {
        conflictId: 'cycle:left>right',
        severity: 'blocking',
        title: 'Two parts need each other',
        detail: 'Left needs Right. Right needs Left. Deployment stops here.',
        fixes: [{ kind: 'none', label: 'Report the loop to Cerulea support' }],
      },
    ];
    render(<ConflictReport conflicts={conflicts} />);
    expect(screen.getByRole('button', { name: /Report the loop/ })).toBeDisabled();
  });
});
