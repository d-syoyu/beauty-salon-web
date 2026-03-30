// constants/menu.ts
// メニューカテゴリの配色定数

export const CATEGORY_COLORS: Record<string, string> = {
  "カット": "#6B8E6B",
  "カラー": "#9F86C0",
  "パーマ": "#E0B1CB",
  "縮毛矯正": "#B8956E",
  "髪質改善": "#2A9D8F",
  "トリートメント": "#98C1D9",
  "ヘッドスパ": "#A89686",
  "ヘアセット": "#C8B6A6",
  "セットメニュー": "#5A5550",
  "店販商品": "#D4A574",
};

export const CATEGORY_TEXT_COLORS: Record<string, string> = {
  "カット": "#FFFFFF",
  "カラー": "#FFFFFF",
  "パーマ": "#1F2937",
  "縮毛矯正": "#FFFFFF",
  "髪質改善": "#FFFFFF",
  "トリートメント": "#1F2937",
  "ヘッドスパ": "#FFFFFF",
  "ヘアセット": "#1F2937",
  "セットメニュー": "#FFFFFF",
  "店販商品": "#FFFFFF",
};

export const getCategoryTextColor = (category: string): string => {
  return CATEGORY_TEXT_COLORS[category] || "#FFFFFF";
};

export const formatPrice = (price: number): string => {
  return `¥${price.toLocaleString()}`;
};
