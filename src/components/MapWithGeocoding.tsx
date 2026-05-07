import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Loader2, MapPin } from 'lucide-react';
import { api } from '@/lib/api';

interface Experience {
  id: number | string;
  title: string;
  location: string;
  price: number;
  image?: string;
  coordinates?: [number, number]; // [lng, lat]
}

interface MapProps {
  experiences: Experience[];
  userLocation?: [number, number];
  onExperienceClick?: (experienceId: number | string) => void;
}

// Geocode a location name using the Mapbox Geocoding API
async function geocodeLocation(
  locationName: string,
  mapboxToken: string
): Promise<[number, number] | null> {
  if (!locationName || !mapboxToken) return null;
  try {
    const query = encodeURIComponent(`${locationName}, Romania`);
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${mapboxToken}&limit=1&country=ro`
    );
    if (!res.ok) return null;
    const json = await res.json();
    const feature = json.features?.[0];
    if (!feature?.center) return null;
    return feature.center as [number, number]; // [lng, lat]
  } catch {
    return null;
  }
}

const MapWithGeocoding = ({ experiences, userLocation, onExperienceClick }: MapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Resolved experiences: those with coordinates (from DB or geocoded)
  const [resolvedExperiences, setResolvedExperiences] = useState<(Experience & { coordinates: [number, number] })[]>([]);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const envToken = import.meta.env.VITE_MAPBOX_TOKEN;
        if (envToken) {
          setMapboxToken(envToken);
          setLoading(false);
          return;
        }
        const { token } = await api.config.getMapboxToken();
        if (token) {
          setMapboxToken(token);
        } else {
          setError('Token Mapbox lipsă. Adaugă VITE_MAPBOX_TOKEN în .env');
        }
      } catch {
        setError('Eroare la încărcarea hărții.');
      } finally {
        setLoading(false);
      }
    };
    fetchToken();
  }, []);

  // Geocode experiences that don't have coordinates
  useEffect(() => {
    if (!mapboxToken || experiences.length === 0) return;

    const resolve = async () => {
      const results: (Experience & { coordinates: [number, number] })[] = [];

      for (const exp of experiences) {
        if (exp.coordinates) {
          results.push(exp as Experience & { coordinates: [number, number] });
        } else if (exp.location) {
          const coords = await geocodeLocation(exp.location, mapboxToken);
          if (coords) {
            results.push({ ...exp, coordinates: coords });
          }
        }
      }

      setResolvedExperiences(results);
    };

    resolve();
  }, [experiences, mapboxToken]);

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

  // Add/update experience markers
  useEffect(() => {
    if (!map.current || !mapboxToken || resolvedExperiences.length === 0) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    resolvedExperiences.forEach((experience) => {
      if (!map.current) return;

      const el = document.createElement('div');
      el.style.cssText = `
        width: 36px; height: 36px;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
      `;
      
      const innerEl = document.createElement('div');
      innerEl.style.cssText = `
        width: 100%; height: 100%; border-radius: 50%;
        background: hsl(16, 85%, 55%); border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        transition: transform 0.2s; transform-origin: center;
      `;
      el.appendChild(innerEl);

      el.addEventListener('mouseenter', () => { innerEl.style.transform = 'scale(1.15)'; });
      el.addEventListener('mouseleave', () => { innerEl.style.transform = 'scale(1)'; });

      // Popup with clickable link
      const popupHtml = `
        <div style="padding:12px;min-width:180px;font-family:inherit">
          ${experience.image
            ? `<img src="${experience.image}" alt="" style="width:100%;height:90px;object-fit:cover;border-radius:6px;margin-bottom:8px" />`
            : ''
          }
          <h3 style="font-weight:700;margin:0 0 4px;font-size:14px;line-height:1.3">${experience.title}</h3>
          <p style="color:#888;font-size:12px;margin:0 0 6px">${experience.location}</p>
          <p style="color:hsl(16,85%,50%);font-weight:700;margin:0 0 10px;font-size:15px">${experience.price} lei</p>
          <a
            href="#/experience/${experience.id}"
            style="display:block;text-align:center;background:hsl(16,85%,55%);color:white;padding:7px 12px;border-radius:6px;font-size:13px;font-weight:600;text-decoration:none"
            onclick="event.stopPropagation()"
          >
            Vezi experiența →
          </a>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 22, closeButton: true, maxWidth: '220px' })
        .setHTML(popupHtml);

      const marker = new mapboxgl.Marker(el)
        .setLngLat(experience.coordinates)
        .setPopup(popup)
        .addTo(map.current);

      // Click on marker opens popup AND navigates
      el.addEventListener('click', () => {
        onExperienceClick?.(experience.id);
      });

      markersRef.current.push(marker);
    });

    // Fit map to markers
    if (resolvedExperiences.length > 0 && map.current) {
      const coords = resolvedExperiences.map(e => e.coordinates);

      if (coords.length === 1) {
        map.current.flyTo({ center: coords[0], zoom: 12 });
      } else {
        const bounds = coords.reduce(
          (b, c) => b.extend(c),
          new mapboxgl.LngLatBounds(coords[0], coords[0])
        );
        map.current.fitBounds(bounds, { padding: 60, maxZoom: 13 });
      }
    }
  }, [resolvedExperiences, mapboxToken, onExperienceClick]);

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
            Adaugă <code>VITE_MAPBOX_TOKEN=...</code> în fișierul <code>.env</code> din rădăcina proiectului.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="absolute inset-0 rounded-xl shadow-lg" />
      {resolvedExperiences.length === 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-muted-foreground shadow flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" />
          Se geocodează locațiile...
        </div>
      )}
    </div>
  );
};

export default MapWithGeocoding;
