import crypto from 'crypto';

export const MCP_TOKEN_PREFIX = 'rik_';

export function generateToken(userId: string): {
  plain: string;
  hash: string;
  prefix: string;
} {
  const random = crypto.randomBytes(24).toString('base64url');
  const plain = `${MCP_TOKEN_PREFIX}${userId.slice(-8)}_${random}`;
  // SHA-256 hash (deterministic, lookup-friendly)
  const hash = crypto.createHash('sha256').update(plain).digest('hex');
  const prefix = plain.slice(0, 16); // "rik_<8chars>_"
  return { plain, hash, prefix };
}

export function hashToken(plain: string): string {
  return crypto.createHash('sha256').update(plain).digest('hex');
}

export function isValidTokenFormat(token: string): boolean {
  return /^rik_[A-Za-z0-9]{8}_[A-Za-z0-9_-]{32,}$/.test(token);
}