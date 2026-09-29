import { formatRuns } from "../../lib/rich-text";

function decorate(run, node) {
  let next = node;
  if (run.underline) next = <u>{next}</u>;
  if (run.italic) next = <em>{next}</em>;
  if (run.bold) next = <strong>{next}</strong>;
  return next;
}

export function FormattedText({ value }) {
  const runs = formatRuns(value).filter((run) => run.type === "text" && run.text);
  if (!runs.length) return value || null;
  return runs.map((run, index) => <span key={index}>{decorate(run, run.text)}</span>);
}
