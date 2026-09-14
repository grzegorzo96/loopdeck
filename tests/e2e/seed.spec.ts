import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// risk: context/foundation/test-plan.md #1 —
//   A user sets a 4th task in today's focus and the app accepts it without refusal or swap.
// seed: tests/e2e/seed.spec.ts

const RUN_ID = `E2E-seed-${Date.now()}`;
const ORIGIN = process.env.BASE_URL ?? "http://localhost:4321";

interface TaskRow {
  id: string;
  title: string;
}

interface TaskLists {
  focus: TaskRow[];
  backlog: TaskRow[];
}

function todayLocalDate(): string {
  return new Date().toLocaleDateString("en-CA");
}

function focusSection(page: Page) {
  return page.locator("section").filter({
    has: page.getByRole("heading", { name: "Today's focus" }),
  });
}

async function deleteAllTasks(request: APIRequestContext): Promise<void> {
  const response = await request.get(`/api/tasks?localDate=${encodeURIComponent(todayLocalDate())}`);
  if (!response.ok()) {
    return;
  }

  const lists = (await response.json()) as TaskLists;
  await Promise.all(
    [...lists.focus, ...lists.backlog].map((task) =>
      request.delete(`/api/tasks/${task.id}`, { headers: { Origin: ORIGIN } }),
    ),
  );
}

async function resetDashboard(page: Page): Promise<void> {
  await deleteAllTasks(page.request);
  await page.reload();
  await expect(page.getByText("No tasks in focus yet.")).toBeVisible();
}

async function addTaskToFocus(page: Page, title: string): Promise<void> {
  const taskInput = page.getByRole("textbox", { name: "New task" });
  const created = page.waitForResponse((response) => {
    const { pathname } = new URL(response.url());
    return pathname === "/api/tasks" && response.request().method() === "POST" && response.ok();
  });
  await taskInput.fill(title);
  await taskInput.press("Enter");
  await created;
  await expect(focusSection(page).getByRole("listitem").filter({ hasText: title })).toBeVisible();
}

test.describe("Risk #1 — 4th focus accepted without refusal or swap", () => {
  test.afterEach(async ({ page }) => {
    await deleteAllTasks(page.request);
  });

  test("fourth focus attempt is refused with swap and today stays at three", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Loopdeck" })).toBeVisible();

    // Teardown-before-setup: drop leftover rows from a crashed run of this spec.
    await resetDashboard(page);

    const titles = [`${RUN_ID} one`, `${RUN_ID} two`, `${RUN_ID} three`];
    const overflow = `${RUN_ID} overflow`;

    // Fill today's focus to the product limit of three.
    for (const title of titles) {
      await addTaskToFocus(page, title);
    }
    await expect(page.getByText("0 of 3 done")).toBeVisible();

    // Attempt a 4th focus task — the risk materializes if this is accepted silently.
    const overflowInput = page.getByRole("textbox", { name: "New task" });
    await overflowInput.fill(overflow);
    await overflowInput.press("Enter");

    const dialog = page.getByRole("dialog", { name: "Three for today is the whole day" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(overflow)).toBeVisible();

    await expect(page.getByText("0 of 3 done")).toBeVisible();
    for (const title of titles) {
      await expect(focusSection(page).getByRole("listitem").filter({ hasText: title })).toBeVisible();
    }

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  });
});
