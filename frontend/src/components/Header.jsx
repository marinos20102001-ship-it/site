import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, LayoutDashboard } from "lucide-react";
import Logo from "./Logo";
import { useAuth } from "../context/AuthContext";

const links = [
  { to: "/", label: "Αρχική" },
  { to: "/services", label: "Υπηρεσίες" },
  { to: "/tax-calculator", label: "Υπολογιστής Φόρου" },
  { to: "/about", label: "Σχετικά" },
  { to: "/contact", label: "Επικοινωνία" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const dashHref = user && user.role === "admin" ? "/admin" : "/dashboard";

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-slate-200">
      <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto flex items-center justify-between h-20">
        <Link to="/" data-testid="header-logo-link" className="flex items-center gap-3">
          <Logo size="sm" />
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="font-serif-display text-[15px] font-semibold text-slate-900 tracking-wide">DM Accounting</span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Λογιστικό Γραφείο</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              data-testid={`nav-${l.to.replace("/", "") || "home"}`}
              className={`text-sm font-medium tracking-wide transition-colors ${
                location.pathname === l.to ? "text-[#1E3A8A]" : "text-slate-600 hover:text-[#1E3A8A]"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user && user.role ? (
            <>
              <button
                onClick={() => navigate(dashHref)}
                data-testid="header-dashboard-btn"
                className="flex items-center gap-2 px-5 py-2.5 bg-[#1E3A8A] text-white text-xs font-semibold tracking-wider uppercase hover:bg-[#1E40AF] transition-colors"
              >
                <LayoutDashboard size={14} /> Dashboard
              </button>
              <button
                onClick={logout}
                data-testid="header-logout-btn"
                className="flex items-center gap-1.5 text-slate-600 hover:text-[#1E3A8A] text-xs font-semibold tracking-wider uppercase"
              >
                <LogOut size={14} /> Έξοδος
              </button>
            </>
          ) : (
            <Link
              to="/login"
              data-testid="header-login-btn"
              className="px-5 py-2.5 bg-[#1E3A8A] text-white text-xs font-semibold tracking-wider uppercase hover:bg-[#1E40AF] transition-colors"
            >
              Πελατειακή Σύνδεση
            </Link>
          )}
        </div>

        <button
          onClick={() => setOpen(!open)}
          data-testid="mobile-menu-toggle"
          className="md:hidden p-2 text-slate-700"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="px-6 py-4 flex flex-col gap-3">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                data-testid={`mobile-nav-${l.to.replace("/", "") || "home"}`}
                className={`py-2 text-sm font-medium ${
                  location.pathname === l.to ? "text-[#1E3A8A]" : "text-slate-700"
                }`}
              >
                {l.label}
              </Link>
            ))}
            {user && user.role ? (
              <>
                <button
                  onClick={() => { setOpen(false); navigate(dashHref); }}
                  data-testid="mobile-dashboard-btn"
                  className="mt-2 px-4 py-3 bg-[#1E3A8A] text-white text-xs font-semibold tracking-wider uppercase text-center"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => { setOpen(false); logout(); }}
                  data-testid="mobile-logout-btn"
                  className="px-4 py-3 border border-slate-300 text-slate-700 text-xs font-semibold uppercase tracking-wider"
                >
                  Έξοδος
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                data-testid="mobile-login-btn"
                className="mt-2 px-4 py-3 bg-[#1E3A8A] text-white text-xs font-semibold tracking-wider uppercase text-center"
              >
                Πελατειακή Σύνδεση
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
