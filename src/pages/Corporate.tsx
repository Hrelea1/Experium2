import { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2, Users, Gift, Ticket, CheckCircle, Send, ArrowRight,
  FileText, CreditCard, Mail, Phone, UserCheck, Star, Sparkles,
  ClipboardList, ThumbsUp, Receipt, Bell, PartyPopper, BarChart3
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
    color: "from-violet-500 to-purple-600",
    bgLight: "bg-violet-50 dark:bg-violet-950/30",
    border: "border-violet-200 dark:border-violet-800",
    title: "Team Building",
    subtitle: "Experiențe de grup pentru echipa ta",
    desc: "Selectezi experiența, stabilești data și numărul de persoane. Experium filtrează automat doar ofertele cu capacitate de grup disponibilă. O singură factură pe CUI-ul companiei.",
    examples: ["Paintball & karting", "Ateliere de gătit în echipă", "Escape rooms", "Rafting & aventură"],
  },
  {
    id: "voucher",
    icon: Ticket,
    color: "from-amber-500 to-orange-500",
    bgLight: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    title: "Beneficii Angajați",
    subtitle: "Voucher cu valoare fixă pentru fiecare angajat",
    desc: "Compania stabilește bugetul per angajat (ex. 500 RON). Fiecare angajat primește un voucher personal și își alege singur experiența preferată de pe platformă.",
    examples: ["Spa & wellness", "Gastronomie & degustări", "Aventură & sport", "Cultură & ateliere"],
  },
  {
    id: "gifting",
    icon: Gift,
    color: "from-rose-500 to-pink-600",
    bgLight: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-rose-200 dark:border-rose-800",
    title: "Client Gifting",
    subtitle: "Experiențe personalizate cadou",
    desc: "Oferă clienților sau partenerilor tăi o experiență memorabilă. Cutii-cadou personalizate, o zi la spa, sau experiența lunii pentru angajatul de top – totul livrat elegant.",
    examples: ["Cutii-cadou experiență", "Zi la spa premium", "Angajatul lunii", "Cadouri parteneri business"],
  },
];

const steps = [
  { icon: ClipboardList, label: "Alege tipul nevoii", sub: "Team Building / Beneficii / Gifting" },
  { icon: UserCheck, label: "Configurare grup", sub: "Nr. persoane, buget, dată" },
  { icon: Sparkles, label: "Filtru automat", sub: "Doar experiențe cu capacitate de grup" },
  { icon: ThumbsUp, label: "Aprobare manager", sub: "Email cu un singur click" },
  { icon: Receipt, label: "Plată & factură", sub: "CUI companie, o singură factură" },
  { icon: Bell, label: "Invitații angajați", sub: "Link personal, detalii, reminder" },
  { icon: PartyPopper, label: "Experiența are loc", sub: "Furnizorul primește briefingul" },
  { icon: BarChart3, label: "Raport post-experiență", sub: "Review colectiv, recomandări" },
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
    // Simulate API call
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
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="relative py-20 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-violet-500/5 to-background pointer-events-none" />
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          <div className="container relative z-10 max-w-4xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6 border border-primary/20">
                <Building2 className="w-4 h-4" />
                Experium pentru Companii
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground mb-6 leading-tight">
                Angajații tăi merită{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">
                  mai mult decât un bonus.
                </span>
              </h1>
              <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
                Oferă-le experiențe pe care nu le vor uita. Team building, vouchere personale sau cadouri de business — totul pe o singură platformă, cu factură pe CUI și zero birocrație.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={() => document.getElementById("corporate-form")?.scrollIntoView({ behavior: "smooth" })}>
                  <Send className="w-4 h-4 mr-2" />
                  Solicită o ofertă
                </Button>
                <Button size="lg" variant="outline" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
                  Cum funcționează
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── 3 Categorii ──────────────────────────────────────── */}
        <section className="py-16 lg:py-24">
          <div className="container">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-3">3 tipuri de nevoi. O singură platformă.</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">Alege ce se potrivește companiei tale. Fiecare categorie vine cu un flux dedicat și factură automată.</p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {categories.map((cat, i) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                >
                  <Card className={`h-full border-2 ${cat.border} hover:shadow-xl transition-all duration-300 group overflow-hidden`}>
                    <CardHeader className="pb-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                        <cat.icon className="w-7 h-7 text-white" />
                      </div>
                      <CardTitle className="text-xl">{cat.title}</CardTitle>
                      <CardDescription className="font-medium text-foreground/70">{cat.subtitle}</CardDescription>
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
                        className="w-full mt-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
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

        {/* ── Cum funcționează ─────────────────────────────────── */}
        <section id="how-it-works" className="py-16 lg:py-24 bg-muted/30">
          <div className="container">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
              <h2 className="text-3xl font-bold mb-3">Cum funcționează?</h2>
              <p className="text-muted-foreground">De la idee la experiență — fără complicații.</p>
            </motion.div>

            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {steps.map((step, i) => (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="relative text-center group"
                  >
                    {/* Connector line */}
                    {i < steps.length - 1 && i % 4 !== 3 && (
                      <div className="hidden md:block absolute top-6 left-1/2 w-full h-0.5 bg-primary/20 z-0" />
                    )}
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mb-3 group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                        <step.icon className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {i + 1}
                      </div>
                      <p className="text-xs font-semibold text-foreground leading-tight mb-1">{step.label}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight">{step.sub}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Beneficii ────────────────────────────────────────── */}
        <section className="py-16 lg:py-24">
          <div className="container">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
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
                  <Card className="h-full hover:shadow-lg hover:border-primary/30 transition-all duration-300">
                    <CardHeader>
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                        <b.icon className="w-5 h-5 text-primary" />
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

        {/* ── Formular cerere ──────────────────────────────────── */}
        <section id="corporate-form" className="py-16 lg:py-24 bg-muted/30">
          <div className="container max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
              <h2 className="text-3xl font-bold mb-3">Solicită o ofertă personalizată</h2>
              <p className="text-muted-foreground">Completează formularul și un specialist Experium te va contacta în maxim 24 ore.</p>
            </motion.div>

            <Card className="shadow-lg border-border/60">
              <CardContent className="p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Numele companiei *</Label>
                      <Input id="company_name" name="company_name" value={formData.company_name} onChange={handleChange} required placeholder="SC Exemplu SRL" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cui">CUI *</Label>
                      <Input id="cui" name="cui" value={formData.cui} onChange={handleChange} required placeholder="RO12345678" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_name">Persoana de contact *</Label>
                    <Input id="contact_name" name="contact_name" value={formData.contact_name} onChange={handleChange} required placeholder="Andreea Popescu – HR Manager" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="hr@companie.ro" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefon *</Label>
                      <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} required placeholder="+40 721 234 567" />
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
                      <Input id="employees_count" name="employees_count" type="number" value={formData.employees_count} onChange={handleChange} placeholder="ex: 50" min="1" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="budget">Buget estimat (RON)</Label>
                      <Input id="budget" name="budget" value={formData.budget} onChange={handleChange} placeholder="ex: 5.000 RON" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Mesaj / detalii suplimentare</Label>
                    <Textarea id="message" name="message" value={formData.message} onChange={handleChange} rows={4} placeholder="Descrie pe scurt ce îți dorești pentru echipa ta..." />
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
