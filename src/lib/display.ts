const AREA_EMOJI: Record<string, string> = {
  DOS: "💮",
  BEPPU: "🎋",
  ALL: "🌏",
};

const CATEGORY_CONFIG: Record<string, { emoji: string; color: string; bg: string; border: string }> = {
  GOLF: { emoji: "⛳", color: "#2d7a3a", bg: "#e8f5e9", border: "#81c784" },
  HOTEL: { emoji: "🏨", color: "#1565c0", bg: "#e3f2fd", border: "#64b5f6" },
  RESTAURANT: { emoji: "🍜", color: "#c62828", bg: "#fbe9e7", border: "#ef9a9a" },
  ONSEN: { emoji: "♨️", color: "#7b1fa2", bg: "#f3e5f5", border: "#ce93d8" },
  DRIVER: { emoji: "🚗", color: "#0277bd", bg: "#e1f5fe", border: "#4fc3f7" },
  GENERAL: { emoji: "📌", color: "#546e7a", bg: "#eceff1", border: "#90a4ae" },
  REFUND: { emoji: "💰", color: "#e65100", bg: "#fff3e0", border: "#ffb74d" },
  MONEY: { emoji: "💱", color: "#2e7d32", bg: "#e8f5e9", border: "#a5d6a7" },
  EXTRA_PAYMENT: { emoji: "💳", color: "#4527a0", bg: "#ede7f6", border: "#b39ddb" },
};

const DEFAULT_CATEGORY = { emoji: "📌", color: "#546e7a", bg: "#eceff1", border: "#90a4ae" };

// 지역별 카테고리 (도스, 벳푸 각각 다른 데이터)
export const AREA_CATEGORIES = ["GOLF", "HOTEL", "RESTAURANT"];

// 공통 안내 카테고리 (area=ALL, 지역과 무관하게 동일)
export const COMMON_CATEGORIES = ["ONSEN", "DRIVER", "REFUND", "MONEY", "EXTRA_PAYMENT", "GENERAL"];

export function isAreaCategory(code: string): boolean {
  return AREA_CATEGORIES.includes(code.toUpperCase());
}

export function isCommonCategory(code: string): boolean {
  return COMMON_CATEGORIES.includes(code.toUpperCase());
}

export function getAreaEmoji(code: string): string {
  return AREA_EMOJI[code.toUpperCase()] || "📍";
}

export function getCategoryEmoji(code: string): string {
  return CATEGORY_CONFIG[code.toUpperCase()]?.emoji || DEFAULT_CATEGORY.emoji;
}

export function getCategoryColor(code: string): string {
  return CATEGORY_CONFIG[code.toUpperCase()]?.color || DEFAULT_CATEGORY.color;
}

export function getCategoryBg(code: string): string {
  return CATEGORY_CONFIG[code.toUpperCase()]?.bg || DEFAULT_CATEGORY.bg;
}

export function getCategoryBorder(code: string): string {
  return CATEGORY_CONFIG[code.toUpperCase()]?.border || DEFAULT_CATEGORY.border;
}

export function getCategoryConfig(code: string) {
  return CATEGORY_CONFIG[code.toUpperCase()] || DEFAULT_CATEGORY;
}
