import React, { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { Users, Wallet, TrendingUp, FileText, Plus, X, Upload, Trash2, Activity, Eye, Mail, Phone, Briefcase, MessageSquare } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

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
  const [tab, setTab] = useState("clients"); // clients | quotes
  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState(null);
  const [err, setErr] = useState("");

  const reload = async () => {
    try {
      const [s, c, q] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/clients"),
        api.get("/admin/quotes"),
      ]);
      setStats(s.data);
      setClients(c.data);
      setQuotes(q.data);
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
    if (!window.confirm("Διαγραφή αιτήματος;")) return;
    await api.delete(`/admin/quotes/${qid}`);
    reload();
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

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-px bg-slate-200">
          <KPI label="Σύνολο Πελατών" value={stats.total_clients} icon={Users} />
          <KPI label="Νέα Αιτήματα" value={stats.new_quotes || 0} icon={MessageSquare} accent={stats.new_quotes ? "bg-amber-600 text-white" : "bg-slate-700 text-white"} />
          <KPI label="Συνολικά Έσοδα" value={fmt(stats.total_income)} icon={TrendingUp} />
          <KPI label="Καθαρά Κέρδη" value={fmt(stats.total_profit)} icon={Wallet} accent={stats.total_profit >= 0 ? "bg-[#1E3A8A] text-white" : "bg-red-600 text-white"} />
          <KPI label="Αρχεία" value={stats.total_files} icon={FileText} accent="bg-slate-700 text-white" />
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
        <div className="mt-10 flex border-b border-slate-200">
          <button
            onClick={() => setTab("clients")}
            data-testid="tab-clients"
            className={`px-6 py-3 text-xs font-semibold tracking-[0.2em] uppercase transition-colors ${tab === "clients" ? "border-b-2 border-[#1E3A8A] text-[#1E3A8A]" : "text-slate-500 hover:text-slate-700"}`}
          >
            Πελάτες ({clients.length})
          </button>
          <button
            onClick={() => setTab("quotes")}
            data-testid="tab-quotes"
            className={`px-6 py-3 text-xs font-semibold tracking-[0.2em] uppercase transition-colors flex items-center gap-2 ${tab === "quotes" ? "border-b-2 border-[#1E3A8A] text-[#1E3A8A]" : "text-slate-500 hover:text-slate-700"}`}
          >
            Αιτήματα Προσφοράς ({quotes.length})
            {stats.new_quotes > 0 && (
              <span className="bg-amber-600 text-white text-[10px] px-1.5 py-0.5">{stats.new_quotes}</span>
            )}
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
                          onClick={async () => {
                            if (!window.confirm(`Διαγραφή πελάτη ${c.name};`)) return;
                            await api.delete(`/admin/clients/${c.id}`);
                            reload();
                          }}
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
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const load = async () => {
    try {
      const r = await api.get(`/admin/clients/${client.id}/dashboard`);
      setData(r.data);
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
    if (!window.confirm(`Διαγραφή ${filename};`)) return;
    await api.delete(`/admin/clients/${client.id}/files/${encodeURIComponent(filename)}`);
    load();
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
          {!data ? (
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
          )}
        </div>
      </div>
    </div>
  );
}
