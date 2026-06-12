import React from "react";
import { Briefcase, FileText, Wallet, Building2, Lightbulb, Users } from "lucide-react";

const services = [
  { icon: Briefcase, title: "Λογιστική υποστήριξη",
    items: ["Τήρηση βιβλίων Β' & Γ' κατηγορίας", "Καταχωρήσεις παραστατικών", "Συμφωνίες τραπεζικών λογαριασμών", "Μηνιαία οικονομικά reports"] },
  { icon: FileText, title: "Φορολογικές δηλώσεις",
    items: ["Δηλώσεις Ε1, Ε2, Ε3, Ε9", "Δηλώσεις νομικών προσώπων", "Δηλώσεις ΦΠΑ & VIES", "Αντιμετώπιση ελέγχων"] },
  { icon: Wallet, title: "Μισθοδοσία",
    items: ["Σύνταξη μισθοδοτικής κατάστασης", "Υποβολή ΑΠΔ", "Διαχείριση αδειών & ασθενειών", "Αναγγελίες ΕΡΓΑΝΗ"] },
  { icon: Building2, title: "Σύσταση επιχειρήσεων",
    items: ["Επιλογή νομικής μορφής", "Διεκπεραίωση στο ΓΕΜΗ", "Έναρξη ΔΟΥ", "Φορολογικές & ασφαλιστικές υποχρεώσεις"] },
  { icon: Lightbulb, title: "Συμβουλευτικές υπηρεσίες",
    items: ["Φορολογικός σχεδιασμός", "Business plans", "Cash flow management", "Χρηματοδοτικά προγράμματα"] },
  { icon: Users, title: "Εργασιακά θέματα",
    items: ["Συμβάσεις εργασίας", "Προσλήψεις & αποχωρήσεις", "Εργατικές διαφορές", "Συμβουλευτική σε εργοδότες"] },
];

export default function Services() {
  return (
    <div data-testid="services-page" className="bg-white">
      <section className="bg-[#1E3A8A] text-white">
        <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto py-24 md:py-32">
          <div className="text-[10px] uppercase tracking-[0.3em] text-blue-200 mb-4">— Υπηρεσίες</div>
          <h1 className="font-serif-display text-4xl md:text-5xl lg:text-6xl leading-tight max-w-3xl">
            Πλήρες φάσμα λογιστικών &<br />φοροτεχνικών υπηρεσιών.
          </h1>
          <p className="mt-6 max-w-2xl text-blue-100 leading-relaxed">
            Καλύπτουμε κάθε ανάγκη της επιχείρησής σας — από την καθημερινή λογιστική έως τη στρατηγική φορολογική συμβουλευτική.
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-white">
        <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto grid md:grid-cols-2 gap-px bg-slate-200">
          {services.map((s, i) => (
            <div key={i} data-testid={`service-detail-${i}`} className="bg-white p-8 md:p-12">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 bg-[#1E3A8A] text-white flex items-center justify-center shrink-0">
                  <s.icon size={24} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <h3 className="font-serif-display text-2xl md:text-3xl text-slate-900">{s.title}</h3>
                  <ul className="mt-5 space-y-2.5">
                    {s.items.map((it, j) => (
                      <li key={j} className="flex items-start gap-3 text-sm text-slate-700">
                        <span className="w-1 h-1 bg-[#1E3A8A] mt-2.5 shrink-0" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
