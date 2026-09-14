// risk: context/foundation/test-plan.md #2 —
//   User A reads or modifies User B's tasks.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  completeTask,
  createTask,
  deleteTask,
  listTasks,
  setTaskFocus,
  unsetTaskFocus,
} from "@/lib/services/task-queries";
import { todayLocalDate } from "../helpers/dates";
import { createTestUser, deleteTestUser, type TestUser } from "../helpers/supabase";

describe("Risk #2 — cross-user task isolation", () => {
  let userA: TestUser;
  let userB: TestUser;
  let victimTaskId: string;
  const localDate = todayLocalDate();

  beforeAll(async () => {
    userA = await createTestUser();
    userB = await createTestUser();

    const task = await createTask(userA.client, {
      title: "User A private task",
      userId: userA.userId,
      setFocus: true,
      localDate,
    });
    victimTaskId = task.id;
  });

  afterAll(async () => {
    await deleteTestUser(userA.userId);
    await deleteTestUser(userB.userId);
  });

  it("does not list another user's focus tasks", async () => {
    const lists = await listTasks(userB.client, localDate);
    expect(lists.focus.some((task) => task.id === victimTaskId)).toBe(false);
    expect(lists.backlog.some((task) => task.id === victimTaskId)).toBe(false);
  });

  it("denies setFocus on another user's task", async () => {
    await expect(setTaskFocus(userB.client, victimTaskId, localDate)).rejects.toThrow("not_found");
  });

  it("denies complete on another user's task", async () => {
    await expect(completeTask(userB.client, victimTaskId, localDate)).rejects.toThrow("not_found");
  });

  it("denies unsetFocus on another user's task", async () => {
    await expect(unsetTaskFocus(userB.client, victimTaskId)).rejects.toThrow("not_found");
  });

  it("denies delete on another user's task", async () => {
    await expect(deleteTask(userB.client, victimTaskId)).rejects.toThrow("not_found");
  });

  it("denies insert with another user's user_id via RLS", async () => {
    const result = await userB.client
      .from("tasks")
      .insert({
        user_id: userA.userId,
        title: "Spoofed ownership",
      })
      .select("id")
      .single();

    expect(result.error).toBeTruthy();
    expect(result.data).toBeNull();
  });

  it("leaves the victim task intact for the owner", async () => {
    const lists = await listTasks(userA.client, localDate);
    expect(lists.focus.some((task) => task.id === victimTaskId)).toBe(true);
  });
});
