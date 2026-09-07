import { Outlet } from "react-router";
import { requireAdmin } from "../lib/auth.server";

export const loader = async ({ request }) => {
  await requireAdmin(request);
  return {};
};

export default function WidgetsLayout() {
  return <Outlet />;
}
