import { describe, it, expect } from 'vitest';
import { env } from '../../lib/env';

describe('env', () => {
  it('loads DATABASE_URL', () => {
    expect(env.DATABASE_URL).toBeTruthy();
    expect(env.DATABASE_URL).toMatch(/^postgresql:\/\//);
  });

  it('loads AUTH_SECRET as non-empty string', () => {
    expect(env.AUTH_SECRET).toBeTruthy();
    expect(env.AUTH_SECRET.length).toBeGreaterThan(20);
  });

  it('loads NEXTAUTH_URL', () => {
    expect(env.NEXTAUTH_URL).toMatch(/^https?:\/\//);
  });

  it('parses numeric port correctly', () => {
    expect(typeof env.PORT).toBe('number');
    expect(env.PORT).toBeGreaterThan(0);
  });
});
