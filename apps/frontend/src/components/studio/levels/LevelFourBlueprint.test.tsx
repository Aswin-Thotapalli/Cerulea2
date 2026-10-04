// Level 4 Blueprint: the typed document read and edited against the schema.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LevelFourBlueprint from './LevelFourBlueprint';
import { stubFetch } from './levels.fixture';
import { readBlueprintDocument } from '@/lib/blueprint/document';
import { readBlueprintText } from '@/lib/blueprint/validate';

afterEach(() => {
  vi.unstubAllGlobals();
});

const document = readBlueprintDocument(
  { name: 'Berth register', summary: 'We register every berth booking.' },
  'Berth register',
);

describe('disclosure level four', () => {
  it('shows the typed document, passes the schema and saves it unchanged', { timeout: 40000 }, async () => {
    const calls = stubFetch({ document });
    render(<LevelFourBlueprint projectId="p-1" />);
    await waitFor(() => expect(screen.getByText('The Blueprint')).toBeInTheDocument(), {
      timeout: 15000,
    });
    const area = screen.getByLabelText('The typed document') as HTMLTextAreaElement;
    await waitFor(() => expect(area.value.length).toBeGreaterThan(10));
    expect(readBlueprintText(area.value).document).toEqual(document);
    expect(screen.getByTestId('schema-clean')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Save the Blueprint' }));
    await waitFor(() =>
      expect(
        calls.some((call) => call.url.includes('/blueprint/document') && call.method === 'PUT'),
      ).toBe(true),
    );
    const saved = calls.find(
      (call) => call.url.includes('/blueprint/document') && call.method === 'PUT',
    )?.body as { document: unknown; expectedVersion: number };
    expect(saved.document).toEqual(document);
    expect(saved.expectedVersion).toBe(1);
    await waitFor(() => expect(screen.getByText(/saved the Blueprint as version 2/)).toBeInTheDocument());
  });

  it('names the place and the fix of a value the schema refuses and holds the save', { timeout: 40000 }, async () => {
    stubFetch({ document });
    render(<LevelFourBlueprint projectId="p-1" />);
    await waitFor(() => expect(screen.getByText('The Blueprint')).toBeInTheDocument(), {
      timeout: 15000,
    });
    const area = screen.getByLabelText('The typed document') as HTMLTextAreaElement;
    await waitFor(() => expect(area.value.length).toBeGreaterThan(10));
    fireEvent.change(area, { target: { value: '{ "name": 12 ' } });
    await waitFor(() => expect(screen.getByTestId('schema-faults')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Save the Blueprint' })).toBeDisabled();
  });
});
