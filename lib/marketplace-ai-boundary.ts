type JsonRecord = Record<string, unknown>;

const MODEL_TOOL_ALLOWLIST = new Set([
  'getAvailableStores',
  'getAvailableCountries',
  'getAvailableRegions',
  'discoverMarketplace',
  'discoverProducts',
  'discoverRestaurantMenus',
  'getProduct',
]);

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeLabel(value: unknown, max = 180): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  return text || undefined;
}

function parseTextOutput(output: JsonRecord): JsonRecord | undefined {
  const content = Array.isArray(output.content) ? output.content : [];
  for (const item of content) {
    if (!isRecord(item) || item.type !== 'text' || typeof item.text !== 'string') continue;
    try {
      const parsed = JSON.parse(item.text);
      if (isRecord(parsed)) return parsed;
    } catch {
      // Never pass unstructured source/tool text to a model.
    }
  }
  return undefined;
}

function projectCountries(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 250).flatMap(item => {
    if (!isRecord(item)) return [];
    const code = safeLabel(item.code ?? item.countryCode, 3)?.toUpperCase();
    const name = safeLabel(item.name ?? item.countryName, 80);
    const currency = safeLabel(item.currency, 3)?.toUpperCase();
    return code && name ? [{ code, name, ...(currency ? { currency } : {}) }] : [];
  });
}

function projectStores(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).flatMap(item => {
    if (!isRecord(item)) return [];
    const id = safeLabel(item.id ?? item.storeId, 160);
    const name = safeLabel(item.name, 120);
    const platform = safeLabel(item.platform, 48);
    if (!id || !name || !platform) return [];
    const verticals = Array.isArray(item.verticals)
      ? item.verticals.flatMap(vertical => {
          const label = safeLabel(vertical, 32);
          return label ? [label] : [];
        }).slice(0, 10)
      : [];
    const countries = projectCountries(item.countries);
    const capabilities = Array.isArray(item.discoveryCapabilities)
      ? item.discoveryCapabilities.slice(0, 10).flatMap(capability => {
          if (!isRecord(capability)) return [];
          const vertical = safeLabel(capability.vertical, 32);
          const resultKind = safeLabel(capability.resultKind, 64);
          const actions = Array.isArray(capability.actions)
            ? capability.actions.flatMap(action => {
                const label = safeLabel(action, 64);
                return label ? [label] : [];
              }).slice(0, 12)
            : [];
          return vertical && resultKind ? [{ vertical, resultKind, actions }] : [];
        })
      : [];
    return [{ id, name, platform, verticals, countries, discoveryCapabilities: capabilities,
      ...(safeLabel(item.address, 240) ? { address: safeLabel(item.address, 240) } : {}),
      ...(safeLabel(item.countryCode, 2) ? { countryCode: safeLabel(item.countryCode, 2) } : {}),
    }];
  });
}

