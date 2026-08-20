import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const BLOCKED_HOSTNAMES = new Set(['localhost', 'localhost.localdomain']);

export function isPublicIpAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a, b] = address.split('.').map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }

  if (family === 6) {
    const normalized = address.toLowerCase();
    return !(
      normalized === '::' ||
      normalized === '::1' ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd') ||
      normalized.startsWith('fe8') ||
      normalized.startsWith('fe9') ||
      normalized.startsWith('fea') ||
      normalized.startsWith('feb') ||
      normalized.startsWith('ff') ||
      normalized.startsWith('2001:db8')
    );
  }

  return false;
}

export type EndpointPolicy = {
  allowedOrigins?: readonly string[];
  developmentPrivateOrigins?: readonly string[];
  resolve?: typeof lookup;
};

/** Validate a destination before the server sends it credentials or a request. */
export async function assertTrustedHttpsEndpoint(value: string | URL, policy: EndpointPolicy = {}): Promise<URL> {
  const url = new URL(value.toString());
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Only credential-free HTTPS endpoints are permitted');
  }

  if (policy.allowedOrigins && !policy.allowedOrigins.includes(url.origin)) {
    throw new Error('Endpoint is not admitted for this deployment');
  }

  const hostname = url.hostname.toLowerCase();
  const isDevelopmentPrivateOrigin = process.env.NODE_ENV !== 'production' &&
    (hostname.endsWith('.local') || hostname.endsWith('.localhost')) &&
    policy.developmentPrivateOrigins?.includes(url.origin) === true;

  if (!isDevelopmentPrivateOrigin && (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost'))) {
    throw new Error('Private endpoints are not permitted');
  }

  const resolve = policy.resolve ?? lookup;
  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await resolve(hostname, { all: true, verbatim: true });

  if (!addresses.length || (
    !isDevelopmentPrivateOrigin &&
    addresses.some(({ address }) => !isPublicIpAddress(address))
  )) {
    throw new Error('Endpoint resolves to a private or reserved address');
  }

  return url;
}

/**
 * Fetch a previously admitted endpoint without following redirects. Redirects
 * are rejected rather than reusing authorization at an unvalidated origin.
 */
export function createTrustedFetch(policy: EndpointPolicy = {}) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const requestUrl = input instanceof Request
      ? input.url
      : input instanceof URL
        ? input.toString()
        : input;
    await assertTrustedHttpsEndpoint(requestUrl, policy);
    const response = await fetch(input, { ...init, redirect: 'manual' });
    if (response.status >= 300 && response.status < 400) {
      throw new Error('Redirected remote endpoints are not permitted');
    }
    return response;
  };
}

export function customAiAllowedOrigins(): string[] {
  return (process.env.MARKETPLACE_CUSTOM_AI_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}
