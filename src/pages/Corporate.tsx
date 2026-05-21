import { useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Building2, Users, Gift, Ticket, CheckCircle, Send, ArrowRight,
  FileText, CreditCard, Mail, Phone, UserCheck, Star, Sparkles,
  ClipboardList, ThumbsUp, Receipt, Bell, PartyPopper, BarChart3,
  TrendingUp, Shield, Zap, Globe, ChevronRight, Award, Heart
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
    gradient: "from-violet-500 via-purple-500 to-indigo-600",
    glow: "shadow-violet-500/25",
    accent: "violet",
    tag: "Cel mai popular",
    title: "Team Building",
    subtitle: "Experiențe de grup pentru echipa ta",
    desc: "Selectezi experiența, stabilești data și numărul de persoane. Experium filtrează automat doar ofertele cu capacitate de grup disponibilă. O singură factură pe CUI-ul companiei.",
    examples: ["Paintball & karting", "Ateliere de gătit în echipă", "Escape rooms", "Rafting & aventură"],
  },
  {
    id: "voucher",
    icon: Ticket,
    gradient: "from-amber-400 via-orange-500 to-rose-500",
    glow: "shadow-orange-500/25",
    accent: "amber",
    tag: "Flexibil",
    title: "Beneficii Angajați",
    subtitle: "Voucher cu valoare fixă pentru fiecare angajat",
    desc: "Compania stabilește bugetul per angajat (ex. 500 RON). Fiecare angajat primește un voucher personal și își alege singur experiența preferată de pe platformă.",
    examples: ["Spa & wellness", "Gastronomie & degustări", "Aventură & sport", "Cultură & ateliere"],
  },
  {
    id: "gifting",
    icon: Gift,
    gradient: "from-rose-500 via-pink-500 to-fuchsia-600",
    glow: "shadow-rose-500/25",
    accent: "rose",
    tag: "Premium",
    title: "Client Gifting",
    subtitle: "Experiențe personalizate cadou",
    desc: "Oferă clienților sau partenerilor tăi o experiență memorabilă. Cutii-cadou personalizate, o zi la spa, sau experiența lunii pentru angajatul de top – totul livrat elegant.",
    examples: ["Cutii-cadou experiență", "Zi la spa premium", "Angajatul lunii", "Cadouri parteneri business"],
  },
];

const steps = [
  { icon: ClipboardList, label: "Alege tipul nevoii", sub: "Team Building / Beneficii / Gifting", color: "from-violet-500 to-purple-600" },
  { icon: UserCheck, label: "Configurare grup", sub: "Nr. persoane, buget, dată", color: "from-blue-500 to-indigo-600" },
  { icon: Sparkles, label: "Filtru automat", sub: "Doar experiențe cu capacitate de grup", color: "from-cyan-500 to-blue-600" },
  { icon: ThumbsUp, label: "Aprobare manager", sub: "Email cu un singur click", color: "from-emerald-500 to-teal-600" },
  { icon: Receipt, label: "Plată & factură", sub: "CUI companie, o singură factură", color: "from-amber-500 to-orange-600" },
  { icon: Bell, label: "Invitații angajați", sub: "Link personal, detalii, reminder", color: "from-orange-500 to-rose-600" },
  { icon: PartyPopper, label: "Experiența are loc", sub: "Furnizorul primește briefingul", color: "from-rose-500 to-pink-600" },
  { icon: BarChart3, label: "Raport post-experiență", sub: "Review colectiv, recomandări", color: "from-primary to-violet-500" },
];

