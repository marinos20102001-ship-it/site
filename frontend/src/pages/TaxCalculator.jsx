import React, { useMemo, useState } from "react";
import { Calculator, ArrowRight, TrendingUp, TrendingDown, Wallet, Users, Home, Briefcase, User, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import SEO from "@/components/SEO";

// Tax brackets per year
const SCALES = {
  2025: [
    { from: 0, to: 10000, rate: 0.09 },
    { from: 10000, to: 20000, rate: 0.22 },
    { from: 20000, to: 30000, rate: 0.28 },
    { from: 30000, to: 40000, rate: 0.36 },
    { from: 40000, to: Infinity, rate: 0.44 },
  ],
  2026: [
    { from: 0, to: 10000, rate: 0.09 },
    { from: 10000, to: 20000, rate: 0.20 },
    { from: 20000, to: 30000, rate: 0.26 },
    { from: 30000, to: 40000, rate: 0.34 },
    { from: 40000, to: Infinity, rate: 0.44 },
  ],
};

function applyAgeAdjust(year, age, scale) {
  if (year !== 2026) return scale;
  if (age === "under25") {
    return scale.map((b, i) => (i < 2 ? { ...b, rate: 0 } : b));
  }
  if (age === "25-30") {
    return scale.map((b, i) => (i === 1 ? { ...b, rate: 0.09 } : b));
  }
  return scale;
}

function calcBaseTax(amount, scale) {
  let total = 0;
  const breakdown = [];
  for (const b of scale) {
    if (amount <= b.from) break;
    const cap = Math.min(amount, b.to);
    const inBracket = Math.max(0, cap - b.from);
    const tax = inBracket * b.rate;
    breakdown.push({ from: b.from, to: b.to, rate: b.rate, amount: inBracket, tax });
    total += tax;
  }
  return { total, breakdown };
}

function calcRentTax(rent, year) {
  if (rent <= 0) return 0;
  if (year === 2025) {
    if (rent <= 12000) return rent * 0.15;
    if (rent <= 35000) return 12000 * 0.15 + (rent - 12000) * 0.35;
    return 12000 * 0.15 + 23000 * 0.35 + (rent - 35000) * 0.45;
  }
  // 2026
  if (rent <= 12000) return rent * 0.15;
  if (rent <= 24000) return 12000 * 0.15 + (rent - 12000) * 0.25;
  if (rent <= 35000) return 12000 * 0.15 + 12000 * 0.25 + (rent - 24000) * 0.35;
  return 12000 * 0.15 + 12000 * 0.25 + 11000 * 0.35 + (rent - 35000) * 0.45;
}

function calcRelief(children, income, baseTax) {
  let base;
  if (children <= 0) base = 777;
  else if (children === 1) base = 900;
  else if (children === 2) base = 1120;
  else if (children === 3) base = 1340;
  else base = 1580 + (children - 4) * 220;
  let reduction = 0;
  if (income > 12000) reduction = ((income - 12000) / 1000) * 20;
  const relief = Math.max(0, base - reduction);
  return Math.min(baseTax, relief);
}

const fmt = (n) =>
  new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n || 0);
const fmtPct = (n) => `${(n * 100).toFixed(0)}%`;

