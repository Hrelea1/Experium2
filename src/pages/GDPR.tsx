import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const GDPR = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <main className="container pt-28 pb-16 max-w-4xl prose prose-neutral dark:prose-invert">
      <h1>Acord de Prelucrare a Datelor cu Caracter Personal</h1>
      <p className="text-muted-foreground mb-8">Data Processing Agreement (DPA) — Anexă la Contractul de Parteneriat</p>
      
      <p>Prezentul Acord de Prelucrare a Datelor (DPA) se încheie între EXPERIUM SRL („Operatorul”) și Partenerul identificat în Contractul de Parteneriat („Împuternicitul”) și face parte integrantă din acel contract.</p>

      <h2>1. Definiții și roluri</h2>
      <ul>
        <li><strong>Operator:</strong> EXPERIUM SRL — stabilește scopurile și mijloacele prelucrării datelor clienților platformei</li>
        <li><strong>Împuternicit:</strong> Partenerul — prelucrează datele clienților exclusiv pentru prestarea experienței rezervate, în numele și la instrucțiunile Operatorului</li>
        <li><strong>Date prelucrate:</strong> Nume, prenume, telefon, email, detalii rezervare (data, număr persoane, cerințe speciale)</li>
        <li><strong>Scopul prelucrării:</strong> Exclusiv prestarea experienței rezervate de clientul final prin platforma Experium</li>
        <li><strong>Durata prelucrării:</strong> Pe durata Contractului de Parteneriat + 30 de zile pentru ștergerea datelor după încetare</li>
      </ul>

      <h2>2. Obligațiile Împuternicitului (Partenerului)</h2>
      <p>Partenerul, în calitate de împuternicit, se obligă:</p>
      <ul>
        <li>să prelucreze datele cu caracter personal ale clienților exclusiv în scopul prestării experienței rezervate și numai la instrucțiunile documentate ale Experium;</li>
        <li>să nu transfere, vândă, dezvăluie sau utilizeze datele clienților în alte scopuri (marketing propriu, contactare directă pentru rezervări viitoare, cesionare către terți);</li>
        <li>să implementeze măsuri tehnice și organizatorice adecvate pentru protejarea datelor împotriva accesului neautorizat, pierderii sau distrugerii;</li>
        <li>să nu angajeze sub-împuterniciți (terți care accesează datele clienților) fără acordul scris prealabil al Experium;</li>
        <li>să șteargă sau să returneze toate datele cu caracter personal primite de la Experium în termen de 30 de zile de la încetarea Contractului de Parteneriat;</li>
        <li>să notifice Experium în termen de 24 de ore de la descoperirea oricărui incident de securitate care implică datele clienților Experium;</li>
        <li>să acorde Experium dreptul de audit al modului de prelucrare a datelor, la cerere motivată cu preaviz de 14 zile;</li>
        <li>să asiste Experium în onorarea drepturilor persoanelor vizate (acces, ștergere, rectificare) atunci când acestea privesc date aflate în posesia Partenerului.</li>
      </ul>

      <h2>3. Răspundere și sancțiuni</h2>
      <ul>
        <li><strong>3.1</strong> Orice încălcare a prezentului DPA de către Partener care conduce la o amendă aplicată Experium de către ANSPDCP sau la daune plătite clienților va fi recuperată integral de la Partener.</li>
        <li><strong>3.2</strong> Partenerul este direct răspunzător față de ANSPDCP și față de persoanele vizate pentru prelucrările efectuate în afara instrucțiunilor Experium sau cu încălcarea prezentului DPA.</li>
        <li><strong>3.3</strong> Încălcarea prezentului DPA constituie motiv de reziliere imediată a Contractului de Parteneriat, fără obligația Experium de a acorda termen de remediere.</li>
      </ul>

      <h2>4. Semnătura</h2>
      <p className="mb-8">Prezentul DPA a fost înțeles și acceptat de ambele Părți prin semnarea Contractului de Parteneriat din care face parte integrantă.</p>

      <div className="grid grid-cols-2 gap-8 mt-12">
        <div>
          <p className="font-bold">EXPERIUM SRL — Operator</p>
          <div className="h-24 border-b-2 border-dashed border-gray-300 mt-4 mb-2"></div>
          <p className="text-sm text-muted-foreground">Semnătura autorizată / Ștampila</p>
        </div>
        <div>
          <p className="font-bold">PARTENER — Împuternicit</p>
          <div className="h-24 border-b-2 border-dashed border-gray-300 mt-4 mb-2"></div>
          <p className="text-sm text-muted-foreground">Semnătura autorizată / Ștampila</p>
        </div>
      </div>

      <div className="mt-16 p-4 bg-muted/50 rounded-lg text-sm text-center">
        <p className="font-semibold text-destructive mb-2">Notă internă (Draft)</p>
        <p>Acest document este un draft și trebuie revizuit de un avocat specializat în GDPR înainte de publicare.</p>
        <p className="mt-2 font-medium">Experium SRL — gdpr@experium.ro — www.experium.ro</p>
      </div>
    </main>
    <Footer />
  </div>
);

export default GDPR;
