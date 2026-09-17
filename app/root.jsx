import { Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from "react-router";
import { isRecoverableClientError } from "./lib/recoverable-error";

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const recoverable = isRecoverableClientError(error);
  const message = recoverable
    ? "The app lost its connection. Reloading…"
    : String(error?.message || error || "Something went wrong.");

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Estimated Delivery Date</title>
        {recoverable ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `try{var k="edd.recover-reload";var n=Date.now();var last=Number(sessionStorage.getItem(k)||0);if(n-last>12000){sessionStorage.setItem(k,String(n));setTimeout(function(){location.reload()},400)}}catch(e){}`,
            }}
          />
        ) : null}
      </head>
      <body>
        <div className="edd-recover" style={{ fontFamily: "system-ui, sans-serif", padding: "1.5rem", maxWidth: "36rem" }}>
          <h1 style={{ fontSize: "1.2rem", margin: "0 0 0.5rem" }}>
            {recoverable ? "Connection interrupted" : "Application error"}
          </h1>
          <p style={{ margin: "0 0 1rem", color: "#303030" }}>{message}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Reload app
          </button>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
