import { createHmac, timingSafeEqual } from 'node:crypto';

// 令牌签发与校验：HMAC-SHA256 签名，避免引入额外依赖

const SECRET = process.env.CHILEMEI_SECRET ?? 'dev-secret-change-me';

export interface TokenPayload {
  uid: number;
  phone: string;
  exp: number;
}

/** 签发令牌（有效期 30 天） */
export function signToken(payload: Omit<TokenPayload, 'exp'>): string {
  const full: TokenPayload = { ...payload, exp: Date.now() + 30 * 24 * 3600 * 1000 };
  const body = Buffer.from(JSON.stringify(full)).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/** 校验令牌，无效或过期返回 null */
export function verifyToken(token: string): TokenPayload | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expect = createHmac('sha256', SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as TokenPayload;
    if (typeof payload.uid !== 'number' || typeof payload.exp !== 'number' || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
