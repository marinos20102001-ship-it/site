import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Lock, Mail, LogIn, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect after user state populates (covers both fresh login + already-authed visits)
  useEffect(() => {
    if (user && user.role) {
      const dest = user.role === "admin" ? "/admin" : "/dashboard";
      navigate(location.state?.from?.pathname || dest, { replace: true });
    }
  }, [user, navigate, location.state]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      // redirect handled by useEffect above when user state updates
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="login-page" className="min-h-screen grid md:grid-cols-2">
      {/* Left brand panel */}
      <div className="hidden md:flex relative bg-[#1E3A8A] text-white p-12 lg:p-16 flex-col justify-between overflow-hidden">
        <div className="relative z-10">
          <div className="bg-white inline-block px-5 py-4">
            <Logo size="md" />
          </div>
        </div>
        <div className="relative z-10">
          <h2 className="font-serif-display text-4xl lg:text-5xl leading-tight">
            Καλωσήρθατε στο<br />
            <span className="italic text-blue-200">DM Portal</span>
          </h2>
          <p className="mt-5 text-blue-100 max-w-md leading-relaxed">
            Ασφαλής πρόσβαση στα οικονομικά σας δεδομένα, 24 ώρες το 24ωρο, από οπουδήποτε.
          </p>
        </div>
        <div className="relative z-10 text-[10px] uppercase tracking-[0.3em] text-blue-200">
          Premium Accounting · Secure · Encrypted
        </div>

        <div className="absolute -bottom-32 -right-32 w-96 h-96 border border-white/10 rounded-full" />
        <div className="absolute -bottom-48 -right-48 w-[600px] h-[600px] border border-white/5 rounded-full" />
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-8 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          <Link to="/" data-testid="login-back-home" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-500 hover:text-[#1E3A8A] mb-10">
            <ArrowLeft size={14} /> Επιστροφή
          </Link>

          <div className="md:hidden mb-8">
            <Logo size="md" />
          </div>

          <h1 className="font-serif-display text-3xl md:text-4xl text-slate-900">Πελατειακή Σύνδεση</h1>
          <p className="mt-3 text-slate-600 text-sm">Εισάγετε τα στοιχεία σας για να αποκτήσετε πρόσβαση.</p>

          <form onSubmit={onSubmit} className="mt-10 space-y-5">
            <div>
              <label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-semibold">Email</label>
              <div className="mt-2 flex items-center border border-slate-300 focus-within:border-[#1E3A8A] transition-colors">
                <Mail size={16} className="ml-3 text-slate-400" />
                <input
                  type="email"
                  required
                  data-testid="login-email-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 outline-none text-sm bg-transparent"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-semibold">Κωδικός</label>
              <div className="mt-2 flex items-center border border-slate-300 focus-within:border-[#1E3A8A] transition-colors">
                <Lock size={16} className="ml-3 text-slate-400" />
                <input
                  type="password"
                  required
                  data-testid="login-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 outline-none text-sm bg-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {err && (
              <div data-testid="login-error" className="text-sm text-red-600 border-l-2 border-red-600 pl-3 py-2 bg-red-50">
                {err}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit-btn"
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#1E3A8A] text-white text-xs font-semibold tracking-[0.25em] uppercase hover:bg-[#1E40AF] transition-colors disabled:opacity-60"
            >
              {loading ? "Σύνδεση…" : (<><LogIn size={14} /> Σύνδεση</>)}
            </button>
          </form>

          <div className="mt-10 p-4 bg-[#F5F5F5] border border-slate-200 text-xs text-slate-600">
            <div className="font-semibold text-slate-900 mb-2 uppercase tracking-wider text-[10px]">Demo Πρόσβαση</div>
            <div>Πελάτης: <code className="text-[#1E3A8A]">client@dmaccounting.gr</code> / <code className="text-[#1E3A8A]">Client2026!</code></div>
            <div>Admin: <code className="text-[#1E3A8A]">admin@dmaccounting.gr</code> / <code className="text-[#1E3A8A]">DMAdmin2026!</code></div>
          </div>
        </div>
      </div>
    </div>
  );
}
