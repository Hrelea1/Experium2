import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin } from 'lucide-react';

interface Experience {
  id: number | string;
  title: string;
  location: string;
  price: number;
  image?: string;
  coordinates?: [number, number];
}

interface MapProps {
  experiences: Experience[];
  userLocation?: [number, number];
  onExperienceClick?: (experienceId: number | string) => void;
}

const Map = ({ experiences, userLocation, onExperienceClick }: MapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch token (no auth required)
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');

        if (error) {
          console.error('Error fetching Mapbox token:', error);
          setError('Nu s-a putut încărca harta. Verificați configurarea Mapbox.');
          return;
        }

        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          setError('Token Mapbox nu este configurat în Supabase secrets.');
        }
      } catch (err) {
        console.error('Map token error:', err);
        setError('Eroare la încărcarea hărții.');
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, []);

  // Initialize map once token is available
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || map.current) return;

    mapboxgl.accessToken = mapboxToken;

    const center: [number, number] = userLocation || [25.0, 45.9]; // Romania centre

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom: userLocation ? 10 : 6,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'top-right'
    );

    // User location marker
    if (userLocation) {
      new mapboxgl.Marker({ color: '#0EA5E9' })
        .setLngLat(userLocation)
        .setPopup(new mapboxgl.Popup().setHTML('<p>Locația ta</p>'))
        .addTo(map.current);
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken, userLocation]);

  // Add/update experience markers separately so map doesn't re-initialize
  useEffect(() => {
    if (!map.current || !mapboxToken) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    experiences.forEach((experience) => {
      if (!experience.coordinates || !map.current) return;

      const el = document.createElement('div');
      el.style.cssText = `
        width: 36px; height: 36px; border-radius: 50%;
        background: hsl(16 85% 55%); border: 3px solid white;
        cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        display: flex; align-items: center; justify-content: center;
        transition: transform 0.2s;
      `;
      el.innerHTML = `<span style="color:white;font-size:13px;font-weight:700">lei</span>`;
      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.15)'; });
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

      const popup = new mapboxgl.Popup({ offset: 20, closeButton: false })
        .setHTML(`
          <div style="padding:10px;min-width:160px">
            <h3 style="font-weight:700;margin:0 0 4px;font-size:14px">${experience.title}</h3>
            <p style="color:#666;font-size:12px;margin:0 0 4px">${experience.location}</p>
            <p style="color:hsl(16 85% 55%);font-weight:700;margin:0;font-size:14px">${experience.price} lei</p>
          </div>
        `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat(experience.coordinates)
        .setPopup(popup)
        .addTo(map.current);

      el.addEventListener('click', () => {
        onExperienceClick?.(experience.id);
      });

      markersRef.current.push(marker);
    });

    // Fit map to show all markers
    if (experiences.length > 0 && map.current) {
      const coords = experiences
        .filter(e => e.coordinates)
        .map(e => e.coordinates!);

      if (coords.length === 1) {
        map.current.flyTo({ center: coords[0], zoom: 12 });
      } else if (coords.length > 1) {
        const bounds = coords.reduce(
          (b, c) => b.extend(c),
          new mapboxgl.LngLatBounds(coords[0], coords[0])
        );
        map.current.fitBounds(bounds, { padding: 60, maxZoom: 13 });
      }
    }
  }, [experiences, mapboxToken, onExperienceClick]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-xl">
        <div className="text-center p-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-muted-foreground">Se încarcă harta...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-xl">
        <div className="text-center p-8 max-w-sm">
          <MapPin className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium text-foreground mb-1">Hartă indisponibilă</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground mt-3 bg-muted-foreground/10 rounded p-2">
            Adaugă <code>MAPBOX_TOKEN</code> în Supabase → Project Settings → Edge Functions → Secrets
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 rounded-xl shadow-lg" />
      {experiences.length === 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-muted-foreground shadow">
          Nu există experiențe cu coordonate GPS
        </div>
      )}
    </div>
  );
};

export default Map;
