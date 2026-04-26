"use client";
import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://lpftxjperpbppplareiu.supabase.co",
  "sb_publishable_Pz9Vl5GaocSNYyd_1RgQLQ_sXXE7_Vf"
);

const MANAGER_PIN = "0000";

const fmt = (n) =>
  new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);

const todayStr = () => new Date().toISOString().split("T")[0];

// ─── Period helpers ────────────────────────────────────────────────────────────
const MONTHS_SV = ["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"];

function getPeriodOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    opts.push({ value: val, label: `${MONTHS_SV[d.getMonth()]} ${d.getFullYear()}` });
  }
  return opts;
}

function getWeekOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const mon = new Date(d);
    mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const f = (x) => x.toISOString().split("T")[0];
    opts.push({ value: `week:${f(mon)}:${f(sun)}`, label: `${f(mon)} – ${f(sun)}` });
  }
  return opts;
}

function filterByPeriod(entries, period) {
  if (!period || period === "all") return entries;
  if (period.startsWith("week:")) {
    const [, from, to] = period.split(":");
    return entries.filter((e) => e.date >= from && e.date <= to);
  }
  return entries.filter((e) => e.date.startsWith(period));
}

const PERIOD_OPTIONS = getPeriodOptions();
const WEEK_OPTIONS = getWeekOptions();

