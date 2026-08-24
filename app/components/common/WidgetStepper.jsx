import { EDITOR_TABS } from "../../lib/constants";

export function WidgetStepper({ widgetId, current }) {
  return (
    <nav className="edd-tabs" aria-label="Widget setup steps">
      {EDITOR_TABS.map((step) => (
        <s-link key={step.id} href={`/app/widgets/${widgetId}?tab=${step.id}`}>
          {current === step.id ? <s-text type="strong">{step.label}</s-text> : step.label}
        </s-link>
      ))}
    </nav>
  );
}

export function EditorLayout({ children, preview }) {
  return (
    <div className="edd-editor">
      <div className="edd-editor__form">{children}</div>
      <aside className="edd-editor__preview" aria-label="Live preview">
        <s-section heading="Live preview">{preview}</s-section>
      </aside>
    </div>
  );
}
