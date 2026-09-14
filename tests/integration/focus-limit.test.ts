// risks: context/foundation/test-plan.md #1, #5, #6
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  completeTask,
  createTask,
  listTasks,
  setTaskFocus,
  swapTaskFocus,
  unsetTaskFocus,
} from "@/lib/services/task-queries";
import { todayLocalDate } from "../helpers/dates";
import { createTestUser, deleteAllUserTasks, deleteTestUser, type TestUser } from "../helpers/supabase";

describe("Risk #1 — fourth focus refused", () => {
  let user: TestUser;
  const localDate = todayLocalDate();

  beforeAll(async () => {
    user = await createTestUser();
  });

  beforeEach(async () => {
    await deleteAllUserTasks(user.userId);
  });

  afterAll(async () => {
    await deleteTestUser(user.userId);
  });

  it("blocks create-with-focus on the 4th task", async () => {
    for (let index = 0; index < 3; index++) {
      await createTask(user.client, {
        title: `focus create ${index}`,
        userId: user.userId,
        setFocus: true,
        localDate,
      });
    }

    await expect(
      createTask(user.client, {
        title: "focus create overflow",
        userId: user.userId,
        setFocus: true,
        localDate,
      }),
    ).rejects.toThrow("focus_limit_exceeded");

    const lists = await listTasks(user.client, localDate);
    expect(lists.focus).toHaveLength(3);
  });

  it("blocks patch setFocus on the 4th task", async () => {
    const backlogIds: string[] = [];
    for (let index = 0; index < 4; index++) {
      const task = await createTask(user.client, {
        title: `patch backlog ${index}`,
        userId: user.userId,
        setFocus: false,
        localDate,
      });
      backlogIds.push(task.id);
    }

    for (let index = 0; index < 3; index++) {
      await setTaskFocus(user.client, backlogIds[index]!, localDate);
    }

    await expect(setTaskFocus(user.client, backlogIds[3]!, localDate)).rejects.toThrow("focus_limit_exceeded");

    const lists = await listTasks(user.client, localDate);
    expect(lists.focus).toHaveLength(3);
  });

  it("allows swap at the focus limit", async () => {
    const focused: string[] = [];
    for (let index = 0; index < 3; index++) {
      const task = await createTask(user.client, {
        title: `swap focus ${index}`,
        userId: user.userId,
        setFocus: true,
        localDate,
      });
      focused.push(task.id);
    }

    const backlog = await createTask(user.client, {
      title: "swap candidate",
      userId: user.userId,
      setFocus: false,
      localDate,
    });

    const lists = await swapTaskFocus(user.client, {
      taskId: backlog.id,
      swapOutId: focused[0]!,
      localDate,
    });

    expect(lists.focus).toHaveLength(3);
    expect(lists.focus.some((task) => task.id === backlog.id)).toBe(true);
    expect(lists.backlog.some((task) => task.id === focused[0]!)).toBe(true);
  });
});

describe("Risk #5 — completion does not free a focus slot", () => {
  let user: TestUser;
  const localDate = todayLocalDate();

  beforeAll(async () => {
    user = await createTestUser();
  });

  beforeEach(async () => {
    await deleteAllUserTasks(user.userId);
  });

  afterAll(async () => {
    await deleteTestUser(user.userId);
  });

  it("keeps three focus slots after completing one task", async () => {
    const focused: string[] = [];
    for (let index = 0; index < 3; index++) {
      const task = await createTask(user.client, {
        title: `complete focus ${index}`,
        userId: user.userId,
        setFocus: true,
        localDate,
      });
      focused.push(task.id);
    }

    const completed = await completeTask(user.client, focused[0]!, localDate);
    expect(completed.newlyCompleted).toBe(true);
    expect(completed.task.completed_at).not.toBeNull();
    expect(completed.task.focus_date).toBe(localDate);

    const backlog = await createTask(user.client, {
      title: "post-complete overflow",
      userId: user.userId,
      setFocus: false,
      localDate,
    });

    await expect(setTaskFocus(user.client, backlog.id, localDate)).rejects.toThrow("focus_limit_exceeded");

    const lists = await listTasks(user.client, localDate);
    expect(lists.focus).toHaveLength(3);
  });

  it("allows swapping out a completed focus task", async () => {
    const focused: string[] = [];
    for (let index = 0; index < 3; index++) {
      const task = await createTask(user.client, {
        title: `swap complete ${index}`,
        userId: user.userId,
        setFocus: true,
        localDate,
      });
      focused.push(task.id);
    }

    await completeTask(user.client, focused[0]!, localDate);

    const backlog = await createTask(user.client, {
      title: "swap after complete",
      userId: user.userId,
      setFocus: false,
      localDate,
    });

    const lists = await swapTaskFocus(user.client, {
      taskId: backlog.id,
      swapOutId: focused[0]!,
      localDate,
    });

    expect(lists.focus).toHaveLength(3);
    expect(lists.focus.some((task) => task.id === backlog.id)).toBe(true);
  });

  it("frees a slot only when focus is unset", async () => {
    const focused: string[] = [];
    for (let index = 0; index < 3; index++) {
      const task = await createTask(user.client, {
        title: `unset control ${index}`,
        userId: user.userId,
        setFocus: true,
        localDate,
      });
      focused.push(task.id);
    }

    const backlog = await createTask(user.client, {
      title: "unset candidate",
      userId: user.userId,
      setFocus: false,
      localDate,
    });

    await unsetTaskFocus(user.client, focused[0]!);
    await setTaskFocus(user.client, backlog.id, localDate);

    const lists = await listTasks(user.client, localDate);
    expect(lists.focus).toHaveLength(3);
    expect(lists.focus.some((task) => task.id === backlog.id)).toBe(true);
  });
});

describe("Risk #6 — backlog completion rejected", () => {
  let user: TestUser;
  const localDate = todayLocalDate();

  beforeAll(async () => {
    user = await createTestUser();
  });

  beforeEach(async () => {
    await deleteAllUserTasks(user.userId);
  });

  afterAll(async () => {
    await deleteTestUser(user.userId);
  });

  it("rejects completing a backlog task", async () => {
    const backlog = await createTask(user.client, {
      title: "backlog only",
      userId: user.userId,
      setFocus: false,
      localDate,
    });

    await expect(completeTask(user.client, backlog.id, localDate)).rejects.toThrow("complete_requires_focus");

    const lists = await listTasks(user.client, localDate);
    expect(lists.backlog.some((task) => task.id === backlog.id && task.completed_at === null)).toBe(true);
  });

  it("allows completing after the task enters focus", async () => {
    const task = await createTask(user.client, {
      title: "focus then complete",
      userId: user.userId,
      setFocus: false,
      localDate,
    });

    await setTaskFocus(user.client, task.id, localDate);
    const completed = await completeTask(user.client, task.id, localDate);

    expect(completed.newlyCompleted).toBe(true);
    expect(completed.task.completed_at).not.toBeNull();
  });
});
