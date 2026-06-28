import React, { useMemo, useState } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";

const CONTACT = {
  email: "roberto@knop.es",
  web: "https://www.knop.es",
  linkedin: "https://www.linkedin.com/in/RobertoKnop",
};

const DEFAULT_INPUTS = {
  maturity: 10,
  year1Income: 100000,
  incomeGrowth: 3,
  year1Expenses: 35000,
  expenseGrowth: 2,
  exitCapRate: 5,
  discountRate: 8,
};

const TEXT = {
  en: {
    title: "Real Estate DCF Pro - Roberto Knop",
    subtitle: "Professional real estate valuation model with manual inputs, NPV, IRR, CAGR, payback, sensitivity and scenario analysis.",
    reset: "Reset", print: "Generate PDF Report", year: "Year", years: "years", inputs: "Valuation Inputs", analysis: "Analysis",
    maturity: "Project Maturity (Years)", year1Income: "Year 1 Income", incomeGrowth: "Income Growth Rate (%)", year1Expenses: "Year 1 Expenses", expenseGrowth: "Expense Growth Rate (%)", exitCapRate: "Exit Cap Rate (%)", discountRate: "Discount Rate (%)",
    npv: "Net Present Value", irr: "IRR", cagr: "CAGR", payback: "Payback Period", terminalValue: "Terminal Value", totalNOI: "Total Net Operating Income",
    income: "Income", expenses: "Expenses", noi: "NOI", dcf: "Discounted Cash Flow", modelTable: "Model Table", operatingChart: "Income, Expenses and NOI", dcfChart: "Discounted Cash Flow",
    sensitivity: "Sensitivity Analysis", sensitivitySubtitle: "NPV sensitivity to Exit Cap Rate and Discount Rate", tornado: "Value Drivers", tornadoSubtitle: "Impact on NPV from a ±100 bps change in each variable", exitCap: "Exit Cap", discount: "Discount", upside: "Upside", downside: "Downside", footerName: "Roberto Knop"
  },
  es: {
    title: "Real Estate DCF Pro - Roberto Knop",
    subtitle: "Modelo profesional de valoración inmobiliaria con inputs manuales, NPV, TIR, CAGR, payback, sensibilidad y análisis de escenarios.",
    reset: "Restaurar", print: "Generar Informe PDF", year: "Año", years: "años", inputs: "Inputs de Valoración", analysis: "Análisis",
    maturity: "Vencimiento del Proyecto (Años)", year1Income: "Ingresos del Ejercicio 1", incomeGrowth: "Tasa de Crecimiento de Ingresos (%)", year1Expenses: "Gastos del Ejercicio 1", expenseGrowth: "Tasa de Crecimiento de Gastos (%)", exitCapRate: "Exit Cap Rate (%)", discountRate: "Discount Rate (%)",
    npv: "Net Present Value", irr: "TIR", cagr: "CAGR", payback: "Payback Period", terminalValue: "Valor Residual", totalNOI: "Total Net Operating Income",
    income: "Ingresos", expenses: "Gastos", noi: "NOI", dcf: "Flujo Descontado", modelTable: "Tabla del Modelo", operatingChart: "Ingresos, Gastos y NOI", dcfChart: "Flujo Descontado",
    sensitivity: "Análisis de Sensibilidad", sensitivitySubtitle: "Sensibilidad del NPV al Exit Cap Rate y al Discount Rate", tornado: "Variables de Impacto", tornadoSubtitle: "Impacto en NPV de un cambio de ±100 pb en cada variable", exitCap: "Exit Cap", discount: "Discount", upside: "Alcista", downside: "Bajista", footerName: "Roberto Knop"
  }
};

