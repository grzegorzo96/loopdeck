const VERDICT_LABEL = {
  APPROVE: "✅ APPROVE",
  REQUEST_CHANGES: "🟡 REQUEST CHANGES",
  REJECT: "🛑 REJECT",
};

const CRITERION_TITLES = {
  product_invariants: "Invariants produktu (focus limit)",
  security_auth: "Bezpieczeństwo i auth",
  stack_conventions: "Konwencje stacku",
  api_data_layer: "Warstwa API i danych",
  scope_regression: "Zakres i regresja",
};

export const REVIEW_COMMENT_MARKER = "<!-- loopdeck-ai-code-review -->";

export function formatReviewComment(review, meta = {}) {
  const model = meta.model ?? process.env.SDK_MODEL ?? "composer-2.5";
  const runUrl = meta.runUrl ?? "";

  let body = `${REVIEW_COMMENT_MARKER}\n`;
  body += `## 🤖 AI Code Review\n\n`;
  body += `**Werdykt:** ${VERDICT_LABEL[review.overall_verdict] ?? review.overall_verdict}\n\n`;
  body += `${review.summary}\n\n`;
  body += `| Kryterium | Wynik |\n|-----------|-------|\n`;

  for (const [id, result] of Object.entries(review.criteria)) {
    const title = CRITERION_TITLES[id] ?? id;
    const icon = result.verdict === "PASS" ? "✅" : "❌";
    body += `| ${title} | ${icon} ${result.verdict} |\n`;
  }

  const failed = Object.entries(review.criteria).filter(([, r]) => r.findings.length > 0);
  if (failed.length > 0) {
    body += `\n<details>\n<summary>Findings (${failed.length} kryteriów)</summary>\n\n`;
    for (const [id, result] of failed) {
      body += `**${CRITERION_TITLES[id] ?? id}**\n`;
      for (const finding of result.findings) {
        body += `- ${finding}\n`;
      }
      body += `\n`;
    }
    body += `</details>\n`;
  }

  body += `\n---\n`;
  body += `*Model: \`${model}\` · Kryteria: \`context/foundation/code-review-criteria.md\`*`;
  if (runUrl) {
    body += ` · [Logi workflow](${runUrl})`;
  }

  return body;
}
