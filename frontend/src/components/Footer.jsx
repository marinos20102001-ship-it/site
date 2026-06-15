import React from "react";
import { Link } from "react-router-dom";
import { Mail, MapPin } from "lucide-react";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="bg-[#0F172A] text-slate-300" data-testid="site-footer">
      <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-1">
          <div className="bg-white inline-block px-5 py-4">
            <Logo size="md" />
          </div>
          <p className="mt-5 text-sm text-slate-400 leading-relaxed max-w-xs">
            Αξιόπιστες λογιστικές και φοροτεχνικές υπηρεσίες με επαγγελματισμό και διαφάνεια.
          </p>
        </div>

        <div>
          <h4 className="font-serif-display text-white text-lg mb-4">Πλοήγηση</h4>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/" className="hover:text-white transition-colors">Αρχική</Link></li>
            <li><Link to="/services" className="hover:text-white transition-colors">Υπηρεσίες</Link></li>
            <li><Link to="/tax-calculator" className="hover:text-white transition-colors">Υπολογιστής Φόρου</Link></li>
            <li><Link to="/about" className="hover:text-white transition-colors">Σχετικά με Εμάς</Link></li>
            <li><Link to="/contact" className="hover:text-white transition-colors">Επικοινωνία</Link></li>
            <li><Link to="/quote" className="hover:text-white transition-colors">Αίτημα Προσφοράς</Link></li>
            <li><Link to="/login" className="hover:text-white transition-colors">Πελατειακή Σύνδεση</Link></li>
            <li><Link to="/privacy" className="hover:text-white transition-colors">Πολιτική Απορρήτου</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif-display text-white text-lg mb-4">Υπηρεσίες</h4>
          <ul className="space-y-2.5 text-sm">
            <li>Λογιστική υποστήριξη</li>
            <li>Φορολογικές δηλώσεις</li>
            <li>Μισθοδοσία</li>
            <li>Σύσταση επιχειρήσεων</li>
            <li>Συμβουλευτικές υπηρεσίες</li>
            <li>Εργασιακά θέματα</li>
          </ul>
        </div>

        <div>
          <h4 className="font-serif-display text-white text-lg mb-4">Επικοινωνία</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0" />
              <span>Πατέλες Μιλτιάδου 9</span>
            </li>
            <li className="flex items-start gap-2">
              <Mail size={16} className="mt-0.5 shrink-0" />
              <a href="mailto:marinosgr@yahoo.gr" className="hover:text-white transition-colors break-all">marinosgr@yahoo.gr</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto py-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-slate-500">
          <div>© {new Date().getFullYear()} DM Accounting. Με επιφύλαξη παντός δικαιώματος.</div>
          <div className="uppercase tracking-[0.2em]">Premium Accounting Services</div>
        </div>
      </div>
    </footer>
  );
}
