export const MARKET_SCOPES = ["read_markets"];

export async function ensureScopes(shopify, scopes) {
  if (!shopify?.scopes?.query || !scopes?.length) return false;
  try {
    const current = await shopify.scopes.query();
    const granted = current?.granted || [];
    const needed = scopes.filter((scope) => !granted.includes(scope));
    if (!needed.length) return true;
    const result = await shopify.scopes.request(needed);
    const approved = result?.detail?.granted || [];
    return result?.result === "granted-all" || needed.every((scope) => approved.includes(scope));
  } catch {
    return false;
  }
}
