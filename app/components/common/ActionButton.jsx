import { useEffect, useRef } from "react";

/**
 * Polaris web components do not reliably receive React 18 onClick.
 * Attach a native listener on the host element instead.
 */
export function ActionButton({ onClick, children, ...props }) {
  const ref = useRef(null);
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const handleClick = (event) => {
      if (!onClickRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      onClickRef.current(event);
    };
    node.addEventListener("click", handleClick, true);
    return () => node.removeEventListener("click", handleClick, true);
  }, []);

  return (
    <s-button ref={ref} {...props}>
      {children}
    </s-button>
  );
}
