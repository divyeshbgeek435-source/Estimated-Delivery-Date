import { useEffect, useRef } from "react";
import { buildElementSelection, parseElementSelection } from "../../lib/element-styles";

/**
 * Click-to-select hotspot. When selected + contentEditable, edits text in place.
 */
export function EditableHotspot({
  elementId,
  stepIndex = null,
  selectedElement,
  onSelect,
  interactive = false,
  style,
  className = "",
  as: Tag = "div",
  contentEditable = false,
  value,
  onChange,
  children,
  title,
  ...rest
}) {
  const selectionKey = buildElementSelection(elementId, stepIndex);
  const selected = interactive && selectedElement === selectionKey;
  const ref = useRef(null);
  const { id: selectedId } = parseElementSelection(selectedElement);
  const groupSelected =
    interactive &&
    stepIndex != null &&
    (selectedId === elementId || selectedElement === elementId);

  useEffect(() => {
    if (!contentEditable || !selected || !ref.current) return;
    const node = ref.current;
    if (document.activeElement === node) return;
    const text = String(value ?? "");
    if (node.textContent !== text) node.textContent = text;
  }, [contentEditable, selected, value]);

  if (!interactive) {
    return (
      <Tag className={className} style={style} {...rest}>
        {children}
      </Tag>
    );
  }

  const editable = Boolean(contentEditable && selected && onChange);

  return (
    <Tag
      {...rest}
      ref={ref}
      className={`edd-hotspot${className ? ` ${className}` : ""}${selected || groupSelected ? " is-selected" : ""}`}
      style={style}
      data-edd-element={selectionKey}
      title={title || `Edit ${elementId}`}
      role={Tag === "button" ? undefined : "button"}
      tabIndex={0}
      contentEditable={editable}
      suppressContentEditableWarning
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(selectionKey);
        rest.onClick?.(event);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          if (!editable) {
            event.preventDefault();
            onSelect?.(selectionKey);
          }
        }
        if (editable && event.key === "Enter" && Tag !== "div" && Tag !== "p") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      onInput={
        editable
          ? (event) => {
              onChange?.(event.currentTarget.textContent || "");
            }
          : undefined
      }
      onBlur={
        editable
          ? (event) => {
              onChange?.(event.currentTarget.textContent || "");
            }
          : undefined
      }
    >
      {editable ? null : children}
    </Tag>
  );
}
