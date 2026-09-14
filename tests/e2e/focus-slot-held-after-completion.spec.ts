import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// risk: context/foundation/test-plan.md #5 —
//   Completing a focus task frees its slot, allowing a 4th focus the same day.
// seed: tests/e2e/seed.spec.ts

const RUN_ID = `E2E-r5-${Date.now()}`;
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

test.describe("Risk #5 — completion frees a focus slot", () => {
  test.afterEach(async ({ page }) => {
    await deleteAllTasks(page.request);
  });

  test("fourth focus stays blocked after completing one of today's three", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);

    await resetDashboard(page);

    const titles = [`${RUN_ID} alpha`, `${RUN_ID} beta`, `${RUN_ID} gamma`];
    const overflow = `${RUN_ID} delta`;

    for (const title of titles) {
      await addTaskToFocus(page, title);
    }
    await expect(page.getByText("0 of 3 done")).toBeVisible();

    const firstFocusItem = focusSection(page).getByRole("listitem").filter({ hasText: titles[0] });
    const completed = page.waitForResponse((response) => {
      const { pathname } = new URL(response.url());
      return pathname.startsWith("/api/tasks/") && response.request().method() === "PATCH" && response.ok();
    });
    await firstFocusItem.getByRole("button", { name: "Done" }).click();
    await completed;
    await expect(page.getByText("1 of 3 done")).toBeVisible();

    const overflowInput = page.getByRole("textbox", { name: "New task" });
    await overflowInput.fill(overflow);
    await overflowInput.press("Enter");

    const dialog = page.getByRole("dialog", { name: "Three for today is the whole day" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(overflow)).toBeVisible();
    await expect(page.getByText("1 of 3 done")).toBeVisible();
    await expect(focusSection(page).getByRole("listitem")).toHaveCount(3);

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
  });
});
