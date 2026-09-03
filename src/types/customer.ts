// Plain, JSON-serializable shapes passed from server components to client
// components on the customer ordering surface (Prisma Decimal -> number).

export interface ClientModifierOption {
  id: string;
  name: string;
  priceDelta: number;
}
export interface ClientModifierGroup {
  id: string;
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  options: ClientModifierOption[];
}
export interface ClientVariant {
  id: string;
  name: string;
  priceDelta: number;
  isDefault: boolean;
}
export interface ClientMenuItem {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  basePrice: number;
  salePrice: number | null;
  soldOut: boolean;
  variants: ClientVariant[];
  modifierGroups: ClientModifierGroup[];
}
export interface ClientMenuCategory {
  id: string;
  name: string;
  description: string | null;
  items: ClientMenuItem[];
}

export interface ClientOrderItemModifier {
  id: string;
  nameSnapshot: string;
  priceDeltaSnapshot: number;
}
export interface ClientOrderItem {
  id: string;
  itemNameSnapshot: string;
  variantNameSnapshot: string | null;
  unitPriceSnapshot: number;
  quantity: number;
  note: string | null;
  status: string;
  modifiers: ClientOrderItemModifier[];
}
export interface ClientOrder {
  id: string;
  orderNumber: number;
  status: string;
  createdAt: string;
  source: string;
  items: ClientOrderItem[];
}
export interface ClientCustomerRequest {
  id: string;
  type: string;
  status: string;
  note: string | null;
  createdAt: string;
}
export interface ClientTableSession {
  id: string;
  status: string;
  guestCount: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  orders: ClientOrder[];
  customerRequests: ClientCustomerRequest[];
}

export interface CartLine {
  key: string;
  menuItemId: string;
  itemName: string;
  variantId: string | null;
  variantName: string | null;
  modifierOptionIds: string[];
  modifierNames: string[];
  unitPrice: number; // base + variant + modifiers, per unit
  quantity: number;
  note?: string;
}