export default function TaxCalculator() {
  const [year, setYear] = useState(2026);
  const [entity, setEntity] = useState("individual"); // individual | business
  const [age, setAge] = useState("normal"); // normal | under25 | 25-30
  const [income, setIncome] = useState(25000);
  const [rent, setRent] = useState(0);
  const [withheld, setWithheld] = useState(0);
  const [children, setChildren] = useState(0);

  const result = useMemo(() => {
    const scale = applyAgeAdjust(year, age, SCALES[year]);
    const { total: baseTax, breakdown } = calcBaseTax(income, scale);
    const rentTax = calcRentTax(rent, year);
    const relief = entity === "individual" ? calcRelief(children, income, baseTax) : 0;
    const totalBeforeWh = baseTax + rentTax - relief;
    const finalTax = totalBeforeWh - withheld;
    const effectiveRate = income + rent > 0 ? totalBeforeWh / (income + rent) : 0;
    return { baseTax, breakdown, rentTax, relief, totalBeforeWh, finalTax, effectiveRate, scale };
  }, [year, entity, age, income, rent, withheld, children]);

  const chartData = result.breakdown.map((b) => ({
    name: b.to === Infinity ? `40k+` : `${(b.from / 1000) | 0}–${(b.to / 1000) | 0}k`,
    Φόρος: +b.tax.toFixed(2),
    rate: fmtPct(b.rate),
  }));

  const pieData = [
    { name: "Βασικός Φόρος", value: Math.max(0, result.baseTax) },
    { name: "Φόρος Ενοικίων", value: Math.max(0, result.rentTax) },
  ].filter((p) => p.value > 0);

  const PIE_COLORS = ["#1E3A8A", "#94A3B8"];
  const refund = result.finalTax < 0;

  return (
    <div data-testid="tax-calc-page" className="bg-white">
      <SEO
        title="Υπολογιστής Φόρου Εισοδήματος 2025 / 2026"
        description="Δωρεάν online υπολογιστής φόρου εισοδήματος για φυσικά πρόσωπα. Νέες κλίμακες 2025 & 2026, μειώσεις για νέους (κάτω 25 και 25-30), εξαρτώμενα μέλη, εισόδημα από ενοίκια."
        path="/tax-calculator"
      />
      {/* Hero */}
      <section className="bg-[#1E3A8A] text-white">
        <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto py-20 md:py-28">
          <div className="grid md:grid-cols-12 gap-8 items-end">
            <div className="md:col-span-8">
              <div className="text-[10px] uppercase tracking-[0.3em] text-blue-200 mb-4 flex items-center gap-2">
                <Sparkles size={12} /> Υπολογιστής Φόρου
              </div>
              <h1 className="font-serif-display text-4xl md:text-5xl lg:text-6xl leading-tight">
                Υπολογισμός φόρου<br />εισοδήματος <span className="italic text-blue-200">2025 / 2026</span>
              </h1>
            </div>
            <div className="md:col-span-4">
              <p className="text-blue-100 leading-relaxed text-sm">
                Άμεσος, ακριβής υπολογισμός φόρου εισοδήματος για ιδιώτες και ατομικές επιχειρήσεις
                με βάση τις ισχύουσες φορολογικές κλίμακες.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Main */}
      <section className="bg-[#F5F5F5] py-14 md:py-20">
        <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto grid lg:grid-cols-12 gap-6">
          {/* INPUT PANEL */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-slate-200">
              <div className="p-6 border-b border-slate-200 flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1E3A8A] text-white flex items-center justify-center">
                  <Calculator size={18} strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-semibold">Στοιχεία</div>
                  <h2 className="font-serif-display text-2xl text-slate-900">Παράμετροι Υπολογισμού</h2>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Year toggle */}
                <div>
                  <label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-semibold">Φορολογικό Έτος</label>
                  <div className="mt-2 grid grid-cols-2 gap-px bg-slate-200">
                    {[2025, 2026].map((y) => (
                      <button
                        key={y}
                        type="button"
                        onClick={() => setYear(y)}
                        data-testid={`year-${y}`}
                        className={`py-3 text-sm font-semibold tracking-wider transition-colors ${year === y ? "bg-[#1E3A8A] text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
                      >
                        {y}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Entity */}
                <div>
                  <label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-semibold">Τύπος Φορολογούμενου</label>
                  <div className="mt-2 grid grid-cols-2 gap-px bg-slate-200">
                    <button
                      type="button"
                      onClick={() => setEntity("individual")}
                      data-testid="entity-individual"
                      className={`py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${entity === "individual" ? "bg-[#1E3A8A] text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
                    >
                      <User size={14} /> Μισθωτός / Ιδιώτης
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntity("business")}
                      data-testid="entity-business"
                      className={`py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${entity === "business" ? "bg-[#1E3A8A] text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
                    >
                      <Briefcase size={14} /> Ατομική Επιχείρηση
                    </button>
                  </div>
                </div>

                {/* Age (only 2026) */}
                {year === 2026 && entity === "individual" && (
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-semibold">Ηλικιακή Ομάδα (Φοροαπαλλαγή 2026)</label>
                    <div className="mt-2 grid grid-cols-3 gap-px bg-slate-200">
                      {[
                        { v: "normal", l: "Κανονική" },
                        { v: "25-30", l: "25-30 ετών" },
                        { v: "under25", l: "Κάτω 25" },
                      ].map((o) => (
                        <button
                          key={o.v}
                          type="button"
                          onClick={() => setAge(o.v)}
                          data-testid={`age-${o.v}`}
                          className={`py-3 text-xs font-medium transition-colors ${age === o.v ? "bg-[#1E3A8A] text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
                        >
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Income */}
                <NumField
                  label={entity === "business" ? "Καθαρά Κέρδη (€)" : "Ετήσιο Εισόδημα (€)"}
                  value={income}
                  onChange={setIncome}
                  testId="input-income"
                />

                {/* Rent */}
                <NumField
                  label="Εισόδημα από Ενοίκια (€)"
                  value={rent}
                  onChange={setRent}
                  testId="input-rent"
                />

                {/* Withheld */}
                <NumField
                  label={entity === "business" ? "Παρακρατηθείς Φόρος (€)" : "Παρακράτηση ΦΜΥ (€)"}
                  value={withheld}
                  onChange={setWithheld}
                  testId="input-withheld"
                />

                {/* Children */}
                {entity === "individual" && (
                  <div>
                    <label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-semibold flex items-center gap-2">
                      <Users size={12} /> Εξαρτώμενα Τέκνα
                    </label>
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setChildren(Math.max(0, children - 1))}
                        data-testid="children-dec"
                        className="w-10 h-10 border border-slate-300 hover:border-[#1E3A8A] hover:text-[#1E3A8A] text-xl"
                      >−</button>
                      <input
                        type="number"
                        min="0"
                        value={children}
                        onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value || "0")))}
                        data-testid="children-input"
                        className="flex-1 text-center py-2.5 border border-slate-300 outline-none focus:border-[#1E3A8A] text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setChildren(children + 1)}
                        data-testid="children-inc"
                        className="w-10 h-10 border border-slate-300 hover:border-[#1E3A8A] hover:text-[#1E3A8A] text-xl"
                      >+</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RESULT PANEL */}
          <div className="lg:col-span-7 space-y-6">
            {/* Result Hero */}
            <div className={`border border-slate-200 ${refund ? "bg-emerald-50" : "bg-[#1E3A8A]"} text-${refund ? "emerald-900" : "white"} p-8 md:p-10`}>
              <div className={`text-[10px] uppercase tracking-[0.3em] font-semibold mb-4 ${refund ? "text-emerald-700" : "text-blue-200"}`}>
                {refund ? "Επιστροφή Φόρου" : "Φόρος προς Καταβολή"}
              </div>
              <div className="flex items-end gap-4 flex-wrap">
                <div className="font-serif-display text-5xl md:text-6xl lg:text-7xl tracking-tight" data-testid="result-final-tax">
                  {fmt(Math.abs(result.finalTax))}
                </div>
                <div className={`pb-2 flex items-center gap-2 text-sm ${refund ? "text-emerald-700" : "text-blue-200"}`}>
                  {refund ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                  Πραγματικός Συντελεστής: <strong>{fmtPct(result.effectiveRate)}</strong>
                </div>
              </div>
              <div className={`mt-4 text-sm max-w-xl ${refund ? "text-emerald-800" : "text-blue-100"}`}>
                {refund
                  ? "Με βάση τα στοιχεία που εισάγατε, δικαιούστε επιστροφή φόρου."
                  : "Με βάση τα στοιχεία που εισάγατε, αυτό είναι το ποσό φόρου που πρέπει να καταβληθεί."}
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-200">
              <SummaryCard label="Βασικός Φόρος" value={fmt(result.baseTax)} testId="result-base-tax" />
              <SummaryCard label="Φόρος Ενοικίων" value={fmt(result.rentTax)} testId="result-rent-tax" />
              <SummaryCard label="Έκπτωση" value={`− ${fmt(result.relief)}`} accent="text-emerald-700" testId="result-relief" />
              <SummaryCard label="Παρακράτηση" value={`− ${fmt(withheld)}`} accent="text-slate-700" testId="result-withheld" />
            </div>

            {/* Chart */}
            <div className="bg-white border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-serif-display text-xl text-slate-900">Ανάλυση ανά Κλιμάκιο</h3>
                  <p className="text-xs text-slate-500 mt-1">Φορολογικές κλίμακες {year}</p>
                </div>
                {pieData.length > 0 && (
                  <div className="hidden md:block w-24 h-24">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" innerRadius={26} outerRadius={42}>
                          {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              {chartData.length === 0 ? (
                <div className="text-sm text-slate-400 text-center py-12">Εισάγετε εισόδημα για να δείτε την ανάλυση.</div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} />
                    <Tooltip
                      contentStyle={{ border: "1px solid #E2E8F0", borderRadius: 0, fontSize: 12 }}
                      formatter={(v) => fmt(v)}
                      labelFormatter={(l, p) => `Κλιμάκιο ${l} (${p?.[0]?.payload?.rate})`}
                    />
                    <Bar dataKey="Φόρος" fill="#1E3A8A" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Breakdown table */}
            <div className="bg-white border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <h3 className="font-serif-display text-xl text-slate-900">Αναλυτικός Πίνακας</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="breakdown-table">
                  <thead className="bg-[#F5F5F5] text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
                    <tr>
                      <th className="text-left p-4">Κλιμάκιο</th>
                      <th className="text-right p-4">Συντελεστής</th>
                      <th className="text-right p-4">Εισόδημα</th>
                      <th className="text-right p-4">Φόρος</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.breakdown.length === 0 ? (
                      <tr><td colSpan="4" className="text-center text-slate-400 py-8">—</td></tr>
                    ) : result.breakdown.map((b, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="p-4 text-slate-900">
                          {b.from.toLocaleString("el-GR")} € — {b.to === Infinity ? "∞" : b.to.toLocaleString("el-GR") + " €"}
                        </td>
                        <td className="p-4 text-right text-slate-700">{fmtPct(b.rate)}</td>
                        <td className="p-4 text-right text-slate-700">{fmt(b.amount)}</td>
                        <td className="p-4 text-right font-semibold text-[#1E3A8A]">{fmt(b.tax)}</td>
                      </tr>
                    ))}
                    {result.rentTax > 0 && (
                      <tr className="border-t border-slate-200 bg-slate-50">
                        <td className="p-4 text-slate-900 flex items-center gap-2"><Home size={14} /> Εισόδημα Ενοικίων</td>
                        <td className="p-4 text-right text-slate-500">—</td>
                        <td className="p-4 text-right text-slate-700">{fmt(rent)}</td>
                        <td className="p-4 text-right font-semibold text-[#1E3A8A]">{fmt(result.rentTax)}</td>
                      </tr>
                    )}
                    <tr className="border-t-2 border-[#1E3A8A] bg-white">
                      <td className="p-4 font-serif-display text-base text-slate-900" colSpan="3">Σύνολο Φόρου προ Παρακράτησης</td>
                      <td className="p-4 text-right font-serif-display text-lg text-[#1E3A8A]">{fmt(result.totalBeforeWh)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="text-xs text-slate-500 leading-relaxed">
              <strong>Σημείωση:</strong> Ο υπολογισμός είναι ενδεικτικός και βασίζεται στις φορολογικές κλίμακες {year}.
              Για ακριβή φορολογική συμβουλευτική, επικοινωνήστε με το γραφείο μας.
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#1E3A8A] text-white">
        <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto py-14 md:py-20 grid md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-8">
            <h3 className="font-serif-display text-2xl md:text-4xl leading-tight">Χρειάζεστε φοροτεχνική υποστήριξη;</h3>
            <p className="mt-3 text-blue-100">Το γραφείο μας αναλαμβάνει την πλήρη φορολογική σας δήλωση και βελτιστοποίηση.</p>
          </div>
          <div className="md:col-span-4 md:justify-self-end">
            <a href="/contact" className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-[#1E3A8A] text-xs font-semibold tracking-[0.25em] uppercase">
              Επικοινωνία <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function NumField({ label, value, onChange, testId }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-semibold">{label}</label>
      <div className="mt-2 flex items-center border border-slate-300 focus-within:border-[#1E3A8A] transition-colors">
        <span className="pl-3 pr-2 text-slate-400 text-sm">€</span>
        <input
          type="number"
          min="0"
          step="100"
          value={value}
          onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value || "0")))}
          data-testid={testId}
          className="w-full p-3 outline-none text-sm bg-transparent"
        />
      </div>
    </div>
  );
}

function SummaryCard({ label, value, accent, testId }) {
  return (
    <div className="bg-white p-5" data-testid={testId}>
      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-semibold">{label}</div>
      <div className={`mt-3 font-serif-display text-2xl ${accent || "text-slate-900"}`}>{value}</div>
    </div>
  );
}
