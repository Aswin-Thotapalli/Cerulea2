import { describe, expect, it } from 'vitest';

import {
  divisionStartUrl,
  explorerUrl,
  newProjectUrl,
  openProjectUrl,
  studioOrigin,
} from './studio-links';

// The browser in these tests sits on the origin jsdom reports.
const origin = window.location.origin;

describe('the Studio addresses', () => {
  it('start from the origin the browser is on', () => {
    expect(studioOrigin()).toBe(origin);
    expect(newProjectUrl()).toBe(`${origin}/`);
  });

  it('open the division screen where a project of that kind starts', () => {
    expect(divisionStartUrl('dapp')).toBe(`${origin}/dapps`);
    expect(divisionStartUrl('enterprise')).toBe(`${origin}/enterprise`);
    expect(divisionStartUrl('govt')).toBe(`${origin}/govt`);
  });

  it('open a saved project inside its division', () => {
    expect(openProjectUrl('prj_1', 'govt')).toBe(`${origin}/govt?project=prj_1`);
    expect(openProjectUrl('prj_1', 'dapp')).toBe(`${origin}/dapps?project=prj_1`);
    expect(openProjectUrl('prj_1', null)).toBe(`${origin}/enterprise?project=prj_1`);
  });

  it('open the Explorer of the chain the division runs on', () => {
    expect(explorerUrl('dapp')).toBe(`${origin}/explorer/public`);
    expect(explorerUrl('enterprise')).toBe(`${origin}/explorer/private`);
    expect(explorerUrl('govt')).toBe(`${origin}/explorer/private`);
  });
});
