import { Form } from "react-router";

export function ConfirmDelete({ id, name }) {
  return (
    <s-modal id={id} heading={`Delete ${name}?`}>
      <s-paragraph>
        This removes the widget and its configuration. Analytics events for this widget are also deleted.
      </s-paragraph>
      <s-button slot="secondary-actions" commandFor={id} command="--hide">
        Cancel
      </s-button>
      <Form method="post">
        <s-button slot="primary-action" variant="primary" tone="critical" type="submit" name="intent" value="delete">
          Delete widget
        </s-button>
      </Form>
    </s-modal>
  );
}

export function ErrorBanner({ errors }) {
  if (!errors || !Object.keys(errors).length) return null;
  const messages = Object.values(errors).map((message) =>
    typeof message === "string" ? message : "Something went wrong. Please try again.",
  );
  return (
    <s-banner heading="Fix the following" tone="critical">
      <s-unordered-list>
        {messages.map((message) => (
          <s-list-item key={message}>{message}</s-list-item>
        ))}
      </s-unordered-list>
    </s-banner>
  );
}
