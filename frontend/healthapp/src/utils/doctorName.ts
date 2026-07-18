/**
 * Return the doctor's display name with a single "Dr." prefix.
 *
 * Some records in the database already store the name with a "Dr." prefix
 * (e.g. "Dr. Sharma"), while others store just the surname. Using this
 * helper everywhere prevents "Dr. Dr. Sharma" duplicates.
 */
export const formatDoctorName = (
  name?: string | null,
  fallback = "—"
): string => {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return fallback;
  return /^dr\.?\s/i.test(trimmed) ? trimmed : `Dr. ${trimmed}`;
};
