import type { APIRoute } from "astro";
import { createClient } from "@/lib/supabase";
import { recordEvent } from "@/lib/services/product-events";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const form = await context.request.formData();
  const email = form.get("email") as string;
  const password = form.get("password") as string;

  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) {
    return context.redirect(`/auth/signup?error=${encodeURIComponent("Supabase is not configured")}`);
  }
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return context.redirect(`/auth/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user) {
    await recordEvent(supabase, {
      userId: data.user.id,
      eventType: "account_created",
    });
  }

  return context.redirect("/auth/confirm-email");
};
