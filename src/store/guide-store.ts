import { create } from 'zustand';
import type { Hotel, GolfCourse, Restaurant } from '@/lib/types';

interface AreaCache {
  hotels: Hotel[];
  golfCourses: GolfCourse[];
  restaurants: Restaurant[];
  fetchedAt: number;
}

interface GuideStore {
  areaCache: Record<string, AreaCache>;
  isAdmin: boolean | null; // null = not checked yet

  getAreaData: (area: string) => AreaCache | null;
  setAreaData: (area: string, data: Partial<AreaCache>) => void;
  updateHotel: (hotel: Hotel) => void;
  deleteHotel: (hotelId: string, area: string) => void;
  addHotel: (hotel: Hotel) => void;
  updateRestaurant: (restaurant: Restaurant) => void;
  deleteRestaurant: (restaurantId: string, area: string) => void;
  addRestaurant: (restaurant: Restaurant) => void;
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
    const existing = get().areaCache[key] || { hotels: [], golfCourses: [], restaurants: [], fetchedAt: 0 };
    set({
      areaCache: {
        ...get().areaCache,
        [key]: { ...existing, ...data, fetchedAt: Date.now() },
      },
    });
  },

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
