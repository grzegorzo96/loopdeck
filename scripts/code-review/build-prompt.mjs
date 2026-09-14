import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const CRITERIA = [
  {
    id: "product_invariants",
    title: "Invariants produktu (focus limit)",
    checks: [
      "Limit 3 slotów focus egzekowany po stronie serwera (>= FOCUS_LIMIT, nie >).",
      "Ukończone zadanie nadal zajmuje slot — count nie może wykluczać is_completed bez nowej reguły produktu.",
      "Brak cichego obejścia limitu w diffie.",
    ],
  },
  {
    id: "security_auth",
    title: "Bezpieczeństwo i granice auth",
    checks: [
      "API z danymi użytkownika wymaga auth (requireAuth / middleware).",
      "Nowe tabele Supabase: RLS + granular policies w migracji.",
      "Brak secrets w kodzie; izolacja danych między kontami.",
    ],
  },
  {
    id: "stack_conventions",
    title: "Konwencje stacku",
    checks: [
      "Astro SSR: prerender = false na dynamicznych trasach.",
      "React bez dyrektyw Next.js; hooki w src/components/hooks/.",
      "Tailwind przez cn(); alias @/*.",
    ],
  },
  {
    id: "api_data_layer",
    title: "Warstwa API i danych",
    checks: [
      "Handlery GET/POST (uppercase), walidacja zod przed logiką.",
      "Obsługa error z Supabase; logika biznesowa w src/lib/services/.",
      "Migracje: YYYYMMDDHHmmss_opis.sql z RLS.",
    ],
  },
  {
    id: "scope_regression",
    title: "Zakres zmiany i ryzyko regresji",
    checks: [
      "Diff minimalny i spójny z celem; brak niepowiązanych refaktorów.",
      "Edge case'y przy zmianie reguł biznesowych uwzględnione lub opisane w findings.",
      "Brak usuwania guardów/testów bez zamiennika.",
    ],
  },
];

const schema = JSON.parse(readFileSync(join(__dirname, "schema.json"), "utf8"));

export function buildSystemPrompt() {
  const criteriaBlock = CRITERIA.map(
    (c, i) => `${i + 1}. **${c.id}** — ${c.title}\n${c.checks.map((check) => `   - ${check}`).join("\n")}`,
  ).join("\n\n");

  return `You are a senior code reviewer for Loopdeck — Astro 7 SSR todo app with hard "3 tasks per day" focus limit, React 19 islands, Tailwind 4, Supabase auth, Cloudflare Workers.

Review ONLY the git diff provided by the user. Do not use tools. Do not assume files outside the diff.

## Acceptance criteria (evaluate each independently)

${criteriaBlock}

## Verdict rules

- Each criterion: PASS or FAIL (empty findings only when PASS).
- overall_verdict:
  - APPROVE — all criteria PASS
  - REQUEST_CHANGES — at least one FAIL, but no critical product/security break
  - REJECT — FAIL on product_invariants OR security_auth

## Output format (strict)

Respond with a single JSON object matching this schema — no markdown fences, no prose before or after:

${JSON.stringify(schema, null, 2)}

Write summary and findings in Polish. Be specific (file/function/condition). Max 3 findings per criterion.`;
}

export function buildUserPrompt(diff) {
  return `Review this git diff:

\`\`\`diff
${diff.trim()}
\`\`\``;
}

export function buildFullPrompt(diff) {
  return `${buildSystemPrompt()}\n\n---\n\n${buildUserPrompt(diff)}`;
}
