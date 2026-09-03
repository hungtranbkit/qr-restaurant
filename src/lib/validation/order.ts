import { z } from "zod";

/** Strips HTML tags and control characters from freeform customer text. */
export function sanitizeNote(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < 0x20 && code !== 0x0a && code !== 0x09) continue; // drop control chars, keep \n \t
    out += ch;
  }
  return out.replace(/<[^>]*>/g, "").trim().slice(0, 300);
}

// Shared cart-line schema used by both customer ordering and staff order entry.
// Never includes price — the server always looks prices up itself.
export const cartLineSchema = z.object({
  menuItemId: z.string().min(1),
  variantId: z.string().min(1).nullish(),
  modifierOptionIds: z.array(z.string().min(1)).max(50).default([]),
  quantity: z.number().int().min(1).max(50),
  note: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((v) => (v ? sanitizeNote(v) : v)),
});

export type CartLineInput = z.infer<typeof cartLineSchema>;

export const submitOrderSchema = z.object({
  tableId: z.string().min(1).optional(), // filled server-side for customer route
  items: z.array(cartLineSchema).min(1).max(100),
  orderNote: z.string().trim().max(300).optional(),
  guestCount: z.number().int().min(1).max(50).optional(),
});

export type SubmitOrderInput = z.infer<typeof submitOrderSchema>;
