import { api } from './api';
import type { StoreLocation } from '@/data/locations';

/**
 * A boutique as the API returns it.
 *
 * `StoreLocation` — the shape the /stores page, the JSON-LD builders and the
 * sitemap already speak — is the same record with everything required, because
 * it describes a *published* address. This one is what the admin holds, where a
 * branch may exist before it has been surveyed, so the optional fields are
 * genuinely optional and `phones` replaces the single `telephone`.
 */
export interface Branch extends Partial<Omit<StoreLocation, 'name' | 'telephone' | 'geo'>> {
  _id: string;
  name: string;
  phones?: string[];
  geo?: { latitude: number; longitude: number } | null;
  order?: number;
  isActive?: boolean;
}

export async function fetchBranches(): Promise<Branch[]> {
  const { data } = await api.get<{ items: Branch[] }>('/branches');
  return data.items;
}

/** The address on one line, skipping the parts that have not been filled in. */
export function branchAddressLine(branch: Branch): string {
  return [branch.streetAddress, branch.addressLocality, branch.addressRegion, branch.postalCode]
    .map((part) => (part ?? '').trim())
    .filter(Boolean)
    .join(', ');
}
