import { describe, expect, it } from "vitest";

import { checkPairs, contrastRatio, isHexColor } from "@/lib/theme/contrast";
import { themeMode, themeToCss } from "@/lib/theme/css";
import { CONTRAST_PAIRS, DEFAULT_THEME, THEME_PRESETS } from "@/lib/theme/presets";

describe("contrast", () => {
  it("matches WCAG reference values", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBe(21);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBe(1);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.48, 1);
  });

  it("every preset passes every required pair in light and dark", () => {
    for (const preset of THEME_PRESETS) {
      for (const mode of ["light", "dark"]) {
        const failures = checkPairs(preset.tokens.colors[mode], CONTRAST_PAIRS).filter((r) => !r.pass);
        expect(failures, `${preset.name} ${mode}`).toEqual([]);
      }
    }
  });

  it("validates hex colours strictly", () => {
    expect(isHexColor("#0F3B3A")).toBe(true);
    expect(isHexColor("#fff")).toBe(true);
    expect(isHexColor("red")).toBe(false);
    expect(isHexColor("#0F3B3A;}body{display:none")).toBe(false);
  });
});

describe("themeToCss", () => {
  it("prints variables for both modes", () => {
    const css = themeToCss(DEFAULT_THEME.tokens);
    expect(css).toContain("--c-primary:#0F3B3A;");
    expect(css).toContain(':root[data-theme="dark"]');
    expect(css).toContain("--ff-display:var(--font-jakarta)");
  });

  it("refuses injected values and falls back to safe defaults", () => {
    const evil = {
      colors: {
        light: { primary: "red;}</style><script>alert(1)</script>", ink: "url(javascript:alert(1))" },
        dark: {},
      },
      fonts: { display: "x;}body{display:none", body: "plus-jakarta", data: "jetbrains-mono" },
      radius: { button: "999", card: "abc" },
    };
    const css = themeToCss(evil);
    expect(css).not.toMatch(/script|javascript|<|display:none/);
    expect(css).toContain("--c-primary:#0F3B3A;");
    expect(css).toContain("--r-btn:24px;");
    expect(css).toContain("--r-card:16px;"); // fallback card radius (UI phase)
  });

  it("maps mode", () => {
    expect(themeMode({ mode: "DARK" })).toBe("dark");
    expect(themeMode({ mode: "LIGHT" })).toBe("light");
    expect(themeMode(null)).toBe("light");
  });
});
