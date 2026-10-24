export class RequestBodyTooLargeError extends Error {
  constructor() {
    super('Request body exceeds the configured limit');
    this.name = 'RequestBodyTooLargeError';
  }
}

export class ResponseBodyTooLargeError extends Error {
  constructor() {
    super('Remote JSON response exceeds the configured limit');
    this.name = 'ResponseBodyTooLargeError';
  }
}

export const SOURCE_GRAPHQL_RESPONSE_MAX_BYTES = 2 * 1024 * 1024;
export const SOURCE_INTROSPECTION_RESPONSE_MAX_BYTES = 8 * 1024 * 1024;
export const BOUNDED_JSON_RESPONSE_MAX_CHUNKS = 8_192;
export const BOUNDED_JSON_REQUEST_MAX_CHUNKS = BOUNDED_JSON_RESPONSE_MAX_CHUNKS;
export const MCP_TRANSPORT_REQUEST_MAX_BYTES = 128 * 1024;

export async function cancelResponseBody(response: Response): Promise<void> {
  if (!response.body || response.body.locked) return;
  try {
    // A clone is a tee branch. Awaiting its cancellation can block the SDK
    // from ever consuming the original response, so initiate cleanup only.
    void response.body.cancel().catch(() => {});
  } catch {
    // Preserve the bounded-response error if the remote stream already failed.
  }
}

/** Stream, byte, and chunk-bound JSON before decoding or allocating its object graph. */
export async function readJsonResponseBounded<T = unknown>(response: Response, maxBytes: number): Promise<T> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new RangeError('Response limit must be a positive safe integer');

  const contentLength = response.headers.get('content-length');
  let declaredLength: number | undefined;
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) {
      await cancelResponseBody(response);
      throw new SyntaxError('Invalid remote Content-Length');
    }
    declaredLength = Number(contentLength);
    if (!Number.isSafeInteger(declaredLength) || declaredLength > maxBytes) {
      await cancelResponseBody(response);
      throw new ResponseBodyTooLargeError();
    }
  }
  if (!response.body) throw new SyntaxError('Missing remote JSON response body');

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) throw new SyntaxError('Invalid remote response chunk');
      if (chunks.length >= BOUNDED_JSON_RESPONSE_MAX_CHUNKS) throw new ResponseBodyTooLargeError();
      size += value.byteLength;
      if (size > maxBytes) throw new ResponseBodyTooLargeError();
      chunks.push(value);
    }
    if (declaredLength !== undefined && size !== declaredLength) {
      throw new SyntaxError('Remote response length did not match Content-Length');
    }

    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }

    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new SyntaxError('Invalid remote JSON response encoding');
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new SyntaxError('Invalid remote JSON response');
    }
  } catch (error) {
    try {
      // Tee cancellation waits for the original branch; return the bounded
      // error now so its consumer can proceed (or cancel independently).
      void reader.cancel(error).catch(() => {});
    } catch {
      // A failed/aborted stream may already be closed.
    }
    throw error;
  } finally {
    reader.releaseLock();
  }
}

/** Read a request body without allowing an unbounded JSON parse allocation. */
function cancelRequestBody(request: Request): void {
  if (!request.body || request.body.locked) return;
  try {
    // Do not await cancellation: Request.clone() tees streams, and cancelling
    // one branch must not hold the original request's downstream fetch open.
    void request.body.cancel().catch(() => {});
  } catch {
    // An aborted or already-closed stream needs no further cleanup.
  }
}

function cancelRequestReader(reader: ReadableStreamDefaultReader<Uint8Array>, reason: unknown): void {
  try {
    // Tee cancellation can wait for the other branch; keep the caller moving.
    void reader.cancel(reason).catch(() => {});
  } catch {
    // An aborted or already-closed stream needs no further cleanup.
  }
}

/** Read bounded JSON; cloned ingress bodies stay independently usable downstream. */
export async function readJsonBodyBounded<T = unknown>(
  request: Request,
  maxBytes: number,
  maxChunks = BOUNDED_JSON_REQUEST_MAX_CHUNKS,
): Promise<T> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1
    || !Number.isSafeInteger(maxChunks) || maxChunks < 1) {
    throw new RangeError('Request limits must be positive safe integers');
  }

  const declaredLength = request.headers.get('content-length');
  if (declaredLength && /^\d+$/.test(declaredLength)) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength > maxBytes) {
      cancelRequestBody(request);
      throw new RequestBodyTooLargeError();
    }
  }

  if (!request.body) throw new SyntaxError('Missing request body');
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let chunks = 0;
  let text = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!(value instanceof Uint8Array)) throw new SyntaxError('Invalid request body chunk');
      if (chunks >= maxChunks) throw new RequestBodyTooLargeError();
      chunks += 1;
      size += value.byteLength;
      if (size > maxBytes) throw new RequestBodyTooLargeError();
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch (error) {
    cancelRequestReader(reader, error);
    throw error;
  } finally {
    reader.releaseLock();
  }

  return JSON.parse(text) as T;
}

export type JsonSchemaLike = Record<string, unknown>;

