export interface AdminCategory {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
  itemCount: number;
}
export interface AdminVariant {
  id: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
}
export interface AdminItem {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  image: string | null;
  categoryId: string;
  categoryName: string;
  basePrice: number;
  salePrice: number | null;
  active: boolean;
  soldOut: boolean;
  kitchenStationId: string | null;
  kitchenStationName: string | null;
  preparationTime: number | null;
  variants: AdminVariant[];
  modifierGroupIds: string[];
  modifierGroupNames: string[];
}
export interface AdminModifierOption {
  id: string;
  name: string;
  priceDelta: number;
  active: boolean;
}
export interface AdminModifierGroup {
  id: string;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: AdminModifierOption[];
}
export interface AdminStation {
  id: string;
  code: string;
  name: string;
}
