import { describe, expect, it } from 'vitest';

import { slugify } from './slug';

describe('slugify', () => {
  it('lowers the case, drops punctuation and joins words with one hyphen', () => {
    expect(slugify('  Berth Register: Port of Chennai!  ')).toBe('berth-register-port-of-chennai');
  });

  it('folds repeated hyphens and spaces into one hyphen', () => {
    expect(slugify('trade -- finance   ledger')).toBe('trade-finance-ledger');
  });

  it('keeps underscores and digits', () => {
    expect(slugify('Ward_12 Records 2026')).toBe('ward_12-records-2026');
  });

  it('cuts the result at sixty four characters', () => {
    const slug = slugify('a'.repeat(80));
    expect(slug).toHaveLength(64);
    expect(slug).toBe('a'.repeat(64));
  });

  it('answers with empty text for one run of punctuation', () => {
    expect(slugify('***')).toBe('');
  });

  it('keeps one hyphen where a space sat between two runs of punctuation', () => {
    expect(slugify('!!! ???')).toBe('-');
  });
});
