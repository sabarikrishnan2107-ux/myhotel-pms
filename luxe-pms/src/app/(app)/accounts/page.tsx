"use client";
import * as React from "react";
import {
  Plus, FileDown, TrendingUp, TrendingDown, Wallet, Receipt, ArrowUp, ArrowDown,
  X, Bot, CheckCircle2, AlertCircle, Search, Sparkles, FileText, Printer,
  ChevronRight, Users, ClipboardList,
  FileBarChart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KPICard } from "@/components/ui/kpi-card";
import { AIInsight } from "@/components/ui/ai-insight";
import { INCOME_BREAKDOWN, EXPENSE_BREAKDOWN, RECENT_TXN } from "@/lib/mock-data-ext";
import { money, cn } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/api";
import { useProperty, hotelName } from "@/lib/use-property";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import {
  PL_TREND, CASH_FLOW, ACCOUNTS, HDFC_STATEMENT,
  AGING_RECEIVABLES, AGING_PAYABLES, GSTR_RETURNS, INCOME_CATS, EXPENSE_CATS,
  blankLine,
  type EntryType, type ExpenseLine, type Entry,
} from "./_data";
import { BankReconcileTab } from "./_tabs/bank-reconcile-tab";
import { PayablesTab } from "./_tabs/payables-tab";
import { ReceivablesTab } from "./_tabs/receivables-tab";
import { PnlBsTab } from "./_tabs/pnl-bs-tab";
import { JournalTab } from "./_tabs/journal-tab";
import { CashierTab } from "./_tabs/cashier-tab";
import { NewExpenseForm } from "./_components/new-expense-form";

const TABS = [
  { id: "dashboard",   label: "Dashboard",         hint: "Your money at a glance — income, expenses, profit and cash position this month." },
  { id: "income",      label: "Income",            hint: "Every payment coming in, broken down by source." },
  { id: "expenses",    label: "Expenses",          hint: "Every payment going out, with bills, categories and the full day book." },
  { id: "profitloss",  label: "Profit & Loss",     hint: "What you earned minus what you spent — plus balance sheet and journal." },
  { id: "cashflow",    label: "Cash Flow",         hint: "Money moving through your bank and cash accounts, and reconciliation." },
  { id: "vendor",      label: "Vendor Payments",   hint: "Bills you owe suppliers, due dates and payment status." },
  { id: "receivables", label: "Guest Receivables", hint: "Money guests, agents and companies still owe you." },
  { id: "vat",         label: "VAT Report",        hint: "VAT you've collected and paid, and your filing status." },
  { id: "reports",     label: "Reports",           hint: "Download statements and summaries, and review cashier shifts." },
] as const;
type TabId = typeof TABS[number]["id"];













function TabHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-muted-foreground -mt-1">{children}</p>
  );
}

