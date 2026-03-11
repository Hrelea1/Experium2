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

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await supabaseClient.auth.getUser(token);
    const user = authData.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { items, returnUrl } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("No items provided");
    }

    // Validate each item
    for (const item of items) {
      if (!item.experienceId || !item.slotId || !item.participants || !item.totalPrice) {
        throw new Error("Missing required fields in cart item");
      }
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    const baseUrl = returnUrl || req.headers.get("origin") || "https://id-preview--822cb615-8c38-4524-bedf-f2603ff01820.lovable.app";

    // Create line items for Stripe
    const lineItems = items.map((item: any) => ({
      price_data: {
        currency: "ron",
        product_data: { name: item.title || "Experiență" },
        unit_amount: Math.round(item.totalPrice * 100),
      },
      quantity: 1,
    }));

    // Build compact metadata for items (within 500 char limit per field)
    // Store essential booking data as JSON array
    const itemsMeta = items.map((item: any) => ({
      e: item.experienceId,
      s: item.slotId,
      p: item.participants,
      t: item.totalPrice,
    }));
    const itemsJson = JSON.stringify(itemsMeta);

    // If items metadata exceeds 500 chars, split across multiple fields
    const metadataObj: Record<string, string> = {
      supabase_user_id: user.id,
      item_count: String(items.length),
    };

    if (itemsJson.length <= 500) {
      metadataObj.items = itemsJson;
    } else {
      // Split into chunks of 490 chars
      const chunks = [];
      for (let i = 0; i < itemsJson.length; i += 490) {
        chunks.push(itemsJson.slice(i, i + 490));
      }
      chunks.forEach((chunk, idx) => {
        metadataObj[`items_${idx}`] = chunk;
      });
      metadataObj.items_chunks = String(chunks.length);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: lineItems,
      mode: "payment",
      success_url: `${baseUrl}#/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}#/cart`,
      metadata: metadataObj,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
