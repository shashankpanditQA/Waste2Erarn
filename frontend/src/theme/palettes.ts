// Four Waste2Earn themes mapped to semantic tokens. Green is the default brand.
// The whole app reads colors from useAppTheme() so a switch re-themes instantly.

export type ThemeName = "Green" | "Blue" | "Dark" | "Pastel";

export interface AppColors {
  background: string;
  surface: string;
  card: string;
  cardAlt: string;

  primary: string;
  onPrimary: string;
  primaryDark: string;
  secondary: string;
  onSecondary: string;
  accent: string;

  textPrimary: string;
  textSecondary: string;
  muted: string;

  success: string;
  warning: string;
  error: string;
  info: string;
  onStatus: string;

  border: string;
  divider: string;

  navSelected: string;
  navUnselected: string;
  navBar: string;

  heroGradient: [string, string];
  rewardGradient: [string, string];

  isDark: boolean;
}

export const PALETTES: Record<ThemeName, AppColors> = {
  Green: {
    background: "#FFFFFF",
    surface: "#F0FDF4",
    card: "#FFFFFF",
    cardAlt: "#ECFDF5",
    primary: "#16A34A",
    onPrimary: "#FFFFFF",
    primaryDark: "#15803D",
    secondary: "#BBF7D0",
    onSecondary: "#064E3B",
    accent: "#0284C7",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
    muted: "#94A3B8",
    success: "#16A34A",
    warning: "#D97706",
    error: "#DC2626",
    info: "#2563EB",
    onStatus: "#FFFFFF",
    border: "#E2E8F0",
    divider: "#F1F5F9",
    navSelected: "#16A34A",
    navUnselected: "#94A3B8",
    navBar: "#FFFFFF",
    heroGradient: ["#22C55E", "#15803D"],
    rewardGradient: ["#16A34A", "#065F46"],
    isDark: false,
  },
  Blue: {
    background: "#FFFFFF",
    surface: "#F0F9FF",
    card: "#FFFFFF",
    cardAlt: "#E0F2FE",
    primary: "#0284C7",
    onPrimary: "#FFFFFF",
    primaryDark: "#0369A1",
    secondary: "#BAE6FD",
    onSecondary: "#082F49",
    accent: "#16A34A",
    textPrimary: "#0F172A",
    textSecondary: "#475569",
    muted: "#94A3B8",
    success: "#16A34A",
    warning: "#D97706",
    error: "#DC2626",
    info: "#0284C7",
    onStatus: "#FFFFFF",
    border: "#E0F2FE",
    divider: "#F1F5F9",
    navSelected: "#0284C7",
    navUnselected: "#94A3B8",
    navBar: "#FFFFFF",
    heroGradient: ["#38BDF8", "#0369A1"],
    rewardGradient: ["#0284C7", "#075985"],
    isDark: false,
  },
  Dark: {
    background: "#0F172A",
    surface: "#1E293B",
    card: "#1E293B",
    cardAlt: "#273549",
    primary: "#4ADE80",
    onPrimary: "#052E16",
    primaryDark: "#22C55E",
    secondary: "#14532D",
    onSecondary: "#DCFCE7",
    accent: "#38BDF8",
    textPrimary: "#F8FAFC",
    textSecondary: "#CBD5E1",
    muted: "#94A3B8",
    success: "#34D399",
    warning: "#FBBF24",
    error: "#F87171",
    info: "#60A5FA",
    onStatus: "#052E16",
    border: "#334155",
    divider: "#273549",
    navSelected: "#4ADE80",
    navUnselected: "#64748B",
    navBar: "#111C30",
    heroGradient: ["#166534", "#064E3B"],
    rewardGradient: ["#15803D", "#064E3B"],
    isDark: true,
  },
  Pastel: {
    background: "#FFF7FB",
    surface: "#FDF2F8",
    card: "#FFFFFF",
    cardAlt: "#FCE7F3",
    primary: "#EC7FB0",
    onPrimary: "#FFFFFF",
    primaryDark: "#DB6BA0",
    secondary: "#FBCFE8",
    onSecondary: "#831843",
    accent: "#34D399",
    textPrimary: "#3F2937",
    textSecondary: "#7C6070",
    muted: "#B79AAA",
    success: "#10B981",
    warning: "#D97706",
    error: "#E11D48",
    info: "#6366F1",
    onStatus: "#FFFFFF",
    border: "#F5D0E5",
    divider: "#FCE7F3",
    navSelected: "#EC7FB0",
    navUnselected: "#C9AEBD",
    navBar: "#FFFFFF",
    heroGradient: ["#F9A8D4", "#EC7FB0"],
    rewardGradient: ["#F472B6", "#DB2777"],
    isDark: false,
  },
};

export const THEME_SWATCH: Record<ThemeName, string> = {
  Green: "#16A34A",
  Blue: "#0284C7",
  Dark: "#1E293B",
  Pastel: "#EC7FB0",
};

export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, "2xl": 32, "3xl": 48 };
export const RADIUS = { sm: 6, md: 12, lg: 20, xl: 28, pill: 999 };

export type StatusKey =
  | "analyzed" | "pending" | "pickup_scheduled" | "verified" | "credited" | "unsupported";

export function statusMeta(status: string, c: AppColors): { label: string; color: string; bg: string } {
  const map: Record<string, { label: string; color: string }> = {
    analyzed: { label: "Analyzed", color: c.info },
    pending: { label: "Pending", color: c.warning },
    pickup_scheduled: { label: "Pickup Scheduled", color: c.accent },
    verified: { label: "Verified", color: c.success },
    credited: { label: "Credited", color: c.success },
    unsupported: { label: "Unsupported", color: c.error },
  };
  const m = map[status] || { label: status, color: c.muted };
  return { ...m, bg: m.color + (c.isDark ? "33" : "22") };
}
