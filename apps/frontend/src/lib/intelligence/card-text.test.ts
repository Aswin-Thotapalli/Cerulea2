import { describe, expect, it } from 'vitest';

import { cardText } from './card-text';

describe('a card written as text', () => {
  it('writes the title, the summary and the rows of a data card', () => {
    expect(
      cardText({ kind: 'data', title: 'Validators', summary: 'Two validators run.', columns: ['Name', 'State'], rows: [['north', 'active'], ['south', 'active']] }),
    ).toBe('Validators\nTwo validators run.\nName | State\nnorth | active\nsouth | active');
  });

  it('writes each option of a choice card with its plain sentence', () => {
    expect(
      cardText({ kind: 'choice', title: '', summary: 'Pick one.', choiceId: 'c', options: [{ id: 'a', label: 'Fast', plain: 'Blocks every second.' }] }),
    ).toBe('Pick one.\nFast: Blocks every second.');
  });

  it('writes the progress of a long operation', () => {
    expect(
      cardText({ kind: 'progress', title: 'Deploy', summary: 'Running.', stage: 'Start', completed: 3, total: 7, settled: false }),
    ).toBe('Deploy\nRunning.\nStart: 3 of 7');
  });
});
