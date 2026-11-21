import { z } from "zod";

import { COLOR_TOKENS, FONT_WHITELIST } from "@/lib/theme/presets";

/** Strict schema for Theme.tokens (Phase 8 todo 08-11). Pure: used by the editor and the API. */

const hex = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex colour like #0F3B3A.");
const colorSet = z.strictObject(Object.fromEntries(COLOR_TOKENS.map((t) => [t.key, hex])));

export const themeTokensSchema = z.strictObject({
  colors: z.strictObject({ light: colorSet, dark: colorSet }),
  fonts: z.strictObject({
    display: z.enum(FONT_WHITELIST.display.map((f) => f.id)),
    body: z.enum(FONT_WHITELIST.body.map((f) => f.id)),
    data: z.enum(FONT_WHITELIST.data.map((f) => f.id)),
  }),
  radius: z.strictObject({ button: z.number().int().min(0).max(24), card: z.number().int().min(0).max(32) }),
  density: z.enum(["comfortable", "compact"]),
  buttonStyle: z.enum(["solid", "outline"]),
});

export const themeNameSchema = z
  .string()
  .trim()
  .min(2, "Enter a name.")
  .max(40, "Keep the name under 40 characters.")
  .refine((v) => !/[<>]/.test(v), "Cannot contain < or >.");

export const themeCreateSchema = z.strictObject({
  name: themeNameSchema,
  fromId: z.string().regex(/^c[a-z0-9]{20,32}$/).optional(),
});

export const themeUpdateSchema = z
  .strictObject({
    name: themeNameSchema.optional(),
    mode: z.enum(["LIGHT", "DARK"]).optional(),
    tokens: themeTokensSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Nothing to change.");
