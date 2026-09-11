/**
 * Supabase/PostgreSQL-based CMS repository layer.
 * All CRUD operations use UUID FK relationships and explicit column selection.
 */

import { getSupabaseServer } from './supabase/server';
import { getSupabaseAdmin } from './supabase/admin';
import type {
  GolfCourse,
  Hotel,
  Restaurant,
  TravelTime,
  FaqItem,
  AdminOption,
  IncludeExclude,
  ContentSection,
} from './types';
import { ConflictError } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function db() {
  return getSupabaseServer();
}

/** Service-role client for admin CRUD (INSERT/UPDATE/DELETE). */
function adminDb() {
  return getSupabaseAdmin();
}

function logError(
  operation: string,
  table: string,
  id: string | undefined,
  error: { code?: string; message: string }
) {
  console.error(
    `CMS_DB_${operation}_FAIL table=${table} id=${id ?? '-'} code=${error.code ?? '-'} msg=${error.message}`
  );
}

function isActive(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.trim().toUpperCase();
    return s === 'TRUE' || s === 'YES' || s === '1' || s === 'Y';
  }
  return false;
}

// Cache for area/category lookups to avoid repeated queries
let _areaCache: Map<string, string> | null = null; // code → id
let _categoryCache: Map<string, string> | null = null; // code → id

async function getAreaCodeMap(): Promise<Map<string, string>> {
  if (_areaCache) return _areaCache;
  const { data, error } = await db().from('areas').select('id, code');
  if (error) throw error;
  _areaCache = new Map((data || []).map((a) => [a.code, a.id]));
  return _areaCache;
}

async function getCategoryCodeMap(): Promise<Map<string, string>> {
  if (_categoryCache) return _categoryCache;
  const { data, error } = await db().from('categories').select('id, code');
  if (error) throw error;
  _categoryCache = new Map((data || []).map((c) => [c.code, c.id]));
  return _categoryCache;
}

async function resolveAreaId(code: string): Promise<string | null> {
  const map = await getAreaCodeMap();
  return map.get(code.toUpperCase()) ?? null;
}

async function resolveCategoryId(code: string): Promise<string | null> {
  const map = await getCategoryCodeMap();
  return map.get(code.toUpperCase()) ?? null;
}

async function resolveEntityIdBySlug(slug: string): Promise<string | null> {
  const { data, error } = await db().from('entities').select('id').eq('slug', slug).single();
  if (error) return null;
  return data?.id ?? null;
}

// Reverse lookups (UUID → code/slug)
async function resolveAreaCode(areaId: string): Promise<string> {
  const { data } = await db().from('areas').select('code').eq('id', areaId).single();
  return data?.code ?? '';
}

async function resolveCategoryCode(categoryId: string): Promise<string> {
  const { data } = await db().from('categories').select('code').eq('id', categoryId).single();
  return data?.code ?? '';
}

async function resolveEntitySlug(entityId: string): Promise<string> {
  const { data } = await db().from('entities').select('slug').eq('id', entityId).single();
  return data?.slug ?? '';
}

// Build area code map by id for batch resolution
async function getAreaCodeByIdMap(): Promise<Map<string, string>> {
  const { data } = await db().from('areas').select('id, code');
  return new Map((data || []).map((a) => [a.id, a.code]));
}

async function getCategoryCodeByIdMap(): Promise<Map<string, string>> {
  const { data } = await db().from('categories').select('id, code');
  return new Map((data || []).map((c) => [c.id, c.code]));
}

// Get entity + area info for building GolfCourse/Hotel/Restaurant shapes
interface EntityRow {
  id: string;
  slug: string;
  display_name: string;
  entity_type: string;
  area_id: string;
  active: boolean;
  sort: number;
  updated_at: string;
}

function entitySlugToId(slug: string): string {
  // Old code uses slug as id for URLs. Keep this convention.
  return slug;
}

// ---------------------------------------------------------------------------
// Admin Options (areas + categories combined)
// ---------------------------------------------------------------------------

export async function getAdminOptions(): Promise<AdminOption[]> {
  const [areasResult, catsResult] = await Promise.all([
    db()
      .from('areas')
      .select('id, code, name_kr, icon, description, active, sort, updated_at')
      .order('sort'),
    db()
      .from('categories')
      .select('id, code, label, icon, description, group_type, active, sort, updated_at')
      .order('sort'),
  ]);

  if (areasResult.error) {
    logError('READ', 'areas', undefined, areasResult.error);
    throw areasResult.error;
  }
  if (catsResult.error) {
    logError('READ', 'categories', undefined, catsResult.error);
    throw catsResult.error;
  }

  const areaOptions: AdminOption[] = (areasResult.data || []).map((a) => ({
    id: a.id,
    option_type: 'AREA',
    code: a.code,
    label: a.name_kr,
    icon: a.icon || '',
    description: a.description || '',
    group: '',
    active: a.active ? 'TRUE' : 'FALSE',
    sort: a.sort,
    updated_at: a.updated_at,
  }));

  const catOptions: AdminOption[] = (catsResult.data || []).map((c) => ({
    id: c.id,
    option_type: 'CATEGORY',
    code: c.code,
    label: c.label,
    icon: c.icon || '',
    description: c.description || '',
    group: c.group_type || '',
    active: c.active ? 'TRUE' : 'FALSE',
    sort: c.sort,
    updated_at: c.updated_at,
  }));

  return [...areaOptions, ...catOptions];
}

export async function getActiveAreas(): Promise<AdminOption[]> {
  const { data, error } = await db()
    .from('areas')
    .select('id, code, name_kr, icon, description, active, sort, updated_at')
    .eq('active', true)
    .order('sort');
  if (error) {
    logError('READ', 'areas', undefined, error);
    throw error;
  }
  return (data || []).map((a) => ({
    id: a.id,
    option_type: 'AREA',
    code: a.code,
    label: a.name_kr,
    icon: a.icon || '',
    description: a.description || '',
    group: '',
    active: 'TRUE',
    sort: a.sort,
    updated_at: a.updated_at,
  }));
}

export async function getActiveCategories(): Promise<AdminOption[]> {
  const { data, error } = await db()
    .from('categories')
    .select('id, code, label, icon, description, group_type, active, sort, updated_at')
    .eq('active', true)
    .order('sort');
  if (error) {
    logError('READ', 'categories', undefined, error);
    throw error;
  }
  return (data || []).map((c) => ({
    id: c.id,
    option_type: 'CATEGORY',
    code: c.code,
    label: c.label,
    icon: c.icon || '',
    description: c.description || '',
    group: c.group_type || '',
    active: 'TRUE',
    sort: c.sort,
    updated_at: c.updated_at,
  }));
}

export async function getAreaCategories(): Promise<AdminOption[]> {
  const { data, error } = await db()
    .from('categories')
    .select('id, code, label, icon, description, group_type, active, sort, updated_at')
    .eq('active', true)
    .eq('group_type', 'AREA')
    .order('sort');
  if (error) {
    logError('READ', 'categories', undefined, error);
    throw error;
  }
  return (data || []).map((c) => ({
    id: c.id,
    option_type: 'CATEGORY',
    code: c.code,
    label: c.label,
    icon: c.icon || '',
    description: c.description || '',
    group: 'AREA',
    active: 'TRUE',
    sort: c.sort,
    updated_at: c.updated_at,
  }));
}

