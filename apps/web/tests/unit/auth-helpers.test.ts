import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../lib/auth-helpers';

describe('auth-helpers', () => {
  it('hashes password to non-empty string', async () => {
    const hash = await hashPassword('mySecret123');
    expect(hash).toBeTruthy();
    expect(hash).not.toEqual('mySecret123');
    expect(hash.length).toBeGreaterThan(40);
  });

  it('verifies correct password', async () => {
    const hash = await hashPassword('correctPassword');
    const result = await verifyPassword('correctPassword', hash);
    expect(result).toBe(true);
  });

  it('rejects incorrect password', async () => {
    const hash = await hashPassword('correctPassword');
    const result = await verifyPassword('wrongPassword', hash);
    expect(result).toBe(false);
  });

  it('produces different hashes for same password (salt)', async () => {
    const hash1 = await hashPassword('same');
    const hash2 = await hashPassword('same');
    expect(hash1).not.toEqual(hash2);
    // But both verify
    expect(await verifyPassword('same', hash1)).toBe(true);
    expect(await verifyPassword('same', hash2)).toBe(true);
  });
});
