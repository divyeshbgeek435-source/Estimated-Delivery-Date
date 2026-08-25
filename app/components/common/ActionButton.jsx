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
    const handleChange = (event) => onChangeRef.current?.(event);
    node.addEventListener("change", handleChange);
    return () => node.removeEventListener("change", handleChange);
  }, []);

  return (
    <s-choice-list ref={ref} {...props} onChange={onChange}>
      {children}
    </s-choice-list>
  );
}

