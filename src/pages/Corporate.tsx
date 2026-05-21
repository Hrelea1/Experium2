import { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2, Users, Gift, Ticket, CheckCircle, Send, ArrowRight,
  FileText, CreditCard, Mail, Star,
  ClipboardList, UserCheck, Sparkles, ThumbsUp, Receipt, Bell, PartyPopper, BarChart3,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const categories = [
  {
    id: "teambuilding",
    icon: Users,
    title: "Team Building",
    subtitle: "Experiențe de grup pentru echipa ta",
    desc: "Selectezi experiența, stabilești data și numărul de persoane. Experium filtrează automat doar ofertele cu capacitate de grup disponibilă. O singură factură pe CUI-ul companiei.",
    examples: ["Paintball & karting", "Ateliere de gătit în echipă", "Escape rooms", "Rafting & aventură"],
  },
  {
    id: "voucher",
    icon: Ticket,
    title: "Beneficii Angajați",
    subtitle: "Voucher cu valoare fixă pentru fiecare angajat",
    desc: "Compania stabilește bugetul per angajat (ex. 500 RON). Fiecare angajat primește un voucher personal și își alege singur experiența preferată de pe platformă.",
    examples: ["Spa & wellness", "Gastronomie & degustări", "Aventură & sport", "Cultură & ateliere"],
  },
  {
    id: "gifting",
    icon: Gift,
    title: "Client Gifting",
    subtitle: "Experiențe personalizate cadou",
    desc: "Oferă clienților sau partenerilor tăi o experiență memorabilă. Cutii-cadou personalizate, o zi la spa, sau experiența lunii pentru angajatul de top – totul livrat elegant.",
    examples: ["Cutii-cadou experiență", "Zi la spa premium", "Angajatul lunii", "Cadouri parteneri business"],
  },
];

const steps = [
  { step: "1", label: "Alege tipul nevoii", sub: "Team Building / Beneficii / Gifting" },
  { step: "2", label: "Configurare grup", sub: "Nr. persoane, buget, dată" },
  { step: "3", label: "Filtru automat", sub: "Doar experiențe cu capacitate de grup" },
  { step: "4", label: "Aprobare manager", sub: "Email cu un singur click" },
  { step: "5", label: "Plată & factură", sub: "CUI companie, o singură factură" },
  { step: "6", label: "Invitații angajați", sub: "Link personal, detalii, reminder" },
  { step: "7", label: "Experiența are loc", sub: "Furnizorul primește briefingul" },
  { step: "8", label: "Raport post-experiență", sub: "Review colectiv, recomandări" },
];

const benefits = [
  { icon: FileText, title: "Factură pe CUI", desc: "O singură factură pentru toată echipa, direct pe companie." },
  { icon: CreditCard, title: "Buget controlat", desc: "Stabilești bugetul maxim. Nicio surpriză la final." },
  { icon: Users, title: "Filtru de grup automat", desc: "Vedeți doar experiențele care acceptă grupul vostru." },
  { icon: CheckCircle, title: "Aprobare simplă", desc: "Managerul aprobă cu un singur click pe email." },
  { icon: Star, title: "Raport HR", desc: "Primiți un raport complet după fiecare experiență." },
  { icon: Mail, title: "Invitații automate", desc: "Angajații primesc automat invitația cu toate detaliile." },
];

const Corporate = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    cui: "",
    contact_name: "",
    email: "",
    phone: "",
    need_type: "",
    employees_count: "",
    budget: "",
    message: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    toast({
      title: "Cerere trimisă cu succes! 🎉",
      description: "Echipa noastră de corporate te va contacta în maxim 24 ore.",
    });
    setFormData({ company_name: "", cui: "", contact_name: "", email: "", phone: "", need_type: "", employees_count: "", budget: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20">

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="py-16 lg:py-24 bg-gradient-to-b from-primary/10 to-background">
          <div className="container text-center max-w-3xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
                <Building2 className="w-4 h-4" />
                Experium pentru Companii
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Angajații tăi merită{" "}
                <span className="text-primary">mai mult decât un bonus.</span>
              </h1>
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Oferă-le experiențe pe care nu le vor uita. Team building, vouchere personale sau cadouri de business —
                totul pe o singură platformă, cu factură pe CUI și zero birocrație.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => document.getElementById("corporate-form")?.scrollIntoView({ behavior: "smooth" })}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Solicită o ofertă
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Cum funcționează
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── 3 Categorii ─────────────────────────────────────────── */}
        <section className="py-16 lg:py-24">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-3">3 tipuri de nevoi. O singură platformă.</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Alege ce se potrivește companiei tale. Fiecare categorie vine cu un flux dedicat și factură automată.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {categories.map((cat, i) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                        <cat.icon className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl">{cat.title}</CardTitle>
                      <CardDescription className="font-medium">{cat.subtitle}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground leading-relaxed">{cat.desc}</p>
                      <div className="space-y-2">
                        {cat.examples.map((ex) => (
                          <div key={ex} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                            <span>{ex}</span>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => {
                          const el = document.getElementById("corporate-form");
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                          setFormData(prev => ({ ...prev, need_type: cat.id }));
                        }}
                      >
                        Solicită ofertă
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Cum funcționează ─────────────────────────────────────── */}
        <section id="how-it-works" className="py-16 lg:py-24 bg-muted/30">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-3">Cum funcționează?</h2>
              <p className="text-muted-foreground">De la idee la experiență — fără complicații.</p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
              {steps.map((step, i) => (
                <motion.div
                  key={step.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="text-center"
                >
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground text-xl font-bold flex items-center justify-center mx-auto mb-3">
                    {step.step}
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.sub}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Beneficii ────────────────────────────────────────────── */}
        <section className="py-16 lg:py-24">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-3">De ce aleg companiile Experium?</h2>
              <p className="text-muted-foreground">Totul gândit pentru nevoile unui departament HR modern.</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {benefits.map((b, i) => (
                <motion.div
                  key={b.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                        <b.icon className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-base">{b.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{b.desc}</CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Formular cerere ──────────────────────────────────────── */}
        <section id="corporate-form" className="py-16 lg:py-24 bg-muted/30">
          <div className="container max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-10"
            >
              <h2 className="text-3xl font-bold mb-3">Solicită o ofertă personalizată</h2>
              <p className="text-muted-foreground">
                Completează formularul și un specialist Experium te va contacta în maxim 24 ore.
              </p>
            </motion.div>

            <Card>
              <CardContent className="p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Numele companiei *</Label>
                      <Input
                        id="company_name"
                        name="company_name"
                        value={formData.company_name}
                        onChange={handleChange}
                        required
                        placeholder="SC Exemplu SRL"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cui">CUI *</Label>
                      <Input
                        id="cui"
                        name="cui"
                        value={formData.cui}
                        onChange={handleChange}
                        required
                        placeholder="RO12345678"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Persoana de contact *</Label>
                    <Input
                      id="contact_name"
                      name="contact_name"
                      value={formData.contact_name}
                      onChange={handleChange}
                      required
                      placeholder="Andreea Popescu – HR Manager"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="hr@companie.ro"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        placeholder="+40 721 234 567"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="need_type">Tipul nevoii *</Label>
                    <select
                      id="need_type"
                      name="need_type"
                      value={formData.need_type}
                      onChange={handleChange}
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Selectează...</option>
                      <option value="teambuilding">Team Building</option>
                      <option value="voucher">Beneficii Angajați (Voucher)</option>
                      <option value="gifting">Client Gifting</option>
                      <option value="multiple">Mai multe tipuri</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employees_count">Număr angajați</Label>
                      <Input
                        id="employees_count"
                        name="employees_count"
                        type="number"
                        value={formData.employees_count}
                        onChange={handleChange}
                        placeholder="ex: 50"
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="budget">Buget estimat (RON)</Label>
                      <Input
                        id="budget"
                        name="budget"
                        value={formData.budget}
                        onChange={handleChange}
                        placeholder="ex: 5.000 RON"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Mesaj / detalii suplimentare</Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Descrie pe scurt ce îți dorești pentru echipa ta..."
                    />
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? "Se trimite..." : (
                      <><Send className="w-4 h-4 mr-2" />Trimite cererea</>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Prin trimiterea acestui formular ești de acord cu prelucrarea datelor conform{" "}
                    <a href="/#/privacy" className="underline hover:text-primary">politicii de confidențialitate</a>.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>

      </main>

      <Footer />
    </div>
  );
};

export default Corporate;
