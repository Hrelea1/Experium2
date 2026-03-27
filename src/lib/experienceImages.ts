import { tokenStore } from "@/lib/api";

const isProd = import.meta.env.PROD;
const defaultApiUrl = isProd ? 'https://experium2-production.up.railway.app' : 'http://localhost:3001';
const BASE_URL = import.meta.env.VITE_API_URL ?? defaultApiUrl;
export async function uploadExperienceImageFile(params: {
  file: File;
}) {
  const { file } = params;

  if (!file.type.startsWith("image/")) {
    throw new Error("Fișier invalid: te rog selectează o imagine.");
  }

  const formData = new FormData();
  formData.append("image", file);

  const token = tokenStore.get();
  
  const response = await fetch(`${BASE_URL}/uploads/experience-image`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Nu am putut încărca imaginea.");
  }

  const data = await response.json();
  if (!data.image_url) {
    throw new Error("Nu am putut genera URL-ul public pentru imagine.");
  }
  
  return data.image_url;
}