export async function getCommonCategories(): Promise<AdminOption[]> {
  const { data, error } = await db()
    .from('categories')
    .select('id, code, label, icon, description, group_type, active, sort, updated_at')
    .eq('active', true)
    .eq('group_type', 'COMMON')
    .order('sort');
  if (error) {
    logError('READ', 'categories', undefined, error);
    throw error;
  }
  return (data || []).map((c) => ({
    id: c.id,
    option_type: 'CATEGORY',
    code: c.code,
    label: c.label,
    icon: c.icon || '',
    description: c.description || '',
    group: 'COMMON',
    active: 'TRUE',
    sort: c.sort,
    updated_at: c.updated_at,
  }));
}

// ---------------------------------------------------------------------------
// Golf Courses
// ---------------------------------------------------------------------------

function mapGolfCourse(
  entity: EntityRow,
  golf: Record<string, unknown>,
  areaCode: string
): GolfCourse {
  return {
    id: entity.id as string,
    slug: entity.slug,
    area: areaCode,
    display_name: entity.display_name,
    official_name: (golf.official_name as string) || '',
    address: (golf.address as string) || '',
    phone: (golf.phone as string) || '',
    course_summary: (golf.course_summary as string) || '',
    play_cart: (golf.play_cart as string) || '',
    clubhouse_dining: (golf.clubhouse_dining as string) || '',
    bath_shower: (golf.bath_shower as string) || '',
    rental: (golf.rental as string) || '',
    dress_code: (golf.dress_code as string) || '',
    google_maps_url: (golf.google_maps_url as string) || '',
    source_url: (golf.source_url as string) || '',
    status: (golf.status as string) || '',
    last_verified: (golf.last_verified as string) || '',
    active: entity.active ? 'TRUE' : 'FALSE',
    sort: entity.sort,
    updated_at: entity.updated_at,
  };
}

export async function getGolfCourses(area?: string): Promise<GolfCourse[]> {
  let query = db()
    .from('golf_courses')
    .select(
      'entity_id, official_name, address, phone, course_summary, play_cart, clubhouse_dining, bath_shower, rental, dress_code, google_maps_url, source_url, status, last_verified, product_reference_minutes, travel_time_note, entities!inner(id, slug, display_name, entity_type, area_id, active, sort, updated_at, areas!inner(code))'
    );

  if (area) {
    query = query.eq('entities.areas.code', area.toUpperCase());
  }

  const { data, error } = await query.order('sort', {
    foreignTable: 'entities',
  });
  if (error) {
    logError('READ', 'golf_courses', undefined, error);
    throw error;
  }

  return (data || [])
    .filter((row) => {
      const ent = row.entities as unknown as EntityRow;
      return ent?.active !== false;
    })
    .map((row) => {
      const ent = row.entities as unknown as EntityRow & { areas: { code: string } };
      const areaCode = ent.areas?.code || '';
      const { entities: _ent, ...golfFields } = row;
      return mapGolfCourse(ent, golfFields, areaCode);
    });
}

export async function getGolfCourseById(id: string): Promise<GolfCourse | null> {
  const { data, error } = await db()
    .from('golf_courses')
    .select(
      'entity_id, official_name, address, phone, course_summary, play_cart, clubhouse_dining, bath_shower, rental, dress_code, google_maps_url, source_url, status, last_verified, product_reference_minutes, travel_time_note, entities!inner(id, slug, display_name, entity_type, area_id, active, sort, updated_at, areas!inner(code))'
    )
    .eq('entities.slug', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    logError('READ', 'golf_courses', id, error);
    throw error;
  }
  const ent = data.entities as unknown as EntityRow & { areas: { code: string } };
  const areaCode = ent.areas?.code || '';
  const { entities: _ent, ...golfFields } = data;
  return mapGolfCourse(ent, golfFields, areaCode);
}

export async function appendGolfCourse(
  data: Record<string, string>
): Promise<{ id: string; slug: string }> {
  const areaId = await resolveAreaId(data.area || '');
  if (!areaId) throw new Error(`Area not found: ${data.area}`);

  // Generate slug
  const slug =
    data.id ||
    `${(data.area || '').toLowerCase()}_golf_${(data.display_name || '').replace(/\s+/g, '_').toLowerCase()}`;

  // Insert entity
  const { data: entity, error: entityError } = await adminDb()
    .from('entities')
    .insert({
      slug,
      entity_type: 'GOLF',
      area_id: areaId,
      display_name: data.display_name || '',
      active: isActive(data.active),
      sort: parseInt(data.sort || '999') || 999,
    })
    .select('id')
    .single();
  if (entityError) {
    logError('INSERT', 'entities', slug, entityError);
    throw entityError;
  }

  // Insert golf_course
  const { error: golfError } = await adminDb()
    .from('golf_courses')
    .insert({
      entity_id: entity.id,
      official_name: data.official_name || '',
      address: data.address || '',
      phone: data.phone || '',
      course_summary: data.course_summary || '',
      play_cart: data.play_cart || '',
      clubhouse_dining: data.clubhouse_dining || '',
      bath_shower: data.bath_shower || '',
      rental: data.rental || '',
      dress_code: data.dress_code || '',
      google_maps_url: data.google_maps_url || '',
      source_url: data.source_url || '',
      status: data.status || '',
      last_verified: data.last_verified || null,
      product_reference_minutes: data.product_reference_minutes
        ? parseInt(data.product_reference_minutes)
        : null,
      travel_time_note: data.travel_time_note || '',
    });
  if (golfError) {
    // Compensate: delete entity
    await adminDb().from('entities').delete().eq('id', entity.id);
    logError('INSERT', 'golf_courses', slug, golfError);
    throw golfError;
  }

  return { id: entity.id, slug };
}

export async function updateGolfCourse(
  id: string,
  data: Record<string, string>,
  expectedUpdatedAt?: string
): Promise<boolean> {
  // Resolve entity by id (UUID)
  const { data: entity, error: findError } = await db()
    .from('entities')
    .select('id, updated_at')
    .eq('id', id)
    .single();
  if (findError || !entity) {
    logError('UPDATE', 'golf_courses', id, findError || { message: 'Not found' });
    return false;
  }

  // Optimistic concurrency
  if (expectedUpdatedAt && entity.updated_at !== expectedUpdatedAt) {
    throw new ConflictError();
  }

  // Update entity
  const entityUpdates: Record<string, unknown> = {};
  if (data.display_name !== undefined) entityUpdates.display_name = data.display_name;
  if (data.active !== undefined) entityUpdates.active = isActive(data.active);
  if (data.sort !== undefined) entityUpdates.sort = parseInt(data.sort) || 0;
  if (data.area !== undefined) {
    const areaId = await resolveAreaId(data.area);
    if (areaId) entityUpdates.area_id = areaId;
  }

  if (Object.keys(entityUpdates).length > 0) {
    const { error } = await adminDb().from('entities').update(entityUpdates).eq('id', entity.id);
    if (error) {
      logError('UPDATE', 'entities', id, error);
      throw error;
    }
  }

  // Update golf_course
  const golfUpdates: Record<string, unknown> = {};
  const fields = [
    'official_name',
    'address',
    'phone',
    'course_summary',
    'play_cart',
    'clubhouse_dining',
    'bath_shower',
    'rental',
    'dress_code',
    'google_maps_url',
    'source_url',
    'status',
    'last_verified',
    'travel_time_note',
  ];
  for (const f of fields) {
    if (data[f] !== undefined) golfUpdates[f] = data[f];
  }
  if (data.product_reference_minutes !== undefined) {
    golfUpdates.product_reference_minutes = data.product_reference_minutes
      ? parseInt(data.product_reference_minutes)
      : null;
  }

  if (Object.keys(golfUpdates).length > 0) {
    const { error } = await adminDb()
      .from('golf_courses')
      .update(golfUpdates)
      .eq('entity_id', entity.id);
    if (error) {
      logError('UPDATE', 'golf_courses', id, error);
      throw error;
    }
  }

  return true;
}

