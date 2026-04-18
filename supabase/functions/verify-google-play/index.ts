import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req) => {
  try {
    const body = await req.json();

    const {
      userId,
      planKey,
      productId,
      purchaseToken,
      orderId,
    } = body;

    if (!userId || !planKey || !productId) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 🚨 TEMP: skip Google verification (we activate immediately)
    // later we can add real Google API verification

    // 1. UPDATE / INSERT ENROLLMENT
    const { data: existing } = await supabase
      .from("enrollments")
      .select("id")
      .eq("purchase_token", purchaseToken)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from("enrollments")
        .update({
          status: "active",
          activated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("enrollments").insert([
        {
          user_id: userId,
          plan: planKey,
          plan_key: planKey,
          product_id: productId,
          purchase_token: purchaseToken,
          order_id: orderId,
          source: "google_play",
          status: "active",
          activated_at: new Date().toISOString(),
        },
      ]);
    }

    // 2. UPDATE PROFILE (THIS IS THE KEY 🔥)
    await supabase
      .from("profiles")
      .update({
        plan: planKey,
        program_active: true,
        is_enrolled: true,
        enrollment_status: "active",
        access_source: "google_play",
        activated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
});