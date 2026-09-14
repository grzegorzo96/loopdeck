// risk: context/foundation/test-plan.md #3 —
//   A Supabase migration passes locally but corrupts or locks prod task rows.
import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "../helpers/supabase";

describe("Risk #3 — migration schema sanity", () => {
  it("tasks table exists with expected columns", async () => {
    const { url, serviceRoleKey } = getSupabaseEnv();
    const admin = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error } = await admin
      .from("tasks")
      .select("id, user_id, title, created_at, focus_date, completed_at")
      .limit(0);

    expect(error).toBeNull();
  });

  it("RLS hides tasks from unauthenticated clients", async () => {
    const { url, anonKey, serviceRoleKey } = getSupabaseEnv();
    const admin = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const anon = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const owner = await admin.auth.admin.createUser({
      email: `schema-${crypto.randomUUID()}@example.com`,
      password: "Schema-Test-Passw0rd!",
      email_confirm: true,
    });
    expect(owner.error).toBeNull();

    const userId = owner.data.user!.id;
    const inserted = await admin
      .from("tasks")
      .insert({ user_id: userId, title: "RLS probe" })
      .select("id")
      .single();
    expect(inserted.error).toBeNull();

    const { data, error } = await anon.from("tasks").select("id").eq("id", inserted.data!.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);

    await admin.from("tasks").delete().eq("id", inserted.data!.id);
    await admin.auth.admin.deleteUser(userId);
  });
});
