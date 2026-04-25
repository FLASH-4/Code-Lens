import { useEffect, useRef, useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Terminal,
  Play,
  Loader2,
  Trash2,
  History as HistoryIcon,
  X,
  Copy,
  Check,
  AlertTriangle,
  Code2,
  FileText,
} from "lucide-react";

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
const API = BACKEND_URL ? `${BACKEND_URL}/api` : "/api";

const STARTER_CODE = `// Paste any code, script, config, YAML, SQL, etc.
// Example:
function fibonacci(n) {
  if (n < 2) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}`;

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function Explainer() {
  const [code, setCode] = useState(STARTER_CODE);
  const [explanation, setExplanation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [mobileTab, setMobileTab] = useState("code"); // "code" | "output"
  const [serviceInfo, setServiceInfo] = useState({});
  const outputRef = useRef(null);

  const loadHistory = async () => {
    try {
      const res = await axios.get(`${API}/history`);
      setHistory(res.data || []);
    } catch (e) {
      // silent
    }
  };

  const loadHealth = async () => {
    try {
      const res = await axios.get(`${API}/health`);
      setServiceInfo(res.data || {});
    } catch (e) {
      // silent
    }
  };

  useEffect(() => {
    loadHistory();
    loadHealth();
  }, []);

  const providerBadge = serviceInfo.model
    ? `${String(serviceInfo.provider || "ai").toUpperCase()} • ${serviceInfo.model}`
    : "AI status";

  const handleExplain = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Please paste some code first.");
      return;
    }
    setLoading(true);
    setError("");
    setExplanation("");
    setActiveId(null);
    try {
      const res = await axios.post(`${API}/explain`, { code: trimmed });
      setExplanation(res.data.explanation || "");
      setActiveId(res.data.id);
      setMobileTab("output");
      loadHistory();
      setTimeout(() => {
        outputRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      }, 50);
    } catch (e) {
      const msg =
        e?.response?.data?.detail ||
        e?.message ||
        "Something went wrong. Please try again.";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  const openHistoryItem = async (id) => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${API}/history/${id}`);
      setCode(res.data.code || "");
      setExplanation(res.data.explanation || "");
      setActiveId(id);
      setSidebarOpen(false);
      setMobileTab("output");
    } catch (e) {
      setError("Could not load that entry.");
    } finally {
      setLoading(false);
    }
  };

  const deleteHistoryItem = async (id, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API}/history/${id}`);
      if (id === activeId) {
        setExplanation("");
        setActiveId(null);
      }
      loadHistory();
    } catch {
      // ignore
    }
  };

  const clearAll = async () => {
    if (!window.confirm("Clear all history?")) return;
    try {
      await axios.delete(`${API}/history`);
      setExplanation("");
      setActiveId(null);
      loadHistory();
    } catch {
      // ignore
    }
  };

  const copyExplanation = async () => {
    try {
      await navigator.clipboard.writeText(explanation);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleKey = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleExplain();
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0b0d10] text-[#d6dbe4] font-mono selection:bg-[#26d07c]/30">
      {/* grid background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(#2a2f38 1px, transparent 1px), linear-gradient(90deg, #2a2f38 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between border-b border-[#1b1f26] bg-[#0b0d10]/80 backdrop-blur px-3 py-3 sm:px-5">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="hidden items-center gap-2 sm:flex">
            <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <div className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <div className="flex min-w-0 items-center gap-2 sm:ml-4">
            <Terminal size={16} className="flex-shrink-0 text-[#26d07c]" />
            <span className="truncate text-xs tracking-tight text-[#e6eaf0] sm:text-sm">
              <span className="text-[#26d07c]">~/</span>code-lens
              <span className="animate-pulse text-[#26d07c]">_</span>
            </span>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="hidden items-center gap-2 rounded-full border border-[#1f242d] bg-[#12151a] px-3 py-1 text-[11px] text-[#9aa4b2] sm:flex">
            <span
              className={`h-2 w-2 rounded-full ${
                serviceInfo.llm_key_configured ? "bg-[#26d07c]" : "bg-[#f59e0b]"
              }`}
            />
            <span>{providerBadge}</span>
          </div>
          <button
            data-testid="toggle-history-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-md border border-[#1f242d] bg-[#12151a] px-2.5 py-1.5 text-xs text-[#9aa4b2] transition hover:border-[#26d07c]/50 hover:text-[#e6eaf0] sm:gap-2 sm:px-3"
          >
            <HistoryIcon size={14} />
            <span className="hidden sm:inline">History</span>
            <span className="rounded bg-[#1f242d] px-1.5 py-0.5 text-[10px] text-[#9aa4b2]">
              {history.length}
            </span>
          </button>
          <button
            data-testid="explain-btn"
            onClick={handleExplain}
            disabled={loading}
            className="group flex items-center gap-1.5 rounded-md border border-[#26d07c]/40 bg-[#26d07c]/10 px-3 py-1.5 text-xs font-medium text-[#26d07c] transition hover:bg-[#26d07c]/20 disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-4"
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Play size={14} />
            )}
            {loading ? "Explaining…" : "Explain"}
            <span className="hidden rounded bg-[#0b0d10] px-1.5 py-0.5 text-[10px] text-[#26d07c]/70 md:inline">
              ⌘↵
            </span>
          </button>
        </div>
      </header>

      {/* Mobile tab switcher — only visible on small screens */}
      <div className="relative z-10 flex border-b border-[#1b1f26] bg-[#0e1116] md:hidden">
        <button
          data-testid="mobile-tab-code"
          onClick={() => setMobileTab("code")}
          className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-medium transition ${
            mobileTab === "code"
              ? "border-b-2 border-[#26d07c] text-[#26d07c]"
              : "border-b-2 border-transparent text-[#6b7280]"
          }`}
        >
          <Code2 size={13} />
          Code
        </button>
        <button
          data-testid="mobile-tab-output"
          onClick={() => setMobileTab("output")}
          className={`flex flex-1 items-center justify-center gap-2 py-2.5 text-xs font-medium transition ${
            mobileTab === "output"
              ? "border-b-2 border-[#26d07c] text-[#26d07c]"
              : "border-b-2 border-transparent text-[#6b7280]"
          }`}
        >
          <FileText size={13} />
          Explanation
          {explanation && (
            <span className="h-1.5 w-1.5 rounded-full bg-[#26d07c]" />
          )}
        </button>
      </div>

      {/* Main content */}
      <main className="relative z-10 flex h-[calc(100vh-53px-41px)] flex-col md:h-[calc(100vh-53px)] md:flex-row">
        {/* Code panel */}
        <section
          className={`${
            mobileTab === "code" ? "flex" : "hidden"
          } w-full flex-col border-[#1b1f26] md:flex md:w-1/2 md:min-w-[320px] md:border-r`}
        >
          <div className="flex items-center justify-between border-b border-[#1b1f26] bg-[#0e1116] px-4 py-2 text-[11px] uppercase tracking-wider text-[#6b7280]">
            <span>input.code</span>
            <span className="text-[#26d07c]/70">{code.length} chars</span>
          </div>
          <textarea
            data-testid="code-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={handleKey}
            spellCheck={false}
            placeholder="// Paste your code, script, config, SQL, YAML, or anything technical..."
            className="flex-1 resize-none bg-[#0b0d10] p-4 text-[13px] leading-6 text-[#e6eaf0] outline-none placeholder:text-[#4b5563] sm:p-5 sm:text-[13.5px]"
            style={{
              fontFamily:
                "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          />
        </section>

        {/* Output panel */}
        <section
          className={`${
            mobileTab === "output" ? "flex" : "hidden"
          } w-full flex-col md:flex md:w-1/2 md:min-w-[320px]`}
        >
          <div className="flex items-center justify-between border-b border-[#1b1f26] bg-[#0e1116] px-4 py-2 text-[11px] uppercase tracking-wider text-[#6b7280]">
            <span>output.explanation</span>
            {explanation && (
              <button
                data-testid="copy-explanation-btn"
                onClick={copyExplanation}
                className="flex items-center gap-1 text-[#9aa4b2] hover:text-[#26d07c]"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "copied" : "copy"}
              </button>
            )}
          </div>

          <div
            ref={outputRef}
            data-testid="explanation-output"
            className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5"
          >
            {error && (
              <div
                data-testid="error-banner"
                className="mb-4 flex items-start gap-2 rounded-md border border-[#ef4444]/40 bg-[#ef4444]/10 p-3 text-sm text-[#fca5a5]"
              >
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <span className="whitespace-pre-wrap break-words">{error}</span>
              </div>
            )}

            {loading && !explanation && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-[#26d07c]">
                  <Loader2 size={14} className="animate-spin" />
                  <span>
                    {serviceInfo.model || "AI"} is analysing your code
                    <span className="animate-pulse">…</span>
                  </span>
                </div>
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-3 animate-pulse rounded bg-[#1b1f26]"
                      style={{ width: `${60 + Math.random() * 40}%` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {!loading && !explanation && !error && (
              <div className="flex h-full flex-col items-center justify-center text-center text-[#4b5563]">
                <Terminal size={40} className="mb-3 text-[#1f242d]" />
                <p className="text-sm">
                  Paste code on the left, hit{" "}
                  <span className="text-[#26d07c]">Explain</span>.
                </p>
                <p className="mt-1 text-xs">
                  Shortcut:{" "}
                  <kbd className="rounded bg-[#12151a] px-1.5 py-0.5 text-[10px]">
                    ⌘/Ctrl + ↵
                  </kbd>
                </p>
              </div>
            )}

            {explanation && (
              <article className="prose-invert-custom">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      if (!inline && match) {
                        return (
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{
                              background: "#0e1116",
                              border: "1px solid #1b1f26",
                              borderRadius: 6,
                              fontSize: 12.5,
                              margin: "10px 0",
                            }}
                          >
                            {String(children).replace(/\n$/, "")}
                          </SyntaxHighlighter>
                        );
                      }
                      return (
                        <code
                          className="rounded bg-[#12151a] px-1.5 py-0.5 text-[12.5px] text-[#fbbf24]"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {explanation}
                </ReactMarkdown>
              </article>
            )}
          </div>
        </section>
      </main>

      {/* History sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        >
          <aside
            data-testid="history-sidebar"
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-0 flex h-full w-full flex-col border-l border-[#1b1f26] bg-[#0b0d10] sm:w-[380px]"
          >
            <div className="flex items-center justify-between border-b border-[#1b1f26] px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-[#e6eaf0]">
                <HistoryIcon size={14} className="text-[#26d07c]" />
                History
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    data-testid="clear-history-btn"
                    onClick={clearAll}
                    className="text-xs text-[#9aa4b2] hover:text-[#ef4444]"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-[#9aa4b2] hover:text-[#e6eaf0]"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {history.length === 0 && (
                <div className="p-6 text-center text-xs text-[#4b5563]">
                  No explanations yet.
                </div>
              )}
              {history.map((h) => (
                <div
                  key={h.id}
                  data-testid={`history-item-${h.id}`}
                  onClick={() => openHistoryItem(h.id)}
                  className={`group cursor-pointer border-b border-[#14181f] px-4 py-3 transition hover:bg-[#12151a] ${
                    activeId === h.id ? "bg-[#12151a]" : ""
                  }`}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="truncate text-sm text-[#e6eaf0]">
                      {h.title}
                    </div>
                    <button
                      data-testid={`delete-history-${h.id}`}
                      onClick={(e) => deleteHistoryItem(h.id, e)}
                      className="opacity-0 transition group-hover:opacity-100"
                    >
                      <Trash2 size={13} className="text-[#9aa4b2] hover:text-[#ef4444]" />
                    </button>
                  </div>
                  <div className="truncate text-[11px] text-[#6b7280]">
                    {h.code_preview}
                  </div>
                  <div className="mt-1 text-[10px] text-[#4b5563]">
                    {formatDate(h.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
