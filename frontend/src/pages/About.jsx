import React from "react";
import { Award, ShieldCheck, Target, HeartHandshake } from "lucide-react";

export default function About() {
  return (
    <div data-testid="about-page" className="bg-white">
      <section className="py-20 md:py-32 bg-white">
        <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto grid md:grid-cols-12 gap-12 items-center">
          <div className="md:col-span-6">
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#1E3A8A] font-semibold mb-4">— Σχετικά με Εμάς</div>
            <h1 className="font-serif-display text-4xl md:text-5xl lg:text-6xl text-slate-900 leading-tight">
              Σύγχρονες μέθοδοι υποστήριξης για κάθε επιχείρηση.
            </h1>
            <p className="mt-7 text-slate-600 leading-relaxed">
              Το DM Accounting είναι ένα σύγχρονο λογιστικό γραφείο που συνδυάζει την επαγγελματική
              γνώση με τις πλέον σύγχρονες ψηφιακές πρακτικές. Αξιοποιούμε cloud εργαλεία,
              ψηφιακή διαχείριση παραστατικών και προσωποποιημένο portal πελατών, ώστε να
              έχετε πάντα πλήρη εικόνα των οικονομικών σας — οποτεδήποτε, από οπουδήποτε.
            </p>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Πιστεύουμε στην προσωπική σχέση εμπιστοσύνης με κάθε πελάτη και στη συνεχή ενημέρωση —
              σε ένα συνεχώς μεταβαλλόμενο φορολογικό περιβάλλον.
            </p>
          </div>
          <div className="md:col-span-6">
            <img
              src="https://images.unsplash.com/photo-1707157284454-553ef0a4ed0d?auto=format&fit=crop&w=1400&q=80"
              alt="DM Accounting Office"
              className="w-full h-[520px] object-cover"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#F5F5F5] py-20 md:py-28">
        <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#1E3A8A] font-semibold mb-4">— Οι Αξίες μας</div>
          <h2 className="font-serif-display text-3xl md:text-4xl lg:text-5xl text-slate-900 max-w-2xl leading-tight">
            Αρχές που καθορίζουν τη συνεργασία μας.
          </h2>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200">
            {[
              { icon: ShieldCheck, t: "Εμπιστοσύνη", d: "Απόλυτη εχεμύθεια και διαφάνεια σε κάθε στάδιο της συνεργασίας." },
              { icon: Award, t: "Εξειδίκευση", d: "Συνεχής εκπαίδευση και επικαιροποίηση στις τελευταίες εξελίξεις." },
              { icon: Target, t: "Συνέπεια", d: "Τήρηση προθεσμιών και άμεση ανταπόκριση στα αιτήματά σας." },
              { icon: HeartHandshake, t: "Προσωπική Σχέση", d: "Εξατομικευμένη προσέγγιση για κάθε πελάτη ξεχωριστά." },
            ].map((v, i) => (
              <div key={i} className="bg-white p-8 md:p-10">
                <v.icon size={28} className="text-[#1E3A8A]" strokeWidth={1.5} />
                <h3 className="mt-5 font-serif-display text-xl text-slate-900">{v.t}</h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{v.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
