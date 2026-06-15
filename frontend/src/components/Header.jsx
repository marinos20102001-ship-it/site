import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogOut, LayoutDashboard, Moon, Sun } from "lucide-react";
import Logo from "./Logo";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const links = [
  { to: "/", label: "Αρχική" },
  { to: "/services", label: "Υπηρεσίες" },
  { to: "/tax-calculator", label: "Υπολογιστής Φόρου" },
  { to: "/about", label: "Σχετικά με Εμάς" },
  { to: "/contact", label: "Επικοινωνία" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();

  const dashHref = user && user.role === "admin" ? "/admin" : "/dashboard";

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
      <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto flex items-center justify-between h-20">
        <Link to="/" data-testid="header-logo-link" className="flex items-center gap-3">
          <Logo size="sm" color={theme === "dark" ? "#FFFFFF" : "#1E3A8A"} />
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="font-serif-display text-[15px] font-semibold text-slate-900 dark:text-white tracking-wide">DM Accounting</span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Λογιστικό Γραφείο</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              data-testid={`nav-${l.to.replace("/", "") || "home"}`}
              className={`text-sm font-medium tracking-wide transition-colors ${
                location.pathname === l.to ? "text-[#1E3A8A] dark:text-blue-300" : "text-slate-600 dark:text-slate-300 hover:text-[#1E3A8A] dark:hover:text-blue-300"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={toggleTheme}
            data-testid="theme-toggle"
            aria-label="Toggle theme"
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            className="w-9 h-9 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-[#1E3A8A] dark:hover:text-blue-300 border border-slate-200 dark:border-slate-700"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
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
                className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-[#1E3A8A] dark:hover:text-blue-300 text-xs font-semibold tracking-wider uppercase"
              >
                <LogOut size={14} /> Έξοδος
              </button>
            </>
          ) : (
            <>
              <Link
                to="/quote"
                data-testid="header-quote-btn"
                className="px-4 py-2.5 border border-[#1E3A8A] text-[#1E3A8A] dark:text-blue-300 dark:border-blue-300 text-xs font-semibold tracking-wider uppercase hover:bg-[#1E3A8A] hover:text-white transition-colors"
              >
                Προσφορά
              </Link>
              <Link
                to="/login"
                data-testid="header-login-btn"
                className="px-5 py-2.5 bg-[#1E3A8A] text-white text-xs font-semibold tracking-wider uppercase hover:bg-[#1E40AF] transition-colors"
              >
                Σύνδεση
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen(!open)}
          data-testid="mobile-menu-toggle"
          className="md:hidden p-2 text-slate-700 dark:text-slate-200"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <div className="px-6 py-4 flex flex-col gap-3">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                data-testid={`mobile-nav-${l.to.replace("/", "") || "home"}`}
                className={`py-2 text-sm font-medium ${
                  location.pathname === l.to ? "text-[#1E3A8A] dark:text-blue-300" : "text-slate-700 dark:text-slate-200"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <button
              onClick={toggleTheme}
              data-testid="mobile-theme-toggle"
              className="flex items-center gap-2 py-2 text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </button>
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
                  className="px-4 py-3 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold uppercase tracking-wider"
                >
                  Έξοδος
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/quote"
                  onClick={() => setOpen(false)}
                  data-testid="mobile-quote-btn"
                  className="mt-2 px-4 py-3 border border-[#1E3A8A] text-[#1E3A8A] dark:text-blue-300 dark:border-blue-300 text-xs font-semibold tracking-wider uppercase text-center"
                >
                  Αίτημα Προσφοράς
                </Link>
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  data-testid="mobile-login-btn"
                  className="px-4 py-3 bg-[#1E3A8A] text-white text-xs font-semibold tracking-wider uppercase text-center"
                >
                  Πελατειακή Σύνδεση
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
