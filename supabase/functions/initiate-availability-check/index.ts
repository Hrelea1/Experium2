import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { booking_id } = await req.json();

    if (!booking_id) {
      return new Response(JSON.stringify({ error: "Missing booking_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Generate tokens
    const confirmToken = crypto.randomUUID();
    const declineToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // 2. Create the request
    const { error: insertError } = await supabaseAdmin
      .from("availability_requests")
      .insert({
        booking_id,
        confirm_token: confirmToken,
        decline_token: declineToken,
        expires_at: expiresAt,
        status: "pending",
      });

    if (insertError) throw insertError;

    // 3. Trigger SMS to provider: "assisted_availability_check"
    // The send-notification function will handle resolving the provider's phone number
    const confirmLink = `https://experium.ro/confirm?t=${confirmToken}`; // This link should point to a page that calls process-availability-response
    const declineLink = `https://experium.ro/decline?t=${declineToken}`;

    await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        event_type: "assisted_availability_check",
        booking_id,
        confirmLink,
        declineLink,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
