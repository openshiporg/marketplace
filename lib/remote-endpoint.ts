import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { Readable } from 'node:stream';

const BLOCKED_HOSTNAMES = new Set(['localhost', 'localhost.localdomain']);

type ResolvedAddress = { address: string; family: number };

function expandIpv6(value: string): number[] | null {
  let address = value.toLowerCase().split('%')[0];
  if (address.includes('.')) {
    const lastColon = address.lastIndexOf(':');
    if (lastColon < 0) return null;
    const octets = address.slice(lastColon + 1).split('.').map(Number);
    if (octets.length !== 4 || octets.some(octet => !Number.isInteger(octet) || octet < 0 || octet > 255)) return null;
    address = `${address.slice(0, lastColon)}:${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`;
  }
  const halves = address.split('::');
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const groups = [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right];
  if (groups.length !== 8 || groups.some(group => !/^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.map(group => Number.parseInt(group, 16));
}

export function isPublicIpAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a, b, c] = address.split('.').map(Number);
    return !(
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168 || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }

  if (family === 6) {
    const groups = expandIpv6(address);
    if (!groups) return false;
    const isIpv4Mapped = groups.slice(0, 5).every(group => group === 0) && groups[5] === 0xffff;
    if (isIpv4Mapped) {
      const high = groups[6];
      const low = groups[7];
      return isPublicIpAddress(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
    }

    // Permit only global-unicast 2000::/3, excluding documentation,
    // transition, and special-purpose allocations with non-public semantics.
    return (groups[0] & 0xe000) === 0x2000
      && !(groups[0] === 0x2001 && (groups[1] <= 0x01ff || groups[1] === 0x0db8))
      && !(groups[0] === 0x3fff && (groups[1] & 0xf000) === 0)
      && groups[0] !== 0x2002;
  }

  return false;
}

export type EndpointPolicy = {
  /** When present, restrict destinations to these origins. Omit to allow any validated origin. */
  allowedOrigins?: readonly string[];
  /** Allow loopback and .local origins only while running a development build. */
  allowDevelopmentPrivateEndpoints?: boolean;
  /** Backward-compatible explicit development allowlist used by marketplace sources. */
  developmentPrivateOrigins?: readonly string[];
  resolve?: typeof lookup;
};

function awaitWithAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  signal.throwIfAborted();
  return new Promise<T>((resolve, reject) => {
    const cleanup = () => signal.removeEventListener('abort', onAbort);
    const onAbort = () => {
      cleanup();
      reject(signal.reason ?? new DOMException('The operation was aborted', 'AbortError'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      value => { cleanup(); resolve(value); },
      error => { cleanup(); reject(error); },
    );
  });
}

async function resolveTrustedEndpoint(value: string | URL, policy: EndpointPolicy = {}): Promise<{ url: URL; addresses: ResolvedAddress[] }> {
  const url = new URL(value.toString());
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const literalFamily = isIP(hostname);
  const isLoopback = hostname === '127.0.0.1' || hostname === '::1' || BLOCKED_HOSTNAMES.has(hostname);
  const isDevelopmentPrivateOrigin = process.env.NODE_ENV !== 'production' &&
    (policy.allowDevelopmentPrivateEndpoints === true || policy.developmentPrivateOrigins?.includes(url.origin) === true) &&
    (isLoopback || hostname.endsWith('.local') || hostname.endsWith('.localhost'));

  if (url.username || url.password || (url.protocol !== 'https:' && !(isDevelopmentPrivateOrigin && url.protocol === 'http:'))) {
    throw new Error('Only credential-free HTTPS endpoints are permitted outside local development');
  }

  if (policy.allowedOrigins && !policy.allowedOrigins.includes(url.origin)) {
    throw new Error('Endpoint is not admitted for this deployment');
  }

  if (!isDevelopmentPrivateOrigin && (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith('.localhost'))) {
    throw new Error('Private endpoints are not permitted');
  }

  const resolve = policy.resolve ?? lookup;
  const addresses: ResolvedAddress[] = literalFamily
    ? [{ address: hostname, family: literalFamily }]
    : await resolve(hostname, { all: true, verbatim: true });

  if (!addresses.length || (
    !isDevelopmentPrivateOrigin &&
    addresses.some(({ address }) => !isPublicIpAddress(address))
  )) {
    throw new Error('Endpoint resolves to a private or reserved address');
  }

  return { url, addresses };
}

/** Validate a destination before the server sends it credentials or a request. */
export async function assertTrustedHttpsEndpoint(value: string | URL, policy: EndpointPolicy = {}): Promise<URL> {
  return (await resolveTrustedEndpoint(value, policy)).url;
}

function bodyToNodeStream(body: BodyInit | null): Readable | undefined {
  if (body === null) return undefined;
  if (typeof body === 'string' || body instanceof Uint8Array) return Readable.from([body]);
  if (body instanceof ArrayBuffer) return Readable.from([Buffer.from(body)]);
  if (ArrayBuffer.isView(body)) return Readable.from([Buffer.from(body.buffer, body.byteOffset, body.byteLength)]);
  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    return Readable.fromWeb(body.stream() as import('node:stream/web').ReadableStream);
  }
  if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) {
    return Readable.fromWeb(body as import('node:stream/web').ReadableStream);
  }
  throw new Error('Unsupported outbound request body');
}

