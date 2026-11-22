#!/usr/bin/env node
/** Prints WCAG contrast for every preset (light + dark). Exits 1 if any required pair fails. */
import { checkPairs } from "../src/lib/theme/contrast.js";
import { CONTRAST_PAIRS, THEME_PRESETS } from "../src/lib/theme/presets.js";

let failed = 0;
for (const preset of THEME_PRESETS) {
  for (const mode of ["light", "dark"]) {
    console.log(`\n${preset.name} — ${mode}`);
    for (const r of checkPairs(preset.tokens.colors[mode], CONTRAST_PAIRS)) {
      if (!r.pass) failed++;
      console.log(
        `  ${r.pass ? "PASS" : "FAIL"}  ${r.ratio.toFixed(2).padStart(5)} (min ${r.min})  ${r.fg} on ${r.bg} — ${r.use}`,
      );
    }
  }
}
console.log(failed ? `\n${failed} pair(s) below AA.` : "\nAll pairs meet their contrast target.");
process.exit(failed ? 1 : 0);
