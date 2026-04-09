import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const Cookies = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <main className="container pt-28 pb-16 max-w-4xl prose prose-neutral dark:prose-invert">
      <h1>Politica de Cookies</h1>
      <p className="text-muted-foreground mb-8">Data ultimei actualizări: 08.04.2026. Versiunea 1.0</p>
      
      <h2>1. Ce sunt cookie-urile</h2>
      <p>Cookie-urile sunt fișiere text de mici dimensiuni stocate pe dispozitivul dumneavoastră (calculator, telefon, tabletă) atunci când vizitați un site web. Ele permit site-ului să vă recunoască la vizite ulterioare și să rețină preferințele dumneavoastră.</p>

      <h2>2. Ce tipuri de cookie-uri folosim</h2>
      <div className="overflow-x-auto my-6">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="border-b p-2">Tip cookie</th>
              <th className="border-b p-2">Nume / Furnizor</th>
              <th className="border-b p-2">Scop</th>
              <th className="border-b p-2">Durata</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border-b p-2">Strict necesare</td>
              <td className="border-b p-2">session_id, csrf_token</td>
              <td className="border-b p-2">Funcționarea platformei, securitate, autentificare</td>
              <td className="border-b p-2">Sesiune / 1 an</td>
            </tr>
            <tr>
              <td className="border-b p-2">Funcționale</td>
              <td className="border-b p-2">lang_pref, currency, remember_me</td>
              <td className="border-b p-2">Reținerea preferințelor (limbă, monedă, login)</td>
              <td className="border-b p-2">1 an</td>
            </tr>
            <tr>
              <td className="border-b p-2">Analitice</td>
              <td className="border-b p-2">Google Analytics (_ga, _gid)</td>
              <td className="border-b p-2">Statistici anonime de utilizare a platformei</td>
              <td className="border-b p-2">26 luni</td>
            </tr>
            <tr>
              <td className="border-b p-2">Marketing</td>
              <td className="border-b p-2">Meta Pixel (_fbp), Google Ads</td>
              <td className="border-b p-2">Reclame personalizate, remarketing</td>
              <td className="border-b p-2">90 zile - 2 ani</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>3. Consimțământ și control</h2>
      <ul>
        <li><strong>3.1</strong> Cookie-urile strict necesare sunt activate automat — fără ele platforma nu funcționează corect. Nu necesită consimțământ.</li>
        <li><strong>3.2</strong> Cookie-urile funcționale, analitice și de marketing sunt activate exclusiv pe baza consimțământului dumneavoastră explicit, exprimat prin bannerul de cookies afișat la prima vizită.</li>
        <li><strong>3.3</strong> Puteți modifica sau retrage consimțământul oricând prin:
          <ul>
            <li>Accesarea centrului de preferințe cookies disponibil în footer-ul site-ului (link „Setări cookies”)</li>
            <li>Setările browserului dumneavoastră (ștergere/blocare cookies)</li>
            <li>Opțiunile de dezabonare ale furnizorilor: tools.google.com/dlpage/gaoptout (Google Analytics), www.aboutads.info/choices (rețea de publicitate)</li>
          </ul>
        </li>
      </ul>

      <h2>4. Cookie-uri ale terților</h2>
      <p>Anumite funcționalități ale platformei implică cookie-uri setate de terți (Google, Meta). Acești furnizori au propriile politici de confidențialitate, independente de Experium. Vă încurajăm să le consultați direct.</p>
    </main>
    <Footer />
  </div>
);

export default Cookies;
