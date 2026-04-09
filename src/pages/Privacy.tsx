import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const Privacy = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <main className="container pt-28 pb-16 max-w-4xl prose prose-neutral dark:prose-invert">
      <h1>Politica de Confidențialitate</h1>
      <p className="text-muted-foreground mb-8">Data ultimei actualizări: 08.04.2026. Versiunea 1.0</p>
      
      <h2>1. Cine suntem</h2>
      <p>Experium SRL (denumită în continuare "Experium", "noi" sau "platforma") operează site-ul www.experium.ro, un marketplace online care reunește experiențe din întreaga Românie — adrenalină, natură, gourmet și relaxare — permițând utilizatorilor să descopere, rezerve și plătească experiențe direct pe platformă.</p>
      <p>În calitate de operator de date cu caracter personal, Experium SRL prelucrează datele dumneavoastră în conformitate cu Regulamentul (UE) 2016/679 (GDPR) și legislația română aplicabilă.</p>

      <h2>2. Ce date colectăm și de ce</h2>
      
      <h3>2.1 Date colectate la crearea contului:</h3>
      <ul>
        <li><strong>Categorie date:</strong> Nume, prenume, adresă de email, număr de telefon, parolă (criptată)</li>
        <li><strong>Scopul prelucrării:</strong> Crearea și gestionarea contului de utilizator</li>
        <li><strong>Temeiul legal:</strong> Executarea contractului (Art. 6 alin. 1 lit. b GDPR)</li>
        <li><strong>Durata păstrării:</strong> Pe durata existenței contului + 3 ani după ștergere</li>
      </ul>

      <h3>2.2 Date colectate la efectuarea unei rezervări:</h3>
      <ul>
        <li><strong>Categorie date:</strong> Detalii rezervare, date de facturare (nume, adresă, CIF dacă e cazul)</li>
        <li><strong>Scopul prelucrării:</strong> Procesarea rezervării, emiterea facturii, comunicarea cu partenerul</li>
        <li><strong>Temeiul legal:</strong> Executarea contractului (Art. 6 alin. 1 lit. b GDPR)</li>
        <li><strong>Durata păstrării:</strong> 10 ani (obligații contabile legale)</li>
      </ul>

      <h3>2.3 Date de plată:</h3>
      <ul>
        <li><strong>Categorie date:</strong> Date card bancar (procesate exclusiv prin procesatorul de plăți)</li>
        <li><strong>Scopul prelucrării:</strong> Procesarea plății rezervării</li>
        <li><strong>Temeiul legal:</strong> Executarea contractului (Art. 6 alin. 1 lit. b GDPR)</li>
        <li><strong>Observație:</strong> Experium NU stochează datele cardului. Acestea sunt procesate direct de Stripe, certificat PCI-DSS.</li>
      </ul>

      <h3>2.4 Date de navigare și tehnice:</h3>
      <ul>
        <li><strong>Categorie date:</strong> Adresă IP, tip browser, pagini vizitate, durata sesiunii, sursa accesului</li>
        <li><strong>Scopul prelucrării:</strong> Securitatea platformei, îmbunătățirea experienței de utilizare, statistici</li>
        <li><strong>Temeiul legal:</strong> Interes legitim (Art. 6 alin. 1 lit. f GDPR) / Consimțământ pentru cookies analitice</li>
        <li><strong>Durata păstrării:</strong> 26 luni (date analitice), 12 luni (loguri de securitate)</li>
      </ul>

      <h3>2.5 Date pentru marketing (opțional):</h3>
      <ul>
        <li><strong>Categorie date:</strong> Adresă email, preferințe de experiențe, istoric rezervări</li>
        <li><strong>Scopul prelucrării:</strong> Trimiterea newsletter-ului, oferte personalizate, remarketing</li>
        <li><strong>Temeiul legal:</strong> Consimțământ explicit (Art. 6 alin. 1 lit. a GDPR)</li>
        <li><strong>Durata păstrării:</strong> Până la retragerea consimțământului</li>
        <li><strong>Important:</strong> Consimțământul este opțional și poate fi retras oricând prin link-ul de dezabonare sau prin email la gdpr@experium.ro</li>
      </ul>

      <h2>3. Cu cine împărțim datele dumneavoastră</h2>
      <p>Experium nu vinde datele dumneavoastră cu caracter personal. Datele pot fi transmise următoarelor categorii de destinatari, strict în scopurile descrise:</p>
      <ul>
        <li><strong>Parteneri furnizori de experiențe:</strong> primesc exclusiv datele necesare prestării experienței rezervate (nume, telefon, număr de persoane, data rezervării). Partenerii sunt obligați contractual să nu utilizeze aceste date în alte scopuri.</li>
        <li><strong>Procesator de plăți (Stripe / Netopia):</strong> pentru procesarea securizată a tranzacțiilor. Procesatorul acționează ca operator independent și are propriile politici de confidențialitate.</li>
        <li><strong>Furnizori de servicii tehnice:</strong> găzduire server, platformă email, instrumente analitice (Google Analytics, Meta Pixel, dacă sunt activate prin consimțământ). Aceștia acționează ca împuterniciți ai Experium pe baza unor contracte DPA.</li>
        <li><strong>Autorități publice:</strong> exclusiv în cazul în care suntem obligați prin lege (ex. ANAF, organe de cercetare penală), în limita strictă a obligației legale.</li>
      </ul>

      <h2>4. Transferuri internaționale de date</h2>
      <p>Unii dintre furnizorii noștri tehnici (ex. Google, Meta) pot transfera date în afara Spațiului Economic European. Aceste transferuri se realizează cu garanții adecvate: Clauze Contractuale Standard aprobate de Comisia Europeană sau certificări echivalente. Puteți solicita informații detaliate la office@experium.ro.</p>

      <h2>5. Drepturile dumneavoastră</h2>
      <p>În calitate de persoană vizată, aveți următoarele drepturi garantate de GDPR, pe care le puteți exercita în orice moment prin email la office@experium.ro:</p>
      <ul>
        <li><strong>Dreptul de acces:</strong> Puteți solicita o copie a tuturor datelor pe care le deținem despre dumneavoastră.</li>
        <li><strong>Dreptul la rectificare:</strong> Puteți solicita corectarea datelor incorecte sau incomplete.</li>
        <li><strong>Dreptul la ștergere („dreptul de a fi uitat”):</strong> Puteți solicita ștergerea datelor, cu excepția celor pe care suntem obligați legal să le păstrăm (ex. date contabile).</li>
        <li><strong>Dreptul la restricționarea prelucrării:</strong> Puteți solicita limitarea prelucrării datelor în anumite circumstanțe.</li>
        <li><strong>Dreptul la portabilitate:</strong> Puteți primi datele furnizate de dumneavoastră într-un format structurat, uzual și lizibil de mașină.</li>
        <li><strong>Dreptul la opoziție:</strong> Vă puteți opune prelucrării bazate pe interes legitim sau în scop de marketing direct.</li>
        <li><strong>Dreptul de a retrage consimțământul:</strong> Oricând, fără a afecta legalitatea prelucrării anterioare retragerii.</li>
        <li><strong>Dreptul de a depune o plângere:</strong> Puteți sesiza ANSPDCP la adresa www.dataprotection.ro sau anspdcp@dataprotection.ro.</li>
      </ul>
      <p>Vom răspunde solicitărilor dumneavoastră în termen de maximum 30 de zile calendaristice. În cazuri complexe, termenul poate fi extins cu încă 60 de zile, cu notificarea prealabilă a motivelor.</p>

      <h2>6. Securitatea datelor</h2>
      <p>Experium implementează măsuri tehnice și organizatorice adecvate pentru protecția datelor dumneavoastră:</p>
      <ul>
        <li>Conexiune criptată SSL/TLS pe întregul site</li>
        <li>Parole stocate exclusiv în formă criptată (hashing)</li>
        <li>Acces restricționat la datele cu caracter personal — exclusiv personalul autorizat</li>
        <li>Evaluări periodice ale vulnerabilităților de securitate</li>
        <li>Procedură de notificare a incidentelor de securitate — în cazul unei breșe de date care afectează drepturile și libertățile dumneavoastră, veți fi notificați în termen de 72 de ore de la descoperire, conform Art. 33-34 GDPR</li>
      </ul>

      <h2>7. Modificări ale politicii</h2>
      <p>Această politică poate fi actualizată periodic pentru a reflecta modificări legislative sau operaționale. Data ultimei actualizări este afișată în antetul documentului. Utilizarea continuă a platformei după publicarea modificărilor constituie acceptarea versiunii actualizate. Pentru modificări substanțiale, veți fi notificați prin email.</p>

      <h2>8. Contact</h2>
      <ul>
        <li><strong>Operator de date:</strong> EXPERIUM SRL</li>
        <li><strong>CUI:</strong> 54433844</li>
        <li><strong>Adresă:</strong> Str. 1 Decembrie 1918, nr. 47, Craiova, Dolj, România</li>
        <li><strong>Email GDPR:</strong> office@experium.ro</li>
        <li><strong>Telefon:</strong> +40 732 696 106</li>
        <li><strong>Autoritate de supraveghere:</strong> ANSPDCP — Bd. G-ral. Gheorghe Magheru 28-30, București, www.dataprotection.ro</li>
      </ul>
    </main>
    <Footer />
  </div>
);

export default Privacy;
