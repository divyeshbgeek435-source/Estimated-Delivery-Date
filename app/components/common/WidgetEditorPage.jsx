import { Form } from "react-router";
import { ErrorBanner } from "./Feedback";
import { EditorLayout, WidgetStepper } from "./WidgetStepper";
import { DeliveryWidgetPreview } from "../widgets/DeliveryWidgetPreview";

export function WidgetEditorPage({
  widget,
  step,
  heading,
  children,
  previewProps,
  errors,
  submitLabel = "Save and continue",
}) {
  const preview = {
    heading: widget.messageConfig.heading,
    template: widget.messageConfig.template,
    icons: widget.iconConfig,
    style: widget.styleConfig,
    shipping: widget.shippingRules,
    timezone: widget.timezone,
    ...previewProps,
  };

  return (
    <s-page heading={heading}>
      <s-link slot="breadcrumb-actions" href="/app">
        Widgets
      </s-link>
      <s-stack gap="base">
        <WidgetStepper widgetId={widget.id} current={step} location={widget.location} />
        <ErrorBanner errors={errors} />
        <Form method="post">
          <EditorLayout preview={<DeliveryWidgetPreview {...preview} />}>
            {children}
            <s-stack direction="inline" gap="base" paddingBlock="base">
              <s-button type="submit" variant="primary">
                {submitLabel}
              </s-button>
              <s-button href="/app" variant="secondary">
                Cancel
              </s-button>
            </s-stack>
          </EditorLayout>
        </Form>
      </s-stack>
    </s-page>
  );
}
