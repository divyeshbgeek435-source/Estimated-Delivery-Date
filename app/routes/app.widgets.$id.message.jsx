import { redirect } from "react-router";

export const loader = async ({ params }) => {
  throw redirect(`/app/widgets/${params.id}?tab=content`);
};