function projectDiscovery(value: unknown): JsonRecord {
  if (!isRecord(value)) return { available: false };
  const sources = Array.isArray(value.sources) ? value.sources.slice(0, 20).flatMap(sourceValue => {
    if (!isRecord(sourceValue) || !isRecord(sourceValue.source)) return [];
    const source = sourceValue.source;
    const id = safeLabel(source.id, 160);
    const platform = safeLabel(source.platform, 48);
    const displayName = safeLabel(source.displayName, 120);
    if (!id || !platform || !displayName) return [];
    const results = Array.isArray(sourceValue.results) ? sourceValue.results.slice(0, 24).flatMap(resultValue => {
      if (!isRecord(resultValue) || !isRecord(resultValue.ref)) return [];
      const title = safeLabel(resultValue.title, 180);
      const resultId = safeLabel(resultValue.ref.id, 160);
      if (!title || !resultId) return [];
      const facts = isRecord(resultValue.facts) ? resultValue.facts : {};
      return [{ id: resultId, title, ...(typeof facts.available === 'boolean' ? { available: facts.available } : {}) }];
    }) : [];
    const allowedOutcomes = new Set(['matched', 'no_match', 'unavailable', 'location_mismatch', 'market_unavailable']);
    const allowedCoverage = new Set(['sampled', 'unknown']);
    const outcome = typeof sourceValue.outcome === 'string' && allowedOutcomes.has(sourceValue.outcome)
      ? sourceValue.outcome
      : 'unavailable';
    const coverage = typeof sourceValue.coverage === 'string' && allowedCoverage.has(sourceValue.coverage)
      ? sourceValue.coverage
      : 'unknown';
    return [{ id, platform, displayName, resultKind: safeLabel(sourceValue.resultKind, 64), outcome, coverage, results }];
  }) : [];

  return {
    schemaVersion: safeLabel(value.schemaVersion, 32),
    vertical: safeLabel(value.vertical, 32),
    ...(safeLabel(value.observedAt, 40) ? { observedAt: safeLabel(value.observedAt, 40) } : {}),
    ...(typeof value.totalResults === 'number' && Number.isSafeInteger(value.totalResults) ? { totalResults: value.totalResults } : {}),
    ...(typeof value.truncated === 'boolean' ? { truncated: value.truncated } : {}),
    sources,
  };
}

function extractProjected(toolName: string, output: JsonRecord): JsonRecord {
  if (output.isError === true) return { ok: false, message: 'The source request failed. No source details or credentials were returned.' };

  const parsed = parseTextOutput(output);
  if (toolName === 'getAvailableStores') {
    return { stores: projectStores(parsed?.stores), totalStores: Number(parsed?.totalStores) || 0 };
  }
  if (toolName === 'getAvailableCountries' || toolName === 'getAvailableRegions') {
    return { countries: projectCountries(parsed?.countries), totalCountries: Number(parsed?.totalCountries) || 0 };
  }
  if (toolName.startsWith('discover')) {
    return projectDiscovery(output.structuredContent ?? parsed);
  }
  if (toolName === 'getProduct' || toolName === 'loginUser') {
    return { ok: true, message: 'A customer interface is ready. Ask the user to review it and use its controls.' };
  }
  return { ok: true };
}

/** Strictly limit which MCP operations the LLM can call directly. */
export function isMarketplaceModelToolAllowed(name: string): boolean {
  return MODEL_TOOL_ALLOWLIST.has(name);
}

/** Convert MCP results to small public DTOs; `_meta`, HTML resources, and raw tool data never enter model context. */
export function projectMarketplaceToolOutput(toolName: string, output: unknown): { type: 'text'; value: string } {
  if (!isMarketplaceModelToolAllowed(toolName)) {
    return { type: 'text', value: JSON.stringify({ ok: false, message: 'This action requires the customer interface.' }) };
  }
  const projected = isRecord(output)
    ? extractProjected(toolName, output)
    : { ok: false, message: 'No safe result was available.' };
  return { type: 'text', value: JSON.stringify(projected) };
}

/** Replay text only, never saved tool calls, merchant HTML, or lifecycle actions. */
export function projectMarketplaceMessagesForModel(messages: unknown[]): unknown[] {
  return messages.flatMap((messageValue) => {
    if (!isRecord(messageValue) || (messageValue.role !== 'user' && messageValue.role !== 'assistant')) return [];
    const parts = Array.isArray(messageValue.parts)
      ? messageValue.parts.slice(0, 40).flatMap(part => {
          if (!isRecord(part)) return [];
          if (part.type === 'text' && typeof part.text === 'string') return [{ type: 'text', text: part.text.slice(0, 12_000) }];
          if (messageValue.role !== 'assistant') return [];
          return [];
        })
      : typeof messageValue.content === 'string'
        ? [{ type: 'text', text: messageValue.content.slice(0, 12_000) }]
        : [];
    if (parts.length === 0) return [];
    return [{ id: safeLabel(messageValue.id, 160) || `message-${parts.length}`, role: messageValue.role, parts }];
  });
}
