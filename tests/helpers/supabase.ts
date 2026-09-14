import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const TEST_PASSWORD = "Test-Passw0rd!";

export interface TestUser {
  userId: string;
  client: SupabaseClient;
  email: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Start Supabase and export env:\n` +
        `  npx supabase start\n` +
        `  eval "$(supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"\n` +
        `  export SUPABASE_URL=$API_URL SUPABASE_KEY=$ANON_KEY SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY`,
    );
  }
  return value;
}

export function getSupabaseEnv(): { url: string; anonKey: string; serviceRoleKey: string } {
  return {
    url: requireEnv("SUPABASE_URL"),
    anonKey: requireEnv("SUPABASE_KEY"),
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export async function createTestUser(): Promise<TestUser> {
  const { url, anonKey, serviceRoleKey } = getSupabaseEnv();
  const email = `test-${crypto.randomUUID()}@example.com`;

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });

  if (createError) {
    throw createError;
  }

  const userId = created.user.id;

  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });

  if (signInError) {
    throw signInError;
  }

  return { userId, client, email };
}

export function requireRowId(row: unknown): string {
  if (typeof row !== "object" || row === null || !("id" in row) || typeof row.id !== "string") {
    throw new Error("expected row id");
  }
  return row.id;
}

export async function deleteAllUserTasks(userId: string): Promise<void> {
  const { url, serviceRoleKey } = getSupabaseEnv();
  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.from("tasks").delete().eq("user_id", userId);
  if (error) {
    throw error;
  }
}

export async function deleteTestUser(userId: string): Promise<void> {
  const { url, serviceRoleKey } = getSupabaseEnv();
  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    throw error;
  }
}
