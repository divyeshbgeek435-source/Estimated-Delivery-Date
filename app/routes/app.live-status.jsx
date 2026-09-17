import { requireAdmin } from "../lib/auth.server";
import { getPublishStatus } from "../services/widgets/widget.server";

export const loader = async ({ request }) => {
  const { merchant } = await requireAdmin(request);
  const widgetId = new URL(request.url).searchParams.get("widgetId");
  return Response.json(await getPublishStatus(merchant.id, widgetId || null), {
    headers: { "Cache-Control": "no-store" },
  });
};
