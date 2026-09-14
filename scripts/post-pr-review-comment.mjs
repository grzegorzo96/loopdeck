#!/usr/bin/env node
// Posts or updates the AI code review comment on the current PR (GitHub Actions).

import { readFileSync } from "node:fs";
import { formatReviewComment, REVIEW_COMMENT_MARKER } from "./code-review/format-pr-comment.mjs";

const reviewPath = process.argv[2] ?? "review.json";
const prNumber = process.env.PR_NUMBER ?? process.env.GITHUB_EVENT_PULL_REQUEST_NUMBER;
const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const runUrl = process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
  ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : "";

async function github(path, { method = "GET", body } = {}) {
  const response = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API ${method} ${path}: ${response.status} ${text}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function main() {
  if (!token || !repo || !prNumber) {
    console.error("Requires GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER");
    process.exit(1);
  }

  const review = JSON.parse(readFileSync(reviewPath, "utf8"));
  const commentBody = formatReviewComment(review, {
    model: process.env.SDK_MODEL,
    runUrl,
  });

  const comments = await github(`/issues/${prNumber}/comments`);
  const existing = comments.find((c) => c.body?.includes(REVIEW_COMMENT_MARKER));

  if (existing) {
    await github(`/issues/comments/${existing.id}`, {
      method: "PATCH",
      body: { body: commentBody },
    });
    console.log(`Updated review comment on PR #${prNumber} (comment ${existing.id})`);
  } else {
    const created = await github(`/issues/${prNumber}/comments`, {
      method: "POST",
      body: { body: commentBody },
    });
    console.log(`Created review comment on PR #${prNumber} (comment ${created.id})`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
