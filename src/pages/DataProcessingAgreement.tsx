import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';

export default function DataProcessingAgreement() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-grow container max-w-4xl py-24">
        <h1 className="text-3xl font-bold mb-8">Acord de Prelucrare a Datelor (DPA)</h1>
        
        <Card>
          <CardContent className="pt-6 space-y-8">
            <div className="bg-muted p-4 rounded-lg">
              <h2 className="font-semibold text-lg text-primary">Data Processing Agreement (DPA) — Anexa la Contractul de Parteneriat</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Prezentul Acord de Prelucrare a Datelor (DPA) se incheie intre EXPERIUM SRL ("Operatorul") si Partenerul identificat in Contractul de Parteneriat ("Imputernicitul") si face parte integranta din acel contract.
              </p>
            </div>

            <section>
              <h2 className="text-xl font-semibold mb-4">1. Definitii si roluri</h2>
              <div className="space-y-4">
                <div className="grid md:grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div className="font-medium">Operator</div>
                  <div className="md:col-span-3 text-muted-foreground"><strong>EXPERIUM SRL</strong> — stabileste scopurile si mijloacele prelucrarii datelor clientilor platformei</div>
                </div>
                <div className="grid md:grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div className="font-medium">Imputernicit</div>
                  <div className="md:col-span-3 text-muted-foreground"><strong>Partenerul</strong> — prelucreaza datele clientilor exclusiv pentru prestarea experientei rezervate, in numele si la instructiunile Operatorului</div>
                </div>
                <div className="grid md:grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div className="font-medium">Date prelucrate</div>
                  <div className="md:col-span-3 text-muted-foreground">Nume, prenume, telefon, email, detalii rezervare (data, numar persoane, cerinte speciale)</div>
                </div>
                <div className="grid md:grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div className="font-medium">Scopul prelucrarii</div>
                  <div className="md:col-span-3 text-muted-foreground">Exclusiv prestarea experientei rezervate de clientul final prin platforma Experium</div>
                </div>
                <div className="grid md:grid-cols-4 gap-4 p-4 border rounded-lg">
                  <div className="font-medium">Durata prelucrarii</div>
                  <div className="md:col-span-3 text-muted-foreground">Pe durata Contractului de Parteneriat + 30 de zile pentru stergerea datelor dupa incetare</div>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Obligatiile Imputernicitului (Partenerului)</h2>
              <p className="mb-3 font-medium">Partenerul, in calitate de imputernicit, se obliga:</p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>sa prelucreze datele cu caracter personal ale clientilor exclusiv in scopul prestarii experientei rezervate si numai la instructiunile documentate ale Experium;</li>
                <li>sa nu transfere, vanda, dezvaluie sau utilizeze datele clientilor in alte scopuri (marketing propriu, contactare directa pentru rezervari viitoare, cesionare catre terti);</li>
                <li>sa implementeze masuri tehnice si organizatorice adecvate pentru protejarea datelor impotriva accesului neautorizat, pierderii sau distrugerii;</li>
                <li>sa nu angajeze sub-imputerniciti (terti care acceseaza datele clientilor) fara acordul scris prealabil al Experium;</li>
                <li>sa stearga sau sa returneze toate datele cu caracter personal primite de la Experium in termen de 30 de zile de la incetarea Contractului de Parteneriat;</li>
                <li>sa notifice Experium in termen de 24 de ore de la descoperirea oricarui incident de securitate care implica datele clientilor Experium;</li>
                <li>sa acorde Experium dreptul de audit al modului de prelucrare a datelor, la cerere motivata cu preaviz de 14 zile;</li>
                <li>sa asiste Experium in onorarea drepturilor persoanelor vizate (acces, stergere, rectificare) atunci cand acestea privesc date aflate in posesia Partenerului.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Raspundere si sanctiuni</h2>
              <ul className="space-y-4 text-muted-foreground list-none">
                <li><strong>3.1</strong> Orice incalcare a prezentului DPA de catre Partener care conduce la o amenda aplicata Experium de catre ANSPDCP sau la daune platite clientilor va fi recuperata integral de la Partener.</li>
                <li><strong>3.2</strong> Partenerul este direct raspunzator fata de ANSPDCP si fata de persoanele vizate pentru prelucrarile efectuate in afara instructiunilor Experium sau cu incalcarea prezentului DPA.</li>
                <li><strong>3.3</strong> Incalcarea prezentului DPA constituie motiv de reziliere imediata a Contractului de Parteneriat, fara obligatia Experium de a acorda termen de remediere.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Semnatura</h2>
              <p className="text-muted-foreground mb-6">
                Prezentul DPA a fost inteles si acceptat de ambele Parti prin semnarea Contractului de Parteneriat din care face parte integranta.
              </p>
              
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="p-6 border rounded-lg space-y-12">
                  <p className="font-semibold text-center uppercase tracking-wide">EXPERIUM SRL — Operator</p>
                  <div className="border-t border-dashed border-gray-400 pt-2 text-center text-sm text-muted-foreground">
                    Semnatura autorizata / Stampila
                  </div>
                </div>
                <div className="p-6 border rounded-lg space-y-12">
                  <p className="font-semibold text-center uppercase tracking-wide">PARTENER — Imputernicit</p>
                  <div className="border-t border-dashed border-gray-400 pt-2 text-center text-sm text-muted-foreground">
                    Semnatura autorizata / Stampila
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 text-sm text-center">
                <p className="font-medium mb-1">Acest document este un draft si trebuie revizuit de un avocat specializat in GDPR inainte de publicare.</p>
                <p className="text-muted-foreground">Experium SRL — gdpr@experium.ro — www.experium.ro</p>
              </div>
            </section>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
