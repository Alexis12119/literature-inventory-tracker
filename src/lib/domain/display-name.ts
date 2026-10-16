export function buildDisplayName(parts: {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
}): string {
  const first = parts.first_name.trim();
  const middle = (parts.middle_name ?? "").trim();
  const last = parts.last_name.trim();
  return middle ? `${first} ${middle} ${last}` : `${first} ${last}`;
}
