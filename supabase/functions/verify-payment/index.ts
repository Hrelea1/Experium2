import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await supabaseClient.auth.getUser(token);
    const user = authData.user;
    if (!user) throw new Error("User not authenticated");

    const { session_id } = await req.json();
    if (!session_id) throw new Error("Missing session_id");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      throw new Error("Payment not completed");
    }

    if (session.metadata?.supabase_user_id !== user.id) {
      throw new Error("Session does not belong to this user");
    }

    // Parse items from metadata
    let itemsJson: string;
    if (session.metadata?.items) {
      itemsJson = session.metadata.items;
    } else if (session.metadata?.items_chunks) {
      const chunkCount = parseInt(session.metadata.items_chunks);
      itemsJson = "";
      for (let i = 0; i < chunkCount; i++) {
        itemsJson += session.metadata[`items_${i}`] || "";
      }
    } else {
      throw new Error("No items metadata found");
    }

    const items = JSON.parse(itemsJson) as Array<{
      e: string; // experienceId
      s: string; // slotId
      p: number; // participants
      t: number; // totalPrice
    }>;

    if (!items || items.length === 0) {
      throw new Error("No booking items found");
    }

    // Process each booking
    const bookingResults = [];
    for (const item of items) {
      const { data: bookingResult, error: bookingError } = await supabaseAdmin.rpc(
        "confirm_slot_booking",
        {
          p_slot_id: item.s,
          p_user_id: user.id,
          p_participants: item.p,
          p_total_price: item.t,
          p_payment_method: "stripe",
        },
      );

      if (bookingError) {
        console.error("Booking error for slot", item.s, bookingError);
        bookingResults.push({ success: false, experienceId: item.e, error: bookingError.message });
        continue;
      }

      const result = bookingResult?.[0];
      if (!result?.success) {
        bookingResults.push({ success: false, experienceId: item.e, error: result?.error_message || "Failed" });
        continue;
      }

      bookingResults.push({ success: true, bookingId: result.booking_id, experienceId: item.e });

      // Send notifications (non-blocking)
      try {
        await supabaseAdmin.functions.invoke("send-notification", {
          body: { event_type: "booking_confirmed", booking_id: result.booking_id },
        });
      } catch (notifErr) {
        console.error("Notification error (non-fatal):", notifErr);
      }

      try {
        await supabaseAdmin.functions.invoke("push-notifications", {
          body: { action: "notify-booking", booking_id: result.booking_id, experience_id: item.e },
        });
      } catch (notifErr) {
        console.error("Provider notification error (non-fatal):", notifErr);
      }
    }

    const allSucceeded = bookingResults.every(r => r.success);
    const successCount = bookingResults.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        success: allSucceeded,
        bookings: bookingResults,
        successCount,
        totalCount: items.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Payment verification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
