import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { SEED_MODULES, SEED_TEMPLATES } from '@/lib/catalogue/seed';
import type { CatalogueTemplate } from '@/lib/catalogue/types';
import { TRACK_LABEL, describeTemplates } from '@/lib/templates/gallery';
import EntryDoors, { type EntryAnswer } from './EntryDoors';
import StartFreshDoor from './StartFreshDoor';
import TemplateGalleryDoor from './TemplateGalleryDoor';

/**
 * The entry doors, past the catalogue a test hands in.
 *
 * Each door reads the catalogue from the catalogue routes when no catalogue
 * is supplied, names a failed read, and hands one answer shape back. These
 * tests check the reads, the failures, the narrowing controls and the answers.
 */

function stubCatalogue(modules: unknown, templates: unknown, status = 200) {
  const urls: string[] = [];
  vi.stubGlobal('fetch', (url: string) => {
    urls.push(url);
    const body = url === '/api/modules' ? modules : templates;
    return Promise.resolve(
      new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }),
    );
  });
  return urls;
}

const fewTemplates = SEED_TEMPLATES.slice(0, 12);

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the start fresh door reading its own catalogue', { timeout: 30000 }, () => {
  it('reads both catalogue routes and opens on a foundation', async () => {
    const urls = stubCatalogue(SEED_MODULES, SEED_TEMPLATES);
    render(<StartFreshDoor application="dapps" />);
    expect(screen.getByText('Reading the Cerulea catalogue.')).toBeInTheDocument();
    expect(await screen.findByText('What the project opens with')).toBeInTheDocument();
    expect(urls.sort()).toEqual(['/api/modules', '/api/templates']);
    expect(screen.getAllByTestId('foundation-part').length).toBeGreaterThan(0);
  });

  it('names the failure when a catalogue route refuses', async () => {
    stubCatalogue(null, null, 503);
    render(<StartFreshDoor application="dapps" />);
    expect(await screen.findByText('Cerulea could not read the catalogue')).toBeInTheDocument();
    expect(screen.getByText(/The catalogue route answered 503\./)).toBeInTheDocument();
  });

  it('warns when the catalogue holds no template for the picked network', async () => {
    const privateOnly = SEED_TEMPLATES.filter((template) => template.projectType === 'blockchain');
    render(
      <StartFreshDoor application="dapps" catalogue={{ modules: SEED_MODULES, templates: privateOnly }} />,
    );
    expect(screen.getByText('Cerulea holds no template for this network yet')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'Shipment trace' } });
    expect(screen.getByRole('button', { name: 'Open the workspace' })).toBeDisabled();

    await userEvent.click(screen.getByRole('radio', { name: /Private Blockchain network/ }));
    expect(await screen.findByText('What the project opens with')).toBeInTheDocument();
    expect(screen.queryByText('Cerulea holds no template for this network yet')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open the workspace' })).toBeEnabled();
  });
});

