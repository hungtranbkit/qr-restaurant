import { z } from "zod";
import { sanitizeNote } from "./order";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

export const customerRequestSchema = z.object({
  type: z.enum(["CALL_STAFF", "WATER", "UTENSILS", "ITEM_SUPPORT", "OTHER"]),
  note: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v ? sanitizeNote(v) : v)),
});

export const paymentRequestSchema = z.object({
  method: z.enum(["CASH", "BANK_TRANSFER", "CARD"]),
});

export const checkoutSchema = z.object({
  tableSessionId: z.string().min(1),
  method: z.enum(["CASH", "BANK_TRANSFER", "CARD", "E_WALLET", "OTHER"]),
  reference: z.string().trim().max(120).optional(),
});

export const discountSchema = z.object({
  tableSessionId: z.string().min(1),
  discountType: z.enum(["FIXED", "PERCENTAGE"]).nullable(),
  discountValue: z.number().min(0).nullable(),
  reason: z.string().trim().max(200).optional(),
});

export const userCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["SUPER_ADMIN", "MANAGER", "CASHIER", "WAITER", "KITCHEN"]),
  password: z.string().min(6).max(200).optional(),
});

export const userUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  role: z.enum(["SUPER_ADMIN", "MANAGER", "CASHIER", "WAITER", "KITCHEN"]).optional(),
  active: z.boolean().optional(),
});

export const tableCreateSchema = z.object({
  areaId: z.string().min(1),
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(60),
  seats: z.number().int().min(1).max(50).default(2),
});

export const tableUpdateSchema = z.object({
  areaId: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(60).optional(),
  seats: z.number().int().min(1).max(50).optional(),
  active: z.boolean().optional(),
});

export const areaCreateSchema = z.object({
  name: z.string().trim().min(1).max(60),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

export const menuCategoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).optional(),
  image: z.string().trim().max(500).optional(),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

export const menuItemCreateSchema = z.object({
  categoryId: z.string().min(1),
  sku: z.string().trim().min(1).max(40),
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  image: z.string().trim().max(500).optional(),
  basePrice: z.number().min(0),
  salePrice: z.number().min(0).nullable().optional(),
  kitchenStationId: z.string().min(1).nullable().optional(),
  preparationTime: z.number().int().min(0).max(240).nullable().optional(),
});

export const menuItemUpdateSchema = menuItemCreateSchema.partial().extend({
  active: z.boolean().optional(),
  soldOut: z.boolean().optional(),
});
