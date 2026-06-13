import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Wallet, AlertCircle, FileText, Download, Calendar, BookOpen, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const CHART_COLORS = ["#1E3A8A", "#3B82F6", "#94A3B8", "#64748B", "#0F172A"];

const fmt = (n) =>
  new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n || 0);

function KPI({ label, value, icon: Icon, accent, sub }) {
  return (
    <div data-testid={`kpi-${label}`} className="bg-white border border-slate-200 p-6">
      <div className="flex items-start justify-between">
        <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-semibold">{label}</div>
        <div className={`w-9 h-9 flex items-center justify-center ${accent || "bg-[#1E3A8A] text-white"}`}>
          <Icon size={16} strokeWidth={1.5} />
        </div>
      </div>
      <div className="mt-5 font-serif-display text-3xl text-slate-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/client/dashboard")
      .then((r) => setData(r.data))
      .catch((e) => setError(e?.response?.data?.detail || "Αποτυχία φόρτωσης"));
  }, []);

  if (error) return <div className="p-12 text-red-600">{error}</div>;
  if (!data) return <div className="p-12 text-slate-500" data-testid="dashboard-loading">Φόρτωση δεδομένων…</div>;

  const t = data.totals || {};
  const monthly = data.monthly || [];
  const vatData = monthly.map((m) => ({ month: m.month, ΦΠΑ: m.vat })).filter((x) => x.ΦΠΑ);
  const pie = [
    { name: "Έσοδα", value: t.income || 0 },
    { name: "Έξοδα", value: t.expense || 0 },
    { name: "ΦΠΑ", value: t.vat || 0 },
    { name: "Οφειλές", value: t.obligations || 0 },
  ].filter((p) => p.value > 0);

  return (
    <div data-testid="client-dashboard" className="bg-[#F5F5F5] min-h-screen">
      <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto py-10 md:py-14">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#1E3A8A] font-semibold">— Dashboard</div>
            <h1 className="font-serif-display text-3xl md:text-4xl lg:text-5xl text-slate-900 mt-2">
              Καλώς ήρθατε, {user?.name?.split(" ")[0] || "Πελάτη"}.
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              {user?.company || "—"} · ΑΦΜ: {user?.afm || "—"}
            </p>
          </div>
          <div className="text-xs text-slate-500 tracking-wider uppercase">
            {data.records_count} εγγραφές · {data.files?.length || 0} αρχεία
          </div>
        </div>

        {/* Απλογραφικά Βιβλία Banner */}
        {user?.books_type === "simple" && (
          <Link
            to="/dashboard/books"
            data-testid="books-link-banner"
            className="block bg-[#1E3A8A] text-white mb-10 group hover:bg-[#1E40AF] transition-colors"
          >
            <div className="flex items-center justify-between p-6 md:p-7">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-white/10 flex items-center justify-center shrink-0">
                  <BookOpen size={22} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-blue-200 font-semibold">— Απλογραφικά Βιβλία</div>
                  <div className="font-serif-display text-xl md:text-2xl mt-1">Ισοζύγιο Λογαριασμών</div>
                  <div className="text-xs text-blue-200 mt-1">Πάγια · Αγορές · ΦΠΑ · Έξοδα · Έσοδα</div>
                </div>
              </div>
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200">
          <KPI label="Συνολικά Έσοδα" value={fmt(t.income)} icon={TrendingUp} />
          <KPI label="Συνολικά Έξοδα" value={fmt(t.expense)} icon={TrendingDown} accent="bg-slate-700 text-white" />
          <KPI label="Καθαρό Αποτέλεσμα" value={fmt(t.profit)} icon={Wallet} accent={t.profit >= 0 ? "bg-[#1E3A8A] text-white" : "bg-red-600 text-white"} />
          <KPI label="Εκκρεμείς Υποχρεώσεις" value={fmt(t.obligations)} icon={AlertCircle} accent="bg-amber-600 text-white" sub={`Πληρωμές: ${fmt(t.payments)}`} />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10">
          <div className="lg:col-span-2 bg-white border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-serif-display text-xl text-slate-900">Έσοδα vs Έξοδα — Μηνιαία</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={monthly}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1E3A8A" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#1E3A8A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94A3B8" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#94A3B8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: 0, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="income" name="Έσοδα" stroke="#1E3A8A" strokeWidth={2} fill="url(#rev)" />
                <Area type="monotone" dataKey="expense" name="Έξοδα" stroke="#94A3B8" strokeWidth={2} fill="url(#exp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-slate-200 p-6">
            <h3 className="font-serif-display text-xl text-slate-900 mb-6">Κατανομή</h3>
            {pie.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-20">Δεν υπάρχουν δεδομένα.</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2}>
                    {pie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ border: "1px solid #E2E8F0", borderRadius: 0, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white border border-slate-200 p-6">
            <h3 className="font-serif-display text-xl text-slate-900 mb-6">Τάση Κερδών</h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: 0, fontSize: 12 }} formatter={(v) => fmt(v)} />
                <Line type="monotone" dataKey="profit" name="Κέρδος" stroke="#1E3A8A" strokeWidth={2.5} dot={{ r: 4, fill: "#1E3A8A" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white border border-slate-200 p-6">
            <h3 className="font-serif-display text-xl text-slate-900 mb-6">Ανάλυση ΦΠΑ</h3>
            {vatData.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-20">Δεν υπάρχουν δεδομένα ΦΠΑ.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={vatData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
                  <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: 0, fontSize: 12 }} formatter={(v) => fmt(v)} />
                  <Bar dataKey="ΦΠΑ" fill="#1E3A8A" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Files & Recent */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="bg-white border border-slate-200 p-6">
            <h3 className="font-serif-display text-xl text-slate-900 mb-4 flex items-center gap-2">
              <FileText size={18} /> Τα Αρχεία μου
            </h3>
            <div className="space-y-2">
              {(data.files || []).length === 0 ? (
                <div className="text-sm text-slate-400 py-8 text-center">Δεν υπάρχουν αρχεία ακόμα.</div>
              ) : (
                data.files.map((f, i) => (
                  <a
                    key={i}
                    href={`${process.env.REACT_APP_BACKEND_URL}/api/client/files/${encodeURIComponent(f.name)}`}
                    target="_blank" rel="noreferrer"
                    data-testid={`client-file-${i}`}
                    className="flex items-center justify-between px-4 py-3 border border-slate-200 hover:border-[#1E3A8A] hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[10px] uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1">{f.ext.replace(".", "")}</span>
                      <span className="text-sm text-slate-800 truncate">{f.name}</span>
                    </div>
                    <Download size={14} className="text-slate-400 shrink-0" />
                  </a>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-6">
            <h3 className="font-serif-display text-xl text-slate-900 mb-4 flex items-center gap-2">
              <Calendar size={18} /> Πρόσφατες Κινήσεις
            </h3>
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {(data.recent || []).length === 0 ? (
                <div className="text-sm text-slate-400 py-8 text-center">Καμία κίνηση.</div>
              ) : (
                data.recent.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-2.5 border-b border-slate-100 last:border-0">
                    <div className="min-w-0">
                      <div className="text-slate-900 truncate">{r.description || r.type}</div>
                      <div className="text-[11px] text-slate-500">{r.date || "—"} · {r.type}</div>
                    </div>
                    <div className={`font-semibold ${r.type === "expense" || r.type === "obligation" ? "text-red-600" : "text-[#1E3A8A]"}`}>
                      {r.type === "expense" || r.type === "obligation" ? "−" : "+"}{fmt(r.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