/**
 * Fetch an admitted destination over a socket pinned to the exact public DNS
 * answer that was validated. Redirects are rejected, never followed with the
 * original credential. The response remains streamed for OpenAI-compatible
 * providers; the upstream caller owns its response-byte/time budget.
 */
export function createTrustedFetch(policy: EndpointPolicy = {}) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const originalRequest = typeof Request !== 'undefined' && input instanceof Request ? input : undefined;
    const requestUrl = originalRequest
      ? originalRequest.url
      : input instanceof URL
        ? input.toString()
        : String(input);
    const signal = init?.signal || originalRequest?.signal;
    signal?.throwIfAborted();
    const { url, addresses } = await awaitWithAbort(resolveTrustedEndpoint(requestUrl, policy), signal);
    // DNS lookup itself is provided by Node's system resolver and is not
    // cancellable, but an expired request must never proceed to an HTTP socket.
    signal?.throwIfAborted();
    const address = addresses[0];
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    const method = (init?.method || originalRequest?.method || 'GET').toUpperCase();
    const headers = new Headers(originalRequest?.headers);
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
    headers.delete('host');
    headers.delete('connection');
    headers.delete('content-length');

    const transport = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const body = init?.body ?? originalRequest?.body ?? null;
    const nodeBody = bodyToNodeStream(body);
    const response = await new Promise<Response>((resolve, reject) => {
      const request = transport(url, {
        method,
        headers: Object.fromEntries(headers.entries()),
        signal: signal || undefined,
        ...(url.protocol === 'https:' ? { servername: isIP(hostname) ? undefined : hostname } : {}),
        lookup: ((requestedHostname: string, options: any, callback: any) => {
          if (requestedHostname.replace(/^\[|\]$/g, '').toLowerCase() !== hostname.toLowerCase()) {
            callback(new Error('Outbound host changed during connection'));
            return;
          }
          if (options?.all) callback(null, [address]);
          else callback(null, address.address, address.family);
        }) as any,
      }, incoming => {
        if (incoming.statusCode && incoming.statusCode >= 300 && incoming.statusCode < 400) {
          incoming.destroy();
          request.destroy();
          reject(new Error('Redirected remote endpoints are not permitted'));
          return;
        }
        const responseHeaders = new Headers();
        for (const [key, value] of Object.entries(incoming.headers)) {
          if (typeof value === 'string') responseHeaders.set(key, value);
          else if (Array.isArray(value)) for (const item of value) responseHeaders.append(key, item);
        }
        // Fetch forbids a body for these statuses and for HEAD responses.
        // Drain the Node response instead of throwing inside the HTTP callback.
        const bodyless = method === 'HEAD' || incoming.statusCode === 204 || incoming.statusCode === 205;
        if (bodyless) incoming.resume();
        const stream = bodyless ? null : Readable.toWeb(incoming) as ReadableStream<Uint8Array>;
        resolve(new Response(stream, {
          status: incoming.statusCode || 502,
          statusText: incoming.statusMessage,
          headers: responseHeaders,
        }));
      });
      request.once('error', reject);
      if (nodeBody) nodeBody.pipe(request);
      else request.end();
    });
    return response;
  };
}

export function customAiAllowedOrigins(): string[] {
  return (process.env.MARKETPLACE_CUSTOM_AI_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

/** Local/BYOK AI is enabled unless a deployer explicitly disables it. */
export function localAiConfigurationEnabled(): boolean {
  return !['1', 'true', 'yes', 'on'].includes(
    (process.env.MARKETPLACE_DISABLE_LOCAL_AI || '').trim().toLowerCase()
  );
}

export function customAiEndpointPolicy(): EndpointPolicy {
  const allowedOrigins = customAiAllowedOrigins();
  return {
    ...(allowedOrigins.length ? { allowedOrigins } : {}),
    allowDevelopmentPrivateEndpoints: true,
  };
}
