export function formatSalary(min: number | null, max: number | null): string {
  if (min == null && max == null) return "Negotiable";
  const fmt = (n: number) => `LKR ${n.toLocaleString("en-LK")}`;
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

export function formatDate(input: string | Date): string {
  return new Date(input).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function timeAgo(input: string | Date): string {
  const diff = Date.now() - new Date(input).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}