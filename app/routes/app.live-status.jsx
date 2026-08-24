import { requireAdmin } from "../lib/auth.server";
import { getPublishStatus } from "../services/widgets/widget.server";

export const loader = async ({ request }) => {
  const { merchant } = await requireAdmin(request);
  const widgetId = new URL(request.url).searchParams.get("widgetId");
  return getPublishStatus(merchant.id, widgetId || null);
};
