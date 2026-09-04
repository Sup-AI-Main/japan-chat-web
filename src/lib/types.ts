// Golf Course
export interface GolfCourse {
  id: string;
  area: string;
  display_name: string;
  official_name: string;
  address: string;
  phone: string;
  course_summary: string;
  play_cart: string;
  clubhouse_dining: string;
  bath_shower: string;
  rental: string;
  dress_code: string;
  google_maps_url: string;
  source_url: string;
  status: string;
  active: string;
  sort: number;
  last_verified: string;
}

// Hotel
export interface Hotel {
  id: string;
  area: string;
  official_name: string;
  address: string;
  phone: string;
  check_in: string;
  check_out: string;
  breakfast: string;
  bath_spa: string;
  hotel_dining: string;
  atm_payment: string;
  transport: string;
  google_maps_url: string;
  source_url: string;
  status: string;
  active: string;
  sort: number;
  last_verified: string;
  name_kr: string;
  name_jp: string;
  address_kr: string;
  address_jp: string;
  checkin_time: string;
  checkout_time: string;
  breakfast_place: string;
  breakfast_time: string;
  breakfast_last_entry: string;
  dinner_place: string;
  dinner_time: string;
  dinner_last_entry: string;
  has_public_bath: string;
  has_outdoor_onsen: string;
  has_sauna: string;
  bath_spa_hours: string;
  tattoo_policy: string;
  other_info: string;
}

// Travel Time
export interface TravelTime {
  id: string;
  area: string;
  hotel_id: string;
  hotel_name: string;
  golf_id: string;
  golf_name: string;
  estimated_time: string;
  google_maps_direction_url: string;
  active: string;
  sort: number;
}

// Restaurant
export interface Restaurant {
  id: string;
  area: string;
  near_type: string;
  near_id: string;
  name: string;
  category: string;
  distance: string;
  address: string;
  hours: string;
  price_range: string;
  phone: string;
  google_maps_url: string;
  source_url: string;
  status: string;
  active: string;
  sort: number;
  last_verified: string;
  name_kr: string;
  name_jp: string;
  menu_kr: string;
  menu_jp: string;
  menu_price: string;
  closed_days: string;
  distance_km: string;
  drive_minutes: string;
  walk_minutes: string;
  description: string;
  recommended: string;
}

// FAQ
export interface FaqItem {
  id: string;
  area: string;
  category: string;
  related_type: string;
  related_id: string;
  related_name: string;
  question_scope: string;
  question: string;
  answer: string;
  source_url: string;
  status: string;
  active: string;
  sort: number;
}

// Admin Options
export interface AdminOption {
  id: string;
  option_type: string;
  code: string;
  label: string;
  description: string;
  group: string; // "AREA" (지역별) or "COMMON" (공통 안내)
  active: string;
  sort: number;
}
