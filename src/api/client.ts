// API 客户端：统一请求入口；API 不可用时上层自动回退演示数据

const API_BASE: string = (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api';

const TOKEN_KEY = 'clm_token';

/** 接口异常 */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** 读取本地令牌 */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** 写入或清除本地令牌 */
export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/** 基础请求 */
export async function apiRequest<T>(
  path: string,
  opts: { method?: string; body?: unknown; token?: string } = {},
): Promise<T> {
  const res = await fetch(API_BASE + path, {
    method: opts.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  if (!res.ok) {
    let message = `请求失败（${res.status}）`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // 响应体不是 JSON 时使用默认提示
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string, token?: string) => apiRequest<T>(path, { token }),
  post: <T>(path: string, body: unknown, token?: string) => apiRequest<T>(path, { method: 'POST', body, token }),
  put: <T>(path: string, body: unknown, token?: string) => apiRequest<T>(path, { method: 'PUT', body, token }),
  del: <T>(path: string, token?: string) => apiRequest<T>(path, { method: 'DELETE', token }),
};

/** 探测后端是否可用（2.5 秒超时，避免阻塞演示模式） */
export async function isApiAvailable(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(API_BASE + '/health', { signal: ctrl.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}
