import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { uploadExperienceImageFile } from "@/lib/experienceImages";
import { api } from "@/lib/api";
import { ExperienceImage } from "@/components/ExperienceImage";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

type CategoryOption = { id: string; name: string };
type RegionOption = { id: string; name: string };

type ExperienceRow = {
  id: string;
  title: string;
  description: string;
  short_description: string | null;
  includes: string[];
  location_name: string;
  price: number;
  original_price: number | null;
  child_price: number | null;
  child_price_description: string | null;
  weekend_price: number | null;
  category_id: string;
  region_id: string;
  duration_minutes: number | null;
  max_participants: number | null;
  min_participants: number | null;
  min_age: number | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  provider_id: string | null;
};

type ExperienceImageRow = {
  id: string;
  image_url: string;
  is_primary: boolean | null;
  display_order: number | null;
};

type ExperienceServiceRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_required: boolean;
  max_quantity: number;
  is_active: boolean;
  display_order: number;
};

type ImageDraft = {
  id?: string;
  clientId: string;
  image_url: string;
  is_primary: boolean;
};

type ServiceDraft = {
  id?: string;
  clientId: string;
  name: string;
  description: string;
  price: string;
  is_required: boolean;
  max_quantity: string;
  is_active: boolean;
};

const newClientId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function normalizeNumberInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function isEqualNullableNumber(a: number | null, b: number | null) {
  return (a ?? null) === (b ?? null);
}

function normalizeIncludes(items: string[]) {
  return items
    .map((x) => x.trim())
    .filter((x) => x.length > 0);
}

function isEqualStringArray(a: string[] | null | undefined, b: string[] | null | undefined) {
  const aa = a ?? [];
  const bb = b ?? [];
  if (aa.length !== bb.length) return false;
  for (let i = 0; i < aa.length; i++) if (aa[i] !== bb[i]) return false;
  return true;
}

