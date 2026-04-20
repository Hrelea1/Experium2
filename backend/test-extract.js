const urls = [
  "https://www.google.com/maps/place/Therme+Bucure%C8%99ti/@44.6062143,26.0827237,15z/data=!3m1!4b1!4m6!3m5!1s0x40b201cd9963a6f1:0xa7d22fa97950c0cc!8m2!3d44.6061955!4d26.0831613!16s%2Fg%2F11bzvf6wlx?entry=ttu",
  "<iframe src=\"https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2842.1585633465913!2d26.080586376822262!3d44.60619547107297!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40b201cd9963a6f1%3A0xa7d22fa97950c0cc!2sTherme%20Bucure%C8%99ti!5e0!3m2!1sen!2sro!4v1700000000000!5m2!1sen!2sro\" width=\"600\" height=\"450\" style=\"border:0;\" allowfullscreen=\"\" loading=\"lazy\" referrerpolicy=\"no-referrer-when-downgrade\"></iframe>",
  "https://goo.gl/maps/12345678"
];

function extract(url) {
  let lat = null, lng = null;
  // 1. the /@lat,lng format
  let match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (match) { return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) }; }
  
  // 2. data=!3dLat!4dLng format (mostly in full links)
  match = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (match) { return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) }; }

  // 3. embed pb= format !2dLng!3dLat
  match = url.match(/!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/);
  if (match) { return { lat: parseFloat(match[2]), lng: parseFloat(match[1]) }; }

  return null;
}

urls.forEach(u => console.log(extract(u)));
