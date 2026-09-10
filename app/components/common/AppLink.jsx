import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";

function pathOf(to) {
  return String(to || "").split("?")[0];
}

/**
 * Polaris s-link href can leave the embedded app (full reload, lost session).
 * Route in-app links through React Router instead.
 */
export function AppLink({ to, children, nav = false, onClick, ...props }) {
  const navigate = useNavigate();
  const location = useLocation();
  const ref = useRef(null);
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;
  const path = pathOf(to);
  const active = nav
    ? path === "/app"
      ? location.pathname === "/app" || location.pathname === "/app/"
      : location.pathname === path || location.pathname.startsWith(`${path}/`)
    : false;

  useEffect(() => {
    const handleClick = (event) => {
      const node = ref.current;
      if (!node) return;
      const chain = typeof event.composedPath === "function" ? event.composedPath() : [];
      if (!chain.includes(node) && event.target !== node && !node.contains(event.target)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onClickRef.current?.(event);
      navigate(to);
    };
    window.addEventListener("click", handleClick, true);
    return () => window.removeEventListener("click", handleClick, true);
  }, [navigate, to]);

  return (
    <s-link ref={ref} href={to} {...(active ? { "aria-current": "page" } : {})} {...props}>
      {children}
    </s-link>
  );
}
