import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Briefcase, FileText, Wallet, Building2, Lightbulb, Users, Check } from "lucide-react";

const services = [
  { icon: Briefcase, title: "Λογιστική υποστήριξη", desc: "Πλήρης τήρηση βιβλίων Β' & Γ' κατηγορίας με ακρίβεια και συνέπεια." },
  { icon: FileText, title: "Φορολογικές δηλώσεις", desc: "Σωστή υποβολή δηλώσεων για επιχειρήσεις και ιδιώτες." },
  { icon: Wallet, title: "Μισθοδοσία", desc: "Διαχείριση μισθοδοσίας, ΑΠΔ, ασφαλιστικών εισφορών." },
  { icon: Building2, title: "Σύσταση επιχειρήσεων", desc: "Συμβουλευτική και διεκπεραίωση σύστασης κάθε νομικής μορφής." },
  { icon: Lightbulb, title: "Συμβουλευτικές υπηρεσίες", desc: "Στρατηγική φορολογικού & επιχειρηματικού σχεδιασμού." },
  { icon: Users, title: "Εργασιακά θέματα", desc: "Συμβάσεις, προσλήψεις, αποχωρήσεις και εργατικές διαφορές." },
];

export default function Home() {
  return (
    <div data-testid="home-page">
      {/* Hero */}
      <section className="relative h-[88vh] min-h-[600px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=2400&q=80"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="relative h-full flex items-center px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto">
          <div className="max-w-3xl text-white">
            <div className="animate-fade-up">
              <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-blue-200 mb-6 border border-blue-300/30 px-3 py-1.5">
                <span className="w-1.5 h-1.5 bg-blue-300" /> DM Accounting · Λογιστικό Γραφείο
              </div>
            </div>
            <h1
              data-testid="hero-title"
              className="font-serif-display text-4xl sm:text-5xl lg:text-7xl leading-[1.05] tracking-tight animate-fade-up delay-100"
            >
              Αξιόπιστες λογιστικές<br />
              και φοροτεχνικές<br />
              <span className="italic text-blue-200">υπηρεσίες.</span>
            </h1>
            <p className="mt-7 text-base lg:text-lg text-slate-200 max-w-xl leading-relaxed animate-fade-up delay-200">
              Για επιχειρήσεις και ιδιώτες — με διαφάνεια, εξειδίκευση και προσοχή στη λεπτομέρεια.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3 animate-fade-up delay-300">
              <Link
                to="/contact"
                data-testid="hero-contact-btn"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#1E3A8A] text-xs font-semibold tracking-[0.2em] uppercase hover:bg-blue-50 transition-colors"
              >
                Επικοινωνία <ArrowRight size={14} />
              </Link>
              <Link
                to="/login"
                data-testid="hero-portal-btn"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/60 text-white text-xs font-semibold tracking-[0.2em] uppercase hover:bg-white/10 transition-colors"
              >
                Πελατειακή Σύνδεση
              </Link>
            </div>
          </div>
        </div>

        {/* bottom indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 text-[10px] tracking-[0.3em] uppercase animate-fade-up delay-400">
          Scroll
        </div>
      </section>

      {/* Stats Strip */}
      <section className="border-y border-slate-200 bg-white">
        <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-3 divide-x divide-slate-200">
          {[
            { v: "Cloud", l: "Σύγχρονες Μέθοδοι" },
            { v: "100%", l: "Συμμόρφωση" },
            { v: "24/7", l: "Πρόσβαση Portal" },
          ].map((s, i) => (
            <div key={i} className="px-6 py-10 text-center">
              <div className="font-serif-display text-3xl md:text-4xl text-[#1E3A8A] font-semibold">{s.v}</div>
              <div className="mt-2 text-[10px] uppercase tracking-[0.25em] text-slate-500">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="py-20 md:py-32 bg-[#F5F5F5]" id="services">
        <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto">
          <div className="grid md:grid-cols-12 gap-8 mb-16">
            <div className="md:col-span-5">
              <div className="text-[10px] uppercase tracking-[0.3em] text-[#1E3A8A] font-semibold mb-4">— Υπηρεσίες</div>
              <h2 className="font-serif-display text-3xl md:text-4xl lg:text-5xl text-slate-900 leading-tight">
                Ολοκληρωμένες λύσεις<br />για κάθε ανάγκη.
              </h2>
            </div>
            <div className="md:col-span-6 md:col-start-7 flex items-end">
              <p className="text-slate-600 leading-relaxed">
                Από την καθημερινή λογιστική παρακολούθηση μέχρι τη στρατηγική φοροτεχνική
                συμβουλευτική — προσφέρουμε υπηρεσίες υψηλής ποιότητας προσαρμοσμένες στις
                δικές σας ανάγκες.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200">
            {services.map((s, i) => (
              <div
                key={i}
                data-testid={`service-card-${i}`}
                className="group bg-white p-8 md:p-10 hover:bg-[#1E3A8A] transition-colors duration-300 cursor-default"
              >
                <s.icon size={28} className="text-[#1E3A8A] group-hover:text-white transition-colors" strokeWidth={1.5} />
                <h3 className="mt-6 font-serif-display text-xl md:text-2xl text-slate-900 group-hover:text-white transition-colors">{s.title}</h3>
                <p className="mt-3 text-sm text-slate-600 group-hover:text-blue-100 transition-colors leading-relaxed">{s.desc}</p>
                <div className="mt-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-[#1E3A8A] group-hover:text-white font-semibold">
                  <span>Μάθετε περισσότερα</span>
                  <ArrowRight size={12} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About teaser */}
      <section className="py-20 md:py-32 bg-white">
        <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto grid md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-6 order-2 md:order-1">
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#1E3A8A] font-semibold mb-4">— Σχετικά με Εμάς</div>
            <h2 className="font-serif-display text-3xl md:text-4xl lg:text-5xl text-slate-900 leading-tight">
              Η εμπειρία στην υπηρεσία<br />της επιχείρησής σας.
            </h2>
            <p className="mt-6 text-slate-600 leading-relaxed">
              Το DM Accounting είναι ένα σύγχρονο λογιστικό γραφείο που συνδυάζει τη μακρόχρονη
              επαγγελματική εμπειρία με τις πλέον σύγχρονες μεθόδους ψηφιακής διαχείρισης.
              Στόχος μας είναι να προσφέρουμε στους πελάτες μας — επιχειρήσεις και ιδιώτες — μια
              πλήρως διαφανή και αξιόπιστη συνεργασία.
            </p>
            <ul className="mt-8 space-y-3">
              {["Εξατομικευμένη προσέγγιση","Ψηφιακή διαχείριση & client portal","Πλήρης συμμόρφωση με τη νομοθεσία","Ευελιξία και άμεση εξυπηρέτηση"].map((it, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-700">
                  <span className="w-6 h-6 bg-[#1E3A8A] text-white flex items-center justify-center"><Check size={14} /></span>
                  {it}
                </li>
              ))}
            </ul>
            <Link
              to="/about"
              data-testid="home-about-link"
              className="mt-10 inline-flex items-center gap-2 px-7 py-3.5 bg-[#1E3A8A] text-white text-xs font-semibold tracking-[0.2em] uppercase hover:bg-[#1E40AF] transition-colors"
            >
              Περισσότερα <ArrowRight size={14} />
            </Link>
          </div>
          <div className="md:col-span-6 order-1 md:order-2">
            <img
              src="https://images.unsplash.com/photo-1714974528693-f77f6fcc56af?auto=format&fit=crop&w=1400&q=80"
              alt="DM Accounting Team"
              className="w-full h-[480px] object-cover"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1E3A8A] text-white">
        <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto py-16 md:py-20 grid md:grid-cols-12 gap-8 items-center">
          <div className="md:col-span-8">
            <h3 className="font-serif-display text-3xl md:text-4xl leading-tight">
              Έτοιμοι να ξεκινήσετε;
            </h3>
            <p className="mt-3 text-blue-100 max-w-2xl">
              Επικοινωνήστε μαζί μας ή συνδεθείτε στο portal σας για να δείτε τα οικονομικά σας δεδομένα σε πραγματικό χρόνο.
            </p>
          </div>
          <div className="md:col-span-4 flex flex-col sm:flex-row gap-3 md:justify-end">
            <Link to="/contact" data-testid="cta-contact-btn" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-[#1E3A8A] text-xs font-semibold tracking-[0.2em] uppercase">
              Επικοινωνία
            </Link>
            <Link to="/login" data-testid="cta-portal-btn" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-white text-white text-xs font-semibold tracking-[0.2em] uppercase hover:bg-white/10">
              Σύνδεση
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
