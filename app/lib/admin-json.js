/** Same-origin JSON fetch that never throws. App Bridge still injects the session token. */
export async function loadAdminJson(url) {
  try {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") || "";
    if (!type.includes("json")) return null;
    return await response.json();
  } catch {
    return null;
  }
}
