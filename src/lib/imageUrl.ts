/**
 * Resolve an image URL. Upload paths (/uploads/...) are served by the
 * same nginx origin, so they can be used as-is. External URLs pass through.
 */
export function imageUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  // Absolute URLs — pass through
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // Upload paths — served by nginx from same origin
  if (path.startsWith('/uploads/')) return path;
  // Other relative paths — prefix with API URL
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  return `${apiUrl}${path}`;
}
