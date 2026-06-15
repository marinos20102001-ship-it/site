import React, { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { Users, Wallet, TrendingUp, FileText, Plus, X, Upload, Trash2, Activity, Eye, Mail, Phone, Briefcase, MessageSquare, Receipt, BookOpen, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { useConfirm } from "../context/ConfirmContext";

const fmt = (n) => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);

function KPI({ label, value, icon: Icon, accent }) {
  return (
    <div data-testid={`admin-kpi-${label}`} className="bg-white border border-slate-200 p-6">
      <div className="flex items-start justify-between">
        <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-semibold">{label}</div>
        <div className={`w-9 h-9 flex items-center justify-center ${accent || "bg-[#1E3A8A] text-white"}`}>
          <Icon size={16} strokeWidth={1.5} />
        </div>
      </div>
      <div className="mt-5 font-serif-display text-3xl text-slate-900">{value}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [firm, setFirm] = useState(null);
  const [tab, setTab] = useState("clients");
  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState(null);
  const [err, setErr] = useState("");
  const confirm = useConfirm();

  const reload = async () => {
    try {
      const [s, c, q, f] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/clients"),
        api.get("/admin/quotes"),
        api.get("/admin/firm/transactions"),
      ]);
      setStats(s.data);
      setClients(c.data);
      setQuotes(q.data);
      setFirm(f.data);
    } catch (e) {
      setErr(formatApiErrorDetail(e?.response?.data?.detail) || e.message);
    }
  };

  useEffect(() => { reload(); }, []);

  const updateQuoteStatus = async (qid, status) => {
    await api.patch(`/admin/quotes/${qid}`, { status });
    reload();
  };
  const deleteQuote = async (qid) => {
    const ok = await confirm({ title: "Διαγραφή Αιτήματος", message: "Είστε σίγουρος ότι θέλετε να διαγράψετε αυτό το αίτημα;" });
    if (!ok) return;
    try {
      await api.delete(`/admin/quotes/${qid}`);
      reload();
    } catch (e) {
      alert(formatApiErrorDetail(e?.response?.data?.detail) || e.message);
    }
  };
  const deleteClient = async (cid, name) => {
    const ok = await confirm({ title: "Διαγραφή Πελάτη", message: `Είστε σίγουρος ότι θέλετε να διαγράψετε τον πελάτη "${name}";` });
    if (!ok) return;
    try {
      await api.delete(`/admin/clients/${cid}`);
      reload();
    } catch (e) {
      alert(formatApiErrorDetail(e?.response?.data?.detail) || e.message);
    }
  };

  if (err) return <div className="p-12 text-red-600">{err}</div>;
  if (!stats) return <div className="p-12 text-slate-500" data-testid="admin-loading">Φόρτωση δεδομένων…</div>;

  return (
    <div data-testid="admin-dashboard" className="bg-[#F5F5F5] min-h-screen">
      <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto py-10 md:py-14">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#1E3A8A] font-semibold">— Admin Panel</div>
            <h1 className="font-serif-display text-3xl md:text-4xl lg:text-5xl text-slate-900 mt-2">Διαχείριση Γραφείου</h1>
            <p className="mt-2 text-sm text-slate-600">Επισκόπηση πελατών, αρχείων και οικονομικών δεικτών.</p>
          </div>
          <button
            onClick={() => setOpenCreate(true)}
            data-testid="admin-new-client-btn"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1E3A8A] text-white text-xs font-semibold tracking-[0.2em] uppercase hover:bg-[#1E40AF]"
          >
            <Plus size={14} /> Νέος Πελάτης
          </button>
        </div>

        {/* KPIs — firm financials */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-slate-200">
          <KPI label="Πελάτες" value={stats.total_clients} icon={Users} />
          <KPI label="Έσοδα Γραφείου" value={fmt(firm?.total_income)} icon={ArrowDownCircle} accent="bg-emerald-700 text-white" />
          <KPI label="Έξοδα Γραφείου" value={fmt(firm?.total_expense)} icon={ArrowUpCircle} accent="bg-slate-700 text-white" />
          <KPI label="Καθαρό Κέρδος" value={fmt(firm?.net_profit)} icon={Wallet} accent={(firm?.net_profit || 0) >= 0 ? "bg-[#1E3A8A] text-white" : "bg-red-600 text-white"} />
          <KPI label="Χρωστούμενα Πελατών" value={fmt(firm?.receivables)} icon={Receipt} accent={(firm?.receivables || 0) > 0 ? "bg-amber-600 text-white" : "bg-slate-700 text-white"} />
        </div>

        {/* Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10">
          <div className="lg:col-span-2 bg-white border border-slate-200 p-6">
            <h3 className="font-serif-display text-xl text-slate-900 mb-6">Συνοπτική Εικόνα</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={[
                { name: "Έσοδα", value: stats.total_income },
                { name: "Έξοδα", value: stats.total_expense },
                { name: "Κέρδη", value: stats.total_profit },
                { name: "ΦΠΑ", value: stats.total_vat },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: 0, fontSize: 12 }} formatter={(v) => fmt(v)} />
                <Bar dataKey="value" fill="#1E3A8A" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-slate-200 p-6">
            <h3 className="font-serif-display text-xl text-slate-900 mb-4 flex items-center gap-2"><Activity size={18} /> Πρόσφατη Δραστηριότητα</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {(stats.recent_logs || []).length === 0 ? (
                <div className="text-sm text-slate-400 py-8 text-center">Καμία δραστηριότητα.</div>
              ) : (
                stats.recent_logs.map((l, i) => (
                  <div key={i} className="text-xs border-b border-slate-100 last:border-0 py-2">
                    <div className="text-slate-900 font-medium">{l.action}</div>
                    <div className="text-slate-500 truncate">{l.target}</div>
                    <div className="text-slate-400 mt-0.5">{(l.timestamp || "").slice(0, 19).replace("T", " ")}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-10 flex border-b border-slate-200 flex-wrap">
          <button onClick={() => setTab("clients")} data-testid="tab-clients"
            className={`px-6 py-3 text-xs font-semibold tracking-[0.2em] uppercase ${tab === "clients" ? "border-b-2 border-[#1E3A8A] text-[#1E3A8A]" : "text-slate-500 hover:text-slate-700"}`}>
            Πελάτες ({clients.length})
          </button>
          <button onClick={() => setTab("firm")} data-testid="tab-firm"
            className={`px-6 py-3 text-xs font-semibold tracking-[0.2em] uppercase ${tab === "firm" ? "border-b-2 border-[#1E3A8A] text-[#1E3A8A]" : "text-slate-500 hover:text-slate-700"}`}>
            Οικονομικά Γραφείου
          </button>
          <button onClick={() => setTab("quotes")} data-testid="tab-quotes"
            className={`px-6 py-3 text-xs font-semibold tracking-[0.2em] uppercase flex items-center gap-2 ${tab === "quotes" ? "border-b-2 border-[#1E3A8A] text-[#1E3A8A]" : "text-slate-500 hover:text-slate-700"}`}>
            Αιτήματα Προσφοράς ({quotes.length})
            {stats.new_quotes > 0 && <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5">{stats.new_quotes}</span>}
          </button>
        </div>

        {/* Clients Table */}
        {tab === "clients" && (
        <div className="bg-white border border-slate-200 border-t-0">
          <div className="p-6 border-b border-slate-200">
            <h3 className="font-serif-display text-xl text-slate-900">Πελάτες</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="clients-table">
              <thead className="bg-[#F5F5F5] text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
                <tr>
                  <th className="text-left p-4">Όνομα</th>
                  <th className="text-left p-4">Email</th>
                  <th className="text-left p-4">Εταιρεία</th>
                  <th className="text-left p-4">ΑΦΜ</th>
                  <th className="text-left p-4">Βιβλία</th>
                  <th className="text-right p-4">Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr><td colSpan="6" className="text-center text-slate-400 py-12">Κανένας πελάτης ακόμα.</td></tr>
                ) : clients.map((c) => (
                  <tr key={c.id} data-testid={`client-row-${c.id}`} className="border-t border-slate-100">
                    <td className="p-4 text-slate-900 font-medium">{c.name}</td>
                    <td className="p-4 text-slate-600">{c.email}</td>
                    <td className="p-4 text-slate-600">{c.company || "—"}</td>
                    <td className="p-4 text-slate-600">{c.afm || "—"}</td>
                    <td className="p-4">
                      <span className={`text-[10px] uppercase tracking-wider px-2 py-1 ${c.books_type === "double" ? "bg-slate-700 text-white" : "bg-blue-50 text-[#1E3A8A] border border-[#1E3A8A]"}`}>
                        {c.books_type === "double" ? "Διπλογραφικά" : "Απλογραφικά"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setOpenView(c)}
                          data-testid={`view-client-${c.id}`}
                          className="inline-flex items-center gap-1 px-3 py-2 border border-[#1E3A8A] text-[#1E3A8A] text-[10px] uppercase tracking-wider font-semibold hover:bg-[#1E3A8A] hover:text-white transition-colors"
                        >
                          <Eye size={12} /> Προβολή
                        </button>
                        <button
                          onClick={() => deleteClient(c.id, c.name)}
                          data-testid={`delete-client-${c.id}`}
                          className="inline-flex items-center gap-1 px-3 py-2 border border-red-300 text-red-600 text-[10px] uppercase tracking-wider font-semibold hover:bg-red-600 hover:text-white transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Quotes Tab */}
        {tab === "quotes" && (
          <QuotesTable quotes={quotes} updateStatus={updateQuoteStatus} onDelete={deleteQuote} />
        )}

        {/* Firm Tab */}
        {tab === "firm" && (
          <FirmFinancials firm={firm} reload={reload} confirm={confirm} />
        )}
      </div>

      {openCreate && <CreateClientModal onClose={() => setOpenCreate(false)} onSaved={() => { setOpenCreate(false); reload(); }} />}
      {openView && <ClientDetailModal client={openView} onClose={() => setOpenView(null)} />}
    </div>
  );
}

function QuotesTable({ quotes, updateStatus, onDelete }) {
  return (
    <div className="bg-white border border-slate-200 border-t-0" data-testid="quotes-section">
      {quotes.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm">Δεν υπάρχουν αιτήματα ακόμη.</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {quotes.map((q) => (
            <div key={q.id} data-testid={`quote-${q.id}`} className="p-6 md:p-8 hover:bg-slate-50 transition-colors">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h4 className="font-serif-display text-xl text-slate-900">{q.name}</h4>
                    <StatusBadge status={q.status} />
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">{new Date(q.created_at).toLocaleString("el-GR", { dateStyle: "short", timeStyle: "short" })}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail size={13} /> <a href={`mailto:${q.email}`} className="hover:text-[#1E3A8A]">{q.email}</a>
                    </div>
                    {q.phone && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone size={13} /> <a href={`tel:${q.phone}`} className="hover:text-[#1E3A8A]">{q.phone}</a>
                      </div>
                    )}
                    {q.company && (
                      <div className="flex items-center gap-2 text-slate-600">
                        <Briefcase size={13} /> {q.company} {q.business_type && `· ${q.business_type}`}
                      </div>
                    )}
                    {q.books_type && (
                      <div className="text-slate-500 text-xs">Βιβλία: {q.books_type} {q.employees && `· Εργαζόμενοι: ${q.employees}`}</div>
                    )}
                  </div>
                  {q.services && q.services.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {q.services.map((s, i) => (
                        <span key={i} className="text-[10px] uppercase tracking-wider bg-blue-50 text-[#1E3A8A] px-2 py-1 border border-[#1E3A8A]/20">{s}</span>
                      ))}
                    </div>
                  )}
                  {q.message && (
                    <p className="mt-3 text-sm text-slate-600 bg-slate-50 border-l-2 border-[#1E3A8A] p-3 italic">"{q.message}"</p>
                  )}
                </div>
                <div className="flex flex-col gap-2 md:w-44 shrink-0">
                  <select
                    value={q.status}
                    onChange={(e) => updateStatus(q.id, e.target.value)}
                    data-testid={`quote-status-${q.id}`}
                    className="text-xs p-2 border border-slate-300 bg-white outline-none focus:border-[#1E3A8A]"
                  >
                    <option value="new">Νέο</option>
                    <option value="contacted">Επικοινωνία</option>
                    <option value="won">Κερδίθηκε</option>
                    <option value="lost">Χάθηκε</option>
                  </select>
                  <button
                    onClick={() => onDelete(q.id)}
                    data-testid={`quote-delete-${q.id}`}
                    className="text-xs px-3 py-2 border border-red-300 text-red-600 hover:bg-red-600 hover:text-white inline-flex items-center justify-center gap-1.5"
                  >
                    <Trash2 size={12} /> Διαγραφή
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    new: { bg: "bg-amber-100 text-amber-800", label: "Νέο" },
    contacted: { bg: "bg-blue-100 text-[#1E3A8A]", label: "Επικοινωνία" },
    won: { bg: "bg-emerald-100 text-emerald-800", label: "Κερδίθηκε" },
    lost: { bg: "bg-slate-100 text-slate-700", label: "Χάθηκε" },
  };
  const m = map[status] || map.new;
  return <span className={`text-[10px] uppercase tracking-wider px-2 py-1 ${m.bg}`}>{m.label}</span>;
}


function FirmFinancials({ firm, reload, confirm }) {
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ type: "expense", amount: "", date: new Date().toISOString().slice(0, 10), description: "" });
  const [err, setErr] = useState("");

  if (!firm) return <div className="p-8 text-slate-400 text-sm">Φόρτωση…</div>;

  const add = async (e) => {
    e.preventDefault(); setErr("");
    try {
      await api.post("/admin/firm/transactions", { ...form, amount: parseFloat(form.amount) });
      setShow(false);
      setForm({ type: "expense", amount: "", date: new Date().toISOString().slice(0, 10), description: "" });
      reload();
    } catch (e) {
      setErr(formatApiErrorDetail(e?.response?.data?.detail) || e.message);
    }
  };

  const del = async (id, isAuto) => {
    if (isAuto) {
      alert("Αυτή η εγγραφή προέρχεται από πληρωμή πελάτη. Διαγράψτε την από την καρτέλα του πελάτη.");
      return;
    }
    const ok = await confirm({ title: "Διαγραφή κίνησης", message: "Διαγραφή αυτής της οικονομικής κίνησης;" });
    if (!ok) return;
    try {
      await api.delete(`/admin/firm/transactions/${id}`);
      reload();
    } catch (e) {
      alert(formatApiErrorDetail(e?.response?.data?.detail) || e.message);
    }
  };

  return (
    <div className="bg-white border border-slate-200 border-t-0" data-testid="firm-financials">
      <div className="p-6 flex items-center justify-between flex-wrap gap-3 border-b border-slate-200">
        <div>
          <h3 className="font-serif-display text-xl text-slate-900">Οικονομικές Κινήσεις Γραφείου</h3>
          <p className="text-xs text-slate-500 mt-1">Οι πληρωμές πελατών προστίθενται αυτόματα ως έσοδα.</p>
        </div>
        <button onClick={() => setShow(true)} data-testid="firm-add-tx-btn"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1E3A8A] text-white text-xs font-semibold tracking-wider uppercase hover:bg-[#1E40AF]">
          <Plus size={14} /> Νέα Κίνηση
        </button>
      </div>

      {firm.items.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm">Καμία κίνηση ακόμη.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-[#F5F5F5] text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
            <tr>
              <th className="text-left p-4">Ημερομηνία</th>
              <th className="text-left p-4">Τύπος</th>
              <th className="text-left p-4">Περιγραφή</th>
              <th className="text-right p-4">Ποσό</th>
              <th className="text-right p-4">Ενέργειες</th>
            </tr>
          </thead>
          <tbody>
            {firm.items.map((t) => (
              <tr key={t.id} className="border-t border-slate-100">
                <td className="p-4 text-slate-700">{t.date}</td>
                <td className="p-4">
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-1 ${t.type === "income" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                    {t.type === "income" ? "Έσοδο" : "Έξοδο"}
                  </span>
                  {t.source === "client_payment" && <span className="ml-2 text-[9px] text-slate-400 uppercase">auto</span>}
                </td>
                <td className="p-4 text-slate-600">{t.description || "—"}</td>
                <td className={`p-4 text-right font-semibold ${t.type === "income" ? "text-emerald-700" : "text-slate-900"}`}>
                  {t.type === "income" ? "+" : "−"}{fmt(t.amount)}
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => del(t.id, t.source === "client_payment")}
                    data-testid={`firm-del-${t.id}`}
                    className="text-red-600 hover:text-red-800"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShow(false)}>
          <div className="bg-white max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="font-serif-display text-xl text-slate-900">Νέα Κίνηση</h3>
              <button onClick={() => setShow(false)}><X size={20} /></button>
            </div>
            <form onSubmit={add} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-px bg-slate-200">
                {[["expense", "Έξοδο"], ["income", "Έσοδο"]].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setForm({ ...form, type: v })}
                    data-testid={`firm-form-type-${v}`}
                    className={`py-3 text-xs font-semibold tracking-wider uppercase ${form.type === v ? "bg-[#1E3A8A] text-white" : "bg-white text-slate-700"}`}>
                    {l}
                  </button>
                ))}
              </div>
              <Input label="Ποσό (€)" type="number" step="0.01" required value={form.amount}
                onChange={(v) => setForm({ ...form, amount: v })} testid="firm-form-amount" />
              <Input label="Ημερομηνία" type="date" required value={form.date}
                onChange={(v) => setForm({ ...form, date: v })} testid="firm-form-date" />
              <Input label="Περιγραφή" value={form.description}
                onChange={(v) => setForm({ ...form, description: v })} testid="firm-form-description" />
              {err && <div className="text-sm text-red-600">{err}</div>}
              <button type="submit" data-testid="firm-form-submit"
                className="w-full py-3 bg-[#1E3A8A] text-white text-xs tracking-[0.25em] uppercase font-semibold hover:bg-[#1E40AF]">
                Αποθήκευση
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Input({ label, value, onChange, testid, ...rest }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testid}
        className="w-full mt-1 p-3 border border-slate-300 text-sm focus:border-[#1E3A8A] outline-none"
        {...rest}
      />
    </label>
  );
}

function CreateClientModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ email: "", password: "", name: "", company: "", phone: "", afm: "", books_type: "simple" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setLoading(true);
    try {
      await api.post("/admin/clients", form);
      onSaved();
    } catch (e) {
      setErr(formatApiErrorDetail(e?.response?.data?.detail) || e.message);
    } finally { setLoading(false); }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      data-testid="create-client-modal"
      onClick={onClose}
    >
      <div className="bg-white max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h3 className="font-serif-display text-2xl text-slate-900">Νέος Πελάτης</h3>
          <button onClick={onClose} data-testid="modal-close-btn" className="p-2 hover:bg-slate-100"><X size={20} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {["name","email","password","company","phone","afm"].map((k) => (
            <div key={k}>
              <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">{({name:"Όνομα",email:"Email",password:"Κωδικός",company:"Εταιρεία",phone:"Τηλέφωνο",afm:"ΑΦΜ"})[k]}</label>
              <input
                required={["name","email","password"].includes(k)}
                type={k === "password" ? "password" : k === "email" ? "email" : "text"}
                value={form[k]}
                onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                data-testid={`new-client-${k}`}
                className="w-full mt-1 p-3 border border-slate-300 text-sm focus:border-[#1E3A8A] outline-none"
              />
            </div>
          ))}
          <div>
            <label className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Κατηγορία Βιβλίων</label>
            <div className="mt-1 grid grid-cols-2 gap-px bg-slate-200">
              {[
                { v: "simple", l: "Απλογραφικά" },
                { v: "double", l: "Διπλογραφικά" },
              ].map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setForm({ ...form, books_type: o.v })}
                  data-testid={`new-client-books-${o.v}`}
                  className={`py-2.5 text-xs font-semibold tracking-wider uppercase transition-colors ${form.books_type === o.v ? "bg-[#1E3A8A] text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          {err && <div data-testid="create-error" className="text-sm text-red-600">{err}</div>}
          <button type="submit" disabled={loading} data-testid="create-client-submit" className="w-full py-3 bg-[#1E3A8A] text-white text-xs tracking-[0.25em] uppercase font-semibold hover:bg-[#1E40AF] disabled:opacity-60">
            {loading ? "Αποθήκευση…" : "Δημιουργία Πελάτη"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ClientDetailModal({ client, onClose }) {
  const [data, setData] = useState(null);
  const [billing, setBilling] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");
  const [billForm, setBillForm] = useState({ type: "charge", amount: "", date: new Date().toISOString().slice(0, 10), description: "" });
  const [activeTab, setActiveTab] = useState("data"); // data | billing
  const confirm = useConfirm();

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const load = async () => {
    try {
      const [r, b] = await Promise.all([
        api.get(`/admin/clients/${client.id}/dashboard`),
        api.get(`/admin/clients/${client.id}/billing`),
      ]);
      setData(r.data);
      setBilling(b.data);
    } catch (e) {
      setErr(formatApiErrorDetail(e?.response?.data?.detail) || e.message);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [client.id]);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      await api.post(`/admin/clients/${client.id}/files`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      await load();
    } catch (e) {
      setErr(formatApiErrorDetail(e?.response?.data?.detail) || e.message);
    } finally { setUploading(false); e.target.value = ""; }
  };

  const removeFile = async (filename) => {
    const ok = await confirm({ title: "Διαγραφή αρχείου", message: `Διαγραφή του αρχείου "${filename}";` });
    if (!ok) return;
    try {
      await api.delete(`/admin/clients/${client.id}/files/${encodeURIComponent(filename)}`);
      load();
    } catch (e) {
      alert(formatApiErrorDetail(e?.response?.data?.detail) || e.message);
    }
  };

  const addBilling = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/admin/clients/${client.id}/billing`, { ...billForm, amount: parseFloat(billForm.amount) });
      setBillForm({ type: "charge", amount: "", date: new Date().toISOString().slice(0, 10), description: "" });
      load();
    } catch (e) {
      alert(formatApiErrorDetail(e?.response?.data?.detail) || e.message);
    }
  };

  const delBilling = async (id) => {
    const ok = await confirm({ title: "Διαγραφή εγγραφής", message: "Διαγραφή της εγγραφής από την καρτέλα;" });
    if (!ok) return;
    try {
      await api.delete(`/admin/clients/${client.id}/billing/${id}`);
      load();
    } catch (e) {
      alert(formatApiErrorDetail(e?.response?.data?.detail) || e.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" data-testid="client-detail-modal">
      <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white">
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Πελάτης</div>
            <h3 className="font-serif-display text-2xl text-slate-900">{client.name}</h3>
            <div className="text-xs text-slate-500 mt-1">{client.email} · {client.company || "—"}</div>
          </div>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <div className="p-6">
          {err && <div className="text-sm text-red-600 mb-4">{err}</div>}

          {/* Tabs inside modal */}
          <div className="flex border-b border-slate-200 mb-6">
            <button onClick={() => setActiveTab("data")} data-testid="client-tab-data"
              className={`px-5 py-2 text-xs font-semibold tracking-wider uppercase ${activeTab === "data" ? "border-b-2 border-[#1E3A8A] text-[#1E3A8A]" : "text-slate-500"}`}>
              Στοιχεία & Αρχεία
            </button>
            <button onClick={() => setActiveTab("billing")} data-testid="client-tab-billing"
              className={`px-5 py-2 text-xs font-semibold tracking-wider uppercase flex items-center gap-2 ${activeTab === "billing" ? "border-b-2 border-[#1E3A8A] text-[#1E3A8A]" : "text-slate-500"}`}>
              Καρτέλα · Χρεώσεις/Πληρωμές
              {billing && billing.balance > 0 && (
                <span className="bg-amber-600 text-white text-[10px] px-1.5">{fmt(billing.balance)}</span>
              )}
            </button>
          </div>

          {activeTab === "data" && (!data ? (
            <div className="text-slate-400 text-center py-12">Φόρτωση…</div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-200 mb-6">
                {[
                  { l: "Έσοδα", v: data.totals.income },
                  { l: "Έξοδα", v: data.totals.expense },
                  { l: "Κέρδη", v: data.totals.profit },
                  { l: "ΦΠΑ", v: data.totals.vat },
                ].map((k, i) => (
                  <div key={i} className="bg-white p-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">{k.l}</div>
                    <div className="font-serif-display text-2xl text-slate-900 mt-2">{fmt(k.v)}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mb-3">
                <h4 className="font-serif-display text-xl text-slate-900">Αρχεία ({data.files?.length || 0})</h4>
                <label data-testid="upload-file-label" className="inline-flex items-center gap-2 px-4 py-2 bg-[#1E3A8A] text-white text-xs tracking-[0.2em] uppercase font-semibold cursor-pointer hover:bg-[#1E40AF]">
                  <Upload size={14} /> {uploading ? "Ανέβασμα…" : "Ανέβασμα"}
                  <input type="file" accept=".xlsx,.xls,.csv,.pdf" data-testid="upload-file-input" onChange={upload} className="hidden" />
                </label>
              </div>

              <div className="space-y-2">
                {(data.files || []).length === 0 ? (
                  <div className="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-300">
                    Κανένα αρχείο. Ανεβάστε .xlsx / .csv / .pdf.
                  </div>
                ) : data.files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-slate-200">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[10px] uppercase bg-slate-100 px-2 py-1 text-slate-600">{f.ext.replace(".", "")}</span>
                      <div className="min-w-0">
                        <div className="text-sm text-slate-800 truncate">{f.name}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Ανέβηκε: {new Date(f.modified).toLocaleString("el-GR", { dateStyle: "short", timeStyle: "short" })}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => removeFile(f.name)} className="text-red-600 hover:text-red-800" data-testid={`delete-file-${i}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          ))}

          {activeTab === "billing" && billing && (
            <div data-testid="client-billing-section">
              <div className="grid grid-cols-3 gap-px bg-slate-200 mb-6">
                <div className="bg-white p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Σύνολο Χρεώσεων</div>
                  <div className="font-serif-display text-2xl text-slate-900 mt-2">{fmt(billing.total_charges)}</div>
                </div>
                <div className="bg-white p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">Σύνολο Πληρωμών</div>
                  <div className="font-serif-display text-2xl text-emerald-700 mt-2">{fmt(billing.total_payments)}</div>
                </div>
                <div className="bg-white p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">{billing.balance > 0 ? "Χρωστάει" : "Καθαρό"}</div>
                  <div className={`font-serif-display text-2xl mt-2 ${billing.balance > 0 ? "text-amber-600" : "text-slate-900"}`}>{fmt(billing.balance)}</div>
                </div>
              </div>

              <form onSubmit={addBilling} className="bg-[#F5F5F5] p-4 mb-6">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold mb-3">Νέα Εγγραφή</div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                  <div className="md:col-span-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Τύπος</label>
                    <select value={billForm.type} onChange={(e) => setBillForm({ ...billForm, type: e.target.value })}
                      data-testid="billing-type"
                      className="w-full mt-1 p-2.5 border border-slate-300 text-sm bg-white">
                      <option value="charge">Χρέωση</option>
                      <option value="payment">Πληρωμή</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Ποσό (€)</label>
                    <input type="number" step="0.01" required value={billForm.amount}
                      onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })}
                      data-testid="billing-amount"
                      className="w-full mt-1 p-2.5 border border-slate-300 text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Ημερομηνία</label>
                    <input type="date" required value={billForm.date}
                      onChange={(e) => setBillForm({ ...billForm, date: e.target.value })}
                      data-testid="billing-date"
                      className="w-full mt-1 p-2.5 border border-slate-300 text-sm" />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Περιγραφή</label>
                    <input value={billForm.description}
                      onChange={(e) => setBillForm({ ...billForm, description: e.target.value })}
                      data-testid="billing-description"
                      placeholder="π.χ. Λογιστικά Μαΐου"
                      className="w-full mt-1 p-2.5 border border-slate-300 text-sm" />
                  </div>
                  <button type="submit" data-testid="billing-submit"
                    className="px-4 py-2.5 bg-[#1E3A8A] text-white text-xs tracking-wider uppercase font-semibold hover:bg-[#1E40AF]">
                    Προσθήκη
                  </button>
                </div>
              </form>

              {billing.entries.length === 0 ? (
                <div className="text-sm text-slate-400 py-8 text-center border border-dashed border-slate-300">
                  Καμία εγγραφή στην καρτέλα.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-[#F5F5F5] text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
                    <tr>
                      <th className="text-left p-3">Ημερομηνία</th>
                      <th className="text-left p-3">Τύπος</th>
                      <th className="text-left p-3">Περιγραφή</th>
                      <th className="text-right p-3">Ποσό</th>
                      <th className="text-right p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {billing.entries.map((e) => (
                      <tr key={e.id} className="border-t border-slate-100">
                        <td className="p-3 text-slate-700">{e.date}</td>
                        <td className="p-3">
                          <span className={`text-[10px] uppercase tracking-wider px-2 py-1 ${e.type === "payment" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                            {e.type === "payment" ? "Πληρωμή" : "Χρέωση"}
                          </span>
                        </td>
                        <td className="p-3 text-slate-600">{e.description || "—"}</td>
                        <td className={`p-3 text-right font-semibold ${e.type === "payment" ? "text-emerald-700" : "text-slate-900"}`}>
                          {e.type === "payment" ? "+" : "−"}{fmt(e.amount)}
                        </td>
                        <td className="p-3 text-right">
                          <button onClick={() => delBilling(e.id)} className="text-red-600 hover:text-red-800"
                            data-testid={`billing-del-${e.id}`}><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
