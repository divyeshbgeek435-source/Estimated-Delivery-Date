import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";

function NavLinkItem({ to, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const ref = useRef(null);
  const active =
    to === "/app"
      ? location.pathname === "/app" || location.pathname === "/app/"
      : location.pathname === to || location.pathname.startsWith(`${to}/`);

  useEffect(() => {
    const handleClick = (event) => {
      const node = ref.current;
      if (!node) return;
      const path = typeof event.composedPath === "function" ? event.composedPath() : [];
      if (!path.includes(node) && event.target !== node && !node.contains(event.target)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      navigate(to);
    };
    window.addEventListener("click", handleClick, true);
    return () => window.removeEventListener("click", handleClick, true);
  }, [navigate, to]);

  return (
    <s-link ref={ref} href={to} {...(active ? { "aria-current": "page" } : {})}>
      {children}
    </s-link>
  );
}

export function AppNav() {
  return (
    <s-app-nav>
      <NavLinkItem to="/app">Home</NavLinkItem>
      <NavLinkItem to="/app/analytics">Analytics</NavLinkItem>
    </s-app-nav>
  );
}
