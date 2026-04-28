import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { tokenStore } from "@/lib/api";

const isProd = import.meta.env.PROD;
const defaultApiUrl = isProd ? 'https://experium2-production.up.railway.app' : 'http://localhost:3001';
const API_BASE = import.meta.env.VITE_API_URL ?? defaultApiUrl;

async function apiReq(path: string, options: RequestInit = {}) {
  const token = tokenStore.get();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string>),
    },
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Request failed");
  return res.json();
}

export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_name: string;
  user_avatar: string | null;
};

export function useExperienceReviews(experienceId: string) {
  return useQuery({
    queryKey: ["reviews", experienceId],
    queryFn: () => apiReq(`/reviews/experience/${experienceId}`) as Promise<Review[]>,
    enabled: !!experienceId,
  });
}

export type LatestReview = Review & { experience_title: string };

export function useLatestReviews(limit: number = 3) {
  return useQuery({
    queryKey: ["reviews", "latest", limit],
    queryFn: () => apiReq(`/reviews/latest?limit=${limit}`) as Promise<LatestReview[]>,
  });
}

export function useAddReview() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ experienceId, rating, comment }: { experienceId: string; rating: number; comment: string }) => {
      return apiReq(`/reviews/experience/${experienceId}`, {
        method: "POST",
        body: JSON.stringify({ rating, comment }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reviews", variables.experienceId] });
      queryClient.invalidateQueries({ queryKey: ["experience", variables.experienceId] }); // to refresh global rating
      toast({ title: "Succes", description: "Recenzia a fost adăugată cu succes." });
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });
}