export function parseBoundedStringMap(
  value: unknown,
  limits: { maxEntries?: number; maxKeyLength?: number; maxValueLength?: number } = {},
): Record<string, string> {
  if (value === undefined || value === null) return {};
  if (!isRecord(value)) throw new SyntaxError('Expected a bounded string map');
  const maxEntries = limits.maxEntries ?? 20;
  const maxKeyLength = limits.maxKeyLength ?? 160;
  const maxValueLength = limits.maxValueLength ?? 4_096;
  const entries = Object.entries(value);
  if (entries.length > maxEntries) throw new SyntaxError('String map contains too many entries');
  const result: Record<string, string> = {};
  let totalChars = 0;
  for (const [key, item] of entries) {
    // Canonical source IDs include encodeURIComponent's unescaped punctuation (notably dots).
    if (!/^[A-Za-z0-9:._~!*'()_-]{1,160}$/.test(key)
      || key === '__proto__' || key === 'prototype' || key === 'constructor'
      || key.length > maxKeyLength
      || typeof item !== 'string' || item.length > maxValueLength || /[\r\n]/.test(item)) {
      throw new SyntaxError('String map contains an invalid entry');
    }
    totalChars += key.length + item.length;
    if (totalChars > 24 * 1024) throw new SyntaxError('String map exceeds its aggregate limit');
    result[key] = item;
  }
  return result;
}

type ValidationIssue = { path: string; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function validateUnknownValue(value: unknown, path: string, depth: number, issues: ValidationIssue[]): void {
  if (depth > 8) {
    issues.push({ path, reason: 'maximum nesting depth exceeded' });
    return;
  }
  if (typeof value === 'string') {
    if (value.length > 2_000) issues.push({ path, reason: 'string exceeds the global limit' });
    return;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) issues.push({ path, reason: 'number must be finite' });
    return;
  }
  if (value === null || typeof value === 'boolean') return;
  if (Array.isArray(value)) {
    if (value.length > 100) issues.push({ path, reason: 'array exceeds the global limit' });
    value.forEach((item, index) => validateUnknownValue(item, `${path}[${index}]`, depth + 1, issues));
    return;
  }
  if (isRecord(value)) {
    if (Object.keys(value).length > 100) issues.push({ path, reason: 'object exceeds the global property limit' });
    for (const [key, nested] of Object.entries(value)) {
      if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
        issues.push({ path: `${path}.${key}`, reason: 'unsafe property name' });
      } else {
        validateUnknownValue(nested, `${path}.${key}`, depth + 1, issues);
      }
    }
    return;
  }
  issues.push({ path, reason: 'value is not JSON-safe' });
}

function validateValue(
  value: unknown,
  schema: JsonSchemaLike,
  path: string,
  depth: number,
  issues: ValidationIssue[],
): void {
  if (depth > 8) {
    issues.push({ path, reason: 'maximum nesting depth exceeded' });
    return;
  }

  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (types[0] !== undefined) {
    const matches = types.some(type => {
      if (type === 'object') return isRecord(value);
      if (type === 'array') return Array.isArray(value);
      if (type === 'string') return typeof value === 'string';
      if (type === 'integer') return typeof value === 'number' && Number.isSafeInteger(value);
      if (type === 'number') return typeof value === 'number' && Number.isFinite(value);
      if (type === 'boolean') return typeof value === 'boolean';
      if (type === 'null') return value === null;
      return false;
    });
    if (!matches) {
      issues.push({ path, reason: 'type mismatch' });
      return;
    }
  }

  if (Array.isArray(schema.enum) && !schema.enum.some(candidate => Object.is(candidate, value))) {
    issues.push({ path, reason: 'value is not an allowed enum member' });
  }

  if (typeof value === 'string') {
    if (value.length > 2_000) issues.push({ path, reason: 'string exceeds the global limit' });
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) issues.push({ path, reason: 'string is too short' });
    if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) issues.push({ path, reason: 'string is too long' });
    if (typeof schema.pattern === 'string') {
      try {
        if (!new RegExp(schema.pattern).test(value)) issues.push({ path, reason: 'string format is invalid' });
      } catch {
        issues.push({ path, reason: 'invalid server schema pattern' });
      }
    }
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) issues.push({ path, reason: 'number must be finite' });
    if (typeof schema.minimum === 'number' && value < schema.minimum) issues.push({ path, reason: 'number is below minimum' });
    if (typeof schema.maximum === 'number' && value > schema.maximum) issues.push({ path, reason: 'number exceeds maximum' });
  }

  if (Array.isArray(value)) {
    if (value.length > 100) issues.push({ path, reason: 'array exceeds the global limit' });
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) issues.push({ path, reason: 'array has too few items' });
    if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) issues.push({ path, reason: 'array has too many items' });
    if (schema.uniqueItems === true && new Set(value.map(canonicalJson)).size !== value.length) {
      issues.push({ path, reason: 'array items must be unique' });
    }
    if (isRecord(schema.items)) value.forEach((item, index) => validateValue(item, schema.items as JsonSchemaLike, `${path}[${index}]`, depth + 1, issues));
  }

  if (isRecord(value)) {
    if (Object.keys(value).length > 100) issues.push({ path, reason: 'object exceeds the global property limit' });
    const properties = isRecord(schema.properties) ? schema.properties : {};
    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const key of required) {
      if (typeof key === 'string' && !Object.hasOwn(value, key)) issues.push({ path: `${path}.${key}`, reason: 'required property is missing' });
    }
    for (const [key, nestedValue] of Object.entries(value)) {
      if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
        issues.push({ path: `${path}.${key}`, reason: 'unsafe property name' });
        continue;
      }
      const propertySchema = properties[key];
      if (isRecord(propertySchema)) {
        validateValue(nestedValue, propertySchema, `${path}.${key}`, depth + 1, issues);
      } else if (schema.additionalProperties === false) {
        issues.push({ path: `${path}.${key}`, reason: 'unknown property' });
      } else {
        // JSON Schema admits undeclared properties by default; MCP UI cards send
        // context such as countryCode that handlers ignore.
        validateUnknownValue(nestedValue, `${path}.${key}`, depth + 1, issues);
      }
    }
  }
}

/** Validate tool arguments against the same JSON Schema advertised by tools/list. */
export function validateJsonSchema(value: unknown, schema: JsonSchemaLike): { valid: boolean; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];
  validateValue(value, schema, '$', 0, issues);
  return { valid: issues.length === 0, issues };
}
