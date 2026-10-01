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
