/**
 * Demo shops that moved to a new hostname while keeping the same backend.
 * Source IDs derive from the base URL, so a move changes the ID. Carts,
 * cart proofs and sessions are issued by the same server, so they remain
 * valid and are carried over to the new ID instead of being orphaned.
 *
 * Only exact v2 IDs are renamed; v1 IDs stay orphaned (see source-identity).
 */
export const SOURCE_ID_RENAMES: Readonly<Record<string, string>> = {
  'source-v2-openfront-https_3A_2F_2Fimpossible-tees.openship.org':
    'source-v2-openfront-https_3A_2F_2Fe-commerce.openship.org',
  'source-v2-openfront-restaurant-https_3A_2F_2Fcraft-burgers.openship.org':
    'source-v2-openfront-restaurant-https_3A_2F_2Frestaurant.openship.org',
};

/**
 * Re-key a per-source record. When both the old and new keys exist, the
 * new entry wins and the old one is dropped, so nothing is duplicated.
 */
export function renameSourceKeys<T>(
  record: Record<string, T>,
): { record: Record<string, T>; changed: boolean } {
  let changed = false;
  const next: Record<string, T> = { ...record };
  for (const [oldId, newId] of Object.entries(SOURCE_ID_RENAMES)) {
    if (!Object.prototype.hasOwnProperty.call(next, oldId)) continue;
    if (!Object.prototype.hasOwnProperty.call(next, newId)) next[newId] = next[oldId];
    delete next[oldId];
    changed = true;
  }
  return { record: changed ? next : record, changed };
}
