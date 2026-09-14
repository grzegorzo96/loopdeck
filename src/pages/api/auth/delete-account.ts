import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import { createAdminClient } from "@/lib/supabase-admin";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect("/dashboard?error=Supabase%20not%20configured");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return context.redirect("/auth/signin");
  }

  const admin = createAdminClient();
  if (!admin) {
    return context.redirect("/dashboard?error=Account%20deletion%20unavailable");
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    return context.redirect(`/dashboard?error=${encodeURIComponent(deleteError.message)}`);
  }

  await supabase.auth.signOut();

  return context.redirect("/");
};
