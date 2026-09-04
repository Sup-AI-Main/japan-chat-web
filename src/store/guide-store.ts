import { create } from 'zustand';
import type { Hotel, GolfCourse, Restaurant, IncludeExclude } from '@/lib/types';

interface AreaCache {
  hotels: Hotel[];
  golfCourses: GolfCourse[];
  restaurants: Restaurant[];
  inclusions: IncludeExclude[];
  fetchedAt: number;
}

interface GuideStore {
  areaCache: Record<string, AreaCache>;
  isAdmin: boolean | null;

  getAreaData: (area: string) => AreaCache | null;
  setAreaData: (area: string, data: Partial<AreaCache>) => void;
  updateHotel: (hotel: Hotel) => void;
  deleteHotel: (hotelId: string, area: string) => void;
  addHotel: (hotel: Hotel) => void;
  updateGolfCourse: (course: GolfCourse) => void;
  deleteGolfCourse: (courseId: string, area: string) => void;
  addGolfCourse: (course: GolfCourse) => void;
  updateRestaurant: (restaurant: Restaurant) => void;
  deleteRestaurant: (restaurantId: string, area: string) => void;
  addRestaurant: (restaurant: Restaurant) => void;
  setInclusions: (parentId: string, items: IncludeExclude[]) => void;
  addInclusion: (item: IncludeExclude) => void;
  updateInclusion: (item: IncludeExclude) => void;
  deleteInclusion: (itemId: string, parentId: string) => void;
  invalidateArea: (area: string) => void;
  setAdmin: (isAdmin: boolean) => void;
  isCacheValid: (area: string, ttlMs?: number) => boolean;
}

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export const useGuideStore = create<GuideStore>((set, get) => ({
  areaCache: {},
  isAdmin: null,

  getAreaData: (area) => {
    const key = area.toUpperCase();
    return get().areaCache[key] || null;
  },

  setAreaData: (area, data) => {
    const key = area.toUpperCase();
    const existing = get().areaCache[key] || { hotels: [], golfCourses: [], restaurants: [], inclusions: [], fetchedAt: 0 };
    set({
      areaCache: {
        ...get().areaCache,
        [key]: { ...existing, ...data, fetchedAt: Date.now() },
      },
    });
  },

  // --- Hotel CRUD ---
  updateHotel: (hotel) => {
    const key = hotel.area.toUpperCase();
    const cache = get().areaCache[key];
    if (!cache) return;
    set({
      areaCache: {
        ...get().areaCache,
        [key]: {
          ...cache,
          hotels: cache.hotels.map((h) => (h.id === hotel.id ? hotel : h)),
        },
      },
    });
  },

  deleteHotel: (hotelId, area) => {
    const key = area.toUpperCase();
    const cache = get().areaCache[key];
    if (!cache) return;
    set({
      areaCache: {
        ...get().areaCache,
        [key]: {
          ...cache,
          hotels: cache.hotels.filter((h) => h.id !== hotelId),
        },
      },
    });
  },

  addHotel: (hotel) => {
    const key = hotel.area.toUpperCase();
    const cache = get().areaCache[key];
    if (!cache) return;
    set({
      areaCache: {
        ...get().areaCache,
        [key]: {
          ...cache,
          hotels: [...cache.hotels, hotel],
        },
      },
    });
  },

  // --- Golf CRUD ---
  updateGolfCourse: (course) => {
    const key = course.area.toUpperCase();
    const cache = get().areaCache[key];
    if (!cache) return;
    set({
      areaCache: {
        ...get().areaCache,
        [key]: {
          ...cache,
          golfCourses: cache.golfCourses.map((c) => (c.id === course.id ? course : c)),
        },
      },
    });
  },

  deleteGolfCourse: (courseId, area) => {
    const key = area.toUpperCase();
    const cache = get().areaCache[key];
    if (!cache) return;
    set({
      areaCache: {
        ...get().areaCache,
        [key]: {
          ...cache,
          golfCourses: cache.golfCourses.filter((c) => c.id !== courseId),
        },
      },
    });
  },

  addGolfCourse: (course) => {
    const key = course.area.toUpperCase();
    const cache = get().areaCache[key];
    if (!cache) return;
    set({
      areaCache: {
        ...get().areaCache,
        [key]: {
          ...cache,
          golfCourses: [...cache.golfCourses, course],
        },
      },
    });
  },

  // --- Restaurant CRUD ---
  updateRestaurant: (restaurant) => {
    const key = restaurant.area.toUpperCase();
    const cache = get().areaCache[key];
    if (!cache) return;
    set({
      areaCache: {
        ...get().areaCache,
        [key]: {
          ...cache,
          restaurants: cache.restaurants.map((r) => (r.id === restaurant.id ? restaurant : r)),
        },
      },
    });
  },

  deleteRestaurant: (restaurantId, area) => {
    const key = area.toUpperCase();
    const cache = get().areaCache[key];
    if (!cache) return;
    set({
      areaCache: {
        ...get().areaCache,
        [key]: {
          ...cache,
          restaurants: cache.restaurants.filter((r) => r.id !== restaurantId),
        },
      },
    });
  },

  addRestaurant: (restaurant) => {
    const key = restaurant.area.toUpperCase();
    const cache = get().areaCache[key];
    if (!cache) return;
    set({
      areaCache: {
        ...get().areaCache,
        [key]: {
          ...cache,
          restaurants: [...cache.restaurants, restaurant],
        },
      },
    });
  },

  // --- Inclusions CRUD ---
  setInclusions: (parentId, items) => {
    // Store inclusions by parentId across all area caches
    const allCache = get().areaCache;
    const newCache = { ...allCache };
    for (const [key, cache] of Object.entries(newCache)) {
      const filtered = cache.inclusions.filter((i) => i.parent_id !== parentId);
      newCache[key] = {
        ...cache,
        inclusions: [...filtered, ...items],
      };
    }
    set({ areaCache: newCache });
  },

  addInclusion: (item) => {
    const allCache = get().areaCache;
    const newCache = { ...allCache };
    for (const [key, cache] of Object.entries(newCache)) {
      newCache[key] = {
        ...cache,
        inclusions: [...cache.inclusions, item],
      };
    }
    set({ areaCache: newCache });
  },

  updateInclusion: (item) => {
    const allCache = get().areaCache;
    const newCache = { ...allCache };
    for (const [key, cache] of Object.entries(newCache)) {
      newCache[key] = {
        ...cache,
        inclusions: cache.inclusions.map((i) => (i.id === item.id ? item : i)),
      };
    }
    set({ areaCache: newCache });
  },

  deleteInclusion: (itemId, parentId) => {
    const allCache = get().areaCache;
    const newCache = { ...allCache };
    for (const [key, cache] of Object.entries(newCache)) {
      newCache[key] = {
        ...cache,
        inclusions: cache.inclusions.filter((i) => i.id !== itemId),
      };
    }
    set({ areaCache: newCache });
  },

  // --- Utility ---
  invalidateArea: (area) => {
    const key = area.toUpperCase();
    const cache = get().areaCache[key];
    if (!cache) return;
    set({
      areaCache: {
        ...get().areaCache,
        [key]: { ...cache, fetchedAt: 0 },
      },
    });
  },

  setAdmin: (isAdmin) => set({ isAdmin }),

  isCacheValid: (area, ttlMs = CACHE_TTL) => {
    const cache = get().areaCache[area.toUpperCase()];
    if (!cache) return false;
    return Date.now() - cache.fetchedAt < ttlMs;
  },
}));
