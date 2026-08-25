import { AppLink } from "./AppLink";

export function AppNav() {
  return (
    <s-app-nav>
      <AppLink nav to="/app">
        Home
      </AppLink>
      <AppLink nav to="/app/analytics">
        Analytics
      </AppLink>
    </s-app-nav>
  );
}
