/** Human-readable bytes formatter (e.g. 1.2 MB). */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const decimals = v >= 10 || i === 0 ? 0 : 1;
  return `${v.toFixed(decimals)} ${units[i]}`;
}
