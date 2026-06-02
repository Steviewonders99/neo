export type GridSpec = { columns: string; rows: string; cells: number }

const TABLE: Record<number, GridSpec> = {
  1:  { columns: '1fr',                 rows: '1fr',          cells: 1 },
  2:  { columns: '1fr 1fr',             rows: '1fr',          cells: 2 },
  3:  { columns: '1fr 1fr 1fr',         rows: '1fr',          cells: 3 },
  4:  { columns: '1fr 1fr',             rows: '1fr 1fr',      cells: 4 },
  5:  { columns: '1fr 1fr 1fr',         rows: '1fr 1fr',      cells: 6 },
  6:  { columns: '1fr 1fr 1fr',         rows: '1fr 1fr',      cells: 6 },
  7:  { columns: '1fr 1fr 1fr',         rows: '1fr 1fr 1fr',  cells: 9 },
  8:  { columns: '1fr 1fr 1fr',         rows: '1fr 1fr 1fr',  cells: 9 },
  9:  { columns: '1fr 1fr 1fr',         rows: '1fr 1fr 1fr',  cells: 9 },
  10: { columns: '1fr 1fr 1fr 1fr 1fr', rows: '1fr 1fr',      cells: 10 },
}

export function gridForCount(n: number): GridSpec {
  const clamped = Math.min(10, Math.max(1, n | 0))
  return TABLE[clamped]
}
