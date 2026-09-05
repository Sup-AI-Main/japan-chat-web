/**
 * Shared restaurant data conversion utilities.
 * Used by both GolfDetailClient and HotelDetailClient.
 */
import type { Restaurant } from "./types";

export interface RestaurantEditData {
  id?: string;
  name_kr: string;
  name_jp: string;
  category: string;
  menu_kr: string;
  menu_jp: string;
  menu_price: string;
  address: string;
  hours: string;
  closed_days: string;
  distance_km: string;
  drive_minutes: string;
  walk_minutes: string;
  phone: string;
  price_range: string;
  google_maps_url: string;
  description: string;
  recommended: boolean;
  near_type: "HOTEL" | "GOLF" | "AREA";
  near_id: string;
}

export function toBool(v: string): boolean {
  if (!v) return false;
  const s = v.trim().toUpperCase();
  return s === "TRUE" || s === "Y" || s === "YES" || s === "1";
}

export function restToEditData(
  r: Restaurant,
  defaultNearType: "HOTEL" | "GOLF" = "HOTEL"
): RestaurantEditData {
  return {
    id: r.id,
    name_kr: r.name_kr || "",
    name_jp: r.name_jp || "",
    category: r.category || "",
    menu_kr: r.menu_kr || "",
    menu_jp: r.menu_jp || "",
    menu_price: r.menu_price || "",
    address: r.address || "",
    hours: r.hours || "",
    closed_days: r.closed_days || "",
    distance_km: r.distance_km || "",
    drive_minutes: r.drive_minutes || "",
    walk_minutes: r.walk_minutes || "",
    phone: r.phone || "",
    price_range: r.price_range || "",
    google_maps_url: r.google_maps_url || "",
    description: r.description || "",
    recommended: toBool(r.recommended),
    near_type: (r.near_type as "HOTEL" | "GOLF" | "AREA") || defaultNearType,
    near_id: r.near_id || "",
  };
}

export function editDataToRestaurant(
  data: RestaurantEditData,
  defaultNearType: "HOTEL" | "GOLF" = "HOTEL"
): Restaurant {
  return {
    id: data.id || "",
    area: "",
    near_type: data.near_type || defaultNearType,
    near_id: data.near_id || "",
    name: data.name_kr || "",
    name_kr: data.name_kr || "",
    name_jp: data.name_jp || "",
    category: data.category || "",
    menu_kr: data.menu_kr || "",
    menu_jp: data.menu_jp || "",
    menu_price: data.menu_price || "",
    distance: data.drive_minutes ? `차량 약 ${data.drive_minutes}분` : "",
    distance_km: data.distance_km || "",
    drive_minutes: data.drive_minutes || "",
    walk_minutes: data.walk_minutes || "",
    address: data.address || "",
    hours: data.hours || "",
    closed_days: data.closed_days || "",
    price_range: data.price_range || "",
    phone: data.phone || "",
    google_maps_url: data.google_maps_url || "",
    source_url: "",
    description: data.description || "",
    recommended: data.recommended ? "TRUE" : "FALSE",
    status: "",
    active: "",
    sort: 0,
    last_verified: "",
    updated_at: "",
  };
}