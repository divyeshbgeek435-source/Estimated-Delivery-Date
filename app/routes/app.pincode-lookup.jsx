import { requireAdmin } from "../lib/auth.server";
import { lookupPostalCode } from "../lib/pincode.server";

export const loader = async ({ request }) => {
  await requireAdmin(request);
  const url = new URL(request.url);
  const country = url.searchParams.get("country") || "IN";
  const code = url.searchParams.get("code") || "";
  return lookupPostalCode(country, code);
};
