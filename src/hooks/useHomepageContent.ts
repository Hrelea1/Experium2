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

export type HomepageContent = {
  id: string;
  section_key: string;
  content: Record<string, any>;
  updated_at: string;
};

// ─── Fetch one section ────────────────────────────────────────────────────────
export function useHomepageContent(sectionKey: string) {
  return useQuery({
    queryKey: ["homepage-content", sectionKey],
    queryFn: () => apiReq(`/homepage-content/${sectionKey}`) as Promise<HomepageContent>,
  });
}

// ─── Fetch all sections ───────────────────────────────────────────────────────
export function useAllHomepageContent() {
  return useQuery({
    queryKey: ["homepage-content", "all"],
    queryFn: () => apiReq("/homepage-content") as Promise<HomepageContent[]>,
  });
}

// ─── Update / upsert a section ────────────────────────────────────────────────
export function useUpdateHomepageContent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ sectionKey, content }: { sectionKey: string; content: Record<string, any> }) => {
      if (!sectionKey || sectionKey.length > 50) throw new Error("Section key invalid");
      if (!content || typeof content !== "object" || Array.isArray(content)) {
        throw new Error("Conținutul trebuie să fie un obiect valid");
      }

      const sanitize = (obj: any): any => {
        if (typeof obj === "string") return obj.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/<[^>]*>/g, "").trim();
        if (Array.isArray(obj)) return obj.map(sanitize);
        if (typeof obj === "object" && obj !== null) return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, sanitize(v)]));
        return obj;
      };

      return apiReq(`/homepage-content/${sectionKey}`, {
        method: "PUT",
        body: JSON.stringify({ content: sanitize(content) }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homepage-content"] });
      toast({ title: "Succes!", description: "Conținutul a fost actualizat" });
    },
    onError: (error: Error) => {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    },
  });
}

// ─── Upload image ─────────────────────────────────────────────────────────────
export function useUploadHomepageImage() {
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
      // We'll reuse the experience-image upload endpoint, tagged as homepage
      formData.append("destination", "homepage");

      const res = await fetch(`${API_BASE}/uploads/general`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
      const data = await res.json();
      return data.image_url as string;
    },
    onError: (error: Error) => {
      toast({ title: "Eroare la încărcare", description: error.message, variant: "destructive" });
    },
  });
}