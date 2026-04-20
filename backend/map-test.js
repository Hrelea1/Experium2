async function expandAndExtract(shortUrl) {
  try {
    const res = await fetch(shortUrl, { method: 'HEAD', redirect: 'manual' });
    const location = res.headers.get('location') || shortUrl;
    console.log("Location:", location);
    
    // matches @44.4267674,26.1025384 or /data=!3d44.4267674!4d26.1025384
    const atMatch = location.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      console.log("LAT:", atMatch[1], "LNG:", atMatch[2]);
      return;
    }
    const dataMatch = location.match(/3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (dataMatch) {
      console.log("LAT:", dataMatch[1], "LNG:", dataMatch[2]);
      return;
    }
    const llMatch = location.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
     if (llMatch) {
      console.log("LAT:", llMatch[1], "LNG:", llMatch[2]);
      return;
    }
    // query param q=lat,lng
    const qMatch = location.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
     if (qMatch) {
      console.log("LAT:", qMatch[1], "LNG:", qMatch[2]);
      return;
    }
    console.log("No coords found in URL");
  } catch (e) {
    console.error(e);
  }
}

// Test with a sample google maps short URL
// e.g. https://maps.app.goo.gl/1w9RBSzPnv9tqD8E9
expandAndExtract('https://maps.app.goo.gl/wM2oN5k6t4XqP2oR8');
