const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;
const LEADING_WS_FORMULA_RE = /^\s+[=+\-@]/;

/**
 * CSV formül enjeksiyonunu (DDE / Excel) önler ve `;` / `"` / yeni satır karakterlerini kaçırır.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  let text = String(value);
  if (FORMULA_PREFIX_RE.test(text) || LEADING_WS_FORMULA_RE.test(text)) {
    text = `'${text}`;
  }

  if (/[;"\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

/**
 * Windows Excel Türkçe uyumu için UTF-8 BOM (`\uFEFF`) ve `;` ayraçlı CSV üretir.
 */
export function buildCsvContent(
  headers: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<unknown>>
): string {
  const headerLine = headers.map((h) => sanitizeCsvCell(h)).join(";");
  const dataLines = rows.map((row) => row.map((cell) => sanitizeCsvCell(cell)).join(";"));
  return `\uFEFF${[headerLine, ...dataLines].join("\r\n")}`;
}
