/**
 * Canonical Area type and unified resolver.
 *
 * Single source of truth for area resolution across public, admin, and layout.
 * All callers use the same data path — no per-context branching.
 */

import { getSupabaseServer } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Area {
  id: string;
  code: string;    // DOS, BEPPU, ALL
  slug: string;    // dos, beppu, all
  nameKr: string;  // 도스, 벳푸
  icon: string;
  description: string;
  active: boolean;
  sort: number;
}

// ---------------------------------------------------------------------------
// Internal cache (single source)
// ---------------------------------------------------------------------------

let _areasCache: Area[] | null = null;
let _areasCacheAt = 0;
const CACHE_TTL = 60_000; // 1 minute

async function fetchAreas(): Promise<Area[]> {
  const now = Date.now();
  if (_areasCache && now - _areasCacheAt < CACHE_TTL) return _areasCache;

  const db = getSupabaseServer();
  const { data, error } = await db
    .from('areas')
    .select('id, code, name_kr, icon, description, active, sort')
    .order('sort');

  if (error) throw error;

  _areasCache = (data || []).map((a) => ({
    id: a.id,
    code: a.code,
    slug: a.code.toLowerCase(),
    nameKr: a.name_kr,
    icon: a.icon || '',
    description: a.description || '',
    active: a.active === true,
    sort: a.sort,
  }));
  _areasCacheAt = now;
  return _areasCache;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Resolve area by URL slug (e.g. "dos" → Area). Returns null if not found. */
export async function resolveAreaBySlug(slug: string): Promise<Area | null> {
  const code = slug.toUpperCase();
  const areas = await fetchAreas();
  return areas.find((a) => a.code === code) ?? null;
}

/** Resolve area by code (e.g. "DOS" → Area). Returns null if not found. */
export async function resolveAreaByCode(code: string): Promise<Area | null> {
  const areas = await fetchAreas();
  return areas.find((a) => a.code === code.toUpperCase()) ?? null;
}

/** Get all active areas. Throws on DB error. */
export async function getActiveAreas(): Promise<Area[]> {
  return fetchAreas();
}

/** Invalidate the area cache (call after admin CRUD). */
export function invalidateAreaCache(): void {
  _areasCache = null;
  _areasCacheAt = 0;
}
