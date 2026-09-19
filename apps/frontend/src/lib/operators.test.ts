import { describe, expect, it } from 'vitest';

import { holdsOperatorRole, operatorAddresses } from './operators';

describe('the Cerulea operator role', () => {
  it('reads the address list from the value that names it', () => {
    expect(
      operatorAddresses({ CERULEA_OPERATOR_EMAILS: 'ops@cerulea.test, second@cerulea.test' }),
    ).toEqual(['ops@cerulea.test', 'second@cerulea.test']);
  });

  it('holds an empty list while no value names an operator', () => {
    expect(operatorAddresses({})).toEqual([]);
  });

  it('recognises an operator whatever the letter case', () => {
    const source = { CERULEA_OPERATOR_EMAILS: 'ops@cerulea.test' };
    expect(holdsOperatorRole('OPS@Cerulea.Test', source)).toBe(true);
  });

  it('closes the administration screens for every other address', () => {
    const source = { CERULEA_OPERATOR_EMAILS: 'ops@cerulea.test' };
    expect(holdsOperatorRole('builder@cerulea.test', source)).toBe(false);
    expect(holdsOperatorRole(null, source)).toBe(false);
  });
});
