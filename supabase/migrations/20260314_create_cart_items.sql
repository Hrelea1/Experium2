-- Create cart_items table for persisting user shopping carts
-- Run this in the Supabase SQL editor (Dashboard > SQL Editor > New query)

CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  experience_id uuid NOT NULL REFERENCES public.experiences(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL REFERENCES public.availability_slots(id) ON DELETE CASCADE,
  participants integer NOT NULL DEFAULT 1 CHECK (participants >= 1),
  services jsonb NOT NULL DEFAULT '[]'::jsonb,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, slot_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own cart items
CREATE POLICY "Users can manage their own cart items"
  ON public.cart_items FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
