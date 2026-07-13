import React from "react";
import { MapPin, Mail, Clock } from "lucide-react";
import SEO from "@/components/SEO";

export default function Contact() {
  return (
    <div data-testid="contact-page" className="bg-white">
      <SEO
        title="Επικοινωνία — Λογιστικό Γραφείο DM Accounting"
        description="Επικοινωνήστε με το DM Accounting για λογιστικές και φοροτεχνικές υπηρεσίες. Στοιχεία επικοινωνίας, διεύθυνση γραφείου και ώρες εξυπηρέτησης."
        path="/contact"
      />
      <section className="bg-[#1E3A8A] text-white">
        <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto py-24 md:py-32">
          <div className="text-[10px] uppercase tracking-[0.3em] text-blue-200 mb-4">— Επικοινωνία</div>
          <h1 className="font-serif-display text-4xl md:text-5xl lg:text-6xl leading-tight max-w-3xl">
            Ας ξεκινήσουμε τη συνεργασία μας.
          </h1>
          <p className="mt-6 max-w-2xl text-blue-100 leading-relaxed">
            Επικοινωνήστε μαζί μας — είμαστε εδώ για να απαντήσουμε σε κάθε σας ερώτηση.
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <h2 className="font-serif-display text-3xl text-slate-900">Στοιχεία Επικοινωνίας</h2>
            <p className="mt-3 text-slate-600">Μπορείτε να μας επισκεφθείτε στα γραφεία μας ή να επικοινωνήσετε ηλεκτρονικά.</p>

            <div className="mt-10 space-y-px bg-slate-200">
              <div className="bg-white p-6 flex items-start gap-4">
                <div className="w-11 h-11 bg-[#1E3A8A] text-white flex items-center justify-center shrink-0">
                  <MapPin size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-semibold">Διεύθυνση</div>
                  <div className="mt-1 text-slate-900 font-medium" data-testid="contact-address">Πατέλες Μιλτιάδου 9</div>
                </div>
              </div>
              <div className="bg-white p-6 flex items-start gap-4">
                <div className="w-11 h-11 bg-[#1E3A8A] text-white flex items-center justify-center shrink-0">
                  <Mail size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-semibold">Email</div>
                  <a href="mailto:marinosgr@yahoo.gr" data-testid="contact-email" className="mt-1 text-slate-900 font-medium hover:text-[#1E3A8A] block break-all">
                    marinosgr@yahoo.gr
                  </a>
                </div>
              </div>
              <div className="bg-white p-6 flex items-start gap-4">
                <div className="w-11 h-11 bg-[#1E3A8A] text-white flex items-center justify-center shrink-0">
                  <Clock size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-semibold">Ώρες Λειτουργίας</div>
                  <div className="mt-1 text-slate-900 font-medium">Δευτέρα — Παρασκευή · 09:00 – 17:00</div>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-7">
            <div className="border border-slate-200 h-full min-h-[480px]">
              <iframe
                title="DM Accounting Location"
                data-testid="contact-map"
                src="https://www.google.com/maps/embed?pb=!4v1781361633379!6m8!1m7!1sonSUYEmWDEKJX7CQTzvsvA!2m2!1d35.33282897122981!2d25.14581843227824!3f153.72963171324963!4f20.627523161224772!5f0.7820865974627469"
                className="w-full h-full min-h-[480px] border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
