import React, { useEffect, useMemo, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { BookOpen, Calendar, FileSpreadsheet, ArrowLeft, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

const fmt = (n) =>
  new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n || 0);

const GROUP_COLORS = {
  "1": "#1E3A8A",
  "2": "#3B82F6",
  "6": "#64748B",
  "7": "#0F172A",
};

const GROUP_LABELS_SHORT = {
  "1": "Πάγια",
  "2": "Αγορές",
  "6": "Έξοδα",
  "7": "Έσοδα",
};

function formatAsOf(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("el-GR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("el-GR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function fmtCell(v) {
  if (!v) return <span className="text-slate-300">—</span>;
  if (v < 0) return <span className="text-red-600">{fmt(v)}</span>;
  return <span>{fmt(v)}</span>;
}

export default function SimpleBooks() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/client/books/simple")
      .then((r) => setData(r.data))
      .catch((e) => setErr(formatApiErrorDetail(e?.response?.data?.detail) || e.message));
  }, []);

  const chartData = useMemo(() => {
    if (!data?.monthly_summary) return [];
    return data.monthly_summary.map((m) => ({
      name: m.month_name.substring(0, 3),
      Πάγια: m["1"] || 0,
      Αγορές: m["2"] || 0,
      Έξοδα: m["6"] || 0,
      Έσοδα: m["7"] || 0,
    }));
  }, [data]);

  if (err) return <div className="p-12 text-red-600" data-testid="books-error">{err}</div>;
  if (!data) return <div className="p-12 text-slate-500" data-testid="books-loading">Φόρτωση…</div>;

  if (data.books_type === "double") {
    return (
      <div className="bg-[#F5F5F5] min-h-screen px-6 md:px-12 lg:px-20 py-16 max-w-[1400px] mx-auto">
        <Link to="/dashboard" data-testid="books-back-dashboard" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-500 hover:text-[#1E3A8A] mb-8">
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <div className="bg-white border border-slate-200 p-10 text-center">
          <BookOpen size={36} className="mx-auto text-[#1E3A8A]" strokeWidth={1.5} />
          <h2 className="font-serif-display text-2xl mt-4">Διπλογραφικά Βιβλία</h2>
          <p className="text-slate-600 mt-2 text-sm">Η ροή για διπλογραφικά βιβλία είναι υπό υλοποίηση.</p>
        </div>
      </div>
    );
  }

  if (!data.has_data) {
    return (
      <div className="bg-[#F5F5F5] min-h-screen">
        <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto py-14">
          <Link to="/dashboard" data-testid="books-back-dashboard" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-500 hover:text-[#1E3A8A] mb-8">
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <div className="bg-white border border-slate-200 p-10">
            <FileSpreadsheet size={36} className="text-[#1E3A8A]" strokeWidth={1.5} />
            <h2 className="font-serif-display text-2xl mt-4">Απλογραφικά Βιβλία</h2>
            <p className="text-slate-600 mt-2 text-sm">
              Δεν έχει ανέβει ακόμη ισοζύγιο. Παρακαλούμε επικοινωνήστε με το γραφείο μας.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const groupsWithData = data.groups.filter((g) => g.rows.length > 0);
  const months = data.months || [];

  return (
    <div data-testid="simple-books-page" className="bg-[#F5F5F5] min-h-screen">
      <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto py-10 md:py-14">
        <Link to="/dashboard" data-testid="books-back-dashboard" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-500 hover:text-[#1E3A8A] mb-6">
          <ArrowLeft size={14} /> Πίσω στο Dashboard
        </Link>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#1E3A8A] font-semibold">— Απλογραφικά Βιβλία</div>
            <h1 className="font-serif-display text-3xl md:text-4xl lg:text-5xl text-slate-900 mt-2">
              Ισοζύγιο έως {formatAsOf(data.as_of)}
            </h1>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-600">
              <span className="flex items-center gap-1.5"><Calendar size={12} /> {user?.company || user?.name}</span>
              <span className="flex items-center gap-1.5"><Clock size={12} /> Τελευταία ενημέρωση: {fmtDateTime(data.uploaded_at)}</span>
              <span className="flex items-center gap-1.5"><FileSpreadsheet size={12} /> {data.source_file}</span>
            </div>
          </div>
        </div>

        {/* Group totals strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 mb-8">
          {["1", "2", "6", "7"].map((key) => {
            const g = data.groups.find((x) => x.key === key);
            const total = g?.total_balance || 0;
            return (
              <div key={key} className="bg-white p-5" data-testid={`group-total-${key}`}>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-5" style={{ background: GROUP_COLORS[key] }} />
                  <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-semibold">
                    Ομάδα {key} · {GROUP_LABELS_SHORT[key]}
                  </div>
                </div>
                <div className={`mt-3 font-serif-display text-2xl ${total < 0 ? "text-red-600" : "text-slate-900"}`}>
                  {fmt(total)}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Σύνολο υπολοίπου έως {data.last_month_name}</div>
              </div>
            );
          })}
        </div>

        {/* Bar chart by month */}
        <div className="bg-white border border-slate-200 p-6 mb-8">
          <h3 className="font-serif-display text-xl text-slate-900 mb-6">Υπόλοιπα ανά Μήνα · {data.year}</h3>
          {chartData.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-12">Δεν υπάρχουν κινήσεις.</div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: 0, fontSize: 12 }} formatter={(v) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Πάγια" fill={GROUP_COLORS["1"]} />
                <Bar dataKey="Αγορές" fill={GROUP_COLORS["2"]} />
                <Bar dataKey="Έξοδα" fill={GROUP_COLORS["6"]} />
                <Bar dataKey="Έσοδα" fill={GROUP_COLORS["7"]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Groups - each with per-month balance table */}
        <div className="space-y-6">
          {groupsWithData.length === 0 ? (
            <div className="bg-white border border-slate-200 p-10 text-center text-slate-500 text-sm">
              Δεν υπάρχουν κινήσεις.
            </div>
          ) : groupsWithData.map((g) => (
            <div key={g.key} className="bg-white border border-slate-200" data-testid={`group-${g.key}`}>
              <div className="flex items-center justify-between p-5 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-10" style={{ background: GROUP_COLORS[g.key] }} />
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-semibold">Ομάδα {g.key}</div>
                    <h3 className="font-serif-display text-xl text-slate-900">{g.label}</h3>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className="text-slate-500">Σύνολο Υπολοίπου</div>
                  <div className={`font-semibold mt-0.5 ${g.total_balance < 0 ? "text-red-600" : "text-[#1E3A8A]"}`}>{fmt(g.total_balance)}</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid={`group-table-${g.key}`}>
                  <thead className="bg-[#F5F5F5] text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
                    <tr>
                      <th className="text-left p-3 w-24 sticky left-0 bg-[#F5F5F5] z-10">Λογ/σμός</th>
                      <th className="text-left p-3 min-w-[200px] sticky left-24 bg-[#F5F5F5] z-10">Περιγραφή</th>
                      {months.map((m) => (
                        <th key={m.index} className="text-right p-3 whitespace-nowrap min-w-[110px]">
                          Υπόλ. {m.name.substring(0, 3)}
                        </th>
                      ))}
                      <th className="text-right p-3 whitespace-nowrap bg-[#1E3A8A]/5 min-w-[130px]">Σύνολο Υπολοίπου</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r, i) => (
                      <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="p-3 font-mono text-slate-900 font-semibold sticky left-0 bg-white">{r.code}</td>
                        <td className="p-3 text-slate-600 sticky left-24 bg-white">{r.description}</td>
                        {months.map((m) => (
                          <td key={m.index} className="p-3 text-right text-slate-700">
                            {fmtCell(r.monthly_balance[m.index])}
                          </td>
                        ))}
                        <td className={`p-3 text-right font-semibold bg-[#1E3A8A]/5 ${r.total_balance < 0 ? "text-red-600" : "text-[#1E3A8A]"}`}>
                          {fmt(r.total_balance)}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                      <td className="p-3 sticky left-0 bg-slate-50" colSpan="2">Σύνολο Ομάδας</td>
                      {months.map((m) => (
                        <td key={m.index} className="p-3 text-right text-slate-900">
                          {fmtCell(g.monthly_balance[m.index])}
                        </td>
                      ))}
                      <td className={`p-3 text-right ${g.total_balance < 0 ? "text-red-600" : "text-[#1E3A8A]"}`}>
                        {fmt(g.total_balance)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
