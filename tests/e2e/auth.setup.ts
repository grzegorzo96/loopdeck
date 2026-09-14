import { expect, test as setup } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const authFile = path.join("playwright", ".auth", "user.json");

setup("authenticate", async ({ page, baseURL }) => {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  const origin = baseURL ?? "http://localhost:4321";
  const email = process.env.E2E_EMAIL ?? `e2e-${Date.now()}@example.com`;
  const password = process.env.E2E_PASSWORD ?? "E2e-Test-Passw0rd!";

  const signup = await page.request.post(`${origin}/api/auth/signup`, {
    form: { email, password },
    headers: { Origin: origin },
    maxRedirects: 0,
  });
  expect(signup.status()).toBe(302);

  const signin = await page.request.post(`${origin}/api/auth/signin`, {
    form: { email, password },
    headers: { Origin: origin },
    maxRedirects: 0,
  });
  expect(signin.status()).toBe(302);

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.context().storageState({ path: authFile });
});
