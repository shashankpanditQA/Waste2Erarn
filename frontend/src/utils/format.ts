export function formatINR(n?: number | null, decimals = 2): string {
  const v = Number(n || 0);
  const fixed = v.toFixed(decimals);
  // trim trailing .00
  const trimmed = fixed.endsWith(".00") ? fixed.slice(0, -3) : fixed;
  return `\u20B9${trimmed}`;
}

export function formatKg(n?: number | null): string {
  const v = Number(n || 0);
  return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(v < 1 ? 2 : 1)} kg`;
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export function timeAgo(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  if (isNaN(d)) return "";
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