const benefits = [
  { icon: FileText, title: "Factură pe CUI", desc: "O singură factură pentru toată echipa, direct pe companie.", color: "text-violet-500", bg: "bg-violet-500/10" },
  { icon: CreditCard, title: "Buget controlat", desc: "Stabilești bugetul maxim. Nicio surpriză la final.", color: "text-amber-500", bg: "bg-amber-500/10" },
  { icon: Users, title: "Filtru de grup automat", desc: "Vedeți doar experiențele care acceptă grupul vostru.", color: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: CheckCircle, title: "Aprobare simplă", desc: "Managerul aprobă cu un singur click pe email.", color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { icon: Star, title: "Raport HR", desc: "Primiți un raport complet după fiecare experiență.", color: "text-rose-500", bg: "bg-rose-500/10" },
  { icon: Mail, title: "Invitații automate", desc: "Angajații primesc automat invitația cu toate detaliile.", color: "text-primary", bg: "bg-primary/10" },
];

const stats = [
  { value: "500+", label: "Companii partenere", icon: Building2 },
  { value: "50k+", label: "Angajați fericiți", icon: Heart },
  { value: "1200+", label: "Experiențe disponibile", icon: Sparkles },
  { value: "98%", label: "Satisfacție medie", icon: Award },
];

const trustedLogos = [
  "Orange", "BCR", "Lidl", "Dedeman", "Banca Transilvania", "Vodafone"
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
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />

      <main className="pt-20">

        {/* ── HERO ─────────────────────────────────────────────────── */}
        <section className="relative py-24 lg:py-36 overflow-hidden bg-foreground dark:bg-background">
          {/* Background mesh */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(16_85%_60%/0.3)_0%,transparent_50%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(258_90%_66%/0.25)_0%,transparent_55%)] pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(45_90%_55%/0.08)_0%,transparent_70%)] pointer-events-none" />

          {/* Animated orbs */}
          <motion.div
            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl pointer-events-none"
          />
          <motion.div
            animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute -bottom-16 -right-24 w-80 h-80 rounded-full bg-violet-500/20 blur-3xl pointer-events-none"
          />

          {/* Grid overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: "linear-gradient(hsl(30 25% 98%) 1px, transparent 1px), linear-gradient(90deg, hsl(30 25% 98%) 1px, transparent 1px)",
              backgroundSize: "60px 60px"
            }}
          />

          <div className="container relative z-10 max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            >
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-primary/40 bg-primary/10 text-primary text-sm font-semibold mb-8 backdrop-blur-sm"
              >
                <Building2 className="w-4 h-4" />
                Experium pentru Companii
                <span className="ml-1 w-2 h-2 rounded-full bg-primary animate-pulse" />
              </motion.span>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-background dark:text-foreground mb-8 leading-[1.05] tracking-tight">
                Angajații tăi merită{" "}
                <span className="relative inline-block">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-amber-400 to-rose-400">
                    mai mult
                  </span>
                  <motion.span
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-amber-400 to-rose-400 origin-left rounded-full"
                  />
                </span>
                <br />decât un bonus.
              </h1>

              <p className="text-lg sm:text-xl text-background/70 dark:text-foreground/70 mb-12 max-w-2xl mx-auto leading-relaxed">
                Oferă-le experiențe pe care nu le vor uita. Team building, vouchere personale sau cadouri de business —
                totul pe o singură platformă, cu factură pe CUI și zero birocrație.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  className="text-base px-8 h-13 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all duration-300"
                  onClick={() => document.getElementById("corporate-form")?.scrollIntoView({ behavior: "smooth" })}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Solicită o ofertă gratuită
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 h-13 border-background/20 dark:border-foreground/20 text-background dark:text-foreground hover:bg-background/10 dark:hover:bg-foreground/10 hover:scale-105 transition-all duration-300 backdrop-blur-sm"
                  onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Cum funcționează
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>

            {/* Stats row inside hero */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.7 }}
              className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="relative group"
                >
                  <div className="rounded-2xl border border-background/10 dark:border-foreground/10 bg-background/5 dark:bg-foreground/5 backdrop-blur-md p-5 hover:bg-background/10 dark:hover:bg-foreground/10 transition-all duration-300 hover:border-primary/40 hover:-translate-y-1">
                    <stat.icon className="w-5 h-5 text-primary mb-3 mx-auto" />
                    <div className="text-3xl font-extrabold text-background dark:text-foreground mb-1">{stat.value}</div>
                    <div className="text-sm text-background/60 dark:text-foreground/60">{stat.label}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── TRUSTED BY ─────────────────────────────────────────── */}
        <section className="py-10 border-y border-border/50 bg-muted/20 overflow-hidden">
          <div className="container">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-8">
              Utilizat de echipe HR din companii precum
            </p>
            <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-4">
              {trustedLogos.map((logo, i) => (
                <motion.span
                  key={logo}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: i * 0.08 }}
                  viewport={{ once: true }}
                  className="text-lg font-bold text-muted-foreground/50 hover:text-muted-foreground transition-colors duration-300 cursor-default select-none tracking-tight"
                >
                  {logo}
                </motion.span>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3 CATEGORII ─────────────────────────────────────────── */}
        <section className="py-20 lg:py-28">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-widest mb-4 border border-primary/20">
                Soluții Corporate
              </span>
              <h2 className="text-4xl lg:text-5xl font-extrabold mb-4 tracking-tight">
                3 tipuri de nevoi.{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">
                  O singură platformă.
                </span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-lg">
                Alege ce se potrivește companiei tale. Fiecare categorie vine cu un flux dedicat și factură automată.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {categories.map((cat, i) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15, duration: 0.6 }}
                  whileHover={{ y: -8 }}
                  className="group relative"
                >
                  {/* Glow effect behind card */}
                  <div className={`absolute -inset-0.5 rounded-3xl bg-gradient-to-br ${cat.gradient} opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500`} />

                  <div className="relative bg-card border border-border/60 rounded-3xl overflow-hidden h-full shadow-md group-hover:shadow-xl group-hover:border-transparent transition-all duration-500">
                    {/* Top gradient banner */}
                    <div className={`h-1.5 w-full bg-gradient-to-r ${cat.gradient}`} />

                    <div className="p-7">
                      {/* Tag */}
                      <div className="flex items-center justify-between mb-6">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.gradient} flex items-center justify-center shadow-lg ${cat.glow} shadow-xl group-hover:scale-110 transition-transform duration-500`}>
                          <cat.icon className="w-7 h-7 text-white" />
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r ${cat.gradient} text-white`}>
                          {cat.tag}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold mb-1">{cat.title}</h3>
                      <p className="text-sm font-medium text-muted-foreground mb-4">{cat.subtitle}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-6">{cat.desc}</p>

                      {/* Examples */}
                      <div className="space-y-2.5 mb-7">
                        {cat.examples.map((ex) => (
                          <div key={ex} className="flex items-center gap-2.5 text-sm">
                            <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${cat.gradient} flex items-center justify-center flex-shrink-0`}>
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                            <span className="font-medium">{ex}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-gradient-to-r ${cat.gradient} text-white opacity-90 hover:opacity-100 hover:shadow-lg transition-all duration-300 group-hover:shadow-md`}
                        onClick={() => {
                          const el = document.getElementById("corporate-form");
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                          setFormData(prev => ({ ...prev, need_type: cat.id }));
                        }}
                      >
                        Solicită ofertă
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CUM FUNCȚIONEAZĂ ─────────────────────────────────────── */}
        <section id="how-it-works" className="py-20 lg:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-muted/40 via-muted/20 to-transparent pointer-events-none" />
          {/* Decorative circles */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-primary/5 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-primary/5 pointer-events-none" />

          <div className="container relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-widest mb-4 border border-primary/20">
                Flux simplu
              </span>
              <h2 className="text-4xl lg:text-5xl font-extrabold mb-4 tracking-tight">Cum funcționează?</h2>
              <p className="text-muted-foreground text-lg">De la idee la experiență — fără complicații.</p>
            </motion.div>

            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {steps.map((step, i) => (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                    whileHover={{ y: -4 }}
                    className="relative group"
                  >
                    {/* Connector line (desktop only, not after last in row) */}
                    {i % 4 !== 3 && i < steps.length - 1 && (
                      <div className="hidden md:block absolute top-7 left-[calc(50%+24px)] right-[-50%] h-px bg-gradient-to-r from-border to-transparent z-0" />
                    )}

                    <div className="relative z-10 flex flex-col items-center text-center p-4">
                      <div className="relative mb-4">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                          <step.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-foreground text-background text-[10px] font-extrabold flex items-center justify-center ring-2 ring-background">
                          {i + 1}
                        </div>
                      </div>
                      <p className="text-sm font-bold text-foreground leading-tight mb-1">{step.label}</p>
                      <p className="text-xs text-muted-foreground leading-snug">{step.sub}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── BENEFICII ────────────────────────────────────────────── */}
        <section className="py-20 lg:py-28">
          <div className="container">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-widest mb-4 border border-primary/20">
                Avantaje
              </span>
              <h2 className="text-4xl lg:text-5xl font-extrabold mb-4 tracking-tight">
                De ce aleg companiile{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">
                  Experium?
                </span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Totul gândit pentru nevoile unui departament HR modern.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {benefits.map((b, i) => (
                <motion.div
                  key={b.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -4 }}
                  className="group"
                >
                  <div className="h-full bg-card border border-border/60 rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                    <div className={`w-12 h-12 rounded-xl ${b.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <b.icon className={`w-6 h-6 ${b.color}`} />
                    </div>
                    <h3 className="font-bold text-base mb-2">{b.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA BAND ─────────────────────────────────────────────── */}
        <section className="py-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-orange-500 to-amber-400" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(258_90%_66%/0.4)_0%,transparent_60%)]" />
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
              backgroundSize: "40px 40px"
            }}
          />
          <div className="container relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Zap className="w-10 h-10 text-white/80 mx-auto mb-4" />
              <h2 className="text-3xl lg:text-4xl font-extrabold text-white mb-4 tracking-tight">
                Gata să transformi cultura companiei?
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
                Un specialist Experium te contactează în maxim 24 ore cu o propunere personalizată.
              </p>
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 hover:scale-105 font-bold px-10 shadow-xl transition-all duration-300"
                onClick={() => document.getElementById("corporate-form")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Send className="w-4 h-4 mr-2" />
                Solicită oferta ta gratuită
              </Button>
            </motion.div>
          </div>
        </section>

        {/* ── FORMULAR ─────────────────────────────────────────────── */}
        <section id="corporate-form" className="py-20 lg:py-28 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-background pointer-events-none" />
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />

          <div className="container max-w-2xl relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-widest mb-4 border border-primary/20">
                Contact
              </span>
              <h2 className="text-4xl font-extrabold mb-4 tracking-tight">Solicită o ofertă personalizată</h2>
              <p className="text-muted-foreground text-lg">
                Completează formularul și un specialist Experium te va contacta în maxim{" "}
                <span className="text-primary font-semibold">24 ore</span>.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <div className="relative">
                {/* Glow behind form */}
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-primary/20 via-violet-500/10 to-amber-400/10 blur-xl opacity-60" />

                <div className="relative bg-card border border-border/60 rounded-3xl overflow-hidden shadow-2xl">
                  {/* Top accent line */}
                  <div className="h-1 w-full bg-gradient-to-r from-primary via-amber-400 to-violet-500" />

                  <div className="p-8 sm:p-10">
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="company_name" className="text-sm font-semibold">
                            Numele companiei <span className="text-primary">*</span>
                          </Label>
                          <Input
                            id="company_name"
                            name="company_name"
                            value={formData.company_name}
                            onChange={handleChange}
                            required
                            placeholder="SC Exemplu SRL"
                            className="h-11 rounded-xl border-border/60 focus:border-primary transition-colors"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cui" className="text-sm font-semibold">
                            CUI <span className="text-primary">*</span>
                          </Label>
                          <Input
                            id="cui"
                            name="cui"
                            value={formData.cui}
                            onChange={handleChange}
                            required
                            placeholder="RO12345678"
                            className="h-11 rounded-xl border-border/60 focus:border-primary transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contact_name" className="text-sm font-semibold">
                          Persoana de contact <span className="text-primary">*</span>
                        </Label>
                        <Input
                          id="contact_name"
                          name="contact_name"
                          value={formData.contact_name}
                          onChange={handleChange}
                          required
                          placeholder="Andreea Popescu – HR Manager"
                          className="h-11 rounded-xl border-border/60 focus:border-primary transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm font-semibold">
                            Email <span className="text-primary">*</span>
                          </Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="hr@companie.ro"
                            className="h-11 rounded-xl border-border/60 focus:border-primary transition-colors"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone" className="text-sm font-semibold">
                            Telefon <span className="text-primary">*</span>
                          </Label>
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            placeholder="+40 721 234 567"
                            className="h-11 rounded-xl border-border/60 focus:border-primary transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="need_type" className="text-sm font-semibold">
                          Tipul nevoii <span className="text-primary">*</span>
                        </Label>
                        <select
                          id="need_type"
                          name="need_type"
                          value={formData.need_type}
                          onChange={handleChange}
                          required
                          className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
                          style={{ borderColor: "hsl(var(--border))" }}
                        >
                          <option value="">Selectează...</option>
                          <option value="teambuilding">Team Building</option>
                          <option value="voucher">Beneficii Angajați (Voucher)</option>
                          <option value="gifting">Client Gifting</option>
                          <option value="multiple">Mai multe tipuri</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <Label htmlFor="employees_count" className="text-sm font-semibold">Număr angajați</Label>
                          <Input
                            id="employees_count"
                            name="employees_count"
                            type="number"
                            value={formData.employees_count}
                            onChange={handleChange}
                            placeholder="ex: 50"
                            min="1"
                            className="h-11 rounded-xl border-border/60 focus:border-primary transition-colors"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="budget" className="text-sm font-semibold">Buget estimat (RON)</Label>
                          <Input
                            id="budget"
                            name="budget"
                            value={formData.budget}
                            onChange={handleChange}
                            placeholder="ex: 5.000 RON"
                            className="h-11 rounded-xl border-border/60 focus:border-primary transition-colors"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message" className="text-sm font-semibold">Mesaj / detalii suplimentare</Label>
                        <Textarea
                          id="message"
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          rows={4}
                          placeholder="Descrie pe scurt ce îți dorești pentru echipa ta..."
                          className="rounded-xl border-border/60 focus:border-primary transition-colors resize-none"
                        />
                      </div>

                      {/* Submit */}
                      <Button
                        type="submit"
                        className="w-full h-13 text-base font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-[1.02] transition-all duration-300"
                        size="lg"
                        disabled={loading}
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                              className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full inline-block"
                            />
                            Se trimite...
                          </span>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Trimite cererea
                          </>
                        )}
                      </Button>

                      <p className="text-xs text-muted-foreground text-center">
                        Prin trimiterea acestui formular ești de acord cu prelucrarea datelor conform{" "}
                        <a href="/#/privacy" className="underline hover:text-primary transition-colors">politicii de confidențialitate</a>.
                      </p>
                    </form>
                  </div>
                </div>
              </div>

              {/* Trust badges */}
              <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-emerald-500" /> Date securizate</span>
                <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-500" /> Răspuns în 24 ore</span>
                <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-blue-500" /> Zero angajament</span>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Corporate;