describe('the gallery door reading its own catalogue', { timeout: 30000 }, () => {
  it('reads the catalogue routes and lists every template they hold', async () => {
    stubCatalogue(SEED_MODULES, fewTemplates);
    render(<TemplateGalleryDoor />);
    expect(screen.getByText('Reading the Cerulea catalogue.')).toBeInTheDocument();
    expect(await screen.findByText(`${fewTemplates.length} of ${fewTemplates.length} templates match.`)).toBeInTheDocument();
    expect(screen.getAllByTestId('template-tile')).toHaveLength(fewTemplates.length);
  });

  it('names the failure when the catalogue answers with no list', async () => {
    stubCatalogue({ modules: 'none' }, { templates: 'none' });
    render(<TemplateGalleryDoor />);
    expect(await screen.findByText('Cerulea could not read the catalogue')).toBeInTheDocument();
    expect(screen.getByText(/found no list/)).toBeInTheDocument();
  });

  it('says so when no template matches the search', () => {
    render(<TemplateGalleryDoor catalogue={{ modules: SEED_MODULES, templates: fewTemplates }} />);
    fireEvent.change(screen.getByLabelText('Search the templates'), { target: { value: 'qqqzzzxxy' } });
    expect(screen.getByText('No template matches yet')).toBeInTheDocument();
    expect(screen.getByText(`0 of ${fewTemplates.length} templates match.`)).toBeInTheDocument();
    expect(screen.queryAllByTestId('template-tile')).toHaveLength(0);
  });

  it('narrows the gallery to the count the area names', async () => {
    render(<TemplateGalleryDoor catalogue={{ modules: SEED_MODULES, templates: fewTemplates }} />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Area' }));
    const options = await screen.findAllByRole('option');
    const area = options.find((option) => option.textContent !== 'Every area') as HTMLElement;
    const count = Number(/\((\d+)\)$/.exec(area.textContent ?? '')?.[1]);
    await userEvent.click(area);
    await waitFor(() =>
      expect(screen.getByText(`${count} of ${fewTemplates.length} templates match.`)).toBeInTheDocument(),
    );
    expect(screen.getAllByTestId('template-tile')).toHaveLength(count);
  });

  it('narrows the gallery to one network', async () => {
    render(<TemplateGalleryDoor catalogue={{ modules: SEED_MODULES, templates: fewTemplates }} />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Network' }));
    await userEvent.click(await screen.findByRole('option', { name: TRACK_LABEL.blockchain }));
    const expected = fewTemplates.filter((template) => template.projectType === 'blockchain').length;
    await waitFor(() => expect(screen.queryAllByTestId('template-tile')).toHaveLength(expected));
    for (const tile of screen.queryAllByTestId('template-tile')) {
      expect(within(tile).getByText(TRACK_LABEL.blockchain)).toBeInTheDocument();
    }
  });

  it('reports the part names a template lists and Cerulea does not hold', () => {
    const cards = describeTemplates(SEED_TEMPLATES, SEED_MODULES);
    const clean = cards.find((card) => card.missingParts.length === 0)?.template as CatalogueTemplate;
    const ghost: CatalogueTemplate = {
      ...clean,
      id: 'tpl-ghost',
      title: 'Ghost ledger',
      modules: [...(clean.modules ?? []), 'ghost-part-one', 'ghost-part-two'],
    };
    render(<TemplateGalleryDoor catalogue={{ modules: SEED_MODULES, templates: [clean, ghost] }} />);
    const [cleanTile, ghostTile] = screen.getAllByTestId('template-tile');
    expect(within(cleanTile).queryByText(/Cerulea holds no part for/)).toBeNull();
    expect(within(ghostTile).getByText('Ghost ledger')).toBeInTheDocument();
    expect(
      within(ghostTile).getByText(/Cerulea holds no part for 2 of the names this template lists\./),
    ).toBeInTheDocument();
  });
});

describe('the answers the three doors hand back', { timeout: 30000 }, () => {
  it('hands back a gallery choice as a browse answer', async () => {
    const answers: EntryAnswer[] = [];
    render(
      <EntryDoors
        application="dapps"
        catalogue={{ modules: SEED_MODULES, templates: fewTemplates }}
        onAnswer={(answer) => answers.push(answer)}
      />,
    );
    await userEvent.click(screen.getByRole('tab', { name: 'Browse it' }));
    const [tile] = await screen.findAllByTestId('template-tile');
    const title = tile.querySelector('.MuiTypography-subtitle1')?.textContent;
    const template = fewTemplates.find((entry) => entry.title === title);
    await userEvent.click(within(tile).getByRole('button', { name: 'Start from this template' }));
    expect(answers).toEqual([
      {
        door: 'browse',
        track: template?.projectType,
        templateId: template?.id,
        publishSelectedRecords: false,
      },
    ]);
  });

  it('hands back an accepted proposal as a describe answer', async () => {
    const answers: EntryAnswer[] = [];
    const description = 'We track every handling step of a shipment and let a buyer verify the goods.';
    render(
      <EntryDoors
        catalogue={{ modules: SEED_MODULES, templates: SEED_TEMPLATES }}
        onAnswer={(answer) => answers.push(answer)}
      />,
    );
    fireEvent.change(screen.getByLabelText('What should this system do'), { target: { value: description } });
    await userEvent.click(screen.getByRole('button', { name: /Show what Cerulea proposes/i }));
    await userEvent.click(await screen.findByRole('button', { name: /Start from this proposal/i }));
    expect(answers).toHaveLength(1);
    expect(answers[0]).toMatchObject({ door: 'describe', description });
    expect(answers[0].templateId.length).toBeGreaterThan(0);
    expect(answers[0].outcomeIds?.length).toBeGreaterThan(0);
  });
});
