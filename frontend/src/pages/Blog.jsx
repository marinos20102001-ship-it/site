import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { ExternalLink, Newspaper, Gavel, BookOpen, CalendarClock, FileText, AlertCircle, RefreshCw } from "lucide-react";

const ICONS = {
  news: Newspaper,
  decisions: Gavel,
  laws: BookOpen,
  deadlines: CalendarClock,
  articles: FileText,
};

function formatDate(s) {
  if (!s) return "";
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString("el-GR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return s;
  }
}

export default function Blog() {
  const [categories, setCategories] = useState([]);
  const [active, setActive] = useState("news");
  const [items, setItems] = useState([]);
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get("/blog/categories");
        setCategories(r.data);
      } catch {
        setCategories([
          { key: "news", label: "Νέα & Ειδήσεις" },
          { key: "decisions", label: "Πρόσφατες Αποφάσεις" },
          { key: "laws", label: "Πρόσφατοι Νόμοι" },
          { key: "deadlines", label: "Προθεσμίες Μηνός" },
          { key: "articles", label: "Άρθρα & Μελέτες" },
        ]);
      }
    })();
  }, []);

  const loadFeed = async (cat) => {
    setLoading(true);
    setError("");
    try {
      const r = await api.get(`/blog/feed?category=${cat}`);
      setItems(r.data.items || []);
      setLabel(r.data.label || "");
    } catch (e) {
      setError("Αδυναμία φόρτωσης ενημερώσεων. Παρακαλώ δοκιμάστε ξανά.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFeed(active); }, [active]);

  return (
    <div data-testid="blog-page" className="bg-white dark:bg-slate-950 min-h-screen">
      {/* Hero */}
      <section className="bg-[#1E3A8A] text-white">
        <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto py-20 md:py-28">
          <div className="text-[10px] uppercase tracking-[0.3em] text-blue-200 mb-4">— Blog & Ενημερώσεις</div>
          <h1 className="font-serif-display text-4xl md:text-5xl lg:text-6xl leading-tight max-w-3xl">
            Φορολογικές<br />
            <span className="italic text-blue-200">ενημερώσεις</span> & ειδήσεις.
          </h1>
          <p className="mt-6 max-w-2xl text-blue-100 leading-relaxed">
            Άμεση πληροφόρηση για νέα, αποφάσεις, νόμους και προθεσμίες — από την έγκυρη πηγή{" "}
            <a href="https://www.taxheaven.gr" target="_blank" rel="noreferrer" className="underline hover:text-white">taxheaven.gr</a>.
          </p>
        </div>
      </section>

      {/* Tabs */}
      <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-20 z-30">
        <div className="px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto flex gap-1 overflow-x-auto scrollbar-hide">
          {categories.map((c) => {
            const Icon = ICONS[c.key] || FileText;
            const isActive = active === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setActive(c.key)}
                data-testid={`blog-tab-${c.key}`}
                className={`flex items-center gap-2 px-4 md:px-6 py-4 text-xs font-semibold uppercase tracking-[0.15em] whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? "border-[#1E3A8A] text-[#1E3A8A] dark:text-blue-300 dark:border-blue-300"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-[#1E3A8A] dark:hover:text-blue-300"
                }`}
              >
                <Icon size={14} strokeWidth={1.8} />
                {c.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Feed */}
      <section className="py-12 md:py-16 bg-[#F5F5F5] dark:bg-slate-900">
        <div className="px-6 md:px-12 lg:px-20 max-w-[1100px] mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-serif-display text-2xl md:text-3xl text-slate-900 dark:text-white">{label || "Φόρτωση…"}</h2>
            <button
              onClick={() => loadFeed(active)}
              data-testid="blog-refresh"
              disabled={loading}
              className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300 hover:text-[#1E3A8A] dark:hover:text-blue-300 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Ανανέωση
            </button>
          </div>

          {error && (
            <div data-testid="blog-error" className="mb-6 flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400 border-l-2 border-red-600 p-3">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 w-3/4 mb-3" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 w-full mb-2" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 w-5/6" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div data-testid="blog-empty" className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-10 text-center text-slate-500 dark:text-slate-400">
              Δεν βρέθηκαν ενημερώσεις αυτή τη στιγμή.
            </div>
          ) : (
            <div className="space-y-px bg-slate-200 dark:bg-slate-700">
              {items.map((it, i) => (
                <a
                  key={i}
                  href={it.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`blog-item-${i}`}
                  className="block bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700/70 transition-colors p-6 md:p-7 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif-display text-lg md:text-xl text-slate-900 dark:text-white group-hover:text-[#1E3A8A] dark:group-hover:text-blue-300 leading-snug">
                        {it.title}
                      </h3>
                      {it.description && (
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                          {it.description}
                        </p>
                      )}
                      <div className="mt-3 flex items-center gap-4 text-[11px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                        {it.pub_date && <span>{formatDate(it.pub_date)}</span>}
                        {it.author && <span className="hidden sm:inline">· {it.author}</span>}
                      </div>
                    </div>
                    <ExternalLink size={18} className="text-slate-400 dark:text-slate-500 group-hover:text-[#1E3A8A] dark:group-hover:text-blue-300 shrink-0 mt-1" />
                  </div>
                </a>
              ))}
            </div>
          )}

          <div className="mt-8 text-xs text-slate-500 dark:text-slate-400 text-center">
            Πηγή: <a href="https://www.taxheaven.gr" target="_blank" rel="noreferrer" className="underline text-[#1E3A8A] dark:text-blue-300">taxheaven.gr</a> — Τα άρθρα ανοίγουν στην αρχική πηγή σε νέα καρτέλα.
          </div>
        </div>
      </section>
    </div>
  );
}
