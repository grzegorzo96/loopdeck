// risks: context/foundation/test-plan.md #4, #7
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { completeTask, createTask, listTasks, setTaskFocus } from "@/lib/services/task-queries";
import { offsetLocalDate, todayLocalDate } from "../helpers/dates";
import {
  createTestUser,
  deleteAllUserTasks,
  deleteTestUser,
  getSupabaseEnv,
  requireRowId,
  type TestUser,
} from "../helpers/supabase";

describe("Risk #4 — lazy day reset on read", () => {
  let user: TestUser;
  const today = todayLocalDate();
  const yesterday = offsetLocalDate(-1);

  beforeAll(async () => {
    user = await createTestUser();
  });

  beforeEach(async () => {
    await deleteAllUserTasks(user.userId);
  });

  afterAll(async () => {
    await deleteTestUser(user.userId);
  });

  it("shows empty focus on a new local day when nothing is focused today", async () => {
    await createTask(user.client, {
      title: "yesterday unfinished",
      userId: user.userId,
      setFocus: true,
      localDate: yesterday,
    });

    const lists = await listTasks(user.client, today);
    expect(lists.focus).toHaveLength(0);
    expect(lists.backlog.some((task) => task.title === "yesterday unfinished")).toBe(true);
  });

  it("keeps completed tasks out of backlog after the day changes", async () => {
    const task = await createTask(user.client, {
      title: "yesterday done",
      userId: user.userId,
      setFocus: true,
      localDate: yesterday,
    });

    await completeTask(user.client, task.id, yesterday);

    const lists = await listTasks(user.client, today);
    expect(lists.focus).toHaveLength(0);
    expect(lists.backlog.some((t) => t.id === task.id)).toBe(false);
  });

  it("allows re-focusing yesterday's unfinished backlog task today", async () => {
    const task = await createTask(user.client, {
      title: "carry forward",
      userId: user.userId,
      setFocus: true,
      localDate: yesterday,
    });

    const before = await listTasks(user.client, today);
    expect(before.backlog.some((t) => t.id === task.id)).toBe(true);

    await setTaskFocus(user.client, task.id, today);

    const after = await listTasks(user.client, today);
    expect(after.focus.some((t) => t.id === task.id)).toBe(true);
    expect(after.backlog.some((t) => t.id === task.id)).toBe(false);
  });

  it("excludes future-dated focus tasks from today's read", async () => {
    const tomorrow = offsetLocalDate(1);
    const { url, serviceRoleKey } = getSupabaseEnv();
    const admin = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const inserted = await admin
      .from("tasks")
      .insert({
        user_id: user.userId,
        title: "future focus",
        focus_date: tomorrow,
      })
      .select("id")
      .single();
    expect(inserted.error).toBeNull();
    const insertedId = requireRowId(inserted.data);

    const lists = await listTasks(user.client, today);
    expect(lists.focus.some((task) => task.id === insertedId)).toBe(false);
    expect(lists.backlog.some((task) => task.id === insertedId)).toBe(false);
  });
});

describe("Risk #7 — local date validation on read/write", () => {
  let user: TestUser;
  const today = todayLocalDate();
  const outOfWindow = offsetLocalDate(-2);

  beforeAll(async () => {
    user = await createTestUser();
  });

  beforeEach(async () => {
    await deleteAllUserTasks(user.userId);
  });

  afterAll(async () => {
    await deleteTestUser(user.userId);
  });

  it("rejects create with a date outside the allowed window", async () => {
    await expect(
      createTask(user.client, {
        title: "invalid day",
        userId: user.userId,
        setFocus: true,
        localDate: outOfWindow,
      }),
    ).rejects.toThrow("invalid_focus_date");
  });

  it("rejects setFocus with a date outside the allowed window", async () => {
    const task = await createTask(user.client, {
      title: "valid backlog",
      userId: user.userId,
      setFocus: false,
      localDate: today,
    });

    await expect(setTaskFocus(user.client, task.id, outOfWindow)).rejects.toThrow("invalid_focus_date");
  });

  it("rejects listTasks with a date outside the allowed window", async () => {
    await expect(listTasks(user.client, outOfWindow)).rejects.toThrow("invalid_focus_date");
  });
});
