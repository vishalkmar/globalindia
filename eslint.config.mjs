import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import simpleImportSort from "eslint-plugin-simple-import-sort";

/**
 * Local rule: no emoji characters anywhere in source (Design.md §5, Memory.md content rule 6).
 * Checks string literals, template strings, JSX text and comments.
 * A few typographic symbols that Unicode also tags as pictographic are allowed: © ® ™ ↔ ↑ ↓ → ←.
 */
const EMOJI = /\p{Extended_Pictographic}|\u{FE0F}|\u{20E3}/u;
const ALLOWED = new Set(["©", "®", "™", "↔", "↑", "↓", "→", "←"]);

function findEmoji(text) {
  if (!text) return null;
  for (const ch of text) {
    if (EMOJI.test(ch) && !ALLOWED.has(ch)) return ch;
  }
  return null;
}

const noEmojiRule = {
  meta: {
    type: "problem",
    docs: { description: "Disallow emoji characters. Use lucide-react SVG icons instead." },
    messages: { emoji: "Emoji '{{ch}}' is not allowed. Use an SVG icon (lucide-react) instead." },
    schema: [],
  },
  create(context) {
    const report = (node, text) => {
      const ch = findEmoji(text);
      if (ch) context.report({ node, messageId: "emoji", data: { ch } });
    };
    return {
      Literal(node) {
        if (typeof node.value === "string") report(node, node.value);
      },
      TemplateElement(node) {
        report(node, node.value.raw);
      },
      JSXText(node) {
        report(node, node.value);
      },
      Program() {
        for (const comment of context.sourceCode.getAllComments()) report(comment, comment.value);
      },
    };
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
      local: { rules: { "no-emoji": noEmojiRule } },
    },
    rules: {
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",
      "local/no-emoji": "error",
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    // Node scripts and seed may print progress
    files: ["scripts/**", "prisma/**", "tests/**"],
    rules: { "no-console": "off" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "playwright-report/**", "next-env.d.ts", ".dev-mail/**"]),
]);

export default eslintConfig;
