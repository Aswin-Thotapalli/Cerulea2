import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import RecommendationGaps from './RecommendationGaps';
import { SEED_MODULES } from '@/lib/catalogue/seed';
import { gapsForModules } from '@/lib/manifest/gaps';
import type { CatalogueModule } from '@/lib/catalogue/types';

const recommender = SEED_MODULES.find((part) =>
  (part.recommends ?? []).some((name) => SEED_MODULES.some((other) => other.moduleId === name)),
) as CatalogueModule;

describe('the recommendation gap surface', () => {
  it('lists every recommended part left out, with the reason each is recommended', () => {
    render(<RecommendationGaps moduleIds={[recommender.moduleId]} />);
    const gaps = gapsForModules([recommender.moduleId], SEED_MODULES);
    expect(gaps.length).toBeGreaterThan(0);
    for (const gap of gaps) {
      expect(screen.getByText(gap.title)).toBeInTheDocument();
      expect(screen.getAllByText(gap.reason).length).toBeGreaterThan(0);
    }
  });

  it('names the part that recommends each gap', () => {
    render(<RecommendationGaps moduleIds={[recommender.moduleId]} />);
    expect(screen.getAllByText(recommender.title).length).toBeGreaterThan(0);
  });

  it('states how many recommended parts are missing', () => {
    render(<RecommendationGaps moduleIds={[recommender.moduleId]} />);
    const gaps = gapsForModules([recommender.moduleId], SEED_MODULES);
    expect(screen.getByTestId('gap-headline')).toHaveTextContent(
      gaps.length === 1 ? 'One part' : `${gaps.length} parts`,
    );
  });

  it('says so where nothing recommended is missing', () => {
    render(<RecommendationGaps moduleIds={[]} />);
    expect(screen.getByText('Nothing the catalogue recommends is missing')).toBeInTheDocument();
  });

  it('opens the screen that installs a gap', async () => {
    const opened: string[] = [];
    render(
      <RecommendationGaps
        moduleIds={[recommender.moduleId]}
        onOpenScreen={(name) => opened.push(name)}
      />,
    );
    await userEvent.click(screen.getAllByRole('button', { name: 'Compose' })[0]);
    expect(opened).toEqual(['Compose']);
  });
});
