import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie, X } from "lucide-react";

const COOKIE_KEY = "dm_cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(COOKIE_KEY)) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
  };
  const decline = () => {
    localStorage.setItem(COOKIE_KEY, "declined");
    setVisible(false);
  };

  if (!visible) return null;
  return (
    <div
      role="dialog"
      data-testid="cookie-banner"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-md z-[60] bg-white border border-slate-200 shadow-xl p-5 animate-fade-up"
    >
      <div className="flex items-start gap-3">
        <Cookie size={22} className="text-[#1E3A8A] shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="font-serif-display text-base text-slate-900 mb-1">Cookies & Απόρρητο</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Χρησιμοποιούμε απαραίτητα cookies για τη λειτουργία του site (σύνδεση χρήστη, ασφάλεια).
            Δεν χρησιμοποιούμε cookies παρακολούθησης ή διαφημίσεων.{" "}
            <Link to="/privacy" className="text-[#1E3A8A] underline">Διαβάστε την Πολιτική Απορρήτου</Link>.
          </p>
          <div className="mt-4 flex gap-2 flex-wrap">
            <button
              onClick={accept}
              data-testid="cookie-accept"
              className="px-4 py-2 bg-[#1E3A8A] text-white text-[11px] font-semibold tracking-[0.2em] uppercase hover:bg-[#1E40AF]"
            >
              Αποδοχή
            </button>
            <button
              onClick={decline}
              data-testid="cookie-decline"
              className="px-4 py-2 border border-slate-300 text-slate-700 text-[11px] font-semibold tracking-[0.2em] uppercase hover:bg-slate-50"
            >
              Μόνο απαραίτητα
            </button>
          </div>
        </div>
        <button onClick={decline} data-testid="cookie-close" className="text-slate-400 hover:text-slate-700">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
