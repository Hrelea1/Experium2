import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin } from 'lucide-react';
import { api } from '@/lib/api';
import MapWithGeocoding from '@/components/MapWithGeocoding';

interface MapExperience {
  id: string;
  title: string;
  location: string;
  price: number;
  image?: string;
  coordinates?: [number, number]; // [lng, lat]
}

export default function MapView() {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<[number, number] | undefined>();
  const [experiences, setExperiences] = useState<MapExperience[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchExperiences = async () => {
      try {
        const result = await api.experiences.list({ limit: 1000 } as any);
        const data = result.data || [];
        const mapped: MapExperience[] = data.map((e: any) => ({
          id: e.id,
          title: e.title,
          location: e.location_name || '',
          price: Number(e.price),
          image: e.primary_image || undefined,
          // Only include coordinates if both lat and lng exist
          coordinates: (e.latitude && e.longitude)
            ? [Number(e.longitude), Number(e.latitude)] as [number, number]
            : undefined,
        }));
        setExperiences(mapped);
      } catch (err) {
        console.error('Failed to fetch experiences for map', err);
      }
      setIsLoading(false);
    };

    fetchExperiences();

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.longitude, pos.coords.latitude]),
        () => {}
      );
    }
  }, []);

  const handleExperienceClick = (experienceId: number | string) => {
    navigate(`/experience/${experienceId}`);
  };

  const withCoords = experiences.filter(e => e.coordinates).length;
  const withoutCoords = experiences.filter(e => !e.coordinates).length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20">
        <div className="container py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <MapPin className="h-8 w-8 text-primary" />
                  Experiențe pe hartă
                </h1>
                <p className="text-muted-foreground mt-1">
                  {isLoading
                    ? 'Se încarcă experiențele...'
                    : experiences.length === 0
                    ? 'Nu există experiențe disponibile'
                    : `${experiences.length} experiențe${withoutCoords > 0 ? ` (${withoutCoords} se geocodează...)` : ''}`}
                </p>
              </div>
            </div>
          </div>

          <div className="h-[calc(100vh-200px)] rounded-lg overflow-hidden">
            <MapWithGeocoding
              experiences={experiences}
              userLocation={userLocation}
              onExperienceClick={handleExperienceClick}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
