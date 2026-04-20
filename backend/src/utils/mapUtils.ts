export async function extractGoogleMapsCoords(url: string): Promise<{ lat: number, lng: number } | null> {
  if (!url || typeof url !== 'string') return null;

  try {
    let finalUrl = url;
    
    // If it's a shortlink, we need to resolve it by fetching and getting the final URL.
    if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
      const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      if (response.url) {
        finalUrl = response.url;
      } else {
        // Fallback to GET if HEAD didn't yield a location
        const responseGet = await fetch(url, { redirect: 'follow' });
        finalUrl = responseGet.url;
      }
    }

    // Attempt to match the @lat,lng format
    const atMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    }

    // Attempt to match data=!3dLat!4dLng
    const dataMatch = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (dataMatch) {
      return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) };
    }

    // Attempt to match embed/iframe format !2dLng!3dLat
    const embedMatch = finalUrl.match(/!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/);
    if (embedMatch) {
      // In embed !2d is Longitude, !3d is Latitude
      return { lat: parseFloat(embedMatch[2]), lng: parseFloat(embedMatch[1]) };
    }

    // Attempt to match query param ll=lat,lng
    const llMatch = finalUrl.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (llMatch) {
      return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
    }

    // Attempt to match query param q=lat,lng
    const qMatch = finalUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch) {
      return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
    }

    return null;
  } catch (error) {
    console.error('[mapUtils] Failed to extract coordinates for URL:', url, error);
    return null;
  }
}
