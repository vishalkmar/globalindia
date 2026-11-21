import { z } from "zod";

import { parseSection, SECTION_TYPES } from "@/lib/sections/registry";

/** Page draft payload (Phase 10 todo 16-17). Each section is validated by its own registry schema. */

const noTags = (max) => z.string().trim().max(max).refine((v) => !/[<>]/.test(v), "Cannot contain < or >.");

export const pageSeoSchema = z.strictObject({
  title: noTags(70),
  description: noTags(170),
  noindex: z.boolean().default(false),
});

const sectionInput = z.strictObject({
  id: z.string().max(40).optional(),
  type: z.enum(SECTION_TYPES),
  isVisible: z.boolean(),
  data: z.record(z.string(), z.unknown()),
});

export const pageDraftSchema = z
  .strictObject({
    title: noTags(80).refine((v) => v.length > 0, "Enter a page title."),
    seo: pageSeoSchema,
    sections: z.array(sectionInput).max(30, "A page can have at most 30 sections."),
  })
  .superRefine((value, ctx) => {
    value.sections.forEach((s, i) => {
      const r = parseSection(s.type, s.data);
      if (!r.success) {
        for (const issue of r.error.issues) {
          ctx.addIssue({ code: "custom", path: ["sections", i, "data", ...issue.path], message: issue.message });
        }
      }
    });
  })
  .transform((value) => ({
    ...value,
    sections: value.sections.map((s) => ({ ...s, data: parseSection(s.type, s.data).data })),
  }));
