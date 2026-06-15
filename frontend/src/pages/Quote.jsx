import React, { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { ArrowRight, Check, AlertCircle, RefreshCw, Shield } from "lucide-react";

const SERVICES = [
  "Λογιστική υποστήριξη",
  "Φορολογικές δηλώσεις",
  "Μισθοδοσία",
  "Σύσταση επιχείρησης",
  "Συμβουλευτικές υπηρεσίες",
  "Εργασιακά θέματα",
];

const BUSINESS_TYPES = ["Ιδιώτης", "Ατομική Επιχείρηση", "ΟΕ", "ΕΕ", "ΙΚΕ", "ΕΠΕ", "ΑΕ", "Άλλο"];
const BOOKS_TYPES = ["Β' Κατηγορίας (Απλογραφικά)", "Γ' Κατηγορίας (Διπλογραφικά)", "Δεν γνωρίζω"];
const EMPLOYEES_RANGES = ["0", "1-5", "6-20", "21-50", "50+"];

export default function Quote() {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "",
    business_type: "", books_type: "", employees: "",
    services: [], message: "",
    captcha_answer: "", website: "", // honeypot
  });
  const [captcha, setCaptcha] = useState(null); // {question, token}
  const [status, setStatus] = useState("idle");
  const [err, setErr] = useState("");

  const loadCaptcha = async () => {
    try {
      const r = await api.get("/captcha");
      setCaptcha(r.data);
    } catch { /* ignore */ }
  };
  useEffect(() => { loadCaptcha(); }, []);

  const toggleService = (s) =>
    setForm((f) => ({
      ...f,
      services: f.services.includes(s) ? f.services.filter((x) => x !== s) : [...f.services, s],
    }));

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending"); setErr("");
    try {
      await api.post("/quotes", { ...form, captcha_token: captcha?.token });
      setStatus("success");
      setForm({ name: "", email: "", phone: "", company: "", business_type: "", books_type: "", employees: "", services: [], message: "", captcha_answer: "", website: "" });
    } catch (e) {
      setErr(formatApiErrorDetail(e?.response?.data?.detail) || e.message);
      setStatus("error");
      loadCaptcha(); // new captcha after failure
      setForm((f) => ({ ...f, captcha_answer: "" }));
    }
  };

  if (status === "success") {
    return (
      <div data-testid="quote-success" className="bg-[#F5F5F5] min-h-[80vh] flex items-center justify-center px-6 py-20">
        <div className="bg-white border border-slate-200 max-w-lg w-full p-10 text-center">
          <div className="w-16 h-16 bg-[#1E3A8A] text-white mx-auto flex items-center justify-center">
            <Check size={28} strokeWidth={2} />
          </div>
          <h2 className="font-serif-display text-3xl text-slate-900 mt-6">Ευχαριστούμε!</h2>
          <p className="text-slate-600 mt-3 leading-relaxed">
            Το αίτημά σας έχει σταλεί. Θα επικοινωνήσουμε μαζί σας εντός 24 ωρών για να συζητήσουμε
            μια εξατομικευμένη προσφορά.
          </p>
          <button
            onClick={() => setStatus("idle")}
            data-testid="quote-new-request"
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 border border-[#1E3A8A] text-[#1E3A8A] text-xs uppercase tracking-[0.2em] font-semibold hover:bg-[#1E3A8A] hover:text-white transition-colors"
          >
            Νέο αίτημα
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="quote-page" className="bg-white">
      {/* Hero */}
      <section className="bg-[#1E3A8A] text-white">
        <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto py-20 md:py-28">
          <div className="grid md:grid-cols-12 gap-8 items-end">
            <div className="md:col-span-8">
              <div className="text-[10px] uppercase tracking-[0.3em] text-blue-200 mb-4">— Αίτημα Προσφοράς</div>
              <h1 className="font-serif-display text-4xl md:text-5xl lg:text-6xl leading-tight">
                Ζητήστε εξατομικευμένη <span className="italic text-blue-200">προσφορά</span>.
              </h1>
            </div>
            <div className="md:col-span-4">
              <p className="text-blue-100 leading-relaxed text-sm">
                Συμπληρώστε τη φόρμα και θα σας στείλουμε εντός 24 ωρών μια διαμορφωμένη
                προσφορά βασισμένη στις δικές σας ανάγκες.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F5F5F5] py-14 md:py-20">
        <div className="px-6 md:px-12 lg:px-20 max-w-[1100px] mx-auto">
          <form onSubmit={submit} className="bg-white border border-slate-200">
            {/* Section 1 */}
            <div className="p-6 md:p-10 border-b border-slate-200">
              <div className="text-[10px] uppercase tracking-[0.3em] text-[#1E3A8A] font-semibold mb-2">Στοιχεία Επικοινωνίας</div>
              <h2 className="font-serif-display text-2xl text-slate-900 mb-6">Πείτε μας ποιοι είστε</h2>
              <div className="grid md:grid-cols-2 gap-5">
                <Field label="Ονοματεπώνυμο *" testId="quote-name">
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    data-testid="quote-name-input"
                    className="w-full p-3 border border-slate-300 text-sm focus:border-[#1E3A8A] outline-none" />
                </Field>
                <Field label="Email *" testId="quote-email">
                  <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    data-testid="quote-email-input"
                    className="w-full p-3 border border-slate-300 text-sm focus:border-[#1E3A8A] outline-none" />
                </Field>
                <Field label="Τηλέφωνο" testId="quote-phone">
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    data-testid="quote-phone-input"
                    className="w-full p-3 border border-slate-300 text-sm focus:border-[#1E3A8A] outline-none" />
                </Field>
                <Field label="Εταιρεία / Επωνυμία" testId="quote-company">
                  <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })}
                    data-testid="quote-company-input"
                    className="w-full p-3 border border-slate-300 text-sm focus:border-[#1E3A8A] outline-none" />
                </Field>
              </div>
            </div>

            {/* Section 2 */}
            <div className="p-6 md:p-10 border-b border-slate-200">
              <div className="text-[10px] uppercase tracking-[0.3em] text-[#1E3A8A] font-semibold mb-2">Στοιχεία Επιχείρησης</div>
              <h2 className="font-serif-display text-2xl text-slate-900 mb-6">Λίγα λόγια για τη δουλειά σας</h2>
              <div className="grid md:grid-cols-3 gap-5">
                <Field label="Νομική Μορφή">
                  <select value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })}
                    data-testid="quote-business-type"
                    className="w-full p-3 border border-slate-300 text-sm focus:border-[#1E3A8A] outline-none bg-white">
                    <option value="">— Επιλέξτε —</option>
                    {BUSINESS_TYPES.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </Field>
                <Field label="Κατηγορία Βιβλίων">
                  <select value={form.books_type} onChange={(e) => setForm({ ...form, books_type: e.target.value })}
                    data-testid="quote-books-type"
                    className="w-full p-3 border border-slate-300 text-sm focus:border-[#1E3A8A] outline-none bg-white">
                    <option value="">— Επιλέξτε —</option>
                    {BOOKS_TYPES.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </Field>
                <Field label="Εργαζόμενοι">
                  <select value={form.employees} onChange={(e) => setForm({ ...form, employees: e.target.value })}
                    data-testid="quote-employees"
                    className="w-full p-3 border border-slate-300 text-sm focus:border-[#1E3A8A] outline-none bg-white">
                    <option value="">— Επιλέξτε —</option>
                    {EMPLOYEES_RANGES.map((e) => <option key={e}>{e}</option>)}
                  </select>
                </Field>
              </div>
            </div>

            {/* Section 3 */}
            <div className="p-6 md:p-10 border-b border-slate-200">
              <div className="text-[10px] uppercase tracking-[0.3em] text-[#1E3A8A] font-semibold mb-2">Υπηρεσίες</div>
              <h2 className="font-serif-display text-2xl text-slate-900 mb-6">Τι σας ενδιαφέρει;</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {SERVICES.map((s) => {
                  const checked = form.services.includes(s);
                  return (
                    <label
                      key={s}
                      data-testid={`quote-service-${s}`}
                      className={`flex items-center gap-3 p-4 border cursor-pointer transition-colors ${checked ? "border-[#1E3A8A] bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}
                    >
                      <input type="checkbox" checked={checked} onChange={() => toggleService(s)} className="sr-only" />
                      <span className={`w-5 h-5 flex items-center justify-center border ${checked ? "bg-[#1E3A8A] border-[#1E3A8A]" : "border-slate-300"}`}>
                        {checked && <Check size={14} className="text-white" />}
                      </span>
                      <span className="text-sm text-slate-800">{s}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Section 4 */}
            <div className="p-6 md:p-10">
              <div className="text-[10px] uppercase tracking-[0.3em] text-[#1E3A8A] font-semibold mb-2">Επιπλέον</div>
              <h2 className="font-serif-display text-2xl text-slate-900 mb-6">Πείτε μας περισσότερα (προαιρετικό)</h2>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                data-testid="quote-message-input"
                rows={5}
                placeholder="Περιγράψτε τις ανάγκες σας ή ρωτήστε ό,τι θέλετε…"
                className="w-full p-4 border border-slate-300 text-sm focus:border-[#1E3A8A] outline-none resize-y"
              />

              {/* Honeypot — hidden from real users, bots will fill it */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, width: 0 }}
                aria-hidden="true"
              />

              {/* Captcha */}
              <div className="mt-6 p-5 bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-[#1E3A8A] font-semibold mb-3">
                  <Shield size={14} /> Επαλήθευση Ανθρώπινου Χρήστη
                </div>
                {captcha ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm text-slate-700">Πόσο κάνει</span>
                    <span className="font-serif-display text-2xl text-[#1E3A8A] bg-white px-4 py-2 border border-slate-300 select-none" data-testid="captcha-question">
                      {captcha.question} = ?
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      value={form.captcha_answer}
                      onChange={(e) => setForm({ ...form, captcha_answer: e.target.value })}
                      data-testid="captcha-answer"
                      className="w-24 p-2 border border-slate-300 text-center text-lg focus:border-[#1E3A8A] outline-none"
                      placeholder="?"
                    />
                    <button
                      type="button"
                      onClick={loadCaptcha}
                      data-testid="captcha-refresh"
                      className="text-xs text-slate-500 hover:text-[#1E3A8A] inline-flex items-center gap-1"
                    >
                      <RefreshCw size={12} /> Αλλαγή
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">Φόρτωση…</div>
                )}
              </div>

              {err && (
                <div data-testid="quote-error" className="mt-4 flex items-start gap-2 text-sm text-red-600 bg-red-50 border-l-2 border-red-600 p-3">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{err}</span>
                </div>
              )}

              <div className="mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <p className="text-xs text-slate-500">
                  Με την αποστολή, αποδέχεστε την{" "}
                  <a href="/privacy" className="text-[#1E3A8A] underline">Πολιτική Απορρήτου</a>.
                </p>
                <button
                  type="submit"
                  disabled={status === "sending"}
                  data-testid="quote-submit-btn"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#1E3A8A] text-white text-xs font-semibold tracking-[0.25em] uppercase hover:bg-[#1E40AF] transition-colors disabled:opacity-60"
                >
                  {status === "sending" ? "Αποστολή..." : (<>Αποστολή Αιτήματος <ArrowRight size={14} /></>)}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

function Field({ label, children, testId }) {
  return (
    <label className="block" data-testid={testId}>
      <span className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-semibold">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
