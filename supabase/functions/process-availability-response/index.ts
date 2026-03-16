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

    const { token, action } = await req.json();

    if (!token || !action) {
      return new Response(JSON.stringify({ error: "Missing token or action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Find the request by token
    const tokenColumn = action === "confirm" ? "confirm_token" : "decline_token";
    const { data: request, error: fetchError } = await supabaseAdmin
      .from("availability_requests")
      .select("*, booking_id")
      .eq(tokenColumn, token)
      .eq("status", "pending")
      .single();

    if (fetchError || !request) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Check if expired
    if (new Date(request.expires_at) < new Date()) {
      await supabaseAdmin
        .from("availability_requests")
        .update({ status: "expired" })
        .eq("id", request.id);

      // Notify user of timeout if not already done by a cron
      // (Simplified for now - we'll handle timeout notification elsewhere or here)
      
      return new Response(JSON.stringify({ error: "Request expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Process action
    if (action === "confirm") {
      // Update request status
      await supabaseAdmin
        .from("availability_requests")
        .update({ status: "confirmed" })
        .eq("id", request.id);

      // Lock the slot for 15 minutes
      // We need to find the slot associated with the booking
      const { data: booking } = await supabaseAdmin
        .from("bookings")
        .select("experience_id, slot_date, booking_date")
        .eq("id", request.booking_id)
        .single();

      if (booking) {
        // Find the slot by date and time
        const startTime = new Date(booking.booking_date).toTimeString().split(' ')[0];
        const { data: slot } = await supabaseAdmin
          .from("availability_slots")
          .select("id")
          .eq("experience_id", booking.experience_id)
          .eq("slot_date", booking.slot_date)
          .eq("start_time", startTime)
          .single();

        if (slot) {
          await supabaseAdmin
            .from("availability_slots")
            .update({
              is_locked: true,
              locked_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
              locked_by: "system" // Or a specific identifier
            })
            .eq("id", slot.id);
        }
      }

      // Trigger user notification: "assisted_confirmed"
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          event_type: "assisted_confirmed",
          booking_id: request.booking_id,
          // paymentLink: `${Deno.env.get("PUBLIC_APP_URL")}/cart?booking=${request.booking_id}`
          paymentLink: `https://experium.ro/cart` // Placeholder for real link logic
        }),
      });

    } else if (action === "decline") {
      // Update request status
      await supabaseAdmin
        .from("availability_requests")
        .update({ status: "declined" })
        .eq("id", request.id);

      // Update booking status
      await supabaseAdmin
        .from("bookings")
        .update({ status: "cancelled", cancellation_reason: "Provider declined availability" })
        .eq("id", request.booking_id);

      // Trigger user notification: "assisted_unavailable"
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          event_type: "assisted_unavailable",
          booking_id: request.booking_id,
        }),
      });
    }

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
