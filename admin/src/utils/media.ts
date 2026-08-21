const API_ORIGIN = import.meta.env.VITE_API_URL ?? '';

export function resolveMediaUrl(src?: string | null): string {
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) return src;
  return `${API_ORIGIN}${src}`;
}