function money(value) {
  if (!Number.isFinite(value)) return "-";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
function pct(value) { if (!Number.isFinite(value)) return "-"; return `${(value * 100).toFixed(2)}%`; }

function calculateIRR(flows, guess = 0.1) {
  let rate = guess;
  for (let i = 0; i < 1000; i++) {
    let npv = 0, dnpv = 0;
    for (let t = 0; t < flows.length; t++) {
      npv += flows[t] / Math.pow(1 + rate, t);
      if (t > 0) dnpv -= t * flows[t] / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(dnpv) < 1e-12) return null;
    const newRate = rate - npv / dnpv;
    if (!Number.isFinite(newRate) || newRate <= -0.9999) return null;
    if (Math.abs(newRate - rate) < 1e-8) return newRate;
    rate = newRate;
  }
  return null;
}

function calculatePaybackPeriod(investment, inflows) {
  let cumulative = 0;
  for (let i = 0; i < inflows.length; i++) {
    const previous = cumulative;
    cumulative += inflows[i];
    if (cumulative >= investment) return i + (investment - previous) / inflows[i];
  }
  return null;
}

function calculateModel(inputs) {
  const maturity = Math.max(1, Math.round(inputs.maturity || 1));
  const incomeGrowth = inputs.incomeGrowth / 100;
  const expenseGrowth = inputs.expenseGrowth / 100;
  const exitCapRate = inputs.exitCapRate / 100;
  const discountRate = inputs.discountRate / 100;
  const rows = [];

  for (let i = 0; i < maturity; i++) {
    const income = i === 0 ? inputs.year1Income : rows[i - 1].income * (1 + incomeGrowth);
    const expenses = i === 0 ? inputs.year1Expenses : rows[i - 1].expenses * (1 + expenseGrowth);
    const noi = income - expenses;
    rows.push({ year: i + 1, income, expenses, noi, terminalValue: 0, discountedCashFlow: 0 });
  }

  const terminalValue = exitCapRate > 0 ? rows[rows.length - 1].noi / exitCapRate : 0;
  rows[rows.length - 1].terminalValue = terminalValue;
  rows.forEach((row, i) => { row.discountedCashFlow = (row.noi + row.terminalValue) / Math.pow(1 + discountRate, i + 1); });

  const netPresentValue = rows.reduce((sum, row) => sum + row.discountedCashFlow, 0);
  const investment = netPresentValue;
  const inflows = rows.map((row, i) => i === rows.length - 1 ? row.noi + row.terminalValue : row.noi);
  const irr = calculateIRR([-investment, ...inflows]);
  const totalInflows = inflows.reduce((sum, value) => sum + value, 0);
  const cagr = investment > 0 ? Math.pow(totalInflows / investment, 1 / maturity) - 1 : null;
  const paybackPeriod = calculatePaybackPeriod(investment, inflows);
  const totalNOI = rows.reduce((sum, row) => sum + row.noi, 0);

  return { rows, netPresentValue, investment, irr, cagr, paybackPeriod, terminalValue, totalNOI };
}

function buildSensitivity(inputs) {
  const baseExit = inputs.exitCapRate, baseDiscount = inputs.discountRate;
  const exitCaps = [baseExit - 1, baseExit - 0.5, baseExit, baseExit + 0.5, baseExit + 1].map(v => Math.max(0.1, Number(v.toFixed(2))));
  const discounts = [baseDiscount - 1, baseDiscount - 0.5, baseDiscount, baseDiscount + 0.5, baseDiscount + 1].map(v => Math.max(0.1, Number(v.toFixed(2))));
  const table = exitCaps.map(exitCap => ({ exitCap, values: discounts.map(discountRate => calculateModel({ ...inputs, exitCapRate: exitCap, discountRate }).netPresentValue) }));
  return { exitCaps, discounts, table };
}

function buildTornado(inputs, baseValue) {
  const shocks = [
    { key: "incomeGrowth", label: "Income Growth", direction: 1 },
    { key: "expenseGrowth", label: "Expense Growth", direction: -1 },
    { key: "exitCapRate", label: "Exit Cap Rate", direction: -1 },
    { key: "discountRate", label: "Discount Rate", direction: -1 },
  ];
  return shocks.map(item => {
    const upValue = calculateModel({ ...inputs, [item.key]: inputs[item.key] + 1 }).netPresentValue;
    const downValue = calculateModel({ ...inputs, [item.key]: Math.max(0.1, inputs[item.key] - 1) }).netPresentValue;
    const positive = item.direction === 1 ? upValue - baseValue : downValue - baseValue;
    const negative = item.direction === 1 ? downValue - baseValue : upValue - baseValue;
    return { name: item.label, positive, negative: Math.abs(negative), absolute: Math.max(Math.abs(positive), Math.abs(negative)) };
  }).sort((a, b) => b.absolute - a.absolute);
}

export default function App() {
  const [language, setLanguage] = useState("en");
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const t = TEXT[language];
  const result = useMemo(() => calculateModel(inputs), [inputs]);
  const sensitivity = useMemo(() => buildSensitivity(inputs), [inputs]);
  const tornadoData = useMemo(() => buildTornado(inputs, result.netPresentValue), [inputs, result.netPresentValue]);
  const inputFields = ["maturity", "year1Income", "incomeGrowth", "year1Expenses", "expenseGrowth", "exitCapRate", "discountRate"];
  const chartData = result.rows.map(row => ({ year: `${t.year} ${row.year}`, [t.income]: Math.round(row.income), [t.expenses]: Math.round(row.expenses), [t.noi]: Math.round(row.noi), [t.dcf]: Math.round(row.discountedCashFlow) }));

  function updateInput(key, value) { setInputs(current => ({ ...current, [key]: Number(value) || 0 })); }
  function getStep(key) { if (key === "maturity") return "1"; if (key.includes("Growth") || key.includes("Rate")) return "0.1"; return "1000"; }
  function paybackLabel(value) { return Number.isFinite(value) ? `${value.toFixed(2)} ${t.years}` : "-"; }
  function sensitivityColor(value) {
    const base = result.netPresentValue;
    if (!Number.isFinite(value) || !Number.isFinite(base) || base === 0) return "bg-slate-100";
    const diff = (value - base) / Math.abs(base);
    if (diff > 0.1) return "bg-emerald-200";
    if (diff > 0.03) return "bg-emerald-100";
    if (diff < -0.1) return "bg-red-200";
    if (diff < -0.03) return "bg-red-100";
    return "bg-slate-100";
  }

  const kpis = [
    { label: t.npv, value: money(result.netPresentValue), emphasis: true },
    { label: t.irr, value: result.irr === null ? "-" : pct(result.irr) },
    { label: t.cagr, value: result.cagr === null ? "-" : pct(result.cagr) },
    { label: t.payback, value: paybackLabel(result.paybackPeriod) },
    { label: t.terminalValue, value: money(result.terminalValue) },
    { label: t.totalNOI, value: money(result.totalNOI) },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-900">
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-6 py-8 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">{t.analysis}</div>
            <h1 className="text-4xl font-bold tracking-tight">{t.title}</h1>
            <p className="mt-2 max-w-3xl text-slate-300">{t.subtitle}</p>
          </div>
          <div className="no-print flex flex-wrap gap-3">
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="rounded-xl border border-slate-600 bg-slate-900 px-4 py-2 text-white"><option value="en">English</option><option value="es">Castellano</option></select>
            <Button onClick={() => setInputs(DEFAULT_INPUTS)} className="bg-slate-700 text-white hover:bg-slate-600">{t.reset}</Button>
            <Button onClick={() => window.print()} className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">{t.print}</Button>
          </div>
        </div>
      </div>

      <main className="bg-slate-50 px-6 py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            {kpis.map(kpi => <Card key={kpi.label} className={`print-card rounded-2xl shadow-sm ${kpi.emphasis ? "border-cyan-300 bg-cyan-50" : ""}`}><CardContent className="p-5"><div className="text-sm font-medium text-slate-500">{kpi.label}</div><div className={`mt-3 font-bold tracking-tight ${kpi.emphasis ? "text-4xl text-slate-950" : "text-3xl"}`}>{kpi.value}</div></CardContent></Card>)}
          </section>

          <section className="grid gap-6 lg:grid-cols-3">
            <Card className="print-card rounded-2xl shadow-sm"><CardContent className="space-y-4 p-5"><h2 className="text-xl font-semibold">{t.inputs}</h2><div className="grid grid-cols-1 gap-3">{inputFields.map(key => <label key={key} className="space-y-1"><span className="text-xs font-medium uppercase text-slate-500">{t[key]}</span><input type="number" step={getStep(key)} value={inputs[key]} onChange={(e) => updateInput(key, e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-cyan-500" /></label>)}</div></CardContent></Card>
            <div className="space-y-6 lg:col-span-2">
              <Card className="print-card rounded-2xl shadow-sm"><CardContent className="p-5"><h2 className="mb-4 text-xl font-semibold">{t.operatingChart}</h2><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="year" /><YAxis tickFormatter={(v) => `$${Math.round(v / 1000)}k`} /><Tooltip formatter={(v) => money(v)} /><Legend /><Bar dataKey={t.income} fill="#3b82f6" /><Bar dataKey={t.expenses} fill="#ef4444" /><Bar dataKey={t.noi} fill="#10b981" /></BarChart></ResponsiveContainer></div></CardContent></Card>
              <Card className="print-card rounded-2xl shadow-sm"><CardContent className="p-5"><h2 className="mb-4 text-xl font-semibold">{t.dcfChart}</h2><div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="year" /><YAxis tickFormatter={(v) => `$${Math.round(v / 1000)}k`} /><Tooltip formatter={(v) => money(v)} /><Legend /><Line type="monotone" dataKey={t.dcf} stroke="#0f172a" strokeWidth={3} dot /></LineChart></ResponsiveContainer></div></CardContent></Card>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card className="print-card rounded-2xl shadow-sm"><CardContent className="p-5"><h2 className="text-xl font-semibold">{t.sensitivity}</h2><p className="mb-4 text-sm text-slate-500">{t.sensitivitySubtitle}</p><div className="overflow-x-auto"><table className="w-full min-w-[620px] border-collapse text-sm"><thead><tr><th className="border bg-slate-100 p-2 text-left">{t.exitCap} ↓ / {t.discount} →</th>{sensitivity.discounts.map(discount => <th key={discount} className="border bg-slate-100 p-2">{discount.toFixed(1)}%</th>)}</tr></thead><tbody>{sensitivity.table.map(row => <tr key={row.exitCap}><th className="border bg-slate-100 p-2 text-left">{row.exitCap.toFixed(1)}%</th>{row.values.map((value, index) => <td key={index} className={`border p-2 text-center font-medium ${sensitivityColor(value)}`}>{money(value)}</td>)}</tr>)}</tbody></table></div></CardContent></Card>
            <Card className="print-card rounded-2xl shadow-sm"><CardContent className="p-5"><h2 className="text-xl font-semibold">{t.tornado}</h2><p className="mb-4 text-sm text-slate-500">{t.tornadoSubtitle}</p><div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={tornadoData} layout="vertical" margin={{ left: 30, right: 20 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tickFormatter={(v) => `$${Math.round(v / 1000)}k`} /><YAxis type="category" dataKey="name" width={110} /><Tooltip formatter={(v) => money(v)} /><Legend /><Bar dataKey="positive" name={t.upside} fill="#10b981" /><Bar dataKey="negative" name={t.downside} fill="#ef4444" /></BarChart></ResponsiveContainer></div></CardContent></Card>
          </section>

          <Card className="print-card rounded-2xl shadow-sm"><CardContent className="overflow-x-auto p-5"><h2 className="mb-4 text-xl font-semibold">{t.modelTable}</h2><table className="w-full min-w-[900px] border-collapse text-sm"><thead><tr className="border-b bg-slate-100 text-left"><th className="p-2">{t.year}</th><th className="p-2">{t.income}</th><th className="p-2">{t.expenses}</th><th className="p-2">{t.noi}</th><th className="p-2">{t.terminalValue}</th><th className="p-2">{t.dcf}</th></tr></thead><tbody>{result.rows.map(row => <tr key={row.year} className="border-b hover:bg-slate-50"><td className="p-2">{row.year}</td><td className="p-2">{money(row.income)}</td><td className="p-2">{money(row.expenses)}</td><td className="p-2 font-semibold">{money(row.noi)}</td><td className="p-2">{money(row.terminalValue)}</td><td className="p-2">{money(row.discountedCashFlow)}</td></tr>)}</tbody></table></CardContent></Card>

          <footer className="mt-8 border-t border-slate-200 pt-6 text-center text-sm text-slate-500"><p className="font-medium text-slate-700">{t.footerName}</p><div className="mt-2 flex flex-wrap justify-center gap-4"><a href={`mailto:${CONTACT.email}`} className="hover:text-slate-900 hover:underline">{CONTACT.email}</a><a href={CONTACT.web} target="_blank" rel="noreferrer" className="hover:text-slate-900 hover:underline">www.knop.es</a><a href={CONTACT.linkedin} target="_blank" rel="noreferrer" className="hover:text-slate-900 hover:underline">LinkedIn</a></div></footer>
        </div>
      </main>
    </div>
  );
}
