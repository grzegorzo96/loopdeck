import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

// risk: context/foundation/test-plan.md #6 —
//   A backlog task is marked done without entering focus first.
// seed: tests/e2e/seed.spec.ts

const RUN_ID = `E2E-r6-${Date.now()}`;
const ORIGIN = process.env.BASE_URL ?? "http://localhost:4321";

interface TaskRow {
  id: string;
  title: string;
  completed_at: string | null;
}

interface TaskLists {
  focus: TaskRow[];
  backlog: TaskRow[];
}

function todayLocalDate(): string {
  return new Date().toLocaleDateString("en-CA");
}

function backlogSection(page: Page) {
  return page.locator("section").filter({
    has: page.getByRole("heading", { name: "Backlog" }),
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

test.describe("Risk #6 — backlog task completed without focus", () => {
  test.afterEach(async ({ page }) => {
    await deleteAllTasks(page.request);
  });

  test("complete action on a backlog task is refused and task stays open", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);

    await resetDashboard(page);

    const title = `${RUN_ID} backlog-only`;
    const localDate = todayLocalDate();

    const created = await page.request.post("/api/tasks", {
      data: { title, setFocus: false, localDate },
    });
    expect(created.ok()).toBeTruthy();
    const { task } = (await created.json()) as { task: TaskRow };

    await page.reload();
    const backlogItem = backlogSection(page).getByRole("listitem").filter({ hasText: title });
    await expect(backlogItem).toBeVisible();
    await expect(backlogItem.getByRole("button", { name: "Done" })).toHaveCount(0);

    const rejected = await page.request.patch(`/api/tasks/${task.id}`, {
      data: { action: "complete", localDate },
    });
    expect(rejected.status()).toBe(422);
    const body = (await rejected.json()) as { code: string; message: string };
    expect(body.code).toBe("complete_requires_focus");

    await page.reload();
    const reopened = backlogSection(page).getByRole("listitem").filter({ hasText: title });
    await expect(reopened).toBeVisible();
    await expect(reopened.locator("span").first()).not.toHaveClass(/line-through/);
  });
});
