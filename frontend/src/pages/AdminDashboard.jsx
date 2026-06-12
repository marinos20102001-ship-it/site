import React, { useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { Users, Wallet, TrendingUp, FileText, Plus, X, Upload, Trash2, Activity, Eye } from "lucide-react";
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
  const [openCreate, setOpenCreate] = useState(false);
  const [openView, setOpenView] = useState(null);
  const [err, setErr] = useState("");

  const reload = async () => {
    try {
      const [s, c] = await Promise.all([api.get("/admin/stats"), api.get("/admin/clients")]);
      setStats(s.data);
      setClients(c.data);
    } catch (e) {
      setErr(formatApiErrorDetail(e?.response?.data?.detail) || e.message);
    }
  };

  useEffect(() => { reload(); }, []);

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200">
          <KPI label="Σύνολο Πελατών" value={stats.total_clients} icon={Users} />
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

        {/* Clients Table */}
        <div className="bg-white border border-slate-200 mt-6">
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
                  <th className="text-right p-4">Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr><td colSpan="5" className="text-center text-slate-400 py-12">Κανένας πελάτης ακόμα.</td></tr>
                ) : clients.map((c) => (
                  <tr key={c.id} data-testid={`client-row-${c.id}`} className="border-t border-slate-100">
                    <td className="p-4 text-slate-900 font-medium">{c.name}</td>
                    <td className="p-4 text-slate-600">{c.email}</td>
                    <td className="p-4 text-slate-600">{c.company || "—"}</td>
                    <td className="p-4 text-slate-600">{c.afm || "—"}</td>
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
      </div>

      {openCreate && <CreateClientModal onClose={() => setOpenCreate(false)} onSaved={() => { setOpenCreate(false); reload(); }} />}
      {openView && <ClientDetailModal client={openView} onClose={() => setOpenView(null)} />}
    </div>
  );
}

function CreateClientModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ email: "", password: "", name: "", company: "", phone: "", afm: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" data-testid="create-client-modal">
      <div className="bg-white max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h3 className="font-serif-display text-2xl text-slate-900">Νέος Πελάτης</h3>
          <button onClick={onClose} data-testid="modal-close-btn"><X size={20} /></button>
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
                  <input type="file" accept=".xlsx,.csv,.pdf" data-testid="upload-file-input" onChange={upload} className="hidden" />
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
                      <span className="text-sm text-slate-800 truncate">{f.name}</span>
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
