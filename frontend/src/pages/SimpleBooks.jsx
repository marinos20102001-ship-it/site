import React, { useEffect, useMemo, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { BookOpen, Calendar, FileSpreadsheet, ArrowLeft, AlertCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell, Legend } from "recharts";

const fmt = (n) =>
  new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n || 0);

const GROUP_COLORS = {
  "1": "#1E3A8A",
  "2": "#3B82F6",
  "54": "#94A3B8",
  "6": "#64748B",
  "7": "#0F172A",
};

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
    if (!data?.groups) return [];
    return data.groups
      .filter((g) => g.rows.length > 0)
      .map((g) => ({
        name: g.label,
        key: g.key,
        Χρέωση: g.total_debit,
        Πίστωση: g.total_credit,
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
            <div className="mt-4 text-xs text-slate-500">
              Στόχος μήνας: {data.target_month_name} {data.target_year}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const groupsWithData = data.groups.filter((g) => g.rows.length > 0);
  const totalDebit = groupsWithData.reduce((s, g) => s + g.total_debit, 0);
  const totalCredit = groupsWithData.reduce((s, g) => s + g.total_credit, 0);

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
              Ισοζύγιο · {data.display_month_name} {data.year}
            </h1>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-600">
              <span className="flex items-center gap-1.5"><Calendar size={12} /> {user?.company || user?.name}</span>
              <span className="flex items-center gap-1.5"><Clock size={12} /> Τελευταία ενημέρωση: {fmtDateTime(data.uploaded_at)}</span>
              <span className="flex items-center gap-1.5"><FileSpreadsheet size={12} /> {data.source_file}</span>
            </div>
          </div>
        </div>

        {data.fallback_used && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 mb-8 flex items-start gap-3 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              Δεν υπάρχουν ακόμη δεδομένα για {data.target_month_name} {data.target_year}.
              Εμφανίζονται τα τελευταία διαθέσιμα ({data.display_month_name}).
            </div>
          </div>
        )}

        {/* Totals row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-slate-200 mb-8">
          <div className="bg-white p-6">
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-semibold">Σύνολο Χρέωσης</div>
            <div className="mt-2 font-serif-display text-3xl text-[#1E3A8A]" data-testid="total-debit">{fmt(totalDebit)}</div>
          </div>
          <div className="bg-white p-6">
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-semibold">Σύνολο Πίστωσης</div>
            <div className="mt-2 font-serif-display text-3xl text-slate-700" data-testid="total-credit">{fmt(totalCredit)}</div>
          </div>
          <div className="bg-white p-6 col-span-2 md:col-span-1">
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-semibold">Καθαρό Υπόλοιπο</div>
            <div className="mt-2 font-serif-display text-3xl text-slate-900" data-testid="total-balance">{fmt(totalDebit - totalCredit)}</div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white border border-slate-200 p-6 mb-8">
          <h3 className="font-serif-display text-xl text-slate-900 mb-6">Ανά Κατηγορία — {data.display_month_name} {data.year}</h3>
          {chartData.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-12">Δεν υπάρχουν κινήσεις.</div>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} interval={0} angle={0} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip contentStyle={{ border: "1px solid #E2E8F0", borderRadius: 0, fontSize: 12 }} formatter={(v) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Χρέωση" fill="#1E3A8A">
                  {chartData.map((d, i) => <Cell key={i} fill={GROUP_COLORS[d.key] || "#1E3A8A"} />)}
                </Bar>
                <Bar dataKey="Πίστωση" fill="#94A3B8" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Groups */}
        <div className="space-y-6">
          {groupsWithData.length === 0 ? (
            <div className="bg-white border border-slate-200 p-10 text-center text-slate-500 text-sm">
              Δεν υπάρχουν κινήσεις για {data.display_month_name}.
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
                  <div className="text-slate-500">Σύνολο</div>
                  <div className="font-semibold text-[#1E3A8A] mt-0.5">{fmt(g.total_debit - g.total_credit)}</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[#F5F5F5] text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
                    <tr>
                      <th className="text-left p-4 w-32">Λογαριασμός</th>
                      <th className="text-left p-4">Περιγραφή</th>
                      <th className="text-right p-4">Χρέωση</th>
                      <th className="text-right p-4">Πίστωση</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="p-4 font-mono text-slate-900 font-semibold">{r.code}</td>
                        <td className="p-4 text-slate-600">{r.description}</td>
                        <td className="p-4 text-right text-[#1E3A8A] font-semibold">{r.debit ? fmt(r.debit) : "—"}</td>
                        <td className="p-4 text-right text-slate-700 font-semibold">{r.credit ? fmt(r.credit) : "—"}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                      <td className="p-4" colSpan="2">Σύνολο</td>
                      <td className="p-4 text-right text-[#1E3A8A]">{fmt(g.total_debit)}</td>
                      <td className="p-4 text-right text-slate-700">{fmt(g.total_credit)}</td>
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

function fmtDateTime(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("el-GR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}
