import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LevelSwitch from './LevelSwitch';
import { DISCLOSURE_LEVELS } from '@/lib/studio/disclosure';

// The control that moves a person between the four disclosure levels. Each
// button answers to the word it shows, so voice control and a role query by
// that word both reach it. The longer sentence reads as its description.
describe('the level switch', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('names every level button by the word it shows', () => {
    render(<LevelSwitch level={2} onLevelChange={() => undefined} />);
    for (const entry of DISCLOSURE_LEVELS) {
      const button = screen.getByRole('button', { name: entry.label });
      expect(button).toBeDefined();
      expect(button.getAttribute('aria-label')).toBeNull();
    }
  });

  it('moves to the level a person picks by its shown word', async () => {
    const moved = vi.fn();
    render(<LevelSwitch level={2} onLevelChange={moved} />);
    const target = DISCLOSURE_LEVELS.find((entry) => entry.level === 3);
    expect(target).toBeDefined();
    await userEvent.click(screen.getByRole('button', { name: target?.label ?? '' }));
    expect(moved).toHaveBeenCalledWith(3);
  });
});
