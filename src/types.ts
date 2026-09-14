export interface Task {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  focus_date: string | null;
  completed_at: string | null;
}

export const FOCUS_LIMIT = 3;

export type FocusLimitResult =
  | { allowed: true; currentCount: number; limit: number }
  | {
      allowed: false;
      currentCount: number;
      limit: number;
      reason: "focus_limit_exceeded" | "invalid_focus_date";
    };
