import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container pt-28 pb-16 max-w-4xl prose prose-neutral dark:prose-invert">
        <h1>Termeni și Condiții de Utilizare</h1>
        <p className="text-muted-foreground mb-8">Data ultimei actualizări: 08.04.2026. Versiunea 1.0</p>
        
        <h2>1. Acceptarea Termenilor</h2>
        <p>Prin accesarea și utilizarea platformei www.experium.ro, confirmați că ați citit, înțeles și acceptat în totalitate prezenții Termeni și Condiții, împreună cu Politica de Confidențialitate și Politica de Cookies. Dacă nu sunteți de acord cu acești termeni, vă rugăm să nu utilizați platforma.</p>
        <p>Aveți dreptul de a utiliza platforma doar dacă aveți cel puțin 18 ani sau acționați cu consimțământul unui părinte/tutore legal.</p>

        <h2>2. Descrierea Serviciului</h2>
        <p>Experium operează un marketplace online care permite utilizatorilor să descopere, rezerve și plătească experiențe oferite de parteneri terți (furnizorii de experiențe). Experium acționează exclusiv ca intermediar comercial și nu este furnizorul direct al experiențelor.</p>
        <p>Disponibilitatea experiențelor, prețurile și detaliile de prestare sunt stabilite de parteneri. Experium depune eforturi rezonabile pentru a verifica acuratețea informațiilor, dar nu garantează exhaustivitatea sau acuratețea descrierilor furnizate de parteneri.</p>

        <h2>3. Procesul de Rezervare și Plată</h2>
        <ul>
          <li><strong>3.1</strong> Rezervarea devine confirmată exclusiv după procesarea cu succes a plății integrale.</li>
          <li><strong>3.2</strong> Confirmarea rezervării se transmite prin email în maximum 24 de ore de la plată.</li>
          <li><strong>3.3</strong> Prețurile afișate pe platformă includ TVA (dacă este aplicabil) și comisionul de serviciu Experium. Nu există costuri ascunse.</li>
          <li><strong>3.4</strong> Plățile sunt procesate prin procesatori de plăți certificați PCI-DSS. Experium nu stochează date de card bancar.</li>
        </ul>

        <h2>4. Politica de Anulare și Rambursare</h2>
        <p>Politica standard de anulare, dacă nu este specificat altfel pe pagina experienței:</p>
        <ul>
          <li><strong>Anulare cu 72+ ore înainte:</strong> Rambursare integrală a sumei plătite</li>
          <li><strong>Anulare între 24-72 ore înainte:</strong> Rambursare 50% din valoarea rezervării</li>
          <li><strong>Anulare sub 24 ore / neprezentare:</strong> Fără rambursare</li>
          <li><strong>Anulare din vina partenerului:</strong> Rambursare integrală sau reprogramare, la alegerea utilizatorului</li>
          <li><strong>Forță majoră (dovedită):</strong> Reprogramare gratuită sau voucher de valoare egală</li>
        </ul>
        <p>Rambursările se procesează în 5-10 zile lucrătoare de la aprobarea cererii, în funcție de banca emitentă a cardului.</p>

        <h2>5. Răspunderea Experium</h2>
        <ul>
          <li><strong>5.1</strong> Experium nu este răspunzător pentru calitatea, siguranța sau conformitatea experiențelor prestate de parteneri. Răspunderea pentru prestarea efectivă a experienței revine exclusiv partenerului.</li>
          <li><strong>5.2</strong> Experium nu garantează disponibilitatea continuă și neîntreruptă a platformei. Întreruperile planificate pentru mentenanță vor fi anunțate în avans.</li>
          <li><strong>5.3</strong> În limita maximă permisă de lege, răspunderea Experium față de un utilizator pentru un eveniment specific este limitată la valoarea rezervării respective.</li>
        </ul>

        <h2>6. Obligațiile Utilizatorului</h2>
        <p>Prin utilizarea platformei, utilizatorul se obligă:</p>
        <ul>
          <li>să furnizeze informații corecte și complete la înregistrare și rezervare;</li>
          <li>să nu utilizeze platforma în scopuri ilegale sau frauduloase;</li>
          <li>să nu încerce să ocolească sistemul de plată al platformei contactând direct partenerii pentru rezervări;</li>
          <li>să respecte regulamentele și condițiile specifice ale fiecărei experiențe (vârsta minimă, stare de sănătate, echipament necesar);</li>
          <li>să nu posteze recenzii false, conținut ofensator sau informații incorecte pe platformă.</li>
        </ul>

        <h2>7. Recenzii și Conținut Generat de Utilizatori</h2>
        <ul>
          <li><strong>7.1</strong> Recenziile pot fi postate exclusiv de utilizatorii care au finalizat efectiv experiența rezervată prin platformă.</li>
          <li><strong>7.2</strong> Experium își rezervă dreptul de a modera, edita sau elimina orice recenzie care conține informații false, limbaj ofensator, date personale ale terților sau încalcă drepturile de proprietate intelectuală.</li>
          <li><strong>7.3</strong> Prin postarea unei recenzii, utilizatorul acordă Experium o licență neexclusivă, gratuită, de utilizare a conținutului în scopuri de marketing și îmbunătățire a platformei.</li>
        </ul>

        <h2>8. Proprietate Intelectuală</h2>
        <p>Toate elementele platformei — logo, design, texte, fotografii procesate de Experium, software — sunt proprietatea exclusivă a Experium SRL și sunt protejate de legislația privind drepturile de autor. Reproducerea, distribuirea sau utilizarea comercială fără acordul scris al Experium este interzisă.</p>

        <h2>9. Legea Aplicabilă și Litigii</h2>
        <p>Prezenții Termeni și Condiții sunt guvernați de legislația română. Orice litigiu va fi soluționat pe cale amiabilă în termen de 30 de zile. În lipsa unui acord, litigiile vor fi soluționate de instanțele competente din România. Utilizatorii persoane fizice au dreptul de a apela și la platformele de soluționare alternativă a litigiilor (SAL/ODR): <code>ec.europa.eu/consumers/odr</code>.</p>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
