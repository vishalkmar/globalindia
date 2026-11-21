/** Shape of a theme sent to the admin UI. */
export const themeShape = (t) => ({
  id: t.id,
  name: t.name,
  slug: t.slug,
  mode: t.mode,
  isActive: t.isActive,
  isPreset: t.isPreset,
  tokens: t.tokens,
  updatedAt: t.updatedAt,
});