export default function EditExperience() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [providers, setProviders] = useState<any[]>([]);

  const [originalExperience, setOriginalExperience] = useState<ExperienceRow | null>(null);
  const [originalImages, setOriginalImages] = useState<ExperienceImageRow[]>([]);
  const [originalServices, setOriginalServices] = useState<ExperienceServiceRow[]>([]);

  // Experience form state
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [regionId, setRegionId] = useState<string>("");
  const [providerId, setProviderId] = useState<string>("none");
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [childPrice, setChildPrice] = useState("");
  const [childPriceDescription, setChildPriceDescription] = useState("");
  const [weekendPrice, setWeekendPrice] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [minParticipants, setMinParticipants] = useState("");
  const [minAge, setMinAge] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);

  const [includes, setIncludes] = useState<string[]>([]);

  const [thumbPreset, setThumbPreset] = useState<"square" | "wide" | "classic">("wide");

  const thumbRatio = useMemo(() => {
    switch (thumbPreset) {
      case "square":
        return 1;
      case "classic":
        return 4 / 3;
      case "wide":
      default:
        return 16 / 9;
    }
  }, [thumbPreset]);

  const [images, setImages] = useState<ImageDraft[]>([]);
  const [services, setServices] = useState<ServiceDraft[]>([]);

  const canSave = useMemo(() => {
    if (!id) return false;
    if (!title.trim()) return false;
    if (!description.trim()) return false;
    if (!locationName.trim()) return false;
    if (!categoryId) return false;
    if (!regionId) return false;
    const p = normalizeNumberInput(price);
    if (p === null || p < 0) return false;
    return true;
  }, [id, title, description, locationName, categoryId, regionId, price]);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      try {
        // Fetch all data from Express API in parallel
        const [expData, catData, regData, allProviders] = await Promise.all([
          api.experiences.getById(id),
          api.categories.list(),
          api.regions.list(),
          api.admin.getUsers({ role: 'provider' }).catch(() => []),
        ]);

        setProviders(Array.isArray(allProviders) ? allProviders : []);

        const exp = expData as any;
        const imgs = (exp.images ?? []) as ExperienceImageRow[];
        const svcs = (exp.services ?? []) as unknown as ExperienceServiceRow[];

        const expRow: ExperienceRow = {
          id: exp.id,
          title: exp.title,
          description: exp.description,
          short_description: exp.short_description,
          includes: exp.includes ?? [],
          location_name: exp.location_name,
          price: Number(exp.price),
          original_price: exp.original_price ? Number(exp.original_price) : null,
          child_price: exp.child_price ? Number(exp.child_price) : null,
          child_price_description: exp.child_price_description || null,
          weekend_price: exp.weekend_price ? Number(exp.weekend_price) : null,
          category_id: exp.category_id,
          region_id: exp.region_id,
          duration_minutes: exp.duration_minutes ? Number(exp.duration_minutes) : null,
          max_participants: exp.max_participants ? Number(exp.max_participants) : null,
          min_participants: exp.min_participants ? Number(exp.min_participants) : null,
          min_age: exp.min_age ? Number(exp.min_age) : null,
          is_active: exp.is_active ?? true,
          is_featured: exp.is_featured ?? false,
          provider_id: exp.provider_id ?? "none",
        };

        setOriginalExperience(expRow);
        setOriginalImages(imgs);
        setOriginalServices(svcs);
        setCategories(Array.isArray(catData) ? catData as CategoryOption[] : []);
        setRegions(Array.isArray(regData) ? regData as RegionOption[] : []);

        // hydrate form state
        setTitle(expRow.title ?? "");
        setShortDescription(expRow.short_description ?? "");
        setDescription(expRow.description ?? "");
        setIncludes(Array.isArray(expRow.includes) ? expRow.includes : []);
        setLocationName(expRow.location_name ?? "");
        setCategoryId(expRow.category_id ?? "");
        setRegionId(expRow.region_id ?? "");
        setProviderId(expRow.provider_id ?? "none");
        setPrice(expRow.price?.toString?.() ?? "");
        setOriginalPrice(expRow.original_price?.toString?.() ?? "");
        setChildPrice(expRow.child_price?.toString?.() ?? "");
        setChildPriceDescription(expRow.child_price_description ?? "");
        setWeekendPrice(expRow.weekend_price?.toString?.() ?? "");
        setDurationMinutes(expRow.duration_minutes?.toString?.() ?? "");
        setMaxParticipants(expRow.max_participants?.toString?.() ?? "");
        setMinParticipants(expRow.min_participants?.toString?.() ?? "");
        setMinAge(expRow.min_age?.toString?.() ?? "");
        setIsActive(expRow.is_active ?? true);
        setIsFeatured(expRow.is_featured ?? false);

        const draftImages: ImageDraft[] = imgs.map((i) => ({
          id: i.id,
          clientId: i.id,
          image_url: i.image_url,
          is_primary: Boolean(i.is_primary),
        }));
        if (draftImages.length > 0 && !draftImages.some((x) => x.is_primary)) {
          draftImages[0].is_primary = true;
        }
        setImages(draftImages);

        const draftServices: ServiceDraft[] = svcs.map((s) => ({
          id: s.id,
          clientId: s.id,
          name: s.name,
          description: s.description ?? "",
          price: Number(s.price)?.toString?.() ?? "0",
          is_required: s.is_required,
          max_quantity: Number(s.max_quantity)?.toString?.() ?? "1",
          is_active: s.is_active,
        }));
        setServices(draftServices);
      } catch (e: any) {
        toast({
          title: "Eroare",
          description: e?.message ?? "Nu am putut încărca experiența",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const moveItem = <T,>(arr: T[], from: number, to: number) => {
    if (to < 0 || to >= arr.length) return arr;
    const next = [...arr];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  };

  const setPrimaryImage = (clientId: string) => {
    setImages((prev) => prev.map((img) => ({ ...img, is_primary: img.clientId === clientId })));
  };

  const addImage = () => {
    setImages((prev) => {
      const next = [
        ...prev,
        {
          clientId: newClientId(),
          image_url: "",
          is_primary: prev.length === 0,
        },
      ];
      return next;
    });
  };

  const uploadAndSetImage = async (clientId: string, file: File) => {
    if (!id) return;
    try {
      setSaving(true);
      const url = await uploadExperienceImageFile({ file });
      setImages((prev) =>
        prev.map((x) => (x.clientId === clientId ? { ...x, image_url: url } : x))
      );
      toast({
        title: "Imagine încărcată",
        description: "Am încărcat fișierul și am setat URL-ul automat.",
      });
    } catch (e: any) {
      toast({
        title: "Eroare upload",
        description: e?.message ?? "Nu am putut încărca imaginea",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const removeImage = (clientId: string) => {
    setImages((prev) => {
      const next = prev.filter((img) => img.clientId !== clientId);
      if (next.length > 0 && !next.some((x) => x.is_primary)) {
        next[0] = { ...next[0], is_primary: true };
      }
      return next;
    });
  };

  const addService = () => {
    setServices((prev) => [
      ...prev,
      {
        clientId: newClientId(),
        name: "",
        description: "",
        price: "0",
        is_required: false,
        max_quantity: "1",
        is_active: true,
      },
    ]);
  };

  const removeService = (clientId: string) => {
    setServices((prev) => prev.filter((s) => s.clientId !== clientId));
  };

  const buildExperiencePatch = () => {
    if (!originalExperience) return null;
    const patch: Record<string, any> = {};

    const nextPrice = normalizeNumberInput(price);
    const nextOriginalPrice = normalizeNumberInput(originalPrice);
    const nextChildPrice = normalizeNumberInput(childPrice);
    const nextWeekendPrice = normalizeNumberInput(weekendPrice);
    const nextDuration = normalizeNumberInput(durationMinutes);
    const nextMax = normalizeNumberInput(maxParticipants);
    const nextMinPart = normalizeNumberInput(minParticipants);
    const nextMinAge = normalizeNumberInput(minAge);

    if (title.trim() !== originalExperience.title) patch.title = title.trim();
    if (description.trim() !== originalExperience.description) patch.description = description.trim();
    if ((shortDescription.trim() || null) !== (originalExperience.short_description ?? null)) {
      patch.short_description = shortDescription.trim() || null;
    }
    if ((childPriceDescription.trim() || null) !== (originalExperience.child_price_description ?? null)) {
      patch.child_price_description = childPriceDescription.trim() || null;
    }
    if (locationName.trim() !== originalExperience.location_name) patch.location_name = locationName.trim();
    if (categoryId !== originalExperience.category_id) patch.category_id = categoryId;
    if (regionId !== originalExperience.region_id) patch.region_id = regionId;

    const nextIncludes = normalizeIncludes(includes);
    if (!isEqualStringArray(nextIncludes, normalizeIncludes(originalExperience.includes ?? []))) {
      patch.includes = nextIncludes;
    }

    if (!isEqualNullableNumber(nextPrice, originalExperience.price)) patch.price = nextPrice;
    if (!isEqualNullableNumber(nextOriginalPrice, originalExperience.original_price ?? null)) {
      patch.original_price = nextOriginalPrice;
    }
    if (!isEqualNullableNumber(nextChildPrice, originalExperience.child_price ?? null)) {
      patch.child_price = nextChildPrice;
    }
    if (!isEqualNullableNumber(nextWeekendPrice, originalExperience.weekend_price ?? null)) {
      patch.weekend_price = nextWeekendPrice;
    }
    if (!isEqualNullableNumber(nextDuration, originalExperience.duration_minutes ?? null)) {
      patch.duration_minutes = nextDuration;
    }
    if (!isEqualNullableNumber(nextMax, originalExperience.max_participants ?? null)) {
      patch.max_participants = nextMax;
    }
    if (!isEqualNullableNumber(nextMinPart, originalExperience.min_participants ?? null)) {
      patch.min_participants = nextMinPart;
    }
    if (!isEqualNullableNumber(nextMinAge, originalExperience.min_age ?? null)) {
      patch.min_age = nextMinAge;
    }

    if ((originalExperience.is_active ?? true) !== isActive) patch.is_active = isActive;
    if ((originalExperience.is_featured ?? false) !== isFeatured) patch.is_featured = isFeatured;

    if (providerId !== "none" || (providerId === "none" && originalExperience.provider_id && originalExperience.provider_id !== "none")) {
        if (providerId !== originalExperience.provider_id) {
            patch.provider_id = providerId === "none" ? "none" : providerId;
        }
    }

    return patch;
  };

  const save = async () => {
    if (!id || !originalExperience) return;
    if (!canSave) {
      toast({
        title: "Formular incomplet",
        description: "Completează câmpurile obligatorii înainte de a salva.",
        variant: "destructive",
      });
      return;
    }

    // Basic front validation for drafts
    const cleanImages = images
      .map((img) => ({ ...img, image_url: img.image_url.trim() }))
      .filter((img) => img.image_url.length > 0);

    const cleanServices = services
      .map((s) => ({
        ...s,
        name: s.name.trim(),
        description: s.description.trim(),
      }))
      .filter((s) => s.name.length > 0);

    setSaving(true);
    try {
      const patch = buildExperiencePatch() || {};
      
      patch.images = cleanImages.map((img, idx) => ({
        image_url: img.image_url,
        is_primary: img.is_primary,
        display_order: idx
      }));

      patch.services = cleanServices.map((s, idx) => ({
        name: s.name,
        description: s.description || null,
        price: normalizeNumberInput(s.price) ?? 0,
        is_required: s.is_required,
        max_quantity: normalizeNumberInput(s.max_quantity) ?? 1,
        is_active: s.is_active,
        display_order: idx,
      }));

      await api.experiences.update(id, patch);

      toast({ title: "Salvat", description: "Experiența a fost actualizată." });
      navigate("/admin/experiences");
    } catch (e: any) {
      toast({
        title: "Eroare",
        description: e?.message ?? "Nu am putut salva modificările",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Editează experiența</h2>
            <p className="text-muted-foreground">Actualizează detaliile, imaginile și serviciile.</p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/admin/experiences")}
              disabled={saving}
            >
              <X className="h-4 w-4 mr-2" />
              Renunță
            </Button>
            <Button onClick={save} disabled={!canSave || saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Se salvează..." : "Salvează"}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          </div>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detalii de bază</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="provider">Furnizor (Provider) *</Label>
                  <select
                    id="provider"
                    value={providerId}
                    onChange={(e) => setProviderId(e.target.value)}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="none">Atribuie mai târziu (Assign Later)</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || p.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Titlu *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Locație *</Label>
                    <Input
                      id="location"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Categorie *</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Alege categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Regiune *</Label>
                    <Select value={regionId} onValueChange={setRegionId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Alege regiunea" />
                      </SelectTrigger>
                      <SelectContent>
                        {regions.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="price">Preț (RON) *</Label>
                    <Input
                      id="price"
                      inputMode="decimal"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="child_price">Preț Copii (RON)</Label>
                    <Input
                      id="child_price"
                      inputMode="decimal"
                      value={childPrice}
                      onChange={(e) => setChildPrice(e.target.value)}
                      placeholder="Opțional"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weekend_price">Preț Extra Weekend (RON)</Label>
                    <Input
                      id="weekend_price"
                      inputMode="decimal"
                      value={weekendPrice}
                      onChange={(e) => setWeekendPrice(e.target.value)}
                      placeholder="Adăugat la prețul de bază"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="child_price_description">Detalii preț copii (opțional)</Label>
                    <Input
                      id="child_price_description"
                      value={childPriceDescription}
                      onChange={(e) => setChildPriceDescription(e.target.value)}
                      placeholder="ex: preț valabil pentru copii sub 12 ani"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="original_price">Preț original (promo)</Label>
                    <Input
                      id="original_price"
                      inputMode="decimal"
                      value={originalPrice}
                      onChange={(e) => setOriginalPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Durată (minute)</Label>
                    <Input
                      id="duration"
                      inputMode="numeric"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_participants">Max. participanți</Label>
                    <Input
                      id="max_participants"
                      inputMode="numeric"
                      value={maxParticipants}
                      onChange={(e) => setMaxParticipants(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_participants">Min. participanți</Label>
                    <Input
                      id="min_participants"
                      inputMode="numeric"
                      value={minParticipants}
                      onChange={(e) => setMinParticipants(e.target.value)}
                      placeholder="Implicit: 1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_age">Vârstă minimă</Label>
                    <Input
                      id="min_age"
                      inputMode="numeric"
                      value={minAge}
                      onChange={(e) => setMinAge(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="short_description">Descriere scurtă</Label>
                  <Textarea
                    id="short_description"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descriere *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={7}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label>Ce include (bullet-uri)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIncludes((prev) => [...prev, ""])}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adaugă rând
                    </Button>
                  </div>
                  {includes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nu ai adăugat încă elemente.</p>
                  ) : (
                    <div className="space-y-2">
                      {includes.map((item, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            value={item}
                            onChange={(e) =>
                              setIncludes((prev) =>
                                prev.map((x, i) => (i === idx ? e.target.value : x))
                              )
                            }
                            placeholder="Ex: Echipament complet"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setIncludes((prev) => moveItem(prev, idx, idx - 1))}
                            disabled={idx === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setIncludes((prev) => moveItem(prev, idx, idx + 1))}
                            disabled={idx === includes.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setIncludes((prev) => prev.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <p className="text-xs text-muted-foreground">
                        Elementele goale sunt ignorate la salvare.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="is_active"
                      checked={isActive}
                      onCheckedChange={(v) => setIsActive(Boolean(v))}
                    />
                    <Label htmlFor="is_active">Activ</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="is_featured"
                      checked={isFeatured}
                      onCheckedChange={(v) => setIsFeatured(Boolean(v))}
                    />
                    <Label htmlFor="is_featured">Evidențiat</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Imagini</CardTitle>
                <Button variant="outline" onClick={addImage}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adaugă imagine
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="rounded-md border bg-card p-4 space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-medium">Preview thumbnails (încadrare)</div>
                      <p className="text-xs text-muted-foreground">
                        Verifică rapid cum arată punctul de focus pe diverse formate.
                      </p>
                    </div>

                    <ToggleGroup
                      type="single"
                      value={thumbPreset}
                      onValueChange={(v) => {
                        if (v === "square" || v === "wide" || v === "classic") setThumbPreset(v);
                      }}
                      className="justify-start sm:justify-end"
                    >
                      <ToggleGroupItem value="square" aria-label="Pătrat">
                        1:1
                      </ToggleGroupItem>
                      <ToggleGroupItem value="wide" aria-label="Wide">
                        16:9
                      </ToggleGroupItem>
                      <ToggleGroupItem value="classic" aria-label="Clasic">
                        4:3
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  {images.filter((i) => i.image_url.trim().length > 0).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Adaugă un URL / încarcă o imagine ca să vezi thumbnails.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {images
                        .filter((i) => i.image_url.trim().length > 0)
                        .map((img, idx) => (
                          <div key={`thumb-${img.clientId}`} className="space-y-2">
                            <AspectRatio ratio={thumbRatio} className="overflow-hidden rounded-md border bg-muted">
                              <ExperienceImage
                                src={img.image_url}
                                alt={`Thumbnail ${idx + 1}`}
                                className="h-full w-full"
                              />

                              <div className="pointer-events-none absolute left-2 top-2 rounded bg-background/70 px-2 py-0.5 text-[11px] text-foreground backdrop-blur-sm">
                                #{idx + 1}{img.is_primary ? " • principală" : ""}
                              </div>
                            </AspectRatio>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {images.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nu există imagini.</p>
                ) : (
                  <div className="space-y-3">
                    {images.map((img, idx) => (
                      <div
                        key={img.clientId}
                        className="rounded-md border bg-card p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium">
                            Imagine {idx + 1}{" "}
                            {img.is_primary ? (
                              <span className="text-muted-foreground">(principală)</span>
                            ) : null}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setImages((prev) => moveItem(prev, idx, idx - 1))}
                              disabled={idx === 0}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setImages((prev) => moveItem(prev, idx, idx + 1))}
                              disabled={idx === images.length - 1}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeImage(img.clientId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-4">
                          <div className="md:col-span-3 space-y-2">
                            <Label>URL imagine</Label>
                            <Input
                              value={img.image_url}
                              onChange={(e) =>
                                setImages((prev) =>
                                  prev.map((x) =>
                                    x.clientId === img.clientId
                                      ? { ...x, image_url: e.target.value }
                                      : x
                                  )
                                )
                              }
                              placeholder="https://..."
                            />

                            <div className="flex items-center gap-2">
                              <Label
                                className="inline-flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 text-sm hover:bg-accent w-fit"
                                htmlFor={`img-upload-${img.clientId}`}
                              >
                                Încarcă fișier
                              </Label>
                              <input
                                id={`img-upload-${img.clientId}`}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) uploadAndSetImage(img.clientId, file);
                                }}
                              />
                              <span className="text-xs text-muted-foreground">
                                Acceptă PNG/JPEG/WebP etc.
                              </span>
                            </div>


                          </div>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant={img.is_primary ? "default" : "outline"}
                              className="w-full"
                              onClick={() => setPrimaryImage(img.clientId)}
                            >
                              {img.is_primary ? "Principală" : "Setează ca principală"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Servicii adiționale</CardTitle>
                <Button variant="outline" onClick={addService}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adaugă serviciu
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {services.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nu există servicii.</p>
                ) : (
                  <div className="space-y-3">
                    {services.map((svc, idx) => (
                      <div key={svc.clientId} className="rounded-md border bg-card p-4 space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium">Serviciu {idx + 1}</div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setServices((prev) => moveItem(prev, idx, idx - 1))}
                              disabled={idx === 0}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setServices((prev) => moveItem(prev, idx, idx + 1))}
                              disabled={idx === services.length - 1}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => removeService(svc.clientId)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Nume</Label>
                            <Input
                              value={svc.name}
                              onChange={(e) =>
                                setServices((prev) =>
                                  prev.map((x) =>
                                    x.clientId === svc.clientId ? { ...x, name: e.target.value } : x
                                  )
                                )
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Preț (RON)</Label>
                            <Input
                              inputMode="decimal"
                              value={svc.price}
                              onChange={(e) =>
                                setServices((prev) =>
                                  prev.map((x) =>
                                    x.clientId === svc.clientId ? { ...x, price: e.target.value } : x
                                  )
                                )
                              }
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Descriere</Label>
                          <Textarea
                            value={svc.description}
                            onChange={(e) =>
                              setServices((prev) =>
                                prev.map((x) =>
                                  x.clientId === svc.clientId
                                    ? { ...x, description: e.target.value }
                                    : x
                                )
                              )
                            }
                            rows={3}
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Cantitate maximă</Label>
                            <Input
                              inputMode="numeric"
                              value={svc.max_quantity}
                              onChange={(e) =>
                                setServices((prev) =>
                                  prev.map((x) =>
                                    x.clientId === svc.clientId
                                      ? { ...x, max_quantity: e.target.value }
                                      : x
                                  )
                                )
                              }
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <Checkbox
                              id={`svc-required-${svc.clientId}`}
                              checked={svc.is_required}
                              onCheckedChange={(v) =>
                                setServices((prev) =>
                                  prev.map((x) =>
                                    x.clientId === svc.clientId
                                      ? { ...x, is_required: Boolean(v) }
                                      : x
                                  )
                                )
                              }
                            />
                            <Label htmlFor={`svc-required-${svc.clientId}`}>Obligatoriu</Label>
                          </div>
                          <div className="flex items-end gap-2">
                            <Checkbox
                              id={`svc-active-${svc.clientId}`}
                              checked={svc.is_active}
                              onCheckedChange={(v) =>
                                setServices((prev) =>
                                  prev.map((x) =>
                                    x.clientId === svc.clientId
                                      ? { ...x, is_active: Boolean(v) }
                                      : x
                                  )
                                )
                              }
                            />
                            <Label htmlFor={`svc-active-${svc.clientId}`}>Activ</Label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
