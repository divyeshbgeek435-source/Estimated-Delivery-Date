const MARKERS = [
  { token: "**", key: "bold" },
  { token: "__", key: "underline" },
  { token: "*", key: "italic" },
];

function escapeEditorHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function wrapEditorHtml(html, run) {
  if (run.underline) html = `<u>${html}</u>`;
  if (run.italic) html = `<em>${html}</em>`;
  if (run.bold) html = `<strong>${html}</strong>`;
  return html;
}

export function runsToEditorHtml(source) {
  return formatRuns(source)
    .map((run) => {
      const raw = run.type === "token" ? `{${run.key}}` : run.text;
      return wrapEditorHtml(escapeEditorHtml(raw).replace(/\n/g, "<br>"), run);
    })
    .join("");
}

export function formatRuns(source) {
  const text = String(source || "");
  const style = { bold: false, italic: false, underline: false };
  const runs = [];
  let buffer = "";

  const flush = () => {
    if (!buffer) return;
    runs.push({ type: "text", text: buffer, bold: style.bold, italic: style.italic, underline: style.underline });
    buffer = "";
  };

  let index = 0;
  while (index < text.length) {
    if (text[index] === "{") {
      const close = text.indexOf("}", index);
      const key = close > index ? text.slice(index + 1, close) : "";
      if (/^[a-z_]+$/i.test(key)) {
        flush();
        runs.push({ type: "token", key, bold: style.bold, italic: style.italic, underline: style.underline });
        index = close + 1;
        continue;
      }
    }

    const marker = MARKERS.find((item) => text.startsWith(item.token, index));
    if (marker) {
      flush();
      style[marker.key] = !style[marker.key];
      index += marker.token.length;
      continue;
    }

    buffer += text[index];
    index += 1;
  }

  flush();
  return runs;
}
