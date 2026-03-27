fetch('https://experium.ro/')
  .then(r => r.text())
  .then(async t => {
    const match = t.match(/src="\/assets\/(index-[^"]+?\.js)"/);
    if (match) {
      console.log('Found JS bundle:', match[1]);
      const res = await fetch('https://experium.ro/assets/' + match[1]);
      const js = await res.text();
      const urls = js.match(/https?:\/\/[^\s"',;()}]+/g) || [];
      const uniqueUrls = [...new Set(urls)];
      console.log('URLs in bundle:');
      console.log(uniqueUrls.filter(u => !u.includes('w3.org') && !u.includes('reactjs') && !u.includes('github') && !u.includes('vitejs')));
    }
  }).catch(e => console.error(e));