export async function deleteGolfCourse(id: string): Promise<boolean> {
  const { data: entity } = await db().from('entities').select('id').eq('id', id).single();
  if (!entity) return false;

  // Hard delete (cascades to golf_courses)
  const { error } = await adminDb().from('entities').delete().eq('id', entity.id);
  if (error) {
    logError('DELETE', 'entities', id, error);
    throw error;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Hotels
// ---------------------------------------------------------------------------

function mapHotel(entity: EntityRow, hotel: Record<string, unknown>, areaCode: string): Hotel {
  return {
    id: entity.id as string,
    slug: entity.slug,
    area: areaCode,
    official_name: (hotel.official_name as string) || '',
    address: (hotel.address as string) || '',
    phone: (hotel.phone as string) || '',
    check_in: (hotel.checkin_time as string) || '',
    check_out: (hotel.checkout_time as string) || '',
    breakfast: (hotel.breakfast_summary as string) || '',
    bath_spa: (hotel.bath_spa_summary as string) || '',
    hotel_dining: (hotel.dinner_summary as string) || '',
    atm_payment: (hotel.atm_payment as string) || '',
    transport: (hotel.transport_note as string) || '',
    google_maps_url: (hotel.google_maps_url as string) || '',
    source_url: (hotel.source_url as string) || '',
    status: (hotel.status as string) || '',
    active: entity.active ? 'TRUE' : 'FALSE',
    sort: entity.sort,
    last_verified: (hotel.last_verified as string) || '',
    name_kr: entity.display_name,
    name_jp: '',
    address_kr: (hotel.address as string) || '',
    address_jp: '',
    checkin_time: (hotel.checkin_time as string) || '',
    checkout_time: (hotel.checkout_time as string) || '',
    breakfast_place: (hotel.breakfast_place as string) || '',
    breakfast_time: (hotel.breakfast_time as string) || '',
    breakfast_last_entry: (hotel.breakfast_last_entry as string) || '',
    dinner_place: (hotel.dinner_place as string) || '',
    dinner_time: (hotel.dinner_time as string) || '',
    dinner_last_entry: (hotel.dinner_last_entry as string) || '',
    has_public_bath:
      hotel.has_public_bath === true ? 'TRUE' : hotel.has_public_bath === false ? 'FALSE' : '',
    has_outdoor_onsen:
      hotel.has_outdoor_onsen === true ? 'TRUE' : hotel.has_outdoor_onsen === false ? 'FALSE' : '',
    has_sauna: hotel.has_sauna === true ? 'TRUE' : hotel.has_sauna === false ? 'FALSE' : '',
    bath_spa_hours: (hotel.bath_spa_hours as string) || '',
    tattoo_policy: (hotel.tattoo_policy as string) || '',
    other_info: (hotel.other_info as string) || '',
    updated_at: entity.updated_at,
  };
}

export async function getHotels(area?: string): Promise<Hotel[]> {
  let query = db()
    .from('hotels')
    .select(
      'entity_id, official_name, address, phone, checkin_time, checkout_time, breakfast_summary, bath_spa_summary, dinner_summary, atm_payment, transport_note, google_maps_url, source_url, status, last_verified, breakfast_place, breakfast_time, breakfast_last_entry, dinner_place, dinner_time, dinner_last_entry, has_public_bath, has_outdoor_onsen, has_sauna, bath_spa_hours, tattoo_policy, other_info, entities!inner(id, slug, display_name, entity_type, area_id, active, sort, updated_at, areas!inner(code))'
    );

  if (area) {
    query = query.eq('entities.areas.code', area.toUpperCase());
  }

  const { data, error } = await query.order('sort', {
    foreignTable: 'entities',
  });
  if (error) {
    logError('READ', 'hotels', undefined, error);
    throw error;
  }

  return (data || [])
    .filter((row) => {
      const ent = row.entities as unknown as EntityRow;
      return ent?.active !== false;
    })
    .map((row) => {
      const ent = row.entities as unknown as EntityRow & { areas: { code: string } };
      const areaCode = ent.areas?.code || '';
      const { entities: _ent, ...hotelFields } = row;
      return mapHotel(ent, hotelFields, areaCode);
    });
}

export async function getHotelById(id: string): Promise<Hotel | null> {
  const { data, error } = await db()
    .from('hotels')
    .select(
      'entity_id, official_name, address, phone, checkin_time, checkout_time, breakfast_summary, bath_spa_summary, dinner_summary, atm_payment, transport_note, google_maps_url, source_url, status, last_verified, breakfast_place, breakfast_time, breakfast_last_entry, dinner_place, dinner_time, dinner_last_entry, has_public_bath, has_outdoor_onsen, has_sauna, bath_spa_hours, tattoo_policy, other_info, entities!inner(id, slug, display_name, entity_type, area_id, active, sort, updated_at, areas!inner(code))'
    )
    .eq('entities.slug', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    logError('READ', 'hotels', id, error);
    throw error;
  }
  const ent = data.entities as unknown as EntityRow & { areas: { code: string } };
  const areaCode = ent.areas?.code || '';
  const { entities: _ent, ...hotelFields } = data;
  return mapHotel(ent, hotelFields, areaCode);
}

export async function appendHotel(
  data: Record<string, string>
): Promise<{ id: string; slug: string }> {
  const areaId = await resolveAreaId(data.area || '');
  if (!areaId) throw new Error(`Area not found: ${data.area}`);

  const slug =
    data.id ||
    `${(data.area || '').toLowerCase()}_hotel_${(data.display_name || '').replace(/\s+/g, '_').toLowerCase()}`;

  const { data: entity, error: entityError } = await adminDb()
    .from('entities')
    .insert({
      slug,
      entity_type: 'HOTEL',
      area_id: areaId,
      display_name: data.display_name || '',
      active: isActive(data.active),
      sort: parseInt(data.sort || '999') || 999,
    })
    .select('id')
    .single();
  if (entityError) {
    logError('INSERT', 'entities', slug, entityError);
    throw entityError;
  }

  const { error: hotelError } = await adminDb()
    .from('hotels')
    .insert({
      entity_id: entity.id,
      official_name: data.official_name || '',
      address: data.address || '',
      phone: data.phone || '',
      checkin_time: data.checkin_time || '',
      checkout_time: data.checkout_time || '',
      breakfast_summary: data.breakfast_summary || '',
      breakfast_place: data.breakfast_place || '',
      breakfast_time: data.breakfast_time || '',
      breakfast_last_entry: data.breakfast_last_entry || '',
      dinner_summary: data.dinner_summary || '',
      dinner_place: data.dinner_place || '',
      dinner_time: data.dinner_time || '',
      dinner_last_entry: data.dinner_last_entry || '',
      bath_spa_summary: data.bath_spa_summary || '',
      has_public_bath: data.has_public_bath ? isActive(data.has_public_bath) : null,
      has_outdoor_onsen: data.has_outdoor_onsen ? isActive(data.has_outdoor_onsen) : null,
      has_sauna: data.has_sauna ? isActive(data.has_sauna) : null,
      bath_spa_hours: data.bath_spa_hours || '',
      tattoo_policy: data.tattoo_policy || '',
      atm_payment: data.atm_payment || '',
      transport_note: data.transport_note || '',
      other_info: data.other_info || '',
      google_maps_url: data.google_maps_url || '',
      source_url: data.source_url || '',
      status: data.status || '',
      last_verified: data.last_verified || null,
    });
  if (hotelError) {
    await adminDb().from('entities').delete().eq('id', entity.id);
    logError('INSERT', 'hotels', slug, hotelError);
    throw hotelError;
  }

  return { id: entity.id, slug };
}

export async function updateHotel(
  id: string,
  data: Record<string, string>,
  expectedUpdatedAt?: string
): Promise<boolean> {
  const { data: entity, error: findError } = await db()
    .from('entities')
    .select('id, updated_at')
    .eq('id', id)
    .single();
  if (findError || !entity) {
    logError('UPDATE', 'hotels', id, findError || { message: 'Not found' });
    return false;
  }

  if (expectedUpdatedAt && entity.updated_at !== expectedUpdatedAt) {
    throw new ConflictError();
  }

  const entityUpdates: Record<string, unknown> = {};
  if (data.display_name !== undefined) entityUpdates.display_name = data.display_name;
  if (data.active !== undefined) entityUpdates.active = isActive(data.active);
  if (data.sort !== undefined) entityUpdates.sort = parseInt(data.sort) || 0;
  if (data.area !== undefined) {
    const areaId = await resolveAreaId(data.area);
    if (areaId) entityUpdates.area_id = areaId;
  }

  if (Object.keys(entityUpdates).length > 0) {
    const { error } = await adminDb().from('entities').update(entityUpdates).eq('id', entity.id);
    if (error) {
      logError('UPDATE', 'entities', id, error);
      throw error;
    }
  }

  const hotelUpdates: Record<string, unknown> = {};
  const fields = [
    'official_name',
    'address',
    'phone',
    'checkin_time',
    'checkout_time',
    'breakfast_summary',
    'breakfast_place',
    'breakfast_time',
    'breakfast_last_entry',
    'dinner_summary',
    'dinner_place',
    'dinner_time',
    'dinner_last_entry',
    'bath_spa_summary',
    'has_public_bath',
    'has_outdoor_onsen',
    'has_sauna',
    'bath_spa_hours',
    'tattoo_policy',
    'atm_payment',
    'transport_note',
    'other_info',
    'google_maps_url',
    'source_url',
    'status',
    'last_verified',
  ];
  for (const f of fields) {
    if (data[f] !== undefined) hotelUpdates[f] = data[f];
  }
  // Convert boolean fields
  for (const bf of ['has_public_bath', 'has_outdoor_onsen', 'has_sauna']) {
    if (hotelUpdates[bf] !== undefined) {
      hotelUpdates[bf] = hotelUpdates[bf] ? isActive(hotelUpdates[bf]) : null;
    }
  }

  if (Object.keys(hotelUpdates).length > 0) {
    const { error } = await adminDb()
      .from('hotels')
      .update(hotelUpdates)
      .eq('entity_id', entity.id);
    if (error) {
      logError('UPDATE', 'hotels', id, error);
      throw error;
    }
  }

  return true;
}

export async function deleteHotel(id: string): Promise<boolean> {
  const { data: entity } = await db().from('entities').select('id').eq('id', id).single();
  if (!entity) return false;

  const { error } = await adminDb().from('entities').delete().eq('id', entity.id);
  if (error) {
    logError('DELETE', 'entities', id, error);
    throw error;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Restaurants
// ---------------------------------------------------------------------------

function mapRestaurant(
  entity: EntityRow,
  rest: Record<string, unknown>,
  areaCode: string,
  nearType: string,
  nearId: string,
  distanceText: string
): Restaurant {
  return {
    id: entity.id as string,
    slug: entity.slug,
    area: areaCode,
    near_type: nearType,
    near_id: nearId,
    name: entity.display_name,
    name_kr: entity.display_name,
    name_jp: '',
    category: (rest.category as string) || '',
    distance: distanceText,
    address: (rest.address as string) || '',
    hours: (rest.hours as string) || '',
    price_range: (rest.price_range as string) || '',
    phone: (rest.phone as string) || '',
    menu_kr: (rest.menu_kr as string) || '',
    menu_jp: (rest.menu_jp as string) || '',
    menu_price: (rest.menu_price as string) || '',
    closed_days: (rest.closed_days as string) || '',
    description: (rest.description as string) || '',
    recommended: rest.recommended === true ? 'TRUE' : rest.recommended === false ? 'FALSE' : '',
    google_maps_url: (rest.google_maps_url as string) || '',
    source_url: (rest.source_url as string) || '',
    status: (rest.status as string) || '',
    last_verified: (rest.last_verified as string) || '',
    distance_km: '',
    drive_minutes: '',
    walk_minutes: '',
    active: entity.active ? 'TRUE' : 'FALSE',
    sort: entity.sort,
    updated_at: entity.updated_at,
  };
}

export async function getRestaurants(area?: string): Promise<Restaurant[]> {
  // Query restaurant_locations with joins to get near entity info
  let query = db().from('restaurant_locations').select(`
      id, distance_text,
      restaurant:entities!restaurant_entity_id(id, slug, display_name, entity_type, area_id, active, sort, updated_at, areas!inner(code), restaurants(entity_id, category, address, hours, price_range, phone, menu_kr, menu_jp, menu_price, closed_days, description, recommended, google_maps_url, source_url, status, last_verified)),
      near:entities!near_entity_id(id, slug, display_name, entity_type)
    `);

  if (area) {
    query = query.eq('restaurant.areas.code', area.toUpperCase());
  }

  const { data, error } = await query;
  if (error) {
    logError('READ', 'restaurant_locations', undefined, error);
    throw error;
  }

  return (data || [])
    .filter((row) => {
      const rest = row.restaurant as unknown as EntityRow & {
        areas: { code: string };
        restaurants: Record<string, unknown>[];
      };
      return rest && rest.active !== false;
    })
    .map((row) => {
      const rest = row.restaurant as unknown as EntityRow & {
        areas: { code: string };
        restaurants: Record<string, unknown>[];
      };
      const near = row.near as unknown as EntityRow;
      const areaCode = rest.areas?.code || '';
      const restData = rest.restaurants?.[0] || {};
      const nearType =
        near?.entity_type === 'GOLF' ? 'GOLF' : near?.entity_type === 'HOTEL' ? 'HOTEL' : '';
      return mapRestaurant(
        rest,
        restData,
        areaCode,
        nearType,
        near?.slug || '',
        ((row as Record<string, unknown>).distance_text as string) || ''
      );
    });
}

export async function getRestaurantById(id: string): Promise<Restaurant | null> {
  // Get the entity first
  const { data: entity, error: findError } = await db()
    .from('entities')
    .select(
      'id, slug, display_name, entity_type, area_id, active, sort, updated_at, areas!inner(code), restaurants(entity_id, category, address, hours, price_range, phone, menu_kr, menu_jp, menu_price, closed_days, description, recommended, google_maps_url, source_url, status, last_verified)'
    )
    .eq('slug', id)
    .eq('entity_type', 'RESTAURANT')
    .single();
  if (findError) {
    if (findError.code === 'PGRST116') return null;
    logError('READ', 'entities', id, findError);
    throw findError;
  }

  const areaCode = (entity.areas as unknown as { code: string })?.code || '';
  const restData = (entity.restaurants as unknown as Record<string, unknown>[])?.[0] || {};

  // Get first near relationship
  const { data: locations } = await db()
    .from('restaurant_locations')
    .select('near:entities!near_entity_id(id, slug, display_name, entity_type)')
    .eq('restaurant_entity_id', entity.id)
    .order('sort')
    .limit(1);

  const near = locations?.[0]?.near as unknown as EntityRow | undefined;
  const nearType =
    near?.entity_type === 'GOLF' ? 'GOLF' : near?.entity_type === 'HOTEL' ? 'HOTEL' : '';

  return mapRestaurant(
    entity as unknown as EntityRow,
    restData,
    areaCode,
    nearType,
    near?.slug || '',
    ((locations?.[0] as Record<string, unknown>)?.distance_text as string) || ''
  );
}

export async function appendRestaurant(
  data: Record<string, string>
): Promise<{ id: string; slug: string }> {
  const areaId = await resolveAreaId(data.area || '');
  if (!areaId) throw new Error(`Area not found: ${data.area}`);

  const slug =
    data.id ||
    `${(data.area || '').toLowerCase()}_rest_${(data.name || data.name_kr || '').replace(/\s+/g, '_').toLowerCase()}`;

  const { data: entity, error: entityError } = await adminDb()
    .from('entities')
    .insert({
      slug,
      entity_type: 'RESTAURANT',
      area_id: areaId,
      display_name: data.name_kr || data.name || '',
      active: isActive(data.active),
      sort: parseInt(data.sort || '999') || 999,
    })
    .select('id')
    .single();
  if (entityError) {
    logError('INSERT', 'entities', slug, entityError);
    throw entityError;
  }

  const { error: restError } = await adminDb()
    .from('restaurants')
    .insert({
      entity_id: entity.id,
      category: data.category || '',
      address: data.address || '',
      hours: data.hours || '',
      price_range: data.price_range || '',
      phone: data.phone || '',
      menu_kr: data.menu_kr || '',
      menu_jp: data.menu_jp || '',
      menu_price: data.menu_price || '',
      closed_days: data.closed_days || '',
      description: data.description || '',
      recommended: data.recommended ? isActive(data.recommended) : null,
      google_maps_url: data.google_maps_url || '',
      source_url: data.source_url || '',
      status: data.status || '',
      last_verified: data.last_verified || null,
    });
  if (restError) {
    await adminDb().from('entities').delete().eq('id', entity.id);
    logError('INSERT', 'restaurants', slug, restError);
    throw restError;
  }

  // Add near relationship if provided
  if (data.near_id && data.near_type) {
    const nearEntityId = await resolveEntityIdBySlug(data.near_id);
    if (nearEntityId) {
      const { error: locError } = await adminDb()
        .from('restaurant_locations')
        .insert({
          restaurant_entity_id: entity.id,
          near_entity_id: nearEntityId,
          distance_text: data.near_name || '',
          sort: 1,
        });
      if (locError) {
        logError('INSERT', 'restaurant_locations', slug, locError);
      }
    }
  }

  return { id: entity.id, slug };
}

export async function updateRestaurant(
  id: string,
  data: Record<string, string>,
  expectedUpdatedAt?: string
): Promise<boolean> {
  const { data: entity, error: findError } = await db()
    .from('entities')
    .select('id, updated_at')
    .eq('id', id)
    .single();
  if (findError || !entity) {
    logError('UPDATE', 'restaurants', id, findError || { message: 'Not found' });
    return false;
  }

  if (expectedUpdatedAt && entity.updated_at !== expectedUpdatedAt) {
    throw new ConflictError();
  }

  const entityUpdates: Record<string, unknown> = {};
  if (data.name_kr !== undefined || data.name !== undefined)
    entityUpdates.display_name = data.name_kr || data.name || '';
  if (data.active !== undefined) entityUpdates.active = isActive(data.active);
  if (data.sort !== undefined) entityUpdates.sort = parseInt(data.sort) || 0;
  if (data.area !== undefined) {
    const areaId = await resolveAreaId(data.area);
    if (areaId) entityUpdates.area_id = areaId;
  }

  if (Object.keys(entityUpdates).length > 0) {
    const { error } = await adminDb().from('entities').update(entityUpdates).eq('id', entity.id);
    if (error) {
      logError('UPDATE', 'entities', id, error);
      throw error;
    }
  }

  const restUpdates: Record<string, unknown> = {};
  const fields = [
    'category',
    'address',
    'hours',
    'price_range',
    'phone',
    'menu_kr',
    'menu_jp',
    'menu_price',
    'closed_days',
    'description',
    'recommended',
    'google_maps_url',
    'source_url',
    'status',
    'last_verified',
  ];
  for (const f of fields) {
    if (data[f] !== undefined) restUpdates[f] = data[f];
  }
  // Convert boolean fields
  if (restUpdates['recommended'] !== undefined) {
    restUpdates['recommended'] = restUpdates['recommended']
      ? isActive(restUpdates['recommended'])
      : null;
  }

  if (Object.keys(restUpdates).length > 0) {
    const { error } = await adminDb()
      .from('restaurants')
      .update(restUpdates)
      .eq('entity_id', entity.id);
    if (error) {
      logError('UPDATE', 'restaurants', id, error);
      throw error;
    }
  }

  return true;
}

export async function deleteRestaurantRow(id: string): Promise<boolean> {
  const { data: entity } = await db().from('entities').select('id').eq('id', id).single();
  if (!entity) return false;

  const { error } = await adminDb().from('entities').delete().eq('id', entity.id);
  if (error) {
    logError('DELETE', 'entities', id, error);
    throw error;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Travel Times
// ---------------------------------------------------------------------------

export async function getTravelTimes(area?: string): Promise<TravelTime[]> {
  let query = db()
    .from('travel_times')
    .select(
      `
      id, product_reference_minutes, display_time, min_minutes, max_minutes, note, source, status, directions_url, time_basis, active, sort, updated_at,
      from_entity:entities!from_entity_id(id, slug, display_name, entity_type, area_id, areas!inner(code)),
      to_entity:entities!to_entity_id(id, slug, display_name, entity_type)
    `
    )
    .eq('active', true);

  if (area) {
    query = query.eq('from_entity.areas.code', area.toUpperCase());
  }

  const { data, error } = await query.order('sort');
  if (error) {
    logError('READ', 'travel_times', undefined, error);
    throw error;
  }

  return (data || []).map((row) => {
    const from = row.from_entity as unknown as EntityRow & { areas: { code: string } };
    const to = row.to_entity as unknown as EntityRow;
    return {
      id: row.id as string,
      area: from?.areas?.code || '',
      hotel_id: from?.slug || '',
      hotel_name: from?.display_name || '',
      golf_id: to?.slug || '',
      golf_name: to?.display_name || '',
      estimated_time: row.product_reference_minutes ? `${row.product_reference_minutes}분` : '',
      google_maps_direction_url: (row.directions_url as string) || '',
      active: row.active ? 'TRUE' : 'FALSE',
      sort: row.sort as number,
    };
  });
}

export async function appendTravelTime(data: Record<string, string>): Promise<string | null> {
  const fromEntityId = await resolveEntityIdBySlug(data.hotel_id || '');
  const toEntityId = await resolveEntityIdBySlug(data.golf_id || '');
  if (!fromEntityId || !toEntityId) {
    logError('INSERT', 'travel_times', undefined, {
      message: `Entity not found: from=${data.hotel_id} to=${data.golf_id}`,
    });
    return null;
  }

  const { data: row, error } = await adminDb()
    .from('travel_times')
    .insert({
      from_entity_id: fromEntityId,
      to_entity_id: toEntityId,
      product_reference_minutes: data.product_reference_minutes
        ? parseInt(data.product_reference_minutes)
        : null,
      display_time: data.display_time || '',
      min_minutes: data.min_minutes ? parseInt(data.min_minutes) : null,
      max_minutes: data.max_minutes ? parseInt(data.max_minutes) : null,
      note: data.note || '',
      source: data.source || '',
      status: data.status || '',
      directions_url: data.directions_url || '',
      time_basis: data.time_basis || '',
      active: isActive(data.active),
      sort: parseInt(data.sort || '999') || 999,
    })
    .select('id')
    .single();
  if (error) {
    logError('INSERT', 'travel_times', undefined, error);
    throw error;
  }
  return row?.id ?? null;
}

export async function updateTravelTime(data: Record<string, string>): Promise<boolean> {
  if (!data.id) return false;

  const updates: Record<string, unknown> = {};
  if (data.product_reference_minutes !== undefined)
    updates.product_reference_minutes = data.product_reference_minutes
      ? parseInt(data.product_reference_minutes)
      : null;
  if (data.display_time !== undefined) updates.display_time = data.display_time;
  if (data.min_minutes !== undefined)
    updates.min_minutes = data.min_minutes ? parseInt(data.min_minutes) : null;
  if (data.max_minutes !== undefined)
    updates.max_minutes = data.max_minutes ? parseInt(data.max_minutes) : null;
  if (data.note !== undefined) updates.note = data.note;
  if (data.source !== undefined) updates.source = data.source;
  if (data.status !== undefined) updates.status = data.status;
  if (data.directions_url !== undefined) updates.directions_url = data.directions_url;
  if (data.time_basis !== undefined) updates.time_basis = data.time_basis;
  if (data.active !== undefined) updates.active = isActive(data.active);
  if (data.sort !== undefined) updates.sort = parseInt(data.sort) || 0;

  const { error } = await adminDb().from('travel_times').update(updates).eq('id', data.id);
  if (error) {
    logError('UPDATE', 'travel_times', data.id, error);
    throw error;
  }
  return true;
}

export async function deleteTravelTime(id: string): Promise<boolean> {
  // Soft delete
  const { error } = await adminDb().from('travel_times').update({ active: false }).eq('id', id);
  if (error) {
    logError('DELETE', 'travel_times', id, error);
    throw error;
  }
  return true;
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

async function mapFaqRow(
  row: Record<string, unknown>,
  areaCodeById: Map<string, string>,
  categoryCodeById: Map<string, string>,
  relatedEntityMap: Map<string, { slug: string; display_name: string }>
): Promise<FaqItem> {
  const areaId = row.area_id as string | null;
  const categoryId = row.category_id as string | null;
  const relatedEntityId = row.related_entity_id as string | null;

  const areaCode = areaId ? areaCodeById.get(areaId) || '' : 'ALL';
  const categoryCode = categoryId ? categoryCodeById.get(categoryId) || '' : '';

  let relatedSlug = '';
  let relatedName = '';
  if (relatedEntityId) {
    const relEntity = relatedEntityMap.get(relatedEntityId);
    if (relEntity) {
      relatedSlug = relEntity.slug;
      relatedName = relEntity.display_name;
    }
  }

  return {
    id: row.id as string,
    area: areaCode,
    category: categoryCode,
    question: (row.question as string) || '',
    answer: (row.answer as string) || '',
    question_scope: (row.scope as string) || '',
    related_type: relatedSlug ? categoryCode : '',
    related_id: relatedSlug,
    related_name: relatedName,
    source_url: (row.source_url as string) || '',
    status: (row.status as string) || '',
    active: isActive(row.active) ? 'TRUE' : 'FALSE',
    sort: row.sort as number,
    updated_at: (row.updated_at as string) || '',
  };
}

export async function getFaq(area?: string, category?: string): Promise<FaqItem[]> {
  const [areaCodeById, categoryCodeById] = await Promise.all([
    getAreaCodeByIdMap(),
    getCategoryCodeByIdMap(),
  ]);

  let query = db()
    .from('faq')
    .select(
      'id, area_id, category_id, related_entity_id, scope, question, answer, source_url, status, active, sort, updated_at'
    )
    .eq('active', true);

  // Area filter: match specific area OR common (area_id IS NULL)
  if (area && area.toUpperCase() !== 'ALL') {
    const areaId = await resolveAreaId(area);
    if (areaId) {
      // We need OR logic: area_id = areaId OR area_id IS NULL
      // Supabase doesn't support OR directly in filter, so use .or()
      query = query.or(`area_id.eq.${areaId},area_id.is.null`);
    }
  } else if (area && area.toUpperCase() === 'ALL') {
    query = query.is('area_id', null);
  }

  if (category) {
    const catId = await resolveCategoryId(category);
    if (catId) {
      query = query.eq('category_id', catId);
    }
  }

  const { data, error } = await query.order('sort');
  if (error) {
    logError('READ', 'faq', undefined, error);
    throw error;
  }

  // Batch-fetch related entities to avoid N+1
  const relatedIds = [
    ...new Set((data || []).map((r) => r.related_entity_id).filter(Boolean)),
  ] as string[];
  const relatedEntityMap = new Map<string, { slug: string; display_name: string }>();
  if (relatedIds.length > 0) {
    const { data: relEntities } = await db()
      .from('entities')
      .select('id, slug, display_name')
      .in('id', relatedIds);
    for (const e of relEntities || []) {
      relatedEntityMap.set(e.id, { slug: e.slug, display_name: e.display_name });
    }
  }

  const results: FaqItem[] = [];
  for (const row of data || []) {
    results.push(await mapFaqRow(row, areaCodeById, categoryCodeById, relatedEntityMap));
  }
  return results;
}

export async function getAdminFaqs(area?: string, category?: string): Promise<FaqItem[]> {
  const [areaCodeById, categoryCodeById] = await Promise.all([
    getAreaCodeByIdMap(),
    getCategoryCodeByIdMap(),
  ]);

  let query = db()
    .from('faq')
    .select(
      'id, area_id, category_id, related_entity_id, scope, question, answer, source_url, status, active, sort, updated_at'
    );

  if (area && area.toUpperCase() !== 'ALL') {
    const areaId = await resolveAreaId(area);
    if (areaId) {
      query = query.or(`area_id.eq.${areaId},area_id.is.null`);
    }
  } else if (area && area.toUpperCase() === 'ALL') {
    query = query.is('area_id', null);
  }

  if (category) {
    const catId = await resolveCategoryId(category);
    if (catId) {
      query = query.eq('category_id', catId);
    }
  }

  const { data, error } = await query.order('sort');
  if (error) {
    logError('READ', 'faq', undefined, error);
    throw error;
  }

  // Batch-fetch related entities to avoid N+1
  const relatedIds = [
    ...new Set((data || []).map((r) => r.related_entity_id).filter(Boolean)),
  ] as string[];
  const relatedEntityMap = new Map<string, { slug: string; display_name: string }>();
  if (relatedIds.length > 0) {
    const { data: relEntities } = await db()
      .from('entities')
      .select('id, slug, display_name')
      .in('id', relatedIds);
    for (const e of relEntities || []) {
      relatedEntityMap.set(e.id, { slug: e.slug, display_name: e.display_name });
    }
  }

  const results: FaqItem[] = [];
  for (const row of data || []) {
    results.push(await mapFaqRow(row, areaCodeById, categoryCodeById, relatedEntityMap));
  }
  return results;
}

export async function getFaqById(id: string): Promise<FaqItem | null> {
  const [areaCodeById, categoryCodeById] = await Promise.all([
    getAreaCodeByIdMap(),
    getCategoryCodeByIdMap(),
  ]);

  const { data, error } = await db()
    .from('faq')
    .select(
      'id, area_id, category_id, related_entity_id, scope, question, answer, source_url, status, active, sort, updated_at'
    )
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    logError('READ', 'faq', id, error);
    throw error;
  }
  // Batch-fetch related entity (single item)
  const relatedEntityMap = new Map<string, { slug: string; display_name: string }>();
  if (data.related_entity_id) {
    const { data: relEntity } = await db()
      .from('entities')
      .select('id, slug, display_name')
      .eq('id', data.related_entity_id)
      .single();
    if (relEntity) {
      relatedEntityMap.set(relEntity.id, {
        slug: relEntity.slug,
        display_name: relEntity.display_name,
      });
    }
  }
  return mapFaqRow(data, areaCodeById, categoryCodeById, relatedEntityMap);
}

export async function appendFaq(data: Record<string, string>): Promise<string> {
  const areaId =
    data.area && data.area.toUpperCase() !== 'ALL' ? await resolveAreaId(data.area) : null;
  const catId = data.category ? await resolveCategoryId(data.category) : null;
  const relatedEntityId = data.related_id ? await resolveEntityIdBySlug(data.related_id) : null;

  const { data: row, error } = await adminDb()
    .from('faq')
    .insert({
      area_id: areaId,
      category_id: catId,
      related_entity_id: relatedEntityId,
      scope: data.question_scope || 'AREA',
      question: data.question || '',
      answer: data.answer || '',
      source_url: data.source_url || '',
      status: data.status || '',
      active: isActive(data.active),
      sort: parseInt(data.sort || '999') || 999,
    })
    .select('id')
    .single();
  if (error) {
    logError('INSERT', 'faq', undefined, error);
    throw error;
  }
  return row?.id || '';
}

export async function updateFaq(_rowIndex: number, data: Record<string, string>): Promise<boolean> {
  if (!data.id) return false;

  const updates: Record<string, unknown> = {};
  if (data.question !== undefined) updates.question = data.question;
  if (data.answer !== undefined) updates.answer = data.answer;
  if (data.source_url !== undefined) updates.source_url = data.source_url;
  if (data.status !== undefined) updates.status = data.status;
  if (data.active !== undefined) updates.active = isActive(data.active);
  if (data.sort !== undefined) updates.sort = parseInt(data.sort) || 0;
  if (data.question_scope !== undefined) updates.scope = data.question_scope;

  if (data.area !== undefined) {
    updates.area_id = data.area.toUpperCase() !== 'ALL' ? await resolveAreaId(data.area) : null;
  }
  if (data.category !== undefined) {
    updates.category_id = await resolveCategoryId(data.category);
  }
  if (data.related_id !== undefined) {
    updates.related_entity_id = data.related_id
      ? await resolveEntityIdBySlug(data.related_id)
      : null;
  }

  const { error } = await adminDb().from('faq').update(updates).eq('id', data.id);
  if (error) {
    logError('UPDATE', 'faq', data.id, error);
    throw error;
  }
  return true;
}

export async function deleteFaq(id: string): Promise<boolean> {
  // Soft delete
  const { error } = await adminDb().from('faq').update({ active: false }).eq('id', id);
  if (error) {
    logError('DELETE', 'faq', id, error);
    throw error;
  }
  return true;
}

export async function updateFaqSort(ids: string[]): Promise<boolean> {
  for (let i = 0; i < ids.length; i++) {
    const { error } = await adminDb()
      .from('faq')
      .update({ sort: i + 1 })
      .eq('id', ids[i]);
    if (error) {
      logError('UPDATE_SORT', 'faq', ids[i], error);
      throw error;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Admin Options CRUD
// ---------------------------------------------------------------------------

export async function appendAdminOption(data: Record<string, string>): Promise<string> {
  let tableName: string;
  let insertData: Record<string, unknown>;

  if (data.option_type === 'AREA') {
    tableName = 'areas';
    insertData = {
      code: data.code || '',
      name_kr: data.label || '',
      name_jp: '',
      icon: data.icon || '',
      description: data.description || '',
      active: isActive(data.active),
      sort: parseInt(data.sort || '999') || 999,
    };
  } else {
    tableName = 'categories';
    insertData = {
      code: data.code || '',
      label: data.label || '',
      icon: data.icon || '',
      group_type: data.group || 'AREA',
      description: data.description || '',
      allows_specific_target: true,
      allowed_entity_types: [],
      navigation_visible: true,
      active: isActive(data.active),
      sort: parseInt(data.sort || '999') || 999,
    };
  }

  const { data: row, error } = await adminDb()
    .from(tableName)
    .insert(insertData)
    .select('id')
    .single();
  if (error) {
    logError('INSERT', tableName, data.code, error);
    throw error;
  }
  return row?.id || '';
}

export async function updateAdminOption(data: Record<string, string>): Promise<boolean> {
  if (!data.id) return false;

  // Determine table: check if ID exists in categories first, then areas
  let table: 'categories' | 'areas' = 'categories';
  if (!data.option_type) {
    const { data: cat } = await adminDb()
      .from('categories')
      .select('id')
      .eq('id', data.id)
      .maybeSingle();
    if (!cat) {
      const { data: area } = await adminDb()
        .from('areas')
        .select('id')
        .eq('id', data.id)
        .maybeSingle();
      if (!area) return false;
      table = 'areas';
    }
  } else {
    table = data.option_type === 'AREA' ? 'areas' : 'categories';
  }

  const updates: Record<string, unknown> = {};
  if (table === 'areas') {
    if (data.label !== undefined) updates.name_kr = data.label;
  } else {
    if (data.label !== undefined) updates.label = data.label;
    if (data.group !== undefined) updates.group_type = data.group;
  }
  if (data.icon !== undefined) updates.icon = data.icon;
  if (data.description !== undefined) updates.description = data.description;
  if (data.active !== undefined) updates.active = isActive(data.active);
  if (data.sort !== undefined) updates.sort = parseInt(data.sort) || 0;

  const { error } = await adminDb().from(table).update(updates).eq('id', data.id);
  if (error) {
    logError('UPDATE', table, data.id, error);
    throw error;
  }
  return true;
}

export async function updateAdminOptionSort(optionType: string, ids: string[]): Promise<boolean> {
  const table = optionType === 'AREA' ? 'areas' : 'categories';
  for (let i = 0; i < ids.length; i++) {
    const { error } = await adminDb()
      .from(table)
      .update({ sort: i + 1 })
      .eq('id', ids[i]);
    if (error) {
      logError('UPDATE_SORT', table, ids[i], error);
      throw error;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Content Sections
// ---------------------------------------------------------------------------

export async function getContentSections(
  parentType?: string,
  parentId?: string,
  includeHidden?: boolean
): Promise<ContentSection[]> {
  let query = db()
    .from('content_sections')
    .select('id, parent_entity_id, title, content, emoji, sort, is_visible, updated_at');

  if (!includeHidden) {
    query = query.eq('is_visible', true);
  }

  if (parentType && parentId) {
    const entityId = await resolveEntityIdBySlug(parentId);
    if (!entityId) return [];
    query = query.eq('parent_entity_id', entityId);
  } else if (parentType) {
    // Need to find all entities of this type
    const { data: entities } = await db()
      .from('entities')
      .select('id')
      .eq('entity_type', parentType);
    const ids = (entities || []).map((e) => e.id);
    if (ids.length === 0) return [];
    query = query.in('parent_entity_id', ids);
  }

  const { data, error } = await query.order('sort');
  if (error) {
    logError('READ', 'content_sections', undefined, error);
    throw error;
  }

  // Batch-fetch parent entities to avoid N+1
  const parentIds = [
    ...new Set((data || []).map((r) => r.parent_entity_id).filter(Boolean)),
  ] as string[];
  const parentEntityMap = new Map<string, { slug: string; entity_type: string }>();
  if (parentIds.length > 0) {
    const { data: parentEntities } = await db()
      .from('entities')
      .select('id, slug, entity_type')
      .in('id', parentIds);
    for (const e of parentEntities || []) {
      parentEntityMap.set(e.id, { slug: e.slug, entity_type: e.entity_type });
    }
  }

  const results: ContentSection[] = [];
  for (const row of data || []) {
    const parentEntity = row.parent_entity_id
      ? parentEntityMap.get(row.parent_entity_id)
      : undefined;

    results.push({
      id: row.id as string,
      parent_type: parentEntity?.entity_type || '',
      parent_id: parentEntity?.slug || '',
      title: (row.title as string) || '',
      content: (row.content as string) || '',
      emoji: (row.emoji as string) || '',
      sort: (row.sort as number) || 0,
      is_visible: row.is_visible ? 'TRUE' : 'FALSE',
      updated_at: (row.updated_at as string) || '',
    });
  }
  return results;
}

export async function appendContentSection(data: Record<string, string>): Promise<string> {
  let entityId: string | null = null;
  if (data.parent_entity_id) {
    entityId = data.parent_entity_id;
  } else if (data.parent_id) {
    entityId = await resolveEntityIdBySlug(data.parent_id);
  }
  if (!entityId) {
    throw new Error(`Entity not found: ${data.parent_id || data.parent_entity_id}`);
  }

  const { data: row, error } = await adminDb()
    .from('content_sections')
    .insert({
      parent_entity_id: entityId,
      title: data.title || '',
      content: data.content || '',
      emoji: data.emoji || '',
      sort: parseInt(data.sort || '999') || 999,
      is_visible: data.is_visible !== 'FALSE',
    })
    .select('id')
    .single();
  if (error) {
    logError('INSERT', 'content_sections', data.parent_id, error);
    throw error;
  }
  return row?.id || '';
}

export async function updateContentSection(
  id: string,
  data: Record<string, string>,
  expectedUpdatedAt?: string
): Promise<boolean> {
  if (expectedUpdatedAt) {
    const { data: existing } = await db()
      .from('content_sections')
      .select('updated_at')
      .eq('id', id)
      .single();
    if (existing && existing.updated_at !== expectedUpdatedAt) {
      throw new ConflictError();
    }
  }

  const updates: Record<string, unknown> = {};
  if (data.title !== undefined) updates.title = data.title;
  if (data.content !== undefined) updates.content = data.content;
  if (data.emoji !== undefined) updates.emoji = data.emoji;
  if (data.sort !== undefined) updates.sort = parseInt(data.sort) || 0;
  if (data.is_visible !== undefined) updates.is_visible = data.is_visible !== 'FALSE';

  const { error } = await adminDb().from('content_sections').update(updates).eq('id', id);
  if (error) {
    logError('UPDATE', 'content_sections', id, error);
    throw error;
  }
  return true;
}

export async function deleteContentSection(id: string): Promise<boolean> {
  // Soft delete
  const { error } = await adminDb()
    .from('content_sections')
    .update({ is_visible: false })
    .eq('id', id);
  if (error) {
    logError('DELETE', 'content_sections', id, error);
    throw error;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Includes / Excludes
// ---------------------------------------------------------------------------

export async function getIncludesExcludes(
  parentType?: string,
  parentId?: string,
  includeHidden?: boolean
): Promise<IncludeExclude[]> {
  let query = db()
    .from('includes_excludes')
    .select('id, parent_entity_id, type, text_kr, sort, is_visible, updated_at');

  if (!includeHidden) {
    query = query.eq('is_visible', true);
  }

  if (parentType && parentId) {
    const entityId = await resolveEntityIdBySlug(parentId);
    if (!entityId) return [];
    query = query.eq('parent_entity_id', entityId);
  } else if (parentType) {
    const { data: entities } = await db()
      .from('entities')
      .select('id')
      .eq('entity_type', parentType);
    const ids = (entities || []).map((e) => e.id);
    if (ids.length === 0) return [];
    query = query.in('parent_entity_id', ids);
  }

  const { data, error } = await query.order('sort');
  if (error) {
    logError('READ', 'includes_excludes', undefined, error);
    throw error;
  }

  // Batch-fetch parent entities to avoid N+1
  const parentIds = [
    ...new Set((data || []).map((r) => r.parent_entity_id).filter(Boolean)),
  ] as string[];
  const parentEntityMap = new Map<string, { slug: string }>();
  if (parentIds.length > 0) {
    const { data: parentEntities } = await db()
      .from('entities')
      .select('id, slug')
      .in('id', parentIds);
    for (const e of parentEntities || []) {
      parentEntityMap.set(e.id, { slug: e.slug });
    }
  }

  const results: IncludeExclude[] = [];
  for (const row of data || []) {
    const entitySlug = row.parent_entity_id
      ? parentEntityMap.get(row.parent_entity_id)?.slug || ''
      : '';
    results.push({
      id: row.id as string,
      parent_type: parentType || '',
      parent_id: entitySlug,
      type: (row.type as string) || '',
      text_kr: (row.text_kr as string) || '',
      text_jp: '',
      sort: (row.sort as number) || 0,
      is_visible: 'TRUE',
      updated_at: (row.updated_at as string) || '',
    });
  }
  return results;
}

export async function appendIncludeExclude(data: Record<string, string>): Promise<string> {
  let entityId: string | null = null;
  if (data.parent_entity_id) {
    entityId = data.parent_entity_id;
  } else if (data.parent_id) {
    entityId = await resolveEntityIdBySlug(data.parent_id);
  }
  if (!entityId) {
    throw new Error(`Entity not found: ${data.parent_id || data.parent_entity_id}`);
  }

  const { data: row, error } = await adminDb()
    .from('includes_excludes')
    .insert({
      parent_entity_id: entityId,
      type: data.type || 'INCLUDED',
      text_kr: data.text_kr || '',
      sort: parseInt(data.sort || '999') || 999,
    })
    .select('id')
    .single();
  if (error) {
    logError('INSERT', 'includes_excludes', data.parent_id, error);
    throw error;
  }
  return row?.id || '';
}

export async function updateIncludeExclude(
  id: string,
  data: Record<string, string>,
  expectedUpdatedAt?: string
): Promise<boolean> {
  if (expectedUpdatedAt) {
    const { data: existing } = await db()
      .from('includes_excludes')
      .select('updated_at')
      .eq('id', id)
      .single();
    if (existing && existing.updated_at !== expectedUpdatedAt) {
      throw new ConflictError();
    }
  }

  const updates: Record<string, unknown> = {};
  if (data.type !== undefined) updates.type = data.type;
  if (data.text_kr !== undefined) updates.text_kr = data.text_kr;
  if (data.sort !== undefined) updates.sort = parseInt(data.sort) || 0;

  const { error } = await adminDb().from('includes_excludes').update(updates).eq('id', id);
  if (error) {
    logError('UPDATE', 'includes_excludes', id, error);
    throw error;
  }
  return true;
}

export async function deleteIncludeExclude(id: string): Promise<boolean> {
  // Soft delete
  const { error } = await adminDb()
    .from('includes_excludes')
    .update({ is_visible: false })
    .eq('id', id);
  if (error) {
    logError('DELETE', 'includes_excludes', id, error);
    throw error;
  }
  return true;
}