// ─── CSS ──────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@300;400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #faf7f2; font-family: 'DM Sans', sans-serif; }
  input, textarea, select {
    font-family: 'DM Sans', sans-serif;
    background: #fff; border: 1.5px solid #e8e0d5;
    border-radius: 8px; padding: 10px 14px; font-size: 14px;
    color: #2a2218; outline: none; transition: border-color 0.2s; width: 100%;
  }
  input:focus, textarea:focus { border-color: #c8a97e; }
  input[type=number]::-webkit-inner-spin-button { opacity: 0.4; }
  ::selection { background: #f0e6d3; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #faf7f2; }
  ::-webkit-scrollbar-thumb { background: #d4c4b0; border-radius: 3px; }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .fade-up  { animation: fadeUp 0.4s ease both; }
  .fade-up-2{ animation: fadeUp 0.4s 0.08s ease both; }
  .fade-up-3{ animation: fadeUp 0.4s 0.16s ease both; }
  .btn {
    cursor: pointer; border: none; border-radius: 10px;
    font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
    padding: 11px 22px; transition: all 0.18s; letter-spacing: 0.02em;
    display: inline-flex; align-items: center; gap: 6px;
  }
  .btn:active { transform: scale(0.97); }
  .btn-gold { background: linear-gradient(135deg,#c8a97e,#b8925e); color:#fff; box-shadow:0 3px 12px rgba(184,146,94,.35); }
  .btn-gold:hover { box-shadow:0 5px 18px rgba(184,146,94,.5); transform:translateY(-1px); }
  .btn-outline { background:transparent; color:#8a7560; border:1.5px solid #d4c4b0; }
  .btn-outline:hover { border-color:#c8a97e; color:#c8a97e; }
  .btn-danger { background:transparent; color:#c0392b; border:1.5px solid transparent; font-size:12px; padding:6px 10px; }
  .btn-danger:hover { border-color:#c0392b; }
  .card { background:#fff; border:1px solid #ede6db; border-radius:16px; padding:24px; box-shadow:0 2px 16px rgba(42,34,24,.05); }
  .label { font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:#a8956e; font-weight:500; margin-bottom:6px; display:block; }
  .entry-row { display:grid; grid-template-columns:90px 1fr auto auto; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid #f0ebe3; transition:background .15s; }
  .entry-row:last-child { border-bottom:none; }
  .entry-row:hover { background:#fdf9f4; margin:0 -12px; padding:12px; border-radius:8px; }
  .pill { display:inline-block; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:500; }
  .spinner { width:32px; height:32px; border:3px solid #f0ebe3; border-top-color:#c8a97e; border-radius:50%; animation:spin 0.7s linear infinite; margin:40px auto; }
  @keyframes spin { to { transform:rotate(360deg); } }
`;

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ employees, onLogin }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const tryLogin = () => {
    if (pin === MANAGER_PIN) { onLogin("manager", null); return; }
    const emp = employees.find((e) => e.pin === pin);
    if (emp) { onLogin("employee", emp); return; }
    setError("Fel PIN, försök igen");
    setPin("");
  };

  return (
    <div style={{ minHeight:"100vh", background:"#faf7f2", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ width:"100%", maxWidth:380 }}>
        <div className="fade-up" style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ fontSize:13, letterSpacing:"0.2em", color:"#c8a97e", marginBottom:10, textTransform:"uppercase" }}>✦ NinjaCuts</div>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:42, color:"#2a2218", lineHeight:1.1 }}>Välkommen</h1>
          <p style={{ marginTop:10, color:"#8a7560", fontSize:14 }}>Välj din profil och ange PIN</p>
        </div>
        <div className="card fade-up-2">
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:20 }}>
            {employees.map((emp) => (
              <button key={emp.id} className="btn btn-outline"
                style={selected?.id === emp.id ? { borderColor:"#c8a97e", color:"#c8a97e", background:"#fdf5eb" } : {}}
                onClick={() => { setSelected(emp); setPin(""); setError(""); }}>
                {emp.name.split(" ")[0]}
              </button>
            ))}
            <button className="btn btn-outline"
              style={selected === "manager" ? { borderColor:"#c8a97e", color:"#c8a97e", background:"#fdf5eb" } : {}}
              onClick={() => { setSelected("manager"); setPin(""); setError(""); }}>
              👑 Chef
            </button>
          </div>
          <label className="label">PIN-kod</label>
          <input type="password" inputMode="numeric" maxLength={4} placeholder="● ● ● ●"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && tryLogin()}
            style={{ fontSize:22, letterSpacing:"0.4em", textAlign:"center", marginBottom:12 }} />
          {error && <div style={{ color:"#c0392b", fontSize:12, marginBottom:10, textAlign:"center" }}>{error}</div>}
          <button className="btn btn-gold" style={{ width:"100%", justifyContent:"center" }} onClick={tryLogin}>Logga in →</button>
        </div>
      </div>
    </div>
  );
}

// ─── EMPLOYEE VIEW ────────────────────────────────────────────────────────────
function EmployeeView({ emp, onLogout, onDataChange }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [period, setPeriod] = useState(PERIOD_OPTIONS[0].value);
  const [periodMode, setPeriodMode] = useState("month");

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("entries")
      .select("*")
      .eq("emp_id", emp.id)
      .order("date", { ascending: false });
    setEntries((data || []).map(e => ({ ...e, empId: e.emp_id })));
    setLoading(false);
  };

  const activePeriod = periodMode === "week"
    ? (WEEK_OPTIONS.find(w => w.value === period)?.value || "all")
    : period;
  const filtered = filterByPeriod(entries, activePeriod).sort((a,b) => b.date.localeCompare(a.date));
  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const commission = (total * emp.rate) / 100;

  const submit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    setSaving(true);
    const { data, error } = await supabase.from("entries").insert([{
      emp_id: emp.id, amount: Number(amount), note, date
    }]).select().single();
    if (!error && data) {
      setEntries(prev => [{ ...data, empId: data.emp_id }, ...prev]);
      onDataChange();
    }
    setAmount(""); setNote(""); setDate(todayStr());
    setSaving(false); setSuccess(true);
    setTimeout(() => setSuccess(false), 2500);
  };

  const PeriodFilter = () => (
    <div style={{ marginBottom:18 }}>
      <div style={{ display:"flex", gap:6, marginBottom:10 }}>
        {[["month","Månad"],["week","Vecka"]].map(([m,l]) => (
          <button key={m} className="btn btn-outline"
            style={periodMode===m ? { borderColor:"#c8a97e", color:"#c8a97e", background:"#fdf5eb", padding:"7px 16px" } : { padding:"7px 16px" }}
            onClick={() => { setPeriodMode(m); setPeriod(m==="month" ? PERIOD_OPTIONS[0].value : WEEK_OPTIONS[0].value); }}>
            {l}
          </button>
        ))}
      </div>
      <select value={period} onChange={e => setPeriod(e.target.value)} style={{ fontSize:13 }}>
        <option value="all">Alla tider</option>
        {(periodMode==="month" ? PERIOD_OPTIONS : WEEK_OPTIONS).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#faf7f2", padding:"32px 20px" }}>
      <div style={{ maxWidth:520, margin:"0 auto" }}>
        <div className="fade-up" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:32 }}>
          <div>
            <div style={{ fontSize:12, letterSpacing:"0.18em", color:"#c8a97e", textTransform:"uppercase", marginBottom:6 }}>Min översikt</div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:32, color:"#2a2218" }}>{emp.name}</h2>
            <div style={{ fontSize:13, color:"#a8956e", marginTop:4 }}>Provision: {emp.rate}%</div>
          </div>
          <button className="btn btn-outline" onClick={onLogout}>Logga ut</button>
        </div>

        <div className="fade-up-2" style={{ marginBottom:18 }}><PeriodFilter /></div>

        <div className="fade-up-2" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:24 }}>
          {[{ label:"Total försäljning", value:fmt(total), color:"#2a2218" },
            { label:"Din provision", value:fmt(commission), color:"#b8925e" }].map(s => (
            <div key={s.label} className="card" style={{ textAlign:"center" }}>
              <div className="label">{s.label}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, color:s.color, fontWeight:700 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="card fade-up-3" style={{ marginBottom:24 }}>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:"#2a2218", marginBottom:18 }}>Registrera försäljning</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div><label className="label">Belopp (kr)</label><input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} /></div>
            <div><label className="label">Datum</label><input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label className="label">Anteckning (valfri)</label>
            <input placeholder="t.ex. Klipp + färg, balayage…" value={note} onChange={e => setNote(e.target.value)} />
          </div>
          {success && <div style={{ background:"#f0faf0", color:"#2d7a2d", border:"1px solid #b7dfb7", borderRadius:8, padding:"10px 14px", fontSize:13, marginBottom:12 }}>✓ Registrerad!</div>}
          <button className="btn btn-gold" style={{ width:"100%", justifyContent:"center" }} onClick={submit} disabled={saving}>
            {saving ? "Sparar…" : "Lägg till →"}
          </button>
        </div>

        <div className="card fade-up-3">
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, color:"#2a2218", marginBottom:16 }}>Min logg ({filtered.length} st)</div>
          {loading ? <div className="spinner" /> : filtered.length === 0
            ? <div style={{ color:"#b0a090", fontSize:13, textAlign:"center", padding:"20px 0" }}>Inga registrerade ännu</div>
            : filtered.map(e => (
              <div key={e.id} className="entry-row">
                <div style={{ fontSize:12, color:"#a8956e" }}>{e.date}</div>
                <div style={{ fontSize:14, color:"#2a2218" }}>{e.note || "—"}</div>
                <div style={{ fontSize:14, fontWeight:500, color:"#2a2218", whiteSpace:"nowrap" }}>{fmt(Number(e.amount))}</div>
                <span className="pill" style={{ background:"#fdf5eb", color:"#b8925e" }}>+{fmt((Number(e.amount)*emp.rate)/100)}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ─── MANAGER VIEW ─────────────────────────────────────────────────────────────
function ManagerView({ employees, onLogout, onAddEmployee, onDeleteEmployee }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [newEmp, setNewEmp] = useState({ name:"", rate:"", pin:"" });
  const [expandedEmp, setExpandedEmp] = useState(null);
  const [filterEmp, setFilterEmp] = useState("all");
  const [period, setPeriod] = useState(PERIOD_OPTIONS[0].value);
  const [periodMode, setPeriodMode] = useState("month");

  useEffect(() => { loadEntries(); }, []);

  const loadEntries = async () => {
    setLoading(true);
    const { data } = await supabase.from("entries").select("*").order("date", { ascending: false });
    setEntries((data || []).map(e => ({ ...e, empId: e.emp_id })));
    setLoading(false);
  };

  const activePeriod = periodMode === "week"
    ? (WEEK_OPTIONS.find(w => w.value === period)?.value || "all")
    : period;
  const periodLabel = activePeriod === "all" ? "Alla tider"
    : periodMode === "month" ? PERIOD_OPTIONS.find(o => o.value === activePeriod)?.label ?? activePeriod
    : WEEK_OPTIONS.find(o => o.value === activePeriod)?.label ?? activePeriod;

  const periodEntries = filterByPeriod(entries, activePeriod);
  const totalSales = periodEntries.reduce((s,e) => s + Number(e.amount), 0);
  const totalCommission = periodEntries.reduce((s,e) => {
    const emp = employees.find(em => em.id === e.empId);
    return s + (emp ? (Number(e.amount)*emp.rate)/100 : 0);
  }, 0);

  const empTotals = employees.map(emp => {
    const ee = periodEntries.filter(e => e.empId === emp.id);
    const sales = ee.reduce((s,e) => s + Number(e.amount), 0);
    return { ...emp, sales, commission:(sales*emp.rate)/100, count:ee.length };
  }).sort((a,b) => b.sales - a.sales);
  const maxSales = Math.max(...empTotals.map(e => e.sales), 1);

  const filteredEntries = (filterEmp==="all" ? periodEntries : periodEntries.filter(e => e.empId === Number(filterEmp)))
    .slice().sort((a,b) => b.date.localeCompare(a.date) || b.id - a.id);

  const deleteEntry = async (id) => {
    await supabase.from("entries").delete().eq("id", id);
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const addEmp = async () => {
    if (!newEmp.name || !newEmp.rate || !newEmp.pin) return;
    const { data, error } = await supabase.from("employees").insert([{ name:newEmp.name, rate:Number(newEmp.rate), pin:newEmp.pin }]).select().single();
    if (!error && data) { onAddEmployee(data); setNewEmp({ name:"", rate:"", pin:"" }); }
  };

  const TabBtn = ({ id, label }) => (
    <button className="btn" onClick={() => setTab(id)}
      style={tab===id ? { background:"#2a2218", color:"#fdf5eb", borderRadius:8, padding:"9px 20px" } : { background:"transparent", color:"#8a7560", padding:"9px 20px" }}>
      {label}
    </button>
  );

  const PeriodFilter = () => (
    <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap", marginBottom:24 }}>
      <div style={{ display:"flex", gap:6 }}>
        {[["month","Månad"],["week","Vecka"]].map(([m,l]) => (
          <button key={m} className="btn btn-outline"
            style={periodMode===m ? { borderColor:"#c8a97e", color:"#c8a97e", background:"#fdf5eb", padding:"7px 16px" } : { padding:"7px 16px" }}
            onClick={() => { setPeriodMode(m); setPeriod(m==="month" ? PERIOD_OPTIONS[0].value : WEEK_OPTIONS[0].value); }}>
            {l}
          </button>
        ))}
      </div>
      <select value={period} onChange={e => setPeriod(e.target.value)} style={{ fontSize:13, width:"auto", minWidth:200 }}>
        <option value="all">Alla tider</option>
        {(periodMode==="month" ? PERIOD_OPTIONS : WEEK_OPTIONS).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span style={{ fontSize:12, color:"#a8956e" }}>Visar: {periodLabel}</span>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#faf7f2", padding:"32px 20px" }}>
      <div style={{ maxWidth:860, margin:"0 auto" }}>
        <div className="fade-up" style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:32 }}>
          <div>
            <div style={{ fontSize:12, letterSpacing:"0.18em", color:"#c8a97e", textTransform:"uppercase", marginBottom:6 }}>✦ Chefvy</div>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:38, color:"#2a2218" }}>NinjaCuts</h1>
          </div>
          <button className="btn btn-outline" onClick={onLogout}>Logga ut</button>
        </div>

        <div className="fade-up-2"><PeriodFilter /></div>

        <div className="fade-up-2" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:28 }}>
          {[{ label:"Total försäljning", val:fmt(totalSales) },
            { label:"Total provision", val:fmt(totalCommission) },
            { label:"Registreringar", val:periodEntries.length }].map(k => (
            <div key={k.label} className="card" style={{ textAlign:"center" }}>
              <div className="label">{k.label}</div>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, color:"#2a2218", fontWeight:700 }}>{k.val}</div>
            </div>
          ))}
        </div>

        <div className="fade-up-3" style={{ display:"flex", gap:4, background:"#f0ebe3", borderRadius:10, padding:4, marginBottom:24, width:"fit-content" }}>
          <TabBtn id="overview" label="Översikt" />
          <TabBtn id="log" label="Logg" />
          <TabBtn id="team" label="Team" />
        </div>

        {loading && <div className="spinner" />}

        {!loading && tab === "overview" && (
          <div className="card fade-up">
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:"#2a2218", marginBottom:20 }}>Frisörer</div>
            {empTotals.map((emp, idx) => (
              <div key={emp.id}>
                <div onClick={() => setExpandedEmp(expandedEmp===emp.id ? null : emp.id)}
                  style={{ display:"grid", gridTemplateColumns:"28px 1fr 110px 110px 80px", alignItems:"center", gap:16, padding:"14px 0",
                    borderBottom: expandedEmp===emp.id ? "none" : "1px solid #f0ebe3", cursor:"pointer" }}>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:"#c8a97e" }}>
                    {["①","②","③","④","⑤","⑥","⑦","⑧"][idx] ?? idx+1}
                  </div>
                  <div>
                    <div style={{ fontWeight:500, color:"#2a2218" }}>{emp.name}</div>
                    <div style={{ height:5, background:"#f0ebe3", borderRadius:9999, marginTop:6, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${(emp.sales/maxSales)*100}%`, background:"linear-gradient(90deg,#c8a97e,#e8c89e)", borderRadius:9999, transition:"width 0.6s ease" }} />
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:12, color:"#a8956e" }}>Försäljning</div>
                    <div style={{ fontWeight:500 }}>{fmt(emp.sales)}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:12, color:"#a8956e" }}>Provision</div>
                    <div style={{ fontWeight:500, color:"#b8925e" }}>{fmt(emp.commission)}</div>
                  </div>
                  <div style={{ textAlign:"right", fontSize:12, color:"#a8956e" }}>{emp.count} st ▾</div>
                </div>
                {expandedEmp === emp.id && (
                  <div style={{ background:"#fdf9f4", borderRadius:10, padding:"12px 16px", marginBottom:14 }}>
                    {periodEntries.filter(e => e.empId===emp.id).sort((a,b) => b.date.localeCompare(a.date)).map(e => (
                      <div key={e.id} className="entry-row" style={{ gridTemplateColumns:"90px 1fr auto auto auto" }}>
                        <div style={{ fontSize:12, color:"#a8956e" }}>{e.date}</div>
                        <div style={{ fontSize:13, color:"#4a3c2a" }}>{e.note || "—"}</div>
                        <div style={{ fontSize:13, fontWeight:500 }}>{fmt(Number(e.amount))}</div>
                        <span className="pill" style={{ background:"#fdf5eb", color:"#b8925e", fontSize:11 }}>+{fmt((Number(e.amount)*emp.rate)/100)}</span>
                        <button className="btn btn-danger" onClick={() => deleteEntry(e.id)}>✕</button>
                      </div>
                    ))}
                    {periodEntries.filter(e => e.empId===emp.id).length===0 && <div style={{ color:"#b0a090", fontSize:13, padding:"8px 0" }}>Inga poster</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && tab === "log" && (
          <div className="card fade-up">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:"#2a2218" }}>All logg ({filteredEntries.length} poster)</div>
              <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)} style={{ width:"auto", padding:"8px 12px", fontSize:13 }}>
                <option value="all">Alla frisörer</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            {filteredEntries.length===0 && <div style={{ color:"#b0a090", fontSize:13, textAlign:"center", padding:"20px 0" }}>Inga poster</div>}
            {(() => {
              const byDate = {};
              filteredEntries.forEach(e => { if (!byDate[e.date]) byDate[e.date]=[]; byDate[e.date].push(e); });
              return Object.entries(byDate).map(([date, dayEntries]) => {
                const dayTotal = dayEntries.reduce((s,e) => s+Number(e.amount),0);
                return (
                  <div key={date} style={{ marginBottom:20 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#a8956e", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8, paddingBottom:6, borderBottom:"1px solid #ede6db" }}>
                      <span>{date}</span><span>Dagstotal: {fmt(dayTotal)}</span>
                    </div>
                    {dayEntries.map(e => {
                      const emp = employees.find(em => em.id===e.empId);
                      return (
                        <div key={e.id} className="entry-row" style={{ gridTemplateColumns:"1fr 1fr auto auto auto" }}>
                          <div style={{ fontWeight:500, fontSize:13, color:"#2a2218" }}>{emp?.name ?? "Okänd"}</div>
                          <div style={{ fontSize:13, color:"#7a6a58" }}>{e.note || "—"}</div>
                          <div style={{ fontSize:14, fontWeight:500 }}>{fmt(Number(e.amount))}</div>
                          <span className="pill" style={{ background:"#fdf5eb", color:"#b8925e", fontSize:11 }}>{emp ? `+${fmt((Number(e.amount)*emp.rate)/100)}` : ""}</span>
                          <button className="btn btn-danger" onClick={() => deleteEntry(e.id)}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()}
          </div>
        )}

        {tab === "team" && (
          <div style={{ display:"grid", gap:20 }}>
            <div className="card fade-up">
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:"#2a2218", marginBottom:18 }}>Lägg till frisör</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 80px 100px", gap:12, marginBottom:14 }}>
                <div><label className="label">Namn</label><input placeholder="Förnamn Efternamn" value={newEmp.name} onChange={e => setNewEmp(p=>({...p,name:e.target.value}))} /></div>
                <div><label className="label">Provision %</label><input type="number" placeholder="10" value={newEmp.rate} onChange={e => setNewEmp(p=>({...p,rate:e.target.value}))} /></div>
                <div><label className="label">PIN (4 siffror)</label><input type="password" maxLength={4} placeholder="••••" value={newEmp.pin} onChange={e => setNewEmp(p=>({...p,pin:e.target.value}))} /></div>
              </div>
              <button className="btn btn-gold" onClick={addEmp}>Lägg till frisör →</button>
            </div>
            <div className="card fade-up-2">
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:"#2a2218", marginBottom:18 }}>Teamet</div>
              {employees.map(emp => (
                <div key={emp.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:"1px solid #f0ebe3" }}>
                  <div>
                    <div style={{ fontWeight:500, color:"#2a2218" }}>{emp.name}</div>
                    <div style={{ fontSize:12, color:"#a8956e" }}>Provision: {emp.rate}% · PIN: {"•".repeat(emp.pin.length)}</div>
                  </div>
                  <button className="btn btn-danger" onClick={() => onDeleteEmployee(emp.id)}>Ta bort</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [employees, setEmployees] = useState([]);
  const [loadingEmps, setLoadingEmps] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => { loadEmployees(); }, []);

  const loadEmployees = async () => {
    setLoadingEmps(true);
    const { data } = await supabase.from("employees").select("*").order("name");
    setEmployees(data || []);
    setLoadingEmps(false);
  };

  const addEmployee = (emp) => setEmployees(prev => [...prev, emp]);

  const deleteEmployee = async (id) => {
    await supabase.from("employees").delete().eq("id", id);
    setEmployees(prev => prev.filter(e => e.id !== id));
  };

  if (loadingEmps) {
    return (
      <div style={{ minHeight:"100vh", background:"#faf7f2", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <style>{css}</style>
        <div>
          <div className="spinner" />
          <p style={{ textAlign:"center", color:"#a8956e", fontSize:13, marginTop:16 }}>Laddar…</p>
        </div>
      </div>
    );
  }

  if (!session) return (
    <>
      <style>{css}</style>
      <LoginScreen employees={employees} onLogin={(role,emp) => setSession({ role, emp })} />
    </>
  );

  return (
    <>
      <style>{css}</style>
      {session.role === "employee"
        ? <EmployeeView emp={session.emp} onLogout={() => setSession(null)} onDataChange={() => {}} />
        : <ManagerView employees={employees} onLogout={() => setSession(null)} onAddEmployee={addEmployee} onDeleteEmployee={deleteEmployee} />
      }
    </>
  );
}
