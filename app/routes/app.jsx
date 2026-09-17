import { Outlet, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { authenticate } from "../shopify.server";
import { AppNav } from "../components/common/AppNav";
import { RecoverableError } from "../components/common/RecoverableError";
import { isRecoverableClientError } from "../lib/recoverable-error";
import appStyles from "../styles/app.css?url";

export const links = () => [{ rel: "stylesheet", href: appStyles }];

export const loader = async ({ request }) => {
  // Session only - avoid merchant profile GraphQL on every nested navigation.
  // Child routes call requireAdmin when they need merchant context.
  await authenticate.admin(request);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export function shouldRevalidate() {
  return false;
}

export default function App() {
  const { apiKey } = useLoaderData();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <AppNav />
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRecoverableClientError(error)) {
    return <RecoverableError />;
  }
  return boundary.error(error);
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
