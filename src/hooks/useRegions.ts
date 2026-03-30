import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tokenStore } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

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

export type Region = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  display_order: number | null;
  experience_count?: number;
};

// ─── Fetch all regions with experience counts ─────────────────────────────────
export function useRegions() {
  return useQuery({
    queryKey: ["regions"],
    queryFn: () => apiReq("/regions") as Promise<Region[]>,
  });
}

// ─── Update region image_url ──────────────────────────────────────────────────
export function useUpdateRegionImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ regionId, imageUrl }: { regionId: string; imageUrl: string }) =>
      apiReq(`/admin/regions/${regionId}`, {
        method: "PUT",
        body: JSON.stringify({ image_url: imageUrl }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["regions"] });
      toast({ title: "Succes!", description: "Imaginea regiunii a fost actualizată" });
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });
}

// ─── Upload region image ──────────────────────────────────────────────────────
export function useUploadRegionImage() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      const MAX_FILE_SIZE = 5 * 1024 * 1024;
      const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

      if (file.size > MAX_FILE_SIZE) throw new Error("Fișierul este prea mare. Mărimea maximă este 5MB.");
      if (!ALLOWED_TYPES.includes(file.type)) throw new Error("Tip de fișier invalid. Folosește JPG, PNG sau WebP.");

      const token = tokenStore.get();
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`${API_BASE}/uploads/general`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
      return (await res.json()).image_url as string;
    },
    onError: (error: Error) => {
      toast({ title: "Eroare la încărcare", description: error.message, variant: "destructive" });
    },
  });
}
