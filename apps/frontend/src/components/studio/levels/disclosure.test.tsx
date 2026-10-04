// The four disclosure levels over the six production steps, and the switch.
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LevelSwitch from './LevelSwitch';
import {
  DISCLOSURE_LEVELS,
  STEP_BLUEPRINT,
  STEP_DATA_SCHEMA,
  STEP_DEPLOY,
  STEP_ECONOMICS,
  STEP_FOUNDATION,
  STEP_INTEGRATIONS,
  defaultLevel,
  describeMove,
  hiddenSteps,
  levelOpens,
  nearestOpenStep,
  readLevel,
} from '@/lib/studio/disclosure';

describe('the four disclosure levels over the six steps', () => {
  it('carries the four names of specification 11.6', () => {
    expect(DISCLOSURE_LEVELS.map((entry) => entry.label)).toEqual([
      'Template',
      'Outcomes',
      'Designer',
      'Blueprint',
    ]);
  });

  it('level 1 Template opens Foundation and Deploy alone', () => {
    expect(hiddenSteps(1)).toEqual([STEP_BLUEPRINT, STEP_DATA_SCHEMA, STEP_ECONOMICS, STEP_INTEGRATIONS]);
    expect(levelOpens(1, STEP_FOUNDATION)).toBe(true);
    expect(levelOpens(1, STEP_DEPLOY)).toBe(true);
    expect(levelOpens(1, 'document')).toBe(false);
  });

  it('level 2 Outcomes opens the Blueprint step and withholds Data schema', () => {
    expect(hiddenSteps(2)).toEqual([STEP_DATA_SCHEMA]);
    expect(levelOpens(2, STEP_BLUEPRINT)).toBe(true);
    expect(levelOpens(2, STEP_ECONOMICS)).toBe(true);
    expect(levelOpens(2, STEP_INTEGRATIONS)).toBe(true);
  });

  it('level 3 Designer opens every step including Data schema', () => {
    expect(hiddenSteps(3)).toEqual([]);
    expect(levelOpens(3, STEP_DATA_SCHEMA)).toBe(true);
    expect(levelOpens(3, 'document')).toBe(false);
  });

  it('level 4 Blueprint opens every step and the document view', () => {
    expect(hiddenSteps(4)).toEqual([]);
    expect(levelOpens(4, 'document')).toBe(true);
  });

  it('moves a person standing on a withheld step to the nearest open one', () => {
    expect(nearestOpenStep(1, STEP_BLUEPRINT)).toBe(STEP_DEPLOY);
    expect(nearestOpenStep(1, STEP_FOUNDATION)).toBe(STEP_FOUNDATION);
    expect(nearestOpenStep(2, STEP_DATA_SCHEMA)).toBe(STEP_ECONOMICS);
    expect(nearestOpenStep(3, STEP_DATA_SCHEMA)).toBe(STEP_DATA_SCHEMA);
  });

  it('opens a Dapps template project on Template, a Dapps blank on Outcomes, Enterprise and Government on Designer', () => {
    expect(defaultLevel({ division: 'dapp', templateId: 'dapp-nft-marketplace' })).toBe(1);
    expect(defaultLevel({ division: 'dapp', templateId: '' })).toBe(2);
    expect(defaultLevel({ division: null, templateId: null })).toBe(2);
    expect(defaultLevel({ division: 'enterprise', templateId: '' })).toBe(3);
    expect(defaultLevel({ division: 'govt', templateId: 'govt-procurement' })).toBe(3);
  });

  it('reads any stored value back as one of the four levels', () => {
    expect(readLevel(1)).toBe(1);
    expect(readLevel(4)).toBe(4);
    expect(readLevel(9)).toBe(2);
    expect(readLevel(undefined)).toBe(2);
  });

  it('states what changes on a move between levels', () => {
    expect(describeMove(1, 3)).toContain('shows more of the same system');
    expect(describeMove(4, 2)).toContain('shows less of the same system');
    expect(describeMove(2, 2)).toContain('stay');
  });
});

describe('the level switch', () => {
  it('offers the four levels and reports a change', async () => {
    const onLevelChange = vi.fn();
    render(<LevelSwitch level={2} onLevelChange={onLevelChange} />);
    for (const label of ['Template', 'Outcomes', 'Designer', 'Blueprint']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Outcomes' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Designer' }));
    expect(onLevelChange).toHaveBeenCalledWith(3);
    expect(screen.getByText(/Every level writes the same Blueprint/)).toBeInTheDocument();
  });

  it('offers the document view at level four alone', () => {
    const onOpenDocument = vi.fn();
    const { rerender } = render(
      <LevelSwitch level={3} onLevelChange={() => undefined} onOpenDocument={onOpenDocument} />,
    );
    expect(screen.queryByRole('button', { name: 'The Blueprint document' })).toBeNull();
    rerender(
      <LevelSwitch level={4} onLevelChange={() => undefined} onOpenDocument={onOpenDocument} />,
    );
    expect(screen.getByRole('button', { name: 'The Blueprint document' })).toBeInTheDocument();
  });
});
