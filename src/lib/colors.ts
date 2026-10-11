const HEX_RE = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;

export const THEME_FALLBACK: [string, string] = ["#0a0d14", "#1b2a4a"];

const FALLBACK_PALETTES: [string, string][] = [
  ["#0a0d14", "#1b2a4a"],
  ["#0a0d14", "#2a1436"],
  ["#101822", "#0f3b4a"],
  ["#131113", "#3b1f1f"],
  ["#0a1410", "#12402c"],
];

function normalizeHex(hex: string): string {
  if (hex.length === 4) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return hex;
}

export function extractHexColors(value: string): string[] {
  const matches = value.match(HEX_RE);
  if (!matches) return [];
  return matches.map((m) => normalizeHex(m));
}

export function themeGradient(colorTheme: string, seed = 0): string {
  const colors = extractHexColors(colorTheme);
  if (colors.length >= 2) {
    return `linear-gradient(150deg, ${colors[0]} 0%, ${colors[1]} 100%)`;
  }
  if (colors.length === 1) {
    return `linear-gradient(150deg, ${colors[0]} 0%, #0a0d14 100%)`;
  }
  const [a, b] = FALLBACK_PALETTES[seed % FALLBACK_PALETTES.length];
  return `linear-gradient(150deg, ${a} 0%, ${b} 100%)`;
}

export function themeAccent(colorTheme: string): string {
  const colors = extractHexColors(colorTheme);
  return colors[0] ?? "#00e5ff";
}
