export function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value || "", 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
}

export function parseSortOrder(value: string | null): "asc" | "desc" {
  return value === "desc" ? "desc" : "asc";
}

export function parseSortField<T extends string>(
  value: string | null,
  allowedFields: readonly T[],
  fallback: T
): T {
  return allowedFields.includes(value as T) ? (value as T) : fallback;
}
