// One Blueprint behind every level.
// Level one writes a document from plain answers. The step screens of levels
// two and three read it through the same project state read. Level four shows
// the same document, passes it through the schema and saves it unchanged.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LevelFourBlueprint from './LevelFourBlueprint';
import LevelOneTemplate from './LevelOneTemplate';
import { firstTemplate, questions, stubFetch } from './levels.fixture';
import StudioSidebar from '@/app/_studio/shell/StudioSidebar';
import { readBlueprintText } from '@/lib/blueprint/validate';
import { hiddenSteps } from '@/lib/studio/disclosure';
import { readProjectState } from '@/lib/studio/project-state';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: 'Demo Person', email: 'demo@cerulea.local' } } }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('one Blueprint behind every level', () => {
  it('level one writes it, levels two and three read it, level four shows and saves it unchanged', { timeout: 90000 }, async () => {
    const calls = stubFetch();

    // Level 1 Template: plain answers, then the build.
    const one = render(<LevelOneTemplate projectId="p-1" />);
    await waitFor(() => expect(screen.getByText('A few plain questions')).toBeInTheDocument(), {
      timeout: 15000,
    });
    await userEvent.type(screen.getByLabelText('What this system does'), 'We register every berth booking.');
    await userEvent.click(screen.getByLabelText('Which kind of system is this'));
    await userEvent.click(await screen.findByRole('option', { name: firstTemplate.title }));
    for (const question of questions) {
      await userEvent.click(screen.getByRole('radio', { name: question.options[0].label }));
    }
    await waitFor(() => expect(screen.getByRole('button', { name: 'Build this system' })).toBeEnabled());
    await userEvent.click(screen.getByRole('button', { name: 'Build this system' }));
    await waitFor(
      () => expect(calls.some((c) => c.url.includes('/blueprint/document') && c.method === 'PUT')).toBe(true),
      { timeout: 20000 },
    );
    const written = calls.find((c) => c.url.includes('/blueprint/document') && c.method === 'PUT')!
      .body as { document: Record<string, unknown> };
    const document = written.document;
    expect(Array.isArray(document.collections)).toBe(true);
    expect((document.collections as unknown[]).length).toBeGreaterThan(0);
    one.unmount();

    // Levels 2 and 3: every step screen reads the project through this one read.
    const state = await readProjectState('p-1');
    expect(state.blueprint).toEqual(document);

    // Level 4 Blueprint: the same document, read, checked and saved unchanged.
    const putsBefore = calls.filter((c) => c.method === 'PUT' && c.url.includes('/blueprint/document')).length;
    render(<LevelFourBlueprint projectId="p-1" />);
    await waitFor(() => expect(screen.getByText('The Blueprint')).toBeInTheDocument(), { timeout: 15000 });
    const area = screen.getByLabelText('The typed document') as HTMLTextAreaElement;
    await waitFor(() => expect(area.value.length).toBeGreaterThan(10));
    expect(readBlueprintText(area.value).document).toEqual(document);
    expect(screen.getByTestId('schema-clean')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save the Blueprint' }));
    await waitFor(() =>
      expect(calls.filter((c) => c.method === 'PUT' && c.url.includes('/blueprint/document')).length).toBe(
        putsBefore + 1,
      ),
    );
    const saved = calls.filter((c) => c.method === 'PUT' && c.url.includes('/blueprint/document')).pop()!
      .body as { document: unknown };
    expect(saved.document).toEqual(document);
  });
});

describe('the sidebar under each level', () => {
  const renderAt = (level: 1 | 2 | 3 | 4) =>
    render(
      <StudioSidebar
        stepIndex={0}
        subStepIndex={0}
        projectType="dapp"
        onStepChange={() => undefined}
        hiddenSteps={hiddenSteps(level)}
      />,
    );

  it('level 2 Outcomes lists the Blueprint step and withholds Data schema', () => {
    stubFetch();
    renderAt(2);
    expect(screen.getByText('Blueprint')).toBeInTheDocument();
    expect(screen.getByText('Economics')).toBeInTheDocument();
    expect(screen.queryByText('Data schema')).toBeNull();
  });

  it('level 3 Designer lists Data schema', () => {
    stubFetch();
    renderAt(3);
    expect(screen.getByText('Data schema')).toBeInTheDocument();
  });

  it('level 1 Template lists Foundation and Deploy & UI alone', () => {
    stubFetch();
    renderAt(1);
    expect(screen.getByText('Foundation')).toBeInTheDocument();
    expect(screen.getByText('Deploy & UI')).toBeInTheDocument();
    expect(screen.queryByText('Blueprint')).toBeNull();
    expect(screen.queryByText('Integrations')).toBeNull();
  });
});
