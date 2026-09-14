import { CRITERIA } from "./build-prompt.mjs";

const CRITERION_IDS = CRITERIA.map((c) => c.id);
const VALID_VERDICTS = new Set(["PASS", "FAIL"]);
const VALID_OVERALL = new Set(["APPROVE", "REQUEST_CHANGES", "REJECT"]);

function extractJsonObject(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  throw new Error("Response does not contain a JSON object");
}

function validateCriterion(id, value, errors) {
  if (!value || typeof value !== "object") {
    errors.push(`criteria.${id}: missing object`);
    return;
  }

  if (!VALID_VERDICTS.has(value.verdict)) {
    errors.push(`criteria.${id}.verdict: expected PASS or FAIL`);
  }

  if (!Array.isArray(value.findings)) {
    errors.push(`criteria.${id}.findings: must be an array`);
    return;
  }

  if (value.verdict === "PASS" && value.findings.length > 0) {
    errors.push(`criteria.${id}: PASS with non-empty findings`);
  }

  if (value.verdict === "FAIL" && value.findings.length === 0) {
    errors.push(`criteria.${id}: FAIL requires at least one finding`);
  }
}

export function parseReviewResponse(rawText) {
  const errors = [];
  let parsed;

  try {
    parsed = JSON.parse(extractJsonObject(rawText));
  } catch (err) {
    return {
      ok: false,
      errors: [`JSON parse error: ${err.message}`],
      review: null,
    };
  }

  if (typeof parsed.summary !== "string" || parsed.summary.length < 10) {
    errors.push("summary: required string (min 10 chars)");
  }

  if (!parsed.criteria || typeof parsed.criteria !== "object") {
    errors.push("criteria: required object");
  } else {
    for (const id of CRITERION_IDS) {
      validateCriterion(id, parsed.criteria[id], errors);
    }
  }

  if (!VALID_OVERALL.has(parsed.overall_verdict)) {
    errors.push("overall_verdict: expected APPROVE | REQUEST_CHANGES | REJECT");
  }

  const fails = CRITERION_IDS.filter((id) => parsed.criteria?.[id]?.verdict === "FAIL");
  const criticalFail = fails.some((id) => id === "product_invariants" || id === "security_auth");

  if (parsed.overall_verdict === "APPROVE" && fails.length > 0) {
    errors.push("overall_verdict APPROVE inconsistent with FAIL criteria");
  }

  if (parsed.overall_verdict === "REJECT" && !criticalFail) {
    errors.push("overall_verdict REJECT requires FAIL on product_invariants or security_auth");
  }

  if (parsed.overall_verdict === "APPROVE" && fails.length === 0) {
    // consistent
  } else if (parsed.overall_verdict === "REQUEST_CHANGES" && fails.length > 0 && !criticalFail) {
    // consistent
  }

  return {
    ok: errors.length === 0,
    errors,
    review: errors.length === 0 ? parsed : null,
  };
}

export function gateAllowsMerge(review) {
  return review?.overall_verdict === "APPROVE";
}
