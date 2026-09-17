export const DEFAULT_TABLE_CELLS: string[][] = [
  ["Command", "What it does"],
  ["/report", "Open a report"],
  ["/case", "View a public case"],
];

export function cellFieldId(row: number, col: number): string {
  return `cell:${row}:${col}`;
}

export function parseCellFieldId(fieldId: string): { row: number; col: number } | null {
  const match = /^cell:(\d+):(\d+)$/.exec(fieldId);
  if (!match) return null;
  return { row: Number(match[1]), col: Number(match[2]) };
}

function parseLegacyRows(rows: unknown): string[][] {
  if (typeof rows !== "string") return [];
  return rows
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split("|").map((cell) => cell.trim()));
}

function asGrid(value: unknown): string[][] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  return value.map((row) =>
    Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [String(row ?? "")],
  );
}

export function normalizeTable(props: Record<string, unknown>): string[][] {
  const fromCells = asGrid(props.cells);
  const raw = fromCells ?? parseLegacyRows(props.rows);
  if (raw.length === 0) return [[""]];

  const trimmed = [...raw];
  // Only collapse blank trailing rows for the legacy pipe-string format.
  // Structured cells keep empty rows/columns the builder just added.
  if (!fromCells) {
    while (trimmed.length > 1 && trimmed[trimmed.length - 1]!.every((cell) => !cell.trim())) {
      trimmed.pop();
    }
  }

  const width = Math.max(1, ...trimmed.map((row) => row.length));
  return trimmed.map((row) => {
    const next = row.map((cell) => String(cell ?? ""));
    while (next.length < width) next.push("");
    return next.slice(0, width);
  });
}

export function persistTable(
  props: Record<string, unknown>,
  cells: string[][],
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...props, cells };
  delete next.rows;
  return next;
}

export function setCell(
  props: Record<string, unknown>,
  row: number,
  col: number,
  value: string,
): Record<string, unknown> {
  const cells = normalizeTable(props);
  const target = cells[row];
  if (!target || col < 0 || col >= target.length) return persistTable(props, cells);
  target[col] = value;
  return persistTable(props, cells);
}

export function addRow(props: Record<string, unknown>): Record<string, unknown> {
  const cells = normalizeTable(props);
  const width = cells[0]?.length ?? 1;
  cells.push(Array.from({ length: width }, () => ""));
  return persistTable(props, cells);
}

function nextTitle(headers: string[]): string {
  let max = 0;
  for (const header of headers) {
    const match = /^Title (\d+)$/.exec(header.trim());
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `Title ${max + 1}`;
}

export function addColumn(props: Record<string, unknown>): Record<string, unknown> {
  const cells = normalizeTable(props);
  const title = nextTitle(cells[0] ?? []);
  return persistTable(
    props,
    cells.map((row, index) => [...row, index === 0 ? title : ""]),
  );
}

export function removeRow(props: Record<string, unknown>, rowIndex: number): Record<string, unknown> {
  const cells = normalizeTable(props);
  if (cells.length <= 1 || rowIndex < 0 || rowIndex >= cells.length) {
    return persistTable(props, cells);
  }
  cells.splice(rowIndex, 1);
  return persistTable(props, cells);
}

export function removeColumn(
  props: Record<string, unknown>,
  colIndex: number,
): Record<string, unknown> {
  const cells = normalizeTable(props);
  const width = cells[0]?.length ?? 1;
  if (width <= 1 || colIndex < 0 || colIndex >= width) {
    return persistTable(props, cells);
  }
  return persistTable(
    props,
    cells.map((row) => row.filter((_, index) => index !== colIndex)),
  );
}

export function applyCellField(
  props: Record<string, unknown>,
  fieldId: string,
  value: string,
): Record<string, unknown> {
  const parsed = parseCellFieldId(fieldId);
  if (!parsed) return props;
  return setCell(props, parsed.row, parsed.col, value);
}
