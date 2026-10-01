import { useEffect, useRef } from "react";
import { runsToEditorHtml } from "../../lib/rich-text";

const ACTIONS = [
  { id: "bold", label: "B", title: "Bold", command: "bold", className: "edd-text-editor__btn--bold" },
  { id: "italic", label: "I", title: "Italic", command: "italic", className: "edd-text-editor__btn--italic" },
  { id: "underline", label: "U", title: "Underline", command: "underline", className: "edd-text-editor__btn--underline" },
];

function htmlToMarkers(node) {
  let out = "";
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      out += child.textContent || "";
      return;
    }
    if (child.nodeName === "BR") {
      out += "\n";
      return;
    }
    if (child.nodeName === "DIV" || child.nodeName === "P") {
      if (out && !out.endsWith("\n")) out += "\n";
      out += htmlToMarkers(child);
      return;
    }
    const inner = htmlToMarkers(child);
    const name = child.nodeName;
    if (name === "STRONG" || name === "B") out += `**${inner}**`;
    else if (name === "EM" || name === "I") out += `*${inner}*`;
    else if (name === "U") out += `__${inner}__`;
    else out += inner;
  });
  return out.replace(/\u00a0/g, " ");
}

export function TextEditorField({
  label,
  name,
  value,
  onChange,
  placeholder = "",
  error,
  multiline = false,
  rows = 3,
  maxLength,
}) {
  const fieldRef = useRef(null);
  const serializedRef = useRef(null);
  const text = String(value || "");

  useEffect(() => {
    const field = fieldRef.current;
    if (!field || serializedRef.current === text) return;
    serializedRef.current = text;
    field.innerHTML = runsToEditorHtml(text);
  }, [text]);

  const publish = () => {
    const field = fieldRef.current;
    if (!field) return;
    const next = htmlToMarkers(field);
    if (maxLength && next.length > maxLength) {
      field.innerHTML = runsToEditorHtml(serializedRef.current || "");
      return;
    }
    serializedRef.current = next;
    onChange(next);
  };

  const apply = (command) => {
    const field = fieldRef.current;
    if (!field) return;
    field.focus();
    document.execCommand("styleWithCSS", false, false);
    document.execCommand(command);
    publish();
  };

  return (
    <div className={`edd-text-editor${error ? " has-error" : ""}`}>
      <span className="edd-text-editor__label">{label}</span>
      <div className="edd-text-editor__bar" role="toolbar" aria-label={`${label} formatting`}>
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            className={`edd-text-editor__btn ${action.className}`}
            title={action.title}
            aria-label={action.title}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => apply(action.command)}
          >
            {action.label}
          </button>
        ))}
      </div>
      <div
        ref={fieldRef}
        className="edd-text-editor__input"
        contentEditable
        role="textbox"
        aria-multiline={multiline ? "true" : "false"}
        aria-label={label}
        data-placeholder={placeholder}
        style={multiline ? { minHeight: `${Math.max(rows, 2) * 1.45}rem` } : undefined}
        suppressContentEditableWarning
        onInput={publish}
        onKeyDown={(event) => {
          if (!multiline && event.key === "Enter") event.preventDefault();
        }}
        onPaste={(event) => {
          event.preventDefault();
          const pasted = event.clipboardData?.getData("text/plain") || "";
          document.execCommand("insertText", false, pasted);
        }}
      />
      {name ? <input type="hidden" name={name} value={text} /> : null}
      {error ? <span className="edd-text-editor__error">{error}</span> : null}
    </div>
  );
}
