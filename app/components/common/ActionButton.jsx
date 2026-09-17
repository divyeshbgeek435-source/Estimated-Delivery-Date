import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";

/**
 * Polaris web components do not reliably receive React 18 onClick.
 * Attach a native listener on the host element instead.
 */
export function ActionButton({ onClick, to, children, ...props }) {
  const ref = useRef(null);
  const navigate = useNavigate();
  const onClickRef = useRef(onClick);
  const toRef = useRef(to);
  onClickRef.current = onClick;
  toRef.current = to;

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const handleClick = (event) => {
      if (!onClickRef.current && !toRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      onClickRef.current?.(event);
      if (toRef.current) navigate(toRef.current);
    };
    node.addEventListener("click", handleClick, true);
    return () => node.removeEventListener("click", handleClick, true);
  }, [navigate]);

  return (
    <s-button ref={ref} {...(to ? { href: to } : {})} {...props}>
      {children}
    </s-button>
  );
}

export function HostChoiceList({ onChange, children, ...props }) {
  const ref = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const handleChange = (event) => {
      const target = event?.currentTarget || event?.target || node;
      // Snapshot values before React state updaters run - web component events can
      // clear currentTarget, which caused "Cannot read properties of null (reading 'values')".
      const values = target?.values ? [...target.values] : undefined;
      const value = target?.value;
      onChangeRef.current?.({
        ...event,
        currentTarget: { values, value },
        target: { values, value },
      });
    };
    node.addEventListener("change", handleChange);
    return () => node.removeEventListener("change", handleChange);
  }, []);

  return (
    <s-choice-list ref={ref} {...props}>
      {children}
    </s-choice-list>
  );
}

function searchFieldValue(event, fallbackNode) {
  const path = typeof event.composedPath === "function" ? event.composedPath() : [];
  const field =
    path.find((item) => item?.nodeName === "INPUT" || item?.tagName === "S-SEARCH-FIELD") ||
    event.currentTarget ||
    event.target ||
    fallbackNode;
  return String(field?.value ?? fallbackNode?.value ?? "");
}

/** Native input events do not reliably reach React inside Polaris section/table hosts. */
export function HostSearchInput({ value, onChange, ...props }) {
  const wrapRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return undefined;
    const handle = (event) => {
      onChangeRef.current?.(searchFieldValue(event, root.querySelector("input")));
    };
    root.addEventListener("input", handle, true);
    root.addEventListener("search", handle, true);
    root.addEventListener("change", handle, true);
    return () => {
      root.removeEventListener("input", handle, true);
      root.removeEventListener("search", handle, true);
      root.removeEventListener("change", handle, true);
    };
  }, []);

  return (
    <span ref={wrapRef} className="edd-host-search">
      <input
        type="search"
        {...props}
        value={value}
        onChange={(event) => onChangeRef.current?.(event.currentTarget.value)}
        onInput={(event) => onChangeRef.current?.(event.currentTarget.value)}
      />
    </span>
  );
}

export function HostSearchField({ value, onChange, ...props }) {
  const ref = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const handle = (event) => {
      onChangeRef.current?.(searchFieldValue(event, node));
    };
    node.addEventListener("input", handle, true);
    node.addEventListener("change", handle, true);
    return () => {
      node.removeEventListener("input", handle, true);
      node.removeEventListener("change", handle, true);
    };
  }, []);

  return <s-search-field ref={ref} value={value} {...props}></s-search-field>;
}

