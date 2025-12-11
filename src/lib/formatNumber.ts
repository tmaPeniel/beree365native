/**
 * Formate un nombre en format compact (1.2k, 698.7k, 1.2M)
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    const formatted = (num / 1_000_000).toFixed(1);
    return formatted.endsWith('.0') ? `${Math.floor(num / 1_000_000)}M` : `${formatted}M`;
  }
  if (num >= 1_000) {
    const formatted = (num / 1_000).toFixed(1);
    return formatted.endsWith('.0') ? `${Math.floor(num / 1_000)}k` : `${formatted}k`;
  }
  return num.toString();
}
