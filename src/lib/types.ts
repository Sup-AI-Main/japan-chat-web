// Golf Course
export interface GolfCourse {
  id: string;
  area: string;
  display_name: string; // 상품표명
  official_name: string; // 공식명
  address: string;
  phone: string;
  course_summary: string; // 코스요약
  play_cart: string; // 플레이/카트
  clubhouse_dining: string; // 클럽하우스 식사
  bath_shower: string; // 목욕/샤워
  rental: string; // 렌탈
  dress_code: string; // 복장
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
  breakfast: string; // 조식
  bath_spa: string; // 목욕/스파
  hotel_dining: string; // 호텔 식사
  atm_payment: string; // ATM/결제
  transport: string; // 교통
  google_maps_url: string;
  source_url: string;
  status: string;
  active: string;
  sort: number;
  last_verified: string;
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
  near_type: string; // HOTEL, GOLF, AREA
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
}

// FAQ
export interface FaqItem {
  id: string;
  area: string; // DOS, BEPPU, ALL
  category: string; // GOLF, HOTEL, ONSEN, DRIVER, RESTAURANT, GENERAL, REFUND, MONEY, EXTRA_PAYMENT
  related_type: string; // GOLF, HOTEL, RESTAURANT, or empty
  related_id: string;
  related_name: string;
  question_scope: string; // AREA, SPECIFIC
  question: string;
  answer: string;
  source_url: string;
  status: string;
  active: string; // TRUE, FALSE
  sort: number;
}

// Admin Options
export interface AdminOption {
  id: string;
  option_type: string; // AREA, CATEGORY, SCOPE, RELATED_TYPE
  code: string;
  label: string; // Korean display name
  sort: number;
}

// Area codes
export type AreaCode = "DOS" | "BEPPU" | "ALL";

// Category codes
export type CategoryCode =
  | "GOLF"
  | "HOTEL"
  | "ONSEN"
  | "DRIVER"
  | "RESTAURANT"
  | "GENERAL"
  | "REFUND"
  | "MONEY"
  | "EXTRA_PAYMENT";
