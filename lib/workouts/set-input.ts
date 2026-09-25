export function parseOptionalNumber(
  value: string,
  kind: "reps" | "weight"
): { ok: true; value: number | null } | { ok: false; message: string } {
  const trimmed = value.trim();
  if (trimmed === "") return { ok: true, value: null };

  const pattern = kind === "reps" ? /^\d+$/ : /^\d+(\.\d{1,2})?$/;
  const parsed = Number(trimmed);
  if (!pattern.test(trimmed) || !Number.isFinite(parsed)) {
    return {
      ok: false,
      message:
        kind === "reps"
          ? "Reps must be a whole number, or left blank."
          : "Weight must be a number, or left blank.",
    };
  }

  return { ok: true, value: parsed };
}
