import type { APIContext } from "astro";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import { jsonResponse } from "@/lib/api/json";

type AuthResult =
  | { error: Response; supabase: SupabaseClient | null; user: null }
  | { error: null; supabase: SupabaseClient; user: User };

export async function requireAuth(context: APIContext): Promise<AuthResult> {
  const supabase = createClient(context.request.headers, context.cookies);

  if (!supabase) {
    return {
      error: jsonResponse({ code: "service_unavailable", message: "Supabase is not configured" }, 503),
      supabase: null,
      user: null,
    };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      error: jsonResponse({ code: "unauthorized", message: "Authentication required" }, 401),
      supabase,
      user: null,
    };
  }

  return { error: null, supabase, user };
}
