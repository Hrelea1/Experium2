import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Building2, Wrench, Plus, X, Upload, Package } from 'lucide-react';
import { uploadExperienceImageFile } from '@/lib/experienceImages';

interface Category { id: string; name: string; }
interface Region { id: string; name: string; }

interface ServiceInput {
  name: string;
  description: string;
  price: string;
  maxQuantity: string;
  isRequired: boolean;
}

const emptyService: ServiceInput = {
  name: '',
  description: '',
  price: '',
  maxQuantity: '1',
  isRequired: false,
};

export default function CreateExperience() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [price, setPrice] = useState('');
  const [providerType, setProviderType] = useState<'accommodation' | 'service'>('service');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [categoryId, setCategoryId] = useState('');
  const [regionId, setRegionId] = useState('');
  const [locationName, setLocationName] = useState('');
  const [cancellationPolicy, setCancellationPolicy] = useState('');

  // Images state
  const [images, setImages] = useState<Array<{ url: string; file?: File | null }>>([{ url: '' }]);

  // Services state
  const [services, setServices] = useState<ServiceInput[]>([]);

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    const [catRes, regRes] = await Promise.all([
      supabase.from('categories').select('id, name').order('name'),
      supabase.from('regions').select('id, name').order('name'),
    ]);
    if (catRes.data) setCategories(catRes.data);
    if (regRes.data) setRegions(regRes.data);
  };

  // Image helpers
  const addImageField = () => setImages([...images, { url: '' }]);
  const removeImageField = (index: number) => setImages(images.filter((_, i) => i !== index));
  const updateImageUrl = (index: number, value: string) =>
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, url: value } : img)));
  const updateImageFile = (index: number, file: File | null) =>
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, file } : img)));

  // Service helpers
  const addService = () => setServices([...services, { ...emptyService }]);
  const removeService = (index: number) => setServices(services.filter((_, i) => i !== index));
  const updateService = (index: number, field: keyof ServiceInput, value: string | boolean) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!title || !description || !price || !categoryId || !regionId || !locationName) {
      toast({ title: 'Date incomplete', description: 'Completează toate câmpurile obligatorii', variant: 'destructive' });
      return;
    }

    const hasAtLeastOneImage = images.some(img => img.file || img.url.trim());
    if (!hasAtLeastOneImage) {
      toast({ title: 'Imagine obligatorie', description: 'Adaugă cel puțin o imagine pentru experiență', variant: 'destructive' });
      return;
    }

    if (providerType === 'service' && !durationMinutes) {
      toast({ title: 'Durată obligatorie', description: 'Pentru tip serviciu, durata este obligatorie', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // 1. Create experience
      const { data: expData, error: expError } = await supabase
        .from('experiences')
        .insert({
          title,
          description,
          short_description: shortDescription || null,
          price: parseFloat(price),
          provider_type: providerType,
          duration_minutes: durationMinutes ? parseInt(durationMinutes) : null,
          max_participants: parseInt(maxParticipants) || 10,
          category_id: categoryId,
          region_id: regionId,
          location_name: locationName,
          cancellation_policy: cancellationPolicy || null,
          ambassador_id: user.id,
          is_active: false,
        })
        .select()
        .single();

      if (expError) throw expError;

      // 2. Auto-assign provider (must happen before images/services for RLS)
      const { error: assignError } = await supabase
        .from('experience_providers')
        .insert({
          experience_id: expData.id,
          provider_user_id: user.id,
          assigned_by: user.id,
          is_active: true,
        });

      if (assignError) throw assignError;

      // 3. Upload images
      const uploadedUrls: string[] = [];
      for (const img of images) {
        if (img.file) {
          const url = await uploadExperienceImageFile({ experienceId: expData.id, file: img.file });
          uploadedUrls.push(url);
        } else if (img.url.trim()) {
          uploadedUrls.push(img.url.trim());
        }
      }

      if (uploadedUrls.length > 0) {
        const imageRecords = uploadedUrls.map((url, index) => ({
          experience_id: expData.id,
          image_url: url,
          is_primary: index === 0,
          display_order: index,
        }));
        const { error: imgError } = await supabase.from('experience_images').insert(imageRecords);
        if (imgError) console.error('Error adding images:', imgError);
      }

      // 4. Insert services
      const validServices = services.filter(s => s.name.trim() && s.price);
      if (validServices.length > 0) {
        const serviceRecords = validServices.map((s, index) => ({
          experience_id: expData.id,
          name: s.name.trim(),
          description: s.description.trim() || null,
          price: parseFloat(s.price),
          max_quantity: parseInt(s.maxQuantity) || 1,
          is_required: s.isRequired,
          display_order: index,
          is_active: true,
        }));
        const { error: svcError } = await supabase.from('experience_services').insert(serviceRecords);
        if (svcError) console.error('Error adding services:', svcError);
      }

      toast({ title: 'Experiență creată!', description: 'Experiența a fost trimisă spre aprobare.' });
      navigate('/provider');
    } catch (error: any) {
      toast({ title: 'Eroare', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container max-w-2xl">
          <Button variant="ghost" onClick={() => navigate('/provider')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Înapoi la Dashboard
          </Button>

          <Card>
            <CardHeader>
              <CardTitle>Creează Experiență Nouă</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">Titlu *</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Tur cu barca pe Dunăre" />
                </div>

                {/* Provider Type */}
                <div className="space-y-2">
                  <Label>Tip furnizor *</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setProviderType('service')}
                      className={`p-4 rounded-lg border-2 text-left transition-colors ${
                        providerType === 'service' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <Wrench className="h-5 w-5 mb-2 text-primary" />
                      <p className="font-medium">Serviciu</p>
                      <p className="text-xs text-muted-foreground">Disponibilitate pe ore</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProviderType('accommodation')}
                      className={`p-4 rounded-lg border-2 text-left transition-colors ${
                        providerType === 'accommodation' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <Building2 className="h-5 w-5 mb-2 text-primary" />
                      <p className="font-medium">Cazare</p>
                      <p className="text-xs text-muted-foreground">Disponibilitate pe nopți</p>
                    </button>
                  </div>
                </div>

                {/* Duration (required for service) */}
                {providerType === 'service' && (
                  <div className="space-y-2">
                    <Label htmlFor="duration">Durată (minute) *</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      placeholder="Ex: 150 (pentru 2h 30m)"
                      min={15}
                      step={15}
                    />
                    {durationMinutes && (
                      <p className="text-xs text-muted-foreground">
                        = {Math.floor(parseInt(durationMinutes) / 60)}h {parseInt(durationMinutes) % 60}m
                      </p>
                    )}
                  </div>
                )}

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Descriere *</Label>
                  <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Descrie experiența în detaliu..." />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shortDesc">Descriere scurtă</Label>
                  <Input id="shortDesc" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="Max 160 caractere" maxLength={160} />
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <Label htmlFor="price">Preț (Lei) *</Label>
                  <Input id="price" type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Ex: 250" min={1} step={0.01} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categorie *</Label>
                    {categories.length > 0 ? (
                      <Select value={categoryId || undefined} onValueChange={setCategoryId}>
                        <SelectTrigger><SelectValue placeholder="Selectează" /></SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input disabled placeholder="Se încarcă..." />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Regiune *</Label>
                    {regions.length > 0 ? (
                      <Select value={regionId || undefined} onValueChange={setRegionId}>
                        <SelectTrigger><SelectValue placeholder="Selectează" /></SelectTrigger>
                        <SelectContent>
                          {regions.map((r) => (
                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input disabled placeholder="Se încarcă..." />
                    )}
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">Locație *</Label>
                  <Input id="location" value={locationName} onChange={(e) => setLocationName(e.target.value)} placeholder="Ex: Tulcea, Delta Dunării" />
                </div>

                {/* Capacity */}
                <div className="space-y-2">
                  <Label htmlFor="maxPart">Capacitate maximă</Label>
                  <Input id="maxPart" type="number" value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} min={1} max={500} />
                </div>

                {/* Cancellation policy */}
                <div className="space-y-2">
                  <Label htmlFor="cancel">Politică anulare (opțional)</Label>
                  <Textarea id="cancel" value={cancellationPolicy} onChange={(e) => setCancellationPolicy(e.target.value)} rows={3} placeholder="Ex: Anulare gratuită cu 48h înainte" />
                </div>

                {/* ===== IMAGES SECTION ===== */}
                <div className="space-y-4 pt-6 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Imagini</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addImageField}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adaugă Imagine
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">Cel puțin o imagine este obligatorie *</p>
                  {images.map((img, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          value={img.url}
                          onChange={(e) => updateImageUrl(index, e.target.value)}
                          placeholder={img.file ? img.file.name : 'URL imagine (ex: https://...)'}
                          className="flex-1"
                        />
                        <div className="flex items-center gap-2">
                          <Label
                            className="inline-flex items-center gap-2 cursor-pointer rounded-md border px-3 py-2 text-sm hover:bg-accent"
                            htmlFor={`img-file-${index}`}
                          >
                            <Upload className="h-4 w-4" />
                            Încarcă
                          </Label>
                          <input
                            id={`img-file-${index}`}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => updateImageFile(index, e.target.files?.[0] ?? null)}
                          />
                        </div>
                        {images.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => removeImageField(index)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {/* Image preview thumbnail */}
                      {(img.file || img.url.trim()) && (
                        <div className="relative w-32 h-20 rounded-lg overflow-hidden border bg-muted">
                          <img
                            src={img.file ? URL.createObjectURL(img.file) : img.url.trim()}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                          {index === 0 && (
                            <span className="absolute top-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded font-medium">
                              Principală
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {images.some(img => img.file) && (
                    <p className="text-xs text-muted-foreground">
                      {images.filter(img => img.file).length} fișier(e) selectat(e) pentru upload
                    </p>
                  )}
                </div>

                {/* ===== SERVICES SECTION ===== */}
                <div className="space-y-4 pt-6 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      <div>
                        <Label className="text-base font-semibold">Servicii Adiționale</Label>
                        <p className="text-sm text-muted-foreground">
                          Adaugă opțiuni extra pe care clienții le pot selecta
                        </p>
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addService}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adaugă Serviciu
                    </Button>
                  </div>

                  {services.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed rounded-xl">
                      <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Nu ai adăugat niciun serviciu. Clienții vor putea doar să cumpere experiența de bază.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {services.map((service, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <span className="text-sm font-medium text-muted-foreground">
                              Serviciu #{index + 1}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeService(index)}
                              className="text-destructive hover:text-destructive"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Șterge
                            </Button>
                          </div>

                          <div className="grid gap-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Nume serviciu *</Label>
                                <Input
                                  value={service.name}
                                  onChange={(e) => updateService(index, 'name', e.target.value)}
                                  placeholder="Ex: Fotografii profesionale"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Preț (RON) *</Label>
                                <Input
                                  type="number"
                                  value={service.price}
                                  onChange={(e) => updateService(index, 'price', e.target.value)}
                                  placeholder="150"
                                  step="0.01"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Descriere</Label>
                              <Input
                                value={service.description}
                                onChange={(e) => updateService(index, 'description', e.target.value)}
                                placeholder="Ex: Primești 50+ poze editate profesional"
                              />
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label>Cantitate maximă</Label>
                                <Input
                                  type="number"
                                  value={service.maxQuantity}
                                  onChange={(e) => updateService(index, 'maxQuantity', e.target.value)}
                                  placeholder="1"
                                  min="1"
                                />
                              </div>
                              <div className="flex items-center gap-2 pt-6">
                                <Checkbox
                                  id={`required-${index}`}
                                  checked={service.isRequired}
                                  onCheckedChange={(checked) => updateService(index, 'isRequired', !!checked)}
                                />
                                <Label htmlFor={`required-${index}`} className="cursor-pointer">
                                  Obligatoriu (inclus automat)
                                </Label>
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => navigate('/provider')}>
                    Anulează
                  </Button>
                  <Button type="submit" disabled={saving} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Se salvează...' : 'Creează Experiență'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