function SubToggle<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { id: T; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-surface-sunken/40 p-0.5">
      {options.map(o => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-[5px] transition-colors",
            value === o.id ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function AccountsPage() {
  const [tab, setTab] = React.useState<TabId>("dashboard");
  const [entries, setEntries] = React.useState<Entry[]>([]);
  const [summary, setSummary] = React.useState<{ income: { category: string; value: number }[]; expense: { category: string; value: number }[]; recent: { id: number; date: string; desc: string; type: string; amount: number }[] } | null>(null);
  React.useEffect(() => {
    apiGet<Entry[]>("/account-entries")
      .then(rows => setEntries(rows.map(r => ({ ...r, id: String(r.id) })).reverse()))
      .catch(() => {});
    apiGet<NonNullable<typeof summary>>("/accounts/summary")
      .then(s => setSummary(s))
      .catch(() => {});
  }, []);

  // Colour palette reused for the live category breakdowns (charts need a colour
  // per slice; the API returns only category + value).
  const PIE_COLORS = ["var(--color-brand)", "var(--color-accent)", "var(--color-info)", "var(--color-warning)", "var(--color-status-checkout-pending)", "var(--color-status-inspected)", "var(--color-status-blocked)"];
  const incomeBreakdown = summary?.income.length
    ? summary.income.map((r, i) => ({ label: r.category, value: r.value, color: PIE_COLORS[i % PIE_COLORS.length] }))
    : INCOME_BREAKDOWN;
  const expenseBreakdown = summary?.expense.length
    ? summary.expense.map((r, i) => ({ label: r.category, value: r.value, color: PIE_COLORS[i % PIE_COLORS.length] }))
    : EXPENSE_BREAKDOWN;
  const recentTxn = summary?.recent.length
    ? summary.recent.map(r => ({ id: String(r.id), date: r.date, desc: r.desc, type: r.type as "Income" | "Expense" | "Refund", amount: r.amount }))
    : RECENT_TXN;
  const [showEntry, setShowEntry] = React.useState<EntryType | null>(null);
  const [showExpenseFull, setShowExpenseFull] = React.useState(false);
  const [voucherEntry, setVoucherEntry] = React.useState<Entry | null>(null);
  const [statementAccountId, setStatementAccountId] = React.useState<string>(ACCOUNTS[1].id); // default HDFC
  const [statementPeriod, setStatementPeriod] = React.useState<string>("May 2026");
  const [statementSearch, setStatementSearch] = React.useState("");
  const [statementType, setStatementType] = React.useState<"all" | "bank" | "receivable" | "payable">("all");
  const [statementFromDate, setStatementFromDate] = React.useState<string>("2026-05-01");
  const [statementToDate, setStatementToDate] = React.useState<string>("2026-05-31");
  const [toast, setToast] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [expensesView, setExpensesView] = React.useState<"bills" | "daybook">("bills");
  const [cashflowView, setCashflowView] = React.useState<"statements" | "reconcile">("statements");
  const [plView, setPlView] = React.useState<"statement" | "journal">("statement");
  const [reportsView, setReportsView] = React.useState<"downloads" | "cashier">("downloads");

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  // Reset all sub-views when the top-level tab changes so users always land
  // on the default sub-view rather than whatever they had open last time.
  const changeTab = (next: TabId) => {
    setTab(next);
    setExpensesView("bills");
    setCashflowView("statements");
    setPlView("statement");
    setReportsView("downloads");
  };

  // Headline KPIs derive from the real posted entries (fall back to the
  // illustrative breakdown only before any entry has loaded).
  const sumByType = (t: EntryType) => entries.filter(e => e.type === t).reduce((s, e) => s + e.amount, 0);
  const seedIncome = INCOME_BREAKDOWN.reduce((s, i) => s + i.value, 0);
  const seedExpense = EXPENSE_BREAKDOWN.reduce((s, i) => s + i.value, 0);
  const income = entries.length ? sumByType("income") : seedIncome;
  const expense = entries.length ? sumByType("expense") + sumByType("refund") : seedExpense;
  const profit = income - expense;
  const margin = income ? ((profit / income) * 100).toFixed(1) : "0.0";

  const handleAdd = (e: Omit<Entry, "id">) => {
    apiPost<Entry>("/account-entries", e)
      .then(row => setEntries(prev => [{ ...row, id: String(row.id) }, ...prev]))
      .catch(() => showToast("Could not save entry"));
    setShowEntry(null);
    showToast(`${e.type === "income" ? "Income" : e.type === "expense" ? "Expense" : "Refund"} of ${money(e.amount)} recorded`);
  };

  const filteredEntries = entries.filter(e =>
    !search || `${e.description} ${e.category} ${e.ref}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight">Accounts</h1>
          <p className="text-muted-foreground text-sm mt-1">Income, expenses, profit, cash flow and VAT — May 2026</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => showToast(`Accounts export ready · ${entries.length} entries · CSV downloaded`)}>
            <FileDown className="h-4 w-4" />Export
          </Button>
          <Button variant="outline" onClick={() => setShowEntry("income")}>+ Income</Button>
          <Button onClick={() => setShowExpenseFull(true)}><Plus className="h-4 w-4" />Expense</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Total Income" value={money(income)} icon={TrendingUp} accent="success" delta={4.9} />
        <KPICard label="Total Expense" value={money(expense)} icon={TrendingDown} accent="warning" delta={-2.7} />
        <KPICard label="Net Profit" value={money(profit)} icon={Wallet} accent="brand" delta={8.4} hint={`Margin ${margin}%`} />
        <KPICard label="VAT Liability" value={money(income * 0.05)} icon={Receipt} accent="info" />
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex items-center gap-1 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => changeTab(t.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
              tab === t.id ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* One-line description of the active section */}
      <TabHint>{TABS.find(t => t.id === tab)?.hint}</TabHint>

      {/* === DASHBOARD === */}
      {tab === "dashboard" && (
        <>
          {/* P&L trend */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Income vs Expense — last 6 months</CardTitle>
                <Badge tone="success">+8.4% MoM profit</Badge>
              </div>
            </CardHeader>
            <CardContent className="pl-0">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={PL_TREND} margin={{ top: 8, right: 16, bottom: 0, left: 8 }} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="income" name="Income" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="var(--color-warning)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Cash flow forecast */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Cash Balance Trend — last 30 days</CardTitle>
                <Badge tone="brand"><Bot className="h-3 w-3" />AI projection enabled</Badge>
              </div>
            </CardHeader>
            <CardContent className="pl-0">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={CASH_FLOW} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={11} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }} />
                    <Line type="monotone" dataKey="balance" stroke="var(--color-brand)" strokeWidth={2} dot={false} name="Cash balance" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Income + Expense mix */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Income Mix</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={incomeBreakdown} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                        {incomeBreakdown.map((d, i) => <Cell key={i} fill={d.color} stroke="var(--color-surface)" strokeWidth={2} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {incomeBreakdown.map(i => (
                    <li key={i.label} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: i.color }} />
                        <span className="text-muted-foreground">{i.label}</span>
                      </span>
                      <span className="font-medium tabular">{money(i.value)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Expense Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseBreakdown} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                        {expenseBreakdown.map((d, i) => <Cell key={i} fill={d.color} stroke="var(--color-surface)" strokeWidth={2} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12, color: "var(--color-foreground)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {expenseBreakdown.map(i => (
                    <li key={i.label} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: i.color }} />
                        <span className="text-muted-foreground">{i.label}</span>
                      </span>
                      <span className="font-medium tabular">{money(i.value)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card className="p-0 overflow-hidden">
            <CardHeader className="bg-surface-elevated">
              <CardTitle>Recent Transactions</CardTitle>
            </CardHeader>
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken/50 border-y border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-2.5 font-semibold">Date</th>
                  <th className="px-5 py-2.5 font-semibold">Description</th>
                  <th className="px-5 py-2.5 font-semibold">Type</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentTxn.map(t => (
                  <tr key={t.id} className="hover:bg-surface-sunken/40">
                    <td className="px-5 py-3 text-muted-foreground tabular">{t.date}</td>
                    <td className="px-5 py-3">{t.desc}</td>
                    <td className="px-5 py-3"><Badge tone={t.type === "Income" ? "success" : t.type === "Refund" ? "neutral" : "warning"}>{t.type}</Badge></td>
                    <td className={cn("px-5 py-3 text-right tabular font-medium", t.amount >= 0 ? "text-success" : "text-warning")}>
                      {t.amount >= 0 ? "+" : ""}{money(Math.abs(t.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Cash Position + Aging Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Cash & Bank position */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <CardTitle>Cash &amp; Bank Position</CardTitle>
                <Button size="sm" variant="ghost" onClick={() => changeTab("cashflow")}>
                  <ChevronRight className="h-3.5 w-3.5" />Open
                </Button>
              </div>
              <ul className="space-y-2.5">
                {ACCOUNTS.filter(a => a.type === "cash" || a.type === "bank" || a.type === "petty").map(a => (
                  <li key={a.id} className="flex items-center gap-3 p-2.5 rounded-md border border-border hover:bg-surface-sunken/40 cursor-pointer" onClick={() => { setStatementAccountId(a.id); changeTab("cashflow"); }}>
                    <span className={cn(
                      "h-8 w-8 rounded-md flex items-center justify-center shrink-0",
                      a.type === "bank" ? "bg-info-soft text-info" :
                      a.type === "cash" ? "bg-success-soft text-success" :
                      "bg-accent-soft text-accent"
                    )}>
                      <Wallet className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{a.name}</p>
                      {a.number && <p className="text-[10px] text-muted-foreground font-mono tabular">{a.number}</p>}
                    </div>
                    <span className="tabular font-semibold text-sm">{money(a.closingBalance)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total Liquid</span>
                <span className="text-lg font-bold tabular">{money(ACCOUNTS.filter(a => a.type === "cash" || a.type === "bank" || a.type === "petty").reduce((s, a) => s + a.closingBalance, 0))}</span>
              </div>
            </Card>

            {/* Receivables aging */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <CardTitle>Receivables Aging</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Customer outstanding</p>
                </div>
                <Badge tone="warning">{money(AGING_RECEIVABLES.reduce((s, b) => s + b.amount, 0))}</Badge>
              </div>
              <ul className="space-y-3">
                {AGING_RECEIVABLES.map((b, i) => (
                  <li key={b.bucket}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={cn("font-medium", i === 0 ? "text-success" : i === 1 ? "text-info" : i === 2 ? "text-warning" : "text-danger")}>
                        {b.bucket}
                      </span>
                      <span className="tabular font-semibold">{money(b.amount)}</span>
                    </div>
                    <div className="h-2 bg-surface-sunken rounded-full overflow-hidden">
                      <div
                        className={cn("h-full",
                          i === 0 ? "bg-success" : i === 1 ? "bg-info" : i === 2 ? "bg-warning" : "bg-danger"
                        )}
                        style={{ width: `${b.pct}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-muted-foreground italic mt-3 pt-3 border-t border-border">
                <span className="font-medium text-danger">₹32,300 over 90 days</span> — escalate to manager
              </p>
            </Card>

            {/* Payables aging */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <CardTitle>Payables Aging</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Vendor outstanding</p>
                </div>
                <Badge tone="info">{money(AGING_PAYABLES.reduce((s, b) => s + b.amount, 0))}</Badge>
              </div>
              <ul className="space-y-3">
                {AGING_PAYABLES.map((b, i) => (
                  <li key={b.bucket}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className={cn("font-medium", i === 0 ? "text-success" : i === 1 ? "text-info" : i === 2 ? "text-warning" : "text-danger")}>
                        {b.bucket}
                      </span>
                      <span className="tabular font-semibold">{money(b.amount)}</span>
                    </div>
                    <div className="h-2 bg-surface-sunken rounded-full overflow-hidden">
                      <div
                        className={cn("h-full",
                          i === 0 ? "bg-success" : i === 1 ? "bg-info" : i === 2 ? "bg-warning" : "bg-danger"
                        )}
                        style={{ width: `${b.pct}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-[10px] text-muted-foreground italic mt-3 pt-3 border-t border-border">
                Average payment cycle: <span className="font-medium text-foreground">22 days</span> · Within terms
              </p>
            </Card>
          </div>
        </>
      )}

      {/* === EXPENSES === */}
      {tab === "expenses" && (
        <>
          <SubToggle
            value={expensesView}
            onChange={setExpensesView}
            options={[{ id: "bills", label: "Expenses & bills" }, { id: "daybook", label: "Day book (all entries)" }]}
          />
          {expensesView === "bills" && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard label="Expense MTD" value={money(expense)} icon={TrendingDown} accent="warning" />
                <KPICard label="Biggest Category" value="Payroll" icon={Wallet} accent="brand" hint={money(385000)} />
                <KPICard label="Pending Bills" value={money(124800)} icon={Receipt} accent="info" />
                <KPICard label="ITC Available" value={money(28400)} icon={Sparkles} accent="success" hint="GST input credit" />
              </div>

              <Card className="p-0 overflow-hidden">
                <CardHeader className="bg-surface-elevated">
                  <div className="flex items-center justify-between">
                    <CardTitle>Recorded Expenses</CardTitle>
                    <Button size="sm" onClick={() => setShowExpenseFull(true)}><Plus className="h-3.5 w-3.5" />Add Expense</Button>
                  </div>
                </CardHeader>
                <table className="w-full text-sm">
                  <thead className="bg-surface-sunken/50 border-b border-border">
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3 font-semibold">Date</th>
                      <th className="px-4 py-3 font-semibold">Vendor / Description</th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 font-semibold tabular">GSTIN / Inv #</th>
                      <th className="px-4 py-3 font-semibold text-right">Amount</th>
                      <th className="px-4 py-3 font-semibold">Bill</th>
                      <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {entries.filter(e => e.type === "expense").map(e => (
                      <tr key={e.id} className="hover:bg-surface-sunken/40">
                        <td className="px-4 py-3 text-muted-foreground tabular">{e.date}</td>
                        <td className="px-4 py-3">
                          {e.vendor && <p className="font-medium">{e.vendor}</p>}
                          <p className={cn("text-xs", e.vendor ? "text-muted-foreground" : "")}>{e.description}</p>
                          {e.lines && e.lines.length > 1 && (
                            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-info bg-info-soft px-1.5 py-0.5 rounded-full">
                              <FileText className="h-2.5 w-2.5" />
                              {e.lines.length} line items
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3"><Badge tone="neutral">{e.category}</Badge></td>
                        <td className="px-4 py-3 text-xs tabular">
                          {e.gstin && <p className="font-mono">{e.gstin}</p>}
                          {e.ref && <p className="text-muted-foreground">{e.ref}</p>}
                          {e.hsnSac && <p className="text-[10px] text-muted-foreground">HSN/SAC {e.hsnSac}</p>}
                        </td>
                        <td className="px-4 py-3 text-right tabular font-medium text-warning">{money(e.amount)}</td>
                        <td className="px-4 py-3">
                          {e.attachment ? (
                            <a
                              href={e.attachment.dataUrl}
                              download={e.attachment.name}
                              className="inline-flex items-center gap-1 text-xs text-success hover:underline"
                              title={e.attachment.name}
                            >
                              <FileText className="h-3.5 w-3.5" />Attached
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-warning">
                              <AlertCircle className="h-3.5 w-3.5" />Missing
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="ghost" onClick={() => setVoucherEntry(e)}>
                            <Printer className="h-3.5 w-3.5" />Voucher
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {entries.filter(e => e.type === "expense").length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">No expenses recorded yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </Card>

              <Card className="p-0 overflow-hidden">
                <CardHeader className="bg-surface-elevated">
                  <CardTitle>Expense Categories — MTD</CardTitle>
                </CardHeader>
                <ul className="divide-y divide-border">
                  {expenseBreakdown.map(c => {
                    const pctOfTotal = (c.value / expense) * 100;
                    return (
                      <li key={c.label} className="flex items-center gap-3 px-5 py-3">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ background: c.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">{c.label}</p>
                            <p className="text-sm font-semibold tabular">{money(c.value)}</p>
                          </div>
                          <div className="mt-1 h-1.5 bg-surface-sunken rounded-full overflow-hidden">
                            <div className="h-full" style={{ width: `${pctOfTotal}%`, background: c.color }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{pctOfTotal.toFixed(1)}% of total expenses</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </>
          )}
          {expensesView === "daybook" && (
            <>
              <Card className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
                    <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by description, category, reference…" className="pl-9 h-9" />
                  </div>
                  <Select className="h-9 w-auto"><option>All types</option><option>Income</option><option>Expense</option><option>Refund</option></Select>
                  <Select className="h-9 w-auto"><option>All categories</option>{[...INCOME_CATS, ...EXPENSE_CATS].map(c => <option key={c}>{c}</option>)}</Select>
                  <Select className="h-9 w-auto"><option>Today</option><option>This week</option><option>This month</option></Select>
                </div>
              </Card>
              <Card className="p-0 overflow-hidden">
                <CardHeader className="bg-surface-elevated">
                  <div className="flex items-center justify-between">
                    <CardTitle>Day Book</CardTitle>
                    <p className="text-xs text-muted-foreground">{filteredEntries.length} entries</p>
                  </div>
                </CardHeader>
                <table className="w-full text-sm">
                  <thead className="bg-surface-sunken/50 border-y border-border">
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-2.5 font-semibold">Date</th>
                      <th className="px-5 py-2.5 font-semibold">Type</th>
                      <th className="px-5 py-2.5 font-semibold">Category</th>
                      <th className="px-5 py-2.5 font-semibold">Description</th>
                      <th className="px-5 py-2.5 font-semibold">Mode</th>
                      <th className="px-5 py-2.5 font-semibold">Ref</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredEntries.map(e => (
                      <tr key={e.id} className="hover:bg-surface-sunken/40">
                        <td className="px-5 py-3 text-muted-foreground tabular">{e.date}</td>
                        <td className="px-5 py-3">
                          <span className={cn("inline-flex items-center gap-1 text-xs", e.type === "income" ? "text-success" : e.type === "expense" ? "text-warning" : "text-muted-foreground")}>
                            {e.type === "income" ? <ArrowUp className="h-3 w-3" /> : e.type === "expense" ? <ArrowDown className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                            {e.type}
                          </span>
                        </td>
                        <td className="px-5 py-3"><Badge tone="neutral">{e.category}</Badge></td>
                        <td className="px-5 py-3">{e.description}</td>
                        <td className="px-5 py-3 text-xs text-muted-foreground">{e.mode}</td>
                        <td className="px-5 py-3 text-xs tabular text-muted-foreground">{e.ref}</td>
                        <td className={cn("px-5 py-3 text-right tabular font-medium", e.type === "income" ? "text-success" : "text-warning")}>
                          {e.type === "income" ? "+" : "-"}{money(e.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </>
      )}

      {/* === INCOME === */}
      {tab === "income" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <KPICard label="Income MTD" value={money(income)} icon={TrendingUp} accent="success" />
            <KPICard label="Biggest Stream" value="Room" icon={Wallet} accent="brand" hint={money(84520)} />
            <KPICard label="Outstanding Receivables" value={money(82400)} icon={Receipt} accent="warning" />
          </div>
          <Card className="p-0 overflow-hidden">
            <CardHeader className="bg-surface-elevated">
              <CardTitle>Income Sources</CardTitle>
            </CardHeader>
            <ul className="divide-y divide-border">
              {incomeBreakdown.map(c => {
                const pctOfTotal = (c.value / income) * 100;
                return (
                  <li key={c.label} className="flex items-center gap-3 px-5 py-3">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ background: c.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{c.label}</p>
                        <p className="text-sm font-semibold tabular">{money(c.value)}</p>
                      </div>
                      <div className="mt-1 h-1.5 bg-surface-sunken rounded-full overflow-hidden">
                        <div className="h-full" style={{ width: `${pctOfTotal}%`, background: c.color }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{pctOfTotal.toFixed(1)}% of total income</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}

      {/* === CASH FLOW === */}
      {tab === "cashflow" && (() => {
        const selectedAccount = ACCOUNTS.find(a => a.id === statementAccountId) ?? ACCOUNTS[0];
        // Compute running balance for HDFC sample
        let runningBalance = selectedAccount.openingBalance;
        const entriesWithBalance = HDFC_STATEMENT.map((e, i) => {
          if (i === 0) return { ...e, balance: runningBalance };
          runningBalance = e.type === "debit" ? runningBalance + e.amount : runningBalance - e.amount;
          return { ...e, balance: runningBalance };
        });
        const periodCredits = HDFC_STATEMENT.filter((_, i) => i > 0 && HDFC_STATEMENT[i].type === "credit").reduce((s, e) => s + e.amount, 0);
        const periodDebits = HDFC_STATEMENT.filter((_, i) => i > 0 && HDFC_STATEMENT[i].type === "debit").reduce((s, e) => s + e.amount, 0);
        const closingBalance = entriesWithBalance[entriesWithBalance.length - 1].balance ?? selectedAccount.openingBalance;
        const customPeriod = statementPeriod === "Custom range…";

        // Aggregate totals
        const totalAssets = ACCOUNTS.filter(a => a.type === "cash" || a.type === "bank" || a.type === "petty").reduce((t, a) => t + a.closingBalance, 0);
        const totalReceivable = ACCOUNTS.filter(a => a.type === "customer").reduce((t, a) => t + a.closingBalance, 0);
        const totalPayable = ACCOUNTS.filter(a => a.type === "vendor").reduce((t, a) => t + a.closingBalance, 0);

        // Filter list by search + type
        const filteredAccounts = ACCOUNTS.filter(a => {
          if (statementType === "bank" && a.type !== "cash" && a.type !== "bank" && a.type !== "petty") return false;
          if (statementType === "receivable" && a.type !== "customer") return false;
          if (statementType === "payable" && a.type !== "vendor") return false;
          if (statementSearch) {
            const q = statementSearch.toLowerCase();
            if (!`${a.name} ${a.number ?? ""} ${a.hint ?? ""}`.toLowerCase().includes(q)) return false;
          }
          return true;
        });

        const visibleClosing = filteredAccounts.reduce((t, a) => t + a.closingBalance, 0);
        const visibleOpening = filteredAccounts.reduce((t, a) => t + a.openingBalance, 0);
        const periodLabel = customPeriod
          ? `${statementFromDate} → ${statementToDate}`
          : statementPeriod;

        return (
          <div className="space-y-5">
            <SubToggle
              value={cashflowView}
              onChange={setCashflowView}
              options={[{ id: "statements", label: "Statements" }, { id: "reconcile", label: "Bank reconcile" }]}
            />
            {cashflowView === "statements" && (<>
            {/* Top totals strip — Total accounts · Receivable · Payable · Net */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KPICard label="Total cash & bank" value={money(totalAssets)} icon={Wallet} accent="info" hint={`${ACCOUNTS.filter(a => a.type === "cash" || a.type === "bank" || a.type === "petty").length} accounts`} />
              <KPICard label="Total receivable" value={money(totalReceivable)} icon={ArrowUp} accent="success" hint={`${ACCOUNTS.filter(a => a.type === "customer").length} customers`} />
              <KPICard label="Total payable" value={money(totalPayable)} icon={ArrowDown} accent={totalPayable > 0 ? "warning" : "neutral"} hint={`${ACCOUNTS.filter(a => a.type === "vendor").length} vendors`} />
              <KPICard label="Net working capital" value={money(totalAssets + totalReceivable - totalPayable)} icon={TrendingUp} accent="brand" hint="cash + AR − AP" />
            </div>

            {/* Filter + search bar */}
            <Card className="p-3 space-y-2.5">
              {/* Account-type chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {([
                  { id: "all",        label: "All accounts",    count: ACCOUNTS.length,                                                                  dot: null },
                  { id: "bank",       label: "Cash & bank",     count: ACCOUNTS.filter(a => a.type === "cash" || a.type === "bank" || a.type === "petty").length, dot: "bg-info" },
                  { id: "receivable", label: "Receivable",      count: ACCOUNTS.filter(a => a.type === "customer").length,                                dot: "bg-success" },
                  { id: "payable",    label: "Account payable", count: ACCOUNTS.filter(a => a.type === "vendor").length,                                  dot: "bg-warning" },
                ] as const).map(t => (
                  <button key={t.id} onClick={() => setStatementType(t.id as typeof statementType)} className={cn(
                    "h-8 px-3 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-2",
                    statementType === t.id ? "bg-foreground text-background border-foreground shadow-xs" : "border-border hover:bg-surface-sunken text-muted-foreground"
                  )}>
                    {t.dot && <span className={cn("h-1.5 w-1.5 rounded-full", t.dot)} />}
                    {t.label}
                    <span className={cn(
                      "tabular text-[10px] rounded-full px-1.5 h-4 inline-flex items-center font-semibold",
                      statementType === t.id ? "bg-background/15 text-background" : "bg-surface-sunken text-muted-foreground"
                    )}>{t.count}</span>
                  </button>
                ))}
              </div>

              {/* Search + period + actions */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
                  <Input
                    value={statementSearch}
                    onChange={e => setStatementSearch(e.target.value)}
                    placeholder="Search company / vendor / account · name, A/c no, notes…"
                    className="pl-9 h-9"
                  />
                </div>
                <Select value={statementPeriod} onChange={e => setStatementPeriod(e.target.value)} className="h-9 w-auto text-xs" title="Period">
                  <option>May 2026</option>
                  <option>Apr 2026</option>
                  <option>Q1 FY 26-27</option>
                  <option>FY 25-26</option>
                  <option>Custom range…</option>
                </Select>
                {(statementSearch || statementType !== "all") && (
                  <Button size="sm" variant="ghost" onClick={() => { setStatementSearch(""); setStatementType("all"); }}>
                    <X className="h-3 w-3" />Clear
                  </Button>
                )}
                <div className="flex-1" />
                <Button size="sm" variant="outline" onClick={() => window.print()}><FileDown className="h-3.5 w-3.5" />PDF</Button>
                <Button size="sm" variant="outline" onClick={() => showToast("Statement queued · Email + WhatsApp to account holder")}>Email</Button>
                <Button size="sm" onClick={() => window.print()}><Printer className="h-3.5 w-3.5" />Print</Button>
              </div>

              {/* Custom date range (only when chosen) */}
              {customPeriod && (
                <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-border">
                  <div className="space-y-1">
                    <Label className="text-[11px]">From date</Label>
                    <Input type="date" value={statementFromDate} onChange={e => setStatementFromDate(e.target.value)} className="h-9 tabular w-40" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">To date</Label>
                    <Input type="date" value={statementToDate} onChange={e => setStatementToDate(e.target.value)} className="h-9 tabular w-40" />
                  </div>
                  <Badge tone="info" className="ml-2">{statementFromDate} → {statementToDate}</Badge>
                </div>
              )}
            </Card>

            {/* Account drill-down selector — visible only when an account is open */}
            <Card className="p-3 bg-surface-elevated/40">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground shrink-0">Drill into account</p>
                <Select value={statementAccountId} onChange={e => setStatementAccountId(e.target.value)} className="h-9 flex-1 max-w-md">
                  <optgroup label="Cash & Bank">
                    {ACCOUNTS.filter(a => a.type === "cash" || a.type === "bank" || a.type === "petty").map(a => (
                      <option key={a.id} value={a.id}>{a.name}{a.number ? ` · ${a.number}` : ""}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Customers (Receivable)">
                    {ACCOUNTS.filter(a => a.type === "customer").map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Vendors (Payable)">
                    {ACCOUNTS.filter(a => a.type === "vendor").map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </optgroup>
                </Select>
                <Button size="sm" variant="outline" onClick={() => showToast("Statement reconciliation started")}>
                  <CheckCircle2 className="h-3.5 w-3.5" />Reconcile
                </Button>
              </div>
            </Card>

            {/* Account header strip */}
            <Card className="p-5">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-start gap-3">
                  <span className={cn(
                    "h-10 w-10 rounded-md flex items-center justify-center shrink-0",
                    selectedAccount.type === "bank" && "bg-info-soft text-info",
                    selectedAccount.type === "cash" && "bg-success-soft text-success",
                    selectedAccount.type === "petty" && "bg-accent-soft text-accent",
                    selectedAccount.type === "customer" && "bg-brand-soft text-brand-soft-foreground",
                    selectedAccount.type === "vendor" && "bg-warning-soft text-warning",
                  )}>
                    <Wallet className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-base">{selectedAccount.name}</p>
                    {selectedAccount.number && (
                      <p className="text-xs text-muted-foreground tabular font-mono">{selectedAccount.number}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground mt-0.5">{selectedAccount.hint}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedAccount.reconciled
                    ? <Badge tone="success"><CheckCircle2 className="h-3 w-3" />Reconciled</Badge>
                    : <Badge tone="warning"><AlertCircle className="h-3 w-3" />Pending Reconciliation</Badge>
                  }
                  <Badge tone="neutral">{periodLabel}</Badge>
                </div>
              </div>

              {/* Balance summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5 pt-5 border-t border-border">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Opening</p>
                  <p className="text-lg font-semibold tabular mt-1">{money(selectedAccount.openingBalance)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-success font-semibold">Credits / Receipts</p>
                  <p className="text-lg font-semibold tabular mt-1 text-success">+ {money(periodDebits)}</p>
                  <p className="text-[10px] text-muted-foreground">{HDFC_STATEMENT.filter((_, i) => i > 0 && HDFC_STATEMENT[i].type === "debit").length} entries</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-warning font-semibold">Debits / Payments</p>
                  <p className="text-lg font-semibold tabular mt-1 text-warning">− {money(periodCredits)}</p>
                  <p className="text-[10px] text-muted-foreground">{HDFC_STATEMENT.filter((_, i) => i > 0 && HDFC_STATEMENT[i].type === "credit").length} entries</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Net Movement</p>
                  <p className={cn("text-lg font-semibold tabular mt-1", periodDebits - periodCredits >= 0 ? "text-success" : "text-warning")}>
                    {periodDebits - periodCredits >= 0 ? "+" : ""}{money(periodDebits - periodCredits)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-brand-soft-foreground font-semibold">Closing</p>
                  <p className="text-xl font-bold tabular mt-1 text-foreground">{money(closingBalance)}</p>
                </div>
              </div>
            </Card>

            {/* Ledger table */}
            <Card className="p-0 overflow-hidden">
              <CardHeader className="bg-surface-elevated">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Account Ledger</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">All transactions in chronological order · {HDFC_STATEMENT.length - 1} movements</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle-foreground" />
                      <Input placeholder="Search by voucher / particulars…" className="pl-8 h-8 w-64 text-xs" />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <table className="w-full text-sm">
                <thead className="bg-surface-sunken/50 border-b border-border">
                  <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-2.5 font-semibold">Date</th>
                    <th className="px-5 py-2.5 font-semibold">Voucher</th>
                    <th className="px-5 py-2.5 font-semibold">Particulars</th>
                    <th className="px-5 py-2.5 font-semibold text-right">Credit (₹)</th>
                    <th className="px-5 py-2.5 font-semibold text-right">Debit (₹)</th>
                    <th className="px-5 py-2.5 font-semibold text-right">Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {entriesWithBalance.map((e, i) => (
                    <tr key={e.id} className={cn("hover:bg-surface-sunken/40", i === 0 && "bg-surface-elevated/50 font-medium")}>
                      <td className="px-5 py-3 text-muted-foreground tabular whitespace-nowrap">{e.date}</td>
                      <td className="px-5 py-3 text-xs tabular font-mono">{e.voucher}</td>
                      <td className="px-5 py-3">{e.particulars}</td>
                      <td className="px-5 py-3 text-right tabular text-success font-medium">
                        {i > 0 && e.type === "debit" ? money(e.amount) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right tabular text-warning font-medium">
                        {i > 0 && e.type === "credit" ? money(e.amount) : "—"}
                      </td>
                      <td className="px-5 py-3 text-right tabular font-semibold">{money(e.balance ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-surface-elevated border-t-2 border-border">
                  <tr>
                    <td colSpan={3} className="px-5 py-3 text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Period Totals</td>
                    <td className="px-5 py-3 text-right tabular font-semibold text-success">{money(periodDebits)}</td>
                    <td className="px-5 py-3 text-right tabular font-semibold text-warning">{money(periodCredits)}</td>
                    <td className="px-5 py-3 text-right tabular font-bold text-base">{money(closingBalance)}</td>
                  </tr>
                </tfoot>
              </table>
            </Card>

            {/* All accounts position — filtered by search + type */}
            <Card className="p-0 overflow-hidden">
              <div className="px-5 py-3 bg-surface-elevated border-b border-border flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm font-semibold inline-flex items-center gap-1.5">
                    {statementType === "all" ? "All accounts" :
                     statementType === "bank" ? "Cash & bank accounts" :
                     statementType === "receivable" ? "Receivables · customers" : "Account payable · vendors"}
                    <Badge tone="neutral">{filteredAccounts.length}</Badge>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Current position{statementSearch ? ` · filtered by "${statementSearch}"` : ""}
                  </p>
                </div>
                {filteredAccounts.length > 0 && (
                  <div className="text-right text-xs">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Filtered total</p>
                    <p className={cn("font-bold tabular text-base",
                      statementType === "payable" ? "text-warning" : "text-foreground"
                    )}>{money(visibleClosing)}</p>
                  </div>
                )}
              </div>
              {filteredAccounts.length === 0 ? (
                <div className="p-12 text-center">
                  <Search className="h-8 w-8 mx-auto text-subtle-foreground mb-2" />
                  <p className="font-medium">No accounts match this search / filter</p>
                  <p className="text-xs text-muted-foreground mt-1">Try widening the type filter or clearing search</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-surface-sunken/50 border-b border-border">
                    <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-5 py-2.5 font-semibold">Account / Company</th>
                      <th className="px-5 py-2.5 font-semibold">Type</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Opening</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Closing</th>
                      <th className="px-5 py-2.5 font-semibold text-right">Movement</th>
                      <th className="px-5 py-2.5 font-semibold">Status</th>
                      <th className="px-5 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredAccounts.map(a => {
                      const movement = a.closingBalance - a.openingBalance;
                      return (
                        <tr key={a.id} className={cn("hover:bg-surface-sunken/40 transition-colors", a.id === statementAccountId && "bg-brand-soft/30")}>
                          <td className="px-5 py-3">
                            <p className="font-medium">{a.name}</p>
                            {a.number && <p className="text-[10px] text-muted-foreground font-mono tabular">{a.number}</p>}
                            {a.hint && <p className="text-[10px] text-muted-foreground italic mt-0.5">{a.hint}</p>}
                          </td>
                          <td className="px-5 py-3">
                            <Badge tone={
                              a.type === "bank" ? "info" :
                              a.type === "cash" ? "success" :
                              a.type === "petty" ? "accent" :
                              a.type === "customer" ? "brand" :
                              "warning"
                            }>{a.type === "vendor" ? "payable" : a.type === "customer" ? "receivable" : a.type}</Badge>
                          </td>
                          <td className="px-5 py-3 text-right tabular text-muted-foreground">{money(a.openingBalance)}</td>
                          <td className="px-5 py-3 text-right tabular font-semibold">{money(a.closingBalance)}</td>
                          <td className={cn("px-5 py-3 text-right tabular font-medium", movement >= 0 ? "text-success" : "text-warning")}>
                            {movement >= 0 ? "+" : ""}{money(movement)}
                          </td>
                          <td className="px-5 py-3">
                            {a.reconciled === undefined
                              ? <span className="text-xs text-muted-foreground">—</span>
                              : a.reconciled
                                ? <Badge tone="success"><CheckCircle2 className="h-3 w-3" />Reconciled</Badge>
                                : <Badge tone="warning"><AlertCircle className="h-3 w-3" />Pending</Badge>
                            }
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Button size="sm" variant="ghost" onClick={() => setStatementAccountId(a.id)}>Open</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-surface-elevated border-t-2 border-border">
                    <tr>
                      <td colSpan={2} className="px-5 py-3 text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                        Total · {filteredAccounts.length} account{filteredAccounts.length === 1 ? "" : "s"}
                      </td>
                      <td className="px-5 py-3 text-right tabular text-muted-foreground font-medium">{money(visibleOpening)}</td>
                      <td className={cn("px-5 py-3 text-right tabular font-bold text-base",
                        statementType === "payable" ? "text-warning" : "text-foreground"
                      )}>{money(visibleClosing)}</td>
                      <td className={cn("px-5 py-3 text-right tabular font-bold",
                        (visibleClosing - visibleOpening) >= 0 ? "text-success" : "text-warning"
                      )}>
                        {(visibleClosing - visibleOpening) >= 0 ? "+" : ""}{money(visibleClosing - visibleOpening)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </Card>
            </>)}
            {cashflowView === "reconcile" && <BankReconcileTab onToast={showToast} />}
          </div>
        );
      })()}

      {/* === VAT REPORT === */}
      {tab === "vat" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard label="Output VAT (5%)" value={money(income * 0.05)} icon={Receipt} accent="warning" hint="Tax collected on sales" />
            <KPICard label="Input VAT (recoverable)" value={money(28400)} icon={Receipt} accent="success" hint="Reclaimable from vendor bills" />
            <KPICard label="Net VAT Payable" value={money(income * 0.05 - 28400)} icon={Wallet} accent="brand" hint="After input VAT offset" />
            <KPICard label="TDS Deducted" value={money(12400)} icon={FileDown} accent="info" hint="Sec 194H + 194J" />
          </div>

          <AIInsight
            variant="panel"
            title="AI Tax Reminder"
            text={
              <>
                <span className="font-semibold">GSTR-3B</span> for May 2026 is due in <span className="font-semibold text-warning">26 days</span> (20 Jun).
                Net liability: <span className="font-semibold">{money(income * 0.05 - 28400)}</span> · ITC available: <span className="font-semibold text-success">{money(28400)}</span>.
                Annual return <span className="font-semibold">GSTR-9</span> window opens 1 Apr 2027. e-Invoice generation: <span className="font-semibold text-success">enabled</span> (NIC portal).
              </>
            }
            action={{ label: "File GSTR-3B", onClick: () => showToast("GSTR-3B draft saved to NIC portal") }}
          />

          {/* GSTR Returns */}
          <Card className="p-0 overflow-hidden">
            <CardHeader className="bg-surface-elevated">
              <div className="flex items-center justify-between">
                <CardTitle>VAT Returns Tracker</CardTitle>
                <Button size="sm" variant="outline" onClick={() => showToast("GSTR-3B JSON downloaded · ready for NIC portal upload")}>
                  <FileDown className="h-3.5 w-3.5" />Download JSON
                </Button>
              </div>
            </CardHeader>
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken/50 border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-2.5 font-semibold">Period</th>
                  <th className="px-5 py-2.5 font-semibold">Form</th>
                  <th className="px-5 py-2.5 font-semibold">Due Date</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Total Turnover</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Tax Liability</th>
                  <th className="px-5 py-2.5 font-semibold">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {GSTR_RETURNS.map(g => (
                  <tr key={g.id} className="hover:bg-surface-sunken/40">
                    <td className="px-5 py-3 font-medium">{g.period}</td>
                    <td className="px-5 py-3"><Badge tone="neutral">{g.form}</Badge></td>
                    <td className="px-5 py-3 text-muted-foreground tabular">{g.due}</td>
                    <td className="px-5 py-3 text-right tabular">{money(g.total)}</td>
                    <td className="px-5 py-3 text-right tabular font-medium text-warning">{money(g.tax)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={
                        g.status === "Filed" ? "success" :
                        g.status === "Draft" ? "info" :
                        g.status === "Pending" ? "warning" :
                        "neutral"
                      }>
                        {g.status === "Filed" && <CheckCircle2 className="h-3 w-3" />}
                        {g.status === "Pending" && <AlertCircle className="h-3 w-3" />}
                        {g.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (g.status === "Filed") showToast(`Opening filed return ${g.form}`);
                        else if (g.status === "Upcoming") showToast(`Reminder set for ${g.form} · ${g.due}`);
                        else showToast(`${g.form} filed · ARN generated · NIC acknowledgment received`);
                      }}>
                        {g.status === "Filed" ? "View" : g.status === "Upcoming" ? "Schedule" : "File now"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* ITC ledger */}
          <Card className="p-0 overflow-hidden">
            <CardHeader className="bg-surface-elevated">
              <div className="flex items-center justify-between">
                <CardTitle>Input Tax Credit (ITC) Ledger</CardTitle>
                <Badge tone="success">Reconciled with GSTR-2B</Badge>
              </div>
            </CardHeader>
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken/50 border-b border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-2.5 font-semibold">Source</th>
                  <th className="px-5 py-2.5 font-semibold text-right">CGST</th>
                  <th className="px-5 py-2.5 font-semibold text-right">SGST</th>
                  <th className="px-5 py-2.5 font-semibold text-right">IGST</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Total ITC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { label: "Capital goods (Furniture, IT)", c: 4200, s: 4200, i: 0 },
                  { label: "Input services (Maintenance, IT)", c: 3800, s: 3800, i: 0 },
                  { label: "Input services (Marketing — inter-state)", c: 0, s: 0, i: 4800 },
                  { label: "Inputs (Linen, Amenities)", c: 1900, s: 1900, i: 0 },
                  { label: "Inputs (F&B raw materials)", c: 1900, s: 1900, i: 0 },
                ].map((r, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3">{r.label}</td>
                    <td className="px-5 py-3 text-right tabular">{r.c > 0 ? money(r.c) : "—"}</td>
                    <td className="px-5 py-3 text-right tabular">{r.s > 0 ? money(r.s) : "—"}</td>
                    <td className="px-5 py-3 text-right tabular">{r.i > 0 ? money(r.i) : "—"}</td>
                    <td className="px-5 py-3 text-right tabular font-medium text-success">{money(r.c + r.s + r.i)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-elevated border-t border-border">
                <tr>
                  <td className="px-5 py-3 text-right text-xs uppercase tracking-wider font-semibold text-muted-foreground">Total ITC</td>
                  <td className="px-5 py-3 text-right tabular font-semibold">{money(11800)}</td>
                  <td className="px-5 py-3 text-right tabular font-semibold">{money(11800)}</td>
                  <td className="px-5 py-3 text-right tabular font-semibold">{money(4800)}</td>
                  <td className="px-5 py-3 text-right tabular font-bold text-base text-success">{money(28400)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>

          <Card className="p-0 overflow-hidden">
            <CardHeader className="bg-surface-elevated"><CardTitle>VAT Summary by Source</CardTitle></CardHeader>
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken/50 border-y border-border">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-2.5 font-semibold">Source</th>
                  <th className="px-5 py-2.5 font-semibold text-right">Net Sales</th>
                  <th className="px-5 py-2.5 font-semibold text-right">VAT (5%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {incomeBreakdown.map(i => (
                  <tr key={i.label}>
                    <td className="px-5 py-3 font-medium">{i.label}</td>
                    <td className="px-5 py-3 text-right tabular">{money(i.value)}</td>
                    <td className="px-5 py-3 text-right tabular text-warning">{money(i.value * 0.05)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-surface-elevated border-t border-border">
                <tr>
                  <td className="px-5 py-3 font-semibold">Total VAT collected</td>
                  <td className="px-5 py-3 text-right tabular font-semibold">{money(income)}</td>
                  <td className="px-5 py-3 text-right tabular font-bold text-warning">{money(income * 0.05)}</td>
                </tr>
              </tfoot>
            </table>
          </Card>
        </>
      )}

      {/* === ENTRY MODAL === */}
      {showEntry && (
        <EntryModal
          type={showEntry}
          onClose={() => setShowEntry(null)}
          onSubmit={handleAdd}
          incomeCats={INCOME_CATS}
          expenseCats={EXPENSE_CATS}
        />
      )}

      {voucherEntry && (
        <PaymentVoucherModal entry={voucherEntry} onClose={() => setVoucherEntry(null)} />
      )}

      {showExpenseFull && (
        <NewExpenseForm
          expenseCats={EXPENSE_CATS}
          onClose={() => setShowExpenseFull(false)}
          onSubmit={(entry, andAddAnother) => {
            handleAdd(entry);
            showToast(andAddAnother ? "Expense saved · ready for next" : "Expense recorded");
            if (!andAddAnother) setShowExpenseFull(false);
          }}
        />
      )}

      {tab === "vendor" && <PayablesTab onToast={showToast} />}
      {tab === "receivables" && <ReceivablesTab onToast={showToast} />}
      {tab === "profitloss" && (
        <div className="space-y-5">
          <SubToggle
            value={plView}
            onChange={setPlView}
            options={[{ id: "statement", label: "P&L / Balance sheet" }, { id: "journal", label: "Journal & ledger" }]}
          />
          {plView === "statement" && <PnlBsTab entries={entries} />}
          {plView === "journal" && <JournalTab onToast={showToast} />}
        </div>
      )}
      {tab === "reports" && (
        <div className="space-y-5">
          <SubToggle
            value={reportsView}
            onChange={setReportsView}
            options={[{ id: "downloads", label: "Statements & summaries" }, { id: "cashier", label: "Cashier shifts" }]}
          />
          {reportsView === "downloads" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: "Profit & Loss statement", desc: "Revenue, costs and net profit for the period.", icon: FileBarChart },
                { name: "Cash flow statement", desc: "Opening, movements and closing balances.", icon: Wallet },
                { name: "VAT summary", desc: "Output VAT, input VAT and net payable.", icon: Receipt },
                { name: "Day book export", desc: "Every transaction, ready for your accountant.", icon: ClipboardList },
                { name: "Receivables aging", desc: "Outstanding by guest, agent and company.", icon: Users },
                { name: "Vendor payables", desc: "Bills due and payment status.", icon: FileText },
              ].map(r => (
                <Card key={r.name} className="p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-md bg-brand-soft text-brand-soft-foreground flex items-center justify-center shrink-0">
                      <r.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.desc}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => showToast(`${r.name} · CSV downloaded`)}>
                      <FileDown className="h-3.5 w-3.5" />CSV
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => showToast(`${r.name} · PDF generated`)}>
                      <Printer className="h-3.5 w-3.5" />PDF
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
          {reportsView === "cashier" && <CashierTab onToast={showToast} />}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-success text-white rounded-md px-4 py-2.5 text-sm shadow-lg inline-flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />{toast}
        </div>
      )}
    </div>
  );
}

function EntryModal({ type, onClose, onSubmit, incomeCats, expenseCats }: {
  type: EntryType; onClose: () => void; onSubmit: (e: Omit<Entry, "id">) => void;
  incomeCats: string[]; expenseCats: string[];
}) {
  const [description, setDescription] = React.useState("");
  const [amount, setAmount] = React.useState<number>(0);
  const [category, setCategory] = React.useState((type === "income" ? incomeCats : expenseCats)[0]);
  const [mode, setMode] = React.useState("UPI");
  const [ref, setRef] = React.useState("");
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [aiSuggested, setAiSuggested] = React.useState<string | null>(null);

  // India-specific expense fields — header level
  const [vendor, setVendor] = React.useState("");
  const [gstin, setGstin] = React.useState("");
  const [interState, setInterState] = React.useState(false);
  const [attachment, setAttachment] = React.useState<{ name: string; dataUrl: string; type: string } | null>(null);

  // Multi-line items — each line is its own row
  const [lines, setLines] = React.useState<ExpenseLine[]>([blankLine()]);

  // Recompute one line's derived fields
  const computeLine = (l: ExpenseLine): ExpenseLine => {
    const taxable = Math.max(0, l.qty * l.rate);
    const tax = taxable * (l.gstPct / 100);
    return { ...l, taxable, tax, amount: taxable + tax };
  };

  const updateLine = (idx: number, patch: Partial<ExpenseLine>) => {
    setLines(prev => prev.map((l, i) => i === idx ? computeLine({ ...l, ...patch }) : l));
  };
  const addLine = () => setLines(prev => [...prev, blankLine()]);
  const removeLine = (idx: number) => setLines(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));

  // Aggregate totals across all lines
  const taxableTotal = lines.reduce((s, l) => s + l.taxable, 0);
  const taxTotal = lines.reduce((s, l) => s + l.tax, 0);
  const grossTotal = taxableTotal + taxTotal;
  const cgst = interState ? 0 : taxTotal / 2;
  const sgst = interState ? 0 : taxTotal / 2;
  const igst = interState ? taxTotal : 0;
  const hsnSac = lines.map(l => l.hsnSac).filter(Boolean).join(", "); // for downstream voucher display

  // Keep `amount` (used at save time) in sync with the lines total
  React.useEffect(() => {
    if (type !== "expense") return;
    setAmount(Math.round(grossTotal));
    // Build a flat description from line items if user hasn't typed one
    if (!description && lines.length > 0 && lines.some(l => l.description)) {
      const first = lines.find(l => l.description)?.description ?? "";
      setDescription(first + (lines.filter(l => l.description).length > 1 ? ` +${lines.filter(l => l.description).length - 1} more` : ""));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grossTotal, type]);

  const uploadInvoice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setAttachment({ name: file.name, dataUrl: ev.target?.result as string, type: file.type });
    reader.readAsDataURL(file);
  };

  // Mock AI categorisation when description is typed
  React.useEffect(() => {
    if (!description || description.length < 4) { setAiSuggested(null); return; }
    const lower = description.toLowerCase();
    const cats = type === "income" ? incomeCats : expenseCats;
    let suggested: string | null = null;
    if (type === "expense") {
      if (lower.includes("salary") || lower.includes("payroll") || lower.includes("wage")) suggested = "Payroll";
      else if (lower.includes("dewa") || lower.includes("electricity") || lower.includes("water") || lower.includes("utility")) suggested = "Utilities (DEWA)";
      else if (lower.includes("food") || lower.includes("kitchen") || lower.includes("grocer")) suggested = "F&B Cost";
      else if (lower.includes("repair") || lower.includes("ac") || lower.includes("plumb") || lower.includes("maintenance")) suggested = "Maintenance";
      else if (lower.includes("booking") || lower.includes("agoda") || lower.includes("expedia") || lower.includes("ota")) suggested = "OTA Commissions";
      else if (lower.includes("linen") || lower.includes("towel") || lower.includes("sheet")) suggested = "Linen & Amenities";
      else if (lower.includes("marketing") || lower.includes("ads") || lower.includes("campaign")) suggested = "Marketing";
      else if (lower.includes("insurance")) suggested = "Insurance";
      else if (lower.includes("bank") || lower.includes("charge")) suggested = "Bank Charges";
    } else {
      if (lower.includes("room") || lower.includes("folio") || lower.includes("checkout")) suggested = "Room Revenue";
      else if (lower.includes("food") || lower.includes("f&b") || lower.includes("dining") || lower.includes("minibar")) suggested = "F&B";
      else if (lower.includes("hall") || lower.includes("ballroom") || lower.includes("conference")) suggested = "Hall Rental";
      else if (lower.includes("spa") || lower.includes("massage")) suggested = "Spa & Wellness";
      else if (lower.includes("laundry")) suggested = "Laundry";
      else if (lower.includes("extra bed")) suggested = "Extra Bed";
    }
    if (suggested && cats.includes(suggested) && suggested !== category) {
      setAiSuggested(suggested);
    } else {
      setAiSuggested(null);
    }
  }, [description, type, category, incomeCats, expenseCats]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const isAnomalous = type === "expense" && amount > 50000;
  // Need vendor + at least one line with description + qty + rate
  const validLines = lines.filter(l => l.description.trim() && l.qty > 0 && l.rate > 0);
  const canSubmit = (type === "expense"
    ? (vendor.trim() && validLines.length > 0 && category)
    : (description.trim() && amount > 0 && category));

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-lg p-5 animate-in shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                {type === "income" ? "Record Income" : type === "expense" ? "Record Expense" : "Record Refund"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Auto-categorised by AI · auto-posted to ledger &amp; VAT
              </p>
            </div>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center"><X className="h-4 w-4" /></button>
          </div>

          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder={type === "income" ? "e.g. ABC Travels — advance receipt" : "e.g. DEWA electricity bill May"}
              autoFocus
            />
          </div>

          {aiSuggested && (
            <div className="rounded-md bg-brand-soft border border-brand/30 p-3 flex items-start gap-3">
              <Sparkles className="h-4 w-4 text-brand mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">AI suggests category</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge tone="brand">{aiSuggested}</Badge>
                  <button type="button" onClick={() => { setCategory(aiSuggested); setAiSuggested(null); }} className="text-xs text-brand hover:underline font-medium">
                    Apply
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={category} onChange={e => setCategory(e.target.value)}>
                {(type === "income" ? incomeCats : expenseCats).map(c => <option key={c}>{c}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Payment mode</Label>
              <Select value={mode} onChange={e => setMode(e.target.value)}>
                <option>UPI</option><option>Cash</option><option>Card</option><option>Net Banking</option><option>NEFT</option><option>RTGS</option><option>IMPS</option><option>Cheque</option>
              </Select>
            </div>
          </div>

          {/* Indian vendor + GST fields — only for expenses */}
          {type === "expense" && (
            <div className="space-y-3 p-3 rounded-md border border-dashed border-border bg-surface-sunken/30">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-semibold inline-flex items-center gap-1.5">
                <Receipt className="h-3 w-3" />Vendor &amp; GST Details
              </p>
              {/* Header — bill-level info shared by all line items */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Vendor / Supplier *</Label>
                  <Input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. Pearl Textiles Pvt. Ltd." />
                </div>
                <div className="space-y-1.5">
                  <Label>Vendor GSTIN</Label>
                  <Input
                    value={gstin}
                    onChange={e => setGstin(e.target.value.toUpperCase())}
                    placeholder="27AAACR5055K1Z5"
                    maxLength={15}
                    className="font-mono uppercase"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Vendor Invoice No.</Label>
                  <Input value={ref} onChange={e => setRef(e.target.value)} placeholder="INV-2026-…" />
                </div>
                <div className="space-y-1.5">
                  <Label>Place of Supply</Label>
                  <Select value={interState ? "inter" : "intra"} onChange={e => setInterState(e.target.value === "inter")}>
                    <option value="intra">Maharashtra (intra-state · CGST+SGST)</option>
                    <option value="inter">Other state (inter-state · IGST)</option>
                  </Select>
                </div>
              </div>

              {/* Line items table — multiple items per bill */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Line Items · {lines.length}
                  </Label>
                  <Button type="button" size="sm" variant="ghost" onClick={addLine}>
                    <Plus className="h-3 w-3" />Add line
                  </Button>
                </div>

                <div className="rounded-md border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-surface-sunken/60 border-b border-border">
                      <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-2 py-1.5 font-semibold w-[34%]">Description *</th>
                        <th className="px-2 py-1.5 font-semibold">HSN/SAC</th>
                        <th className="px-2 py-1.5 font-semibold text-right w-[8%]">Qty</th>
                        <th className="px-2 py-1.5 font-semibold text-right">Rate (₹)</th>
                        <th className="px-2 py-1.5 font-semibold">GST %</th>
                        <th className="px-2 py-1.5 font-semibold text-right">Tax</th>
                        <th className="px-2 py-1.5 font-semibold text-right">Amount</th>
                        <th className="w-[5%]"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-surface">
                      {lines.map((l, i) => (
                        <tr key={l.id}>
                          <td className="p-1">
                            <input
                              type="text"
                              value={l.description}
                              onChange={e => updateLine(i, { description: e.target.value })}
                              placeholder="Item / service description"
                              className="w-full h-8 px-2 rounded-md bg-transparent text-xs outline-hidden focus:bg-surface-sunken/40 focus:ring-1 focus:ring-ring/40"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="text"
                              value={l.hsnSac ?? ""}
                              onChange={e => updateLine(i, { hsnSac: e.target.value })}
                              placeholder="9963"
                              className="w-full h-8 px-2 rounded-md bg-transparent text-xs tabular font-mono outline-hidden focus:bg-surface-sunken/40 focus:ring-1 focus:ring-ring/40"
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              value={l.qty}
                              onChange={e => updateLine(i, { qty: Math.max(0, Number(e.target.value)) })}
                              className="w-full h-8 px-2 rounded-md bg-transparent text-xs tabular text-right outline-hidden focus:bg-surface-sunken/40 focus:ring-1 focus:ring-ring/40"
                              min={0}
                            />
                          </td>
                          <td className="p-1">
                            <input
                              type="number"
                              value={l.rate}
                              onChange={e => updateLine(i, { rate: Math.max(0, Number(e.target.value)) })}
                              className="w-full h-8 px-2 rounded-md bg-transparent text-xs tabular text-right outline-hidden focus:bg-surface-sunken/40 focus:ring-1 focus:ring-ring/40"
                              step="0.01"
                              min={0}
                            />
                          </td>
                          <td className="p-1">
                            <select
                              value={l.gstPct}
                              onChange={e => updateLine(i, { gstPct: Number(e.target.value) })}
                              className="w-full h-8 px-2 rounded-md bg-transparent text-xs tabular outline-hidden focus:bg-surface-sunken/40 focus:ring-1 focus:ring-ring/40"
                            >
                              <option value={0}>0%</option>
                              <option value={5}>5%</option>
                              <option value={12}>12%</option>
                              <option value={18}>18%</option>
                              <option value={28}>28%</option>
                            </select>
                          </td>
                          <td className="p-2 text-right tabular text-muted-foreground">{money(l.tax)}</td>
                          <td className="p-2 text-right tabular font-medium">{money(l.amount)}</td>
                          <td className="p-1 text-center">
                            <button
                              type="button"
                              onClick={() => removeLine(i)}
                              disabled={lines.length === 1}
                              className="h-7 w-7 rounded-md inline-flex items-center justify-center text-subtle-foreground hover:text-danger hover:bg-danger-soft disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Remove line"
                              aria-label="Remove line"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-surface-elevated border-t border-border">
                      <tr>
                        <td colSpan={5} className="px-2 py-1.5 text-right text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                          Taxable Subtotal
                        </td>
                        <td className="px-2 py-1.5 text-right tabular text-muted-foreground">{money(taxTotal)}</td>
                        <td className="px-2 py-1.5 text-right tabular font-semibold">{money(taxableTotal)}</td>
                        <td></td>
                      </tr>
                      {interState ? (
                        <tr>
                          <td colSpan={6} className="px-2 py-1.5 text-right text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                            IGST
                          </td>
                          <td className="px-2 py-1.5 text-right tabular">{money(igst)}</td>
                          <td></td>
                        </tr>
                      ) : (
                        <>
                          <tr>
                            <td colSpan={6} className="px-2 py-1.5 text-right text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                              CGST
                            </td>
                            <td className="px-2 py-1.5 text-right tabular">{money(cgst)}</td>
                            <td></td>
                          </tr>
                          <tr>
                            <td colSpan={6} className="px-2 py-1.5 text-right text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                              SGST
                            </td>
                            <td className="px-2 py-1.5 text-right tabular">{money(sgst)}</td>
                            <td></td>
                          </tr>
                        </>
                      )}
                      <tr className="border-t-2 border-border">
                        <td colSpan={6} className="px-2 py-2 text-right text-xs uppercase tracking-wider font-bold">
                          Grand Total
                        </td>
                        <td className="px-2 py-2 text-right tabular font-bold text-base">{money(grossTotal)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {taxTotal > 0 && (
                  <p className="text-[10px] text-muted-foreground italic">
                    <Sparkles className="h-2.5 w-2.5 inline mr-0.5" />
                    Eligible for Input Tax Credit (ITC) {money(taxTotal)} — auto-posted to GSTR-2B reconciliation
                  </p>
                )}
              </div>

              {/* Invoice upload */}
              <div className="space-y-1.5">
                <Label>Upload Purchase Invoice (vendor bill)</Label>
                {!attachment ? (
                  <label className="block">
                    <div className="rounded-md border-2 border-dashed border-border bg-surface p-4 text-center cursor-pointer hover:bg-surface-sunken transition-colors">
                      <FileText className="h-6 w-6 mx-auto text-subtle-foreground" />
                      <p className="text-xs mt-2">Click to upload PDF, JPG or PNG · max 10 MB</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Required for GST input credit · auto-scanned via OCR for HSN/SAC + tax extraction
                      </p>
                    </div>
                    <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={uploadInvoice} />
                  </label>
                ) : (
                  <div className="rounded-md border border-success/30 bg-success-soft/30 p-3 flex items-center gap-3">
                    <span className="h-9 w-9 rounded-md bg-success text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{attachment.name}</p>
                      <p className="text-[10px] text-muted-foreground">{attachment.type} · OCR ready</p>
                    </div>
                    <button type="button" onClick={() => setAttachment(null)} className="h-7 w-7 rounded-md hover:bg-danger-soft hover:text-danger inline-flex items-center justify-center" aria-label="Remove">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* For income/refund, simple amount + ref input */}
          {type !== "expense" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (₹) *</Label>
                <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} step="0.01" />
              </div>
              <div className="space-y-1.5">
                <Label>Reference / Invoice #</Label>
                <Input value={ref} onChange={e => setRef(e.target.value)} placeholder="INV-…" />
              </div>
            </div>
          )}

          {isAnomalous && (
            <div className="rounded-md bg-warning-soft border border-warning/30 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-warning">AI anomaly check</p>
                <p className="text-muted-foreground mt-0.5">This expense is unusually large for {category} — average is around AED 2,400. Confirm before saving.</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button
              disabled={!canSubmit}
              variant={type === "income" ? "success" : "primary"}
              onClick={() => {
                // Build a sensible description from line items if not explicitly typed
                const computedDesc = type === "expense"
                  ? (validLines.length > 1
                      ? `${validLines[0].description} +${validLines.length - 1} more`
                      : validLines[0]?.description ?? description)
                  : description;
                onSubmit({
                  date: new Date(date).toLocaleDateString("en-US", { day: "2-digit", month: "short" }),
                  type, category,
                  description: computedDesc,
                  amount: type === "expense" ? Math.round(grossTotal) : amount,
                  mode, ref,
                  ...(type === "expense" ? {
                    vendor, gstin, hsnSac, cgst, sgst, igst,
                    lines: validLines,
                    voucherNo: `PV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`,
                    attachment,
                  } : {}),
                });
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
              Save {type === "income" ? "Income" : type === "expense" ? "Expense" : "Refund"}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

// ---------- Payment Voucher Modal ----------
function PaymentVoucherModal({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const name = hotelName(useProperty());
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);

  const taxableValue = entry.amount - ((entry.cgst ?? 0) + (entry.sgst ?? 0) + (entry.igst ?? 0));
  const amountInWords = inrToWords(entry.amount);
  const voucherNo = entry.voucherNo ?? `PV-${new Date().getFullYear()}-${entry.id.slice(-4).toUpperCase()}`;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs no-print" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 pointer-events-none overflow-y-auto no-print">
        <Card className="pointer-events-auto w-full max-w-2xl p-5 shadow-xl my-auto animate-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Payment Voucher Preview</h3>
            <button type="button" onClick={onClose} className="h-8 w-8 rounded-md hover:bg-surface-sunken inline-flex items-center justify-center" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* The voucher document */}
          <div id="print-area" className="rounded-md border-2 border-double border-border p-5 bg-surface text-sm space-y-3">
            {/* Header */}
            <div className="text-center border-b-2 border-double border-border pb-3">
              <p className="font-display text-lg font-medium">{name}</p>
              <p className="text-[10px] text-muted-foreground">Main Tower · MG Road, Bandra West, Mumbai 400050</p>
              <p className="text-[10px] text-muted-foreground tabular">GSTIN 27AAACR5055K1Z5 · PAN AAACR5055K</p>
              <div className="mt-2 inline-block px-4 py-1 rounded-full bg-warning text-white text-[10px] uppercase tracking-[0.2em] font-bold">
                Payment Voucher
              </div>
            </div>

            {/* Voucher meta */}
            <div className="grid grid-cols-3 gap-3 text-xs border-b border-border pb-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Voucher No.</p>
                <p className="font-semibold tabular mt-0.5">{voucherNo}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Date</p>
                <p className="font-semibold tabular mt-0.5">{entry.date} 2026</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Mode</p>
                <p className="font-semibold mt-0.5">{entry.mode}</p>
              </div>
            </div>

            {/* Body — paid to */}
            <div className="space-y-2 border-b border-border pb-3">
              <div className="grid grid-cols-3 gap-2 text-xs">
                <span className="text-muted-foreground">Paid To</span>
                <span className="col-span-2 font-medium">{entry.vendor ?? "—"}</span>
              </div>
              {entry.gstin && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span className="text-muted-foreground">Vendor GSTIN</span>
                  <span className="col-span-2 font-mono tabular">{entry.gstin}</span>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <span className="text-muted-foreground">Account Head</span>
                <span className="col-span-2 font-medium">{entry.category}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <span className="text-muted-foreground">Description</span>
                <span className="col-span-2">{entry.description}</span>
              </div>
              {entry.ref && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span className="text-muted-foreground">Invoice / Bill #</span>
                  <span className="col-span-2 tabular">{entry.ref}</span>
                </div>
              )}
              {entry.hsnSac && (
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span className="text-muted-foreground">HSN / SAC</span>
                  <span className="col-span-2 tabular">{entry.hsnSac}</span>
                </div>
              )}
            </div>

            {/* Line items (if present) */}
            {entry.lines && entry.lines.length > 0 && (
              <div className="border-b border-border pb-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Line Items</p>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-left border-b border-border">
                      <th className="py-1 font-semibold">#</th>
                      <th className="py-1 font-semibold">Description</th>
                      <th className="py-1 font-semibold">HSN/SAC</th>
                      <th className="py-1 font-semibold text-right">Qty</th>
                      <th className="py-1 font-semibold text-right">Rate</th>
                      <th className="py-1 font-semibold text-right">Tax</th>
                      <th className="py-1 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.lines.map((l, i) => (
                      <tr key={l.id} className="border-b border-border/40">
                        <td className="py-1 text-muted-foreground tabular">{i + 1}</td>
                        <td className="py-1">{l.description}</td>
                        <td className="py-1 tabular font-mono">{l.hsnSac || "—"}</td>
                        <td className="py-1 text-right tabular">{l.qty}</td>
                        <td className="py-1 text-right tabular">{money(l.rate)}</td>
                        <td className="py-1 text-right tabular text-muted-foreground">{money(l.tax)} <span className="text-[9px]">({l.gstPct}%)</span></td>
                        <td className="py-1 text-right tabular font-medium">{money(l.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Amount breakdown */}
            <div className="border-b border-border pb-3 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Taxable Value</span><span className="tabular">{money(taxableValue)}</span></div>
              {(entry.cgst ?? 0) > 0 && (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span className="tabular">{money(entry.cgst!)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span className="tabular">{money(entry.sgst!)}</span></div>
                </>
              )}
              {(entry.igst ?? 0) > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">VAT</span><span className="tabular">{money(entry.igst!)}</span></div>
              )}
              <div className="flex justify-between border-t border-border pt-1 mt-1">
                <span className="font-semibold">Gross Amount Paid</span>
                <span className="font-bold tabular text-base">{money(entry.amount)}</span>
              </div>
            </div>

            {/* Amount in words */}
            <div className="rounded-md bg-warning-soft/40 border border-warning/30 p-3 text-xs">
              <span className="text-muted-foreground uppercase tracking-wider font-semibold mr-2">Amount in words:</span>
              <span className="font-medium">{amountInWords} Rupees Only</span>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t-2 border-double border-border">
              <div className="text-center">
                <p className="border-t border-border pt-1 text-[10px] text-muted-foreground">Prepared by</p>
                <p className="text-[10px] tabular">Cashier</p>
              </div>
              <div className="text-center">
                <p className="border-t border-border pt-1 text-[10px] text-muted-foreground">Approved by</p>
                <p className="text-[10px] tabular">Accounts Manager</p>
              </div>
              <div className="text-center">
                <p className="border-t border-border pt-1 text-[10px] text-muted-foreground">Received by</p>
                <p className="text-[10px] tabular">Vendor / Recipient</p>
              </div>
            </div>

            <p className="text-[9px] text-muted-foreground italic text-center border-t border-border pt-2">
              Original for Recipient · Duplicate for Accounts · Triplicate for Vendor Records
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-border mt-4">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            {entry.attachment && (
              <a href={entry.attachment.dataUrl} download={entry.attachment.name}>
                <Button variant="outline"><FileText className="h-4 w-4" />View Invoice</Button>
              </a>
            )}
            <Button variant="outline"><FileText className="h-4 w-4" />Save PDF</Button>
            <Button onClick={() => window.print()}><Printer className="h-4 w-4" />Print Voucher</Button>
          </div>
        </Card>
      </div>
    </>
  );
}

// Indian-style number-to-words (Lakh / Crore)
function inrToWords(n: number): string {
  if (n === 0) return "Zero";
  if (n < 0) return "Minus " + inrToWords(-n);
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  function two(num: number): string {
    if (num < 20) return ones[num];
    return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
  }
  function three(num: number): string {
    if (num >= 100) return ones[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + two(num % 100) : "");
    return two(num);
  }
  let out = "";
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  if (crore) out += three(crore) + " Crore ";
  if (lakh) out += three(lakh) + " Lakh ";
  if (thousand) out += three(thousand) + " Thousand ";
  if (n) out += three(n);
  return out.trim();
}

// ===================== CASHIER SUMMARY TAB — moved to ./_tabs/cashier-tab.tsx =====================


