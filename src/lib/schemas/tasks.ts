import { z } from "zod";

export const localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format");

export const listTasksQuerySchema = z.object({
  localDate: localDateSchema,
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(500),
  setFocus: z.boolean(),
  localDate: localDateSchema,
});

export const patchTaskSchema = z.object({
  action: z.enum(["setFocus", "unsetFocus", "complete"]),
  localDate: localDateSchema,
});

export const swapFocusSchema = z.object({
  taskId: z.uuid(),
  swapOutId: z.uuid(),
  localDate: localDateSchema,
});
