export function toBrandName(brand: unknown): string {
  if (!brand) return '';
  if (typeof brand === 'string') return brand;
  if (typeof brand === 'object' && 'name' in brand) return String((brand as { name: string }).name);
  return '';
}

export function toBrandSlug(brand: unknown): string {
  if (!brand) return '';
  if (typeof brand === 'object' && 'slug' in brand) return String((brand as { slug: string }).slug);
  return '';
}
