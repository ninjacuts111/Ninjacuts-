"use client";
import { useState, useEffect } from "react";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://lpftxjperpbppplareiu.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Pz9Vl5GaocSNYyd_1RgQLQ_sXXE7_Vf"
const REQUEST_TIMEOUT_MS = 12000;

async function supabaseFetch(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        ...(options.headers || {})
      }
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

const db = {
  async get(table, filters = "") {
    try {
      const res = await supabaseFetch(`${SUPABASE_URL}/rest/v1/${table}?select=*${filters}&order=id.asc`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
      if (!res.ok) {
        const text = await res.text();
        console.error(`[db.get ${table}] HTTP ${res.status}:`, text);
        return { __error: `Kunde inte hämta "${table}" (${res.status}). ${text}` };
      }
      return await res.json();
    } catch (e) {
      console.error(`[db.get ${table}] Nätverksfel:`, e);
      return { __error: `Nätverksfel eller timeout: ${e.name === "AbortError" ? "Anropet tog för lång tid" : e.message}. Kontrollera Supabase-URL och internetanslutning.` };
    }
  },
  async post(table, body) {
    try {
      const res = await supabaseFetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const text = await res.text();
        console.error(`[db.post ${table}] HTTP ${res.status}:`, text);
        return { __error: text };
      }
      return await res.json();
    } catch (e) {
      console.error(`[db.post ${table}] Nätverksfel:`, e);
      return { __error: e.name === "AbortError" ? "Anropet tog för lång tid" : e.message };
    }
  },
  async upsert(table, body, onConflict = "key") {
    try {
      const res = await supabaseFetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const text = await res.text();
        console.error(`[db.upsert ${table}] HTTP ${res.status}:`, text);
        return { __error: text };
      }
      return await res.json();
    } catch (e) {
      console.error(`[db.upsert ${table}] Nätverksfel:`, e);
      return { __error: e.message };
    }
  },
  async delete(table, id) {
    try {
      await supabaseFetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
        method: "DELETE",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
    } catch (e) {
      console.error(`[db.delete ${table}] Nätverksfel:`, e);
    }
  }
};

const DEFAULT_MANAGER_PASSWORD = "0000";
const fmt = (n) => new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 }).format(n);
const todayStr = () => new Date().toISOString().split("T")[0];
const MONTHS_SV = ["Januari","Februari","Mars","April","Maj","Juni","Juli","Augusti","September","Oktober","November","December"];

function getPeriodOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    opts.push({ value: val, label: `${MONTHS_SV[d.getMonth()]} ${d.getFullYear()}` });
  }
  return opts;
}

function getWeekOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i*7);
    const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay()+6)%7));
    const sun = new Date(mon); sun.setDate(mon.getDate()+6);
    const f = (x) => x.toISOString().split("T")[0];
    opts.push({ value: `week:${f(mon)}:${f(sun)}`, label: `${f(mon)} – ${f(sun)}` });
  }
  return opts;
}

function filterByPeriod(entries, period) {
  if (!period || period === "all") return entries;
  if (period.startsWith("week:")) {
    const [,from,to] = period.split(":");
    return entries.filter(e => e.date >= from && e.date <= to);
  }
  return entries.filter(e => e.date.startsWith(period));
}

const PERIOD_OPTIONS = getPeriodOptions();
const WEEK_OPTIONS = getWeekOptions();

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  html,body{background:#f5f0eb;font-family:'DM Sans',sans-serif}
  input,select{font-family:'DM Sans',sans-serif;background:#fff;border:1.5px solid #d8cfc4;border-radius:8px;padding:10px 14px;font-size:14px;color:#1a1a1a;outline:none;transition:border-color .2s;width:100%}
  input:focus{border-color:#1a1a1a}
  @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
  .fu{animation:fadeUp .4s ease both}
  .fu2{animation:fadeUp .4s .08s ease both}
  .fu3{animation:fadeUp .4s .16s ease both}
  .btn{cursor:pointer;border:none;border-radius:8px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;padding:11px 22px;transition:all .18s;display:inline-flex;align-items:center;gap:6px;letter-spacing:0.03em}
  .btn:active{transform:scale(.97)}
  .gold{background:#1a1a1a;color:#fff;box-shadow:0 3px 12px rgba(0,0,0,.2)}
  .gold:hover{background:#333;transform:translateY(-1px)}
  .out{background:transparent;color:#555;border:1.5px solid #ccc}
  .out:hover{border-color:#1a1a1a;color:#1a1a1a}
  .active-profile{border-color:#1a1a1a !important;color:#1a1a1a !important;background:#ede8e2 !important}
  .del{background:transparent;color:#c0392b;border:1.5px solid transparent;font-size:12px;padding:6px 10px}
  .del:hover{border-color:#c0392b}
  .card{background:#fff;border:1px solid #e8e0d5;border-radius:16px;padding:24px;box-shadow:0 2px 20px rgba(0,0,0,.06)}
  .lbl{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#999;font-weight:500;margin-bottom:6px;display:block}
  .row{display:grid;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #f0ebe3;transition:background .15s}
  .row:last-child{border-bottom:none}
  .pill{display:inline-block;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:500}
  .spin{width:32px;height:32px;border:3px solid #e8e0d5;border-top-color:#1a1a1a;border-radius:50%;animation:sp .7s linear infinite;margin:40px auto}
  @keyframes sp{to{transform:rotate(360deg)}}
  .logo-text{font-family:'Cormorant Garamond',serif;font-size:38px;font-weight:700;color:#1a1a1a;letter-spacing:0.05em}
  .logo-sub{font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:#999;margin-top:2px}
`;

function Logo({ size = "lg" }) {
  return (
    <div style={{textAlign: size === "lg" ? "center" : "left"}}>
      <div className="logo-text" style={{fontSize: size === "lg" ? 42 : 28}}>NINJA CUTS</div>
      <div className="logo-sub">Salong</div>
    </div>
  );
}

function LoginScreen({ employees, adminPassword, onLogin }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  const tryLogin = () => {
    if (pin === adminPassword) { onLogin("manager", null); return; }
    const emp = employees.find(e => e.pin === pin);
    if (emp) { onLogin("employee", emp); return; }
    setError("Fel PIN, försök igen");
    setPin("");
  };

  return (
    <div style={{minHeight:"100vh",background:"#f5f0eb",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div className="fu" style={{textAlign:"center",marginBottom:40}}>
          <Logo size="lg" />
          <p style={{color:"#999",fontSize:14,letterSpacing:"0.05em",marginTop:12}}>Välj din profil och ange lösenord/PIN</p>
        </div>
        <div className="card fu2">
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20}}>
            {employees.map(emp => (
              <button key={emp.id} className={`btn out ${selected?.id===emp.id?"active-profile":""}`}
                onClick={()=>{setSelected(emp);setPin("");setError("")}}>
                {emp.name.split(" ")[0]}
              </button>
            ))}
            <button className={`btn out ${selected==="manager"?"active-profile":""}`}
              onClick={()=>{setSelected("manager");setPin("");setError("")}}>
              ✦ Admin
            </button>
          </div>
          <label className="lbl">Lösenord / PIN</label>
          <input type="password" placeholder="Ange lösenord"
            value={pin} onChange={e=>{setPin(e.target.value);setError("")}}
            onKeyDown={e=>e.key==="Enter"&&tryLogin()}
            style={{fontSize:22,letterSpacing:"0.4em",textAlign:"center",marginBottom:12}}/>
          {error&&<div style={{color:"#c0392b",fontSize:12,marginBottom:10,textAlign:"center"}}>{error}</div>}
          <button className="btn gold" style={{width:"100%",justifyContent:"center"}} onClick={tryLogin}>Logga in →</button>
        </div>
      </div>
    </div>
  );
}

function PeriodFilter({ period, setPeriod, periodMode, setPeriodMode }) {
  return (
    <div style={{marginBottom:18}}>
      <div style={{display:"flex",gap:6,marginBottom:10}}>
        {[["month","Månad"],["week","Vecka"]].map(([m,l])=>(
          <button key={m} className={`btn out ${periodMode===m?"active-profile":""}`}
            style={{padding:"7px 16px"}}
            onClick={()=>{setPeriodMode(m);setPeriod(m==="month"?PERIOD_OPTIONS[0].value:WEEK_OPTIONS[0].value)}}>
            {l}
          </button>
        ))}
      </div>
      <select value={period} onChange={e=>setPeriod(e.target.value)} style={{fontSize:13}}>
        <option value="all">Alla tider</option>
        {(periodMode==="month"?PERIOD_OPTIONS:WEEK_OPTIONS).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function EmployeeView({ emp, onLogout }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [period, setPeriod] = useState(PERIOD_OPTIONS[0].value);
  const [periodMode, setPeriodMode] = useState("month");

  useEffect(()=>{
    db.get("entries",`&emp_id=eq.${emp.id}`).then(data=>{
      setEntries(Array.isArray(data)?data.map(e=>({...e,empId:e.emp_id})):[]);
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  const activePeriod = periodMode==="week"?(WEEK_OPTIONS.find(w=>w.value===period)?.value||"all"):period;
  const filtered = filterByPeriod(entries,activePeriod).sort((a,b)=>b.date.localeCompare(a.date));
  const total = filtered.reduce((s,e)=>s+Number(e.amount),0);
  const commission = (total*emp.rate)/100;

  const submit = async () => {
    if(!amount||isNaN(Number(amount))||Number(amount)<=0) return;
    setSaving(true);
    const data = await db.post("entries",[{emp_id:emp.id,amount:Number(amount),note,date}]);
    if(Array.isArray(data)&&data[0]) setEntries(prev=>[{...data[0],empId:data[0].emp_id},...prev]);
    setAmount("");setNote("");setDate(todayStr());
    setSaving(false);setSuccess(true);
    setTimeout(()=>setSuccess(false),2500);
  };

  return (
    <div style={{minHeight:"100vh",background:"#f5f0eb",padding:"32px 20px"}}>
      <div style={{maxWidth:520,margin:"0 auto"}}>
        <div className="fu" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:32}}>
          <div>
            <Logo size="sm" />
            <div style={{marginTop:8,fontSize:12,letterSpacing:"0.18em",color:"#999",textTransform:"uppercase"}}>Min översikt — {emp.name}</div>
          </div>
          <button className="btn out" onClick={onLogout}>Logga ut</button>
        </div>

        <div className="fu2"><PeriodFilter period={period} setPeriod={setPeriod} periodMode={periodMode} setPeriodMode={setPeriodMode}/></div>

        <div className="fu2" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:24}}>
          {[{label:"Total försäljning",value:fmt(total)},{label:"Din provision",value:fmt(commission)}].map(s=>(
            <div key={s.label} className="card" style={{textAlign:"center"}}>
              <div className="lbl">{s.label}</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,color:"#1a1a1a",fontWeight:700}}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="card fu3" style={{marginBottom:24}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:"#1a1a1a",marginBottom:18}}>Registrera försäljning</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div><label className="lbl">Belopp (kr)</label><input type="number" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)}/></div>
            <div><label className="lbl">Datum</label><input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
          </div>
          <div style={{marginBottom:14}}>
            <label className="lbl">Anteckning (valfri)</label>
            <input placeholder="t.ex. Klipp + färg…" value={note} onChange={e=>setNote(e.target.value)}/>
          </div>
          {success&&<div style={{background:"#f0faf0",color:"#2d7a2d",border:"1px solid #b7dfb7",borderRadius:8,padding:"10px 14px",fontSize:13,marginBottom:12}}>✓ Registrerad!</div>}
          <button className="btn gold" style={{width:"100%",justifyContent:"center"}} onClick={submit} disabled={saving}>
            {saving?"Sparar…":"Lägg till →"}
          </button>
        </div>

        <div className="card fu3">
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:"#1a1a1a",marginBottom:16}}>Min logg ({filtered.length} st)</div>
          {loading?<div className="spin"/>:filtered.length===0
            ?<div style={{color:"#aaa",fontSize:13,textAlign:"center",padding:"20px 0"}}>Inga registrerade ännu</div>
            :filtered.map(e=>(
              <div key={e.id} className="row" style={{gridTemplateColumns:"90px 1fr auto auto"}}>
                <div style={{fontSize:12,color:"#aaa"}}>{e.date}</div>
                <div style={{fontSize:14,color:"#1a1a1a"}}>{e.note||"—"}</div>
                <div style={{fontSize:14,fontWeight:500,whiteSpace:"nowrap"}}>{fmt(Number(e.amount))}</div>
                <span className="pill" style={{background:"#f0ece8",color:"#1a1a1a"}}>+{fmt((Number(e.amount)*emp.rate)/100)}</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}


function AdminPasswordCard({ setAdminPassword }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const savePassword = async () => {
    setStatus("");
    if (newPassword.trim().length < 4) { setStatus("Lösenordet måste vara minst 4 tecken."); return; }
    if (newPassword !== confirmPassword) { setStatus("Lösenorden matchar inte."); return; }
    setSaving(true);
    const data = await db.upsert("app_settings", [{ key: "manager_password", value: newPassword.trim() }]);
    setSaving(false);
    if (Array.isArray(data)) {
      setAdminPassword(newPassword.trim());
      setNewPassword("");
      setConfirmPassword("");
      setStatus("✓ Admin-lösenordet är uppdaterat.");
    } else {
      setStatus("Kunde inte spara lösenordet. Kör upgrade_to_sellable_v2.sql i Supabase.");
    }
  };

  return (
    <div className="card fu">
      <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:"#1a1a1a",marginBottom:8}}>Admin-lösenord</div>
      <div style={{fontSize:13,color:"#777",lineHeight:1.6,marginBottom:18}}>Byt lösenordet som används för admin-inloggning. Standard är <b>0000</b> tills du ändrar det.</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        <div><label className="lbl">Nytt lösenord</label><input type="password" placeholder="Minst 4 tecken" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></div>
        <div><label className="lbl">Bekräfta lösenord</label><input type="password" placeholder="Skriv igen" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></div>
      </div>
      {status&&<div style={{fontSize:13,color:status.startsWith("✓")?"#2d7a2d":"#c0392b",marginBottom:12}}>{status}</div>}
      <button className="btn gold" onClick={savePassword} disabled={saving}>{saving?"Sparar…":"Spara nytt admin-lösenord →"}</button>
    </div>
  );
}

function ManagerView({ employees, setEmployees, setAdminPassword, onLogout }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [newEmp, setNewEmp] = useState({name:"",rate:"",pin:""});
  const [expandedEmp, setExpandedEmp] = useState(null);
  const [filterEmp, setFilterEmp] = useState("all");
  const [period, setPeriod] = useState(PERIOD_OPTIONS[0].value);
  const [periodMode, setPeriodMode] = useState("month");
  const [adding, setAdding] = useState(false);

  useEffect(()=>{
    db.get("entries").then(data=>{
      setEntries(Array.isArray(data)?data.map(e=>({...e,empId:e.emp_id})):[]);
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  const activePeriod = periodMode==="week"?(WEEK_OPTIONS.find(w=>w.value===period)?.value||"all"):period;
  const periodLabel = activePeriod==="all"?"Alla tider":periodMode==="month"?PERIOD_OPTIONS.find(o=>o.value===activePeriod)?.label??activePeriod:WEEK_OPTIONS.find(o=>o.value===activePeriod)?.label??activePeriod;
  const periodEntries = filterByPeriod(entries,activePeriod);
  const totalSales = periodEntries.reduce((s,e)=>s+Number(e.amount),0);
  const totalCommission = periodEntries.reduce((s,e)=>{
    const emp=employees.find(em=>em.id===e.empId);
    return s+(emp?(Number(e.amount)*emp.rate)/100:0);
  },0);
  const empTotals = employees.map(emp=>{
    const ee=periodEntries.filter(e=>e.empId===emp.id);
    const sales=ee.reduce((s,e)=>s+Number(e.amount),0);
    return{...emp,sales,commission:(sales*emp.rate)/100,count:ee.length};
  }).sort((a,b)=>b.sales-a.sales);
  const maxSales = Math.max(...empTotals.map(e=>e.sales),1);
  const filteredEntries = (filterEmp==="all"?periodEntries:periodEntries.filter(e=>e.empId===Number(filterEmp))).slice().sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);

  const deleteEntry = async(id)=>{
    await db.delete("entries",id);
    setEntries(prev=>prev.filter(e=>e.id!==id));
  };

  const addEmp = async()=>{
    if(!newEmp.name||!newEmp.rate||!newEmp.pin) return;
    setAdding(true);
    const data = await db.post("employees",[{name:newEmp.name,rate:Number(newEmp.rate),pin:newEmp.pin}]);
    if(Array.isArray(data)&&data[0]) setEmployees(prev=>[...prev,data[0]]);
    setNewEmp({name:"",rate:"",pin:""});
    setAdding(false);
  };

  const deleteEmp = async(id)=>{
    await db.delete("employees",id);
    setEmployees(prev=>prev.filter(e=>e.id!==id));
    setEntries(prev=>prev.filter(e=>e.empId!==id));
  };

  const TabBtn=({id,label})=>(
    <button className="btn" onClick={()=>setTab(id)}
      style={tab===id?{background:"#1a1a1a",color:"#fff",borderRadius:8,padding:"9px 20px"}:{background:"transparent",color:"#888",padding:"9px 20px"}}>
      {label}
    </button>
  );

  return (
    <div style={{minHeight:"100vh",background:"#f5f0eb",padding:"32px 20px"}}>
      <div style={{maxWidth:860,margin:"0 auto"}}>
        <div className="fu" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:32}}>
          <div>
            <Logo size="sm" />
            <div style={{fontSize:11,letterSpacing:"0.2em",color:"#999",textTransform:"uppercase",marginTop:6}}>Admin — Salong-rapport</div>
          </div>
          <button className="btn out" onClick={onLogout}>Logga ut</button>
        </div>

        <div className="fu2" style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:24}}>
          <div style={{display:"flex",gap:6}}>
            {[["month","Månad"],["week","Vecka"]].map(([m,l])=>(
              <button key={m} className={`btn out ${periodMode===m?"active-profile":""}`}
                style={{padding:"7px 16px"}}
                onClick={()=>{setPeriodMode(m);setPeriod(m==="month"?PERIOD_OPTIONS[0].value:WEEK_OPTIONS[0].value)}}>
                {l}
              </button>
            ))}
          </div>
          <select value={period} onChange={e=>setPeriod(e.target.value)} style={{fontSize:13,width:"auto",minWidth:200}}>
            <option value="all">Alla tider</option>
            {(periodMode==="month"?PERIOD_OPTIONS:WEEK_OPTIONS).map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <span style={{fontSize:12,color:"#aaa"}}>Visar: {periodLabel}</span>
        </div>

        <div className="fu2" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:28}}>
          {[{label:"Total försäljning",val:fmt(totalSales)},{label:"Total provision",val:fmt(totalCommission)},{label:"Registreringar",val:periodEntries.length}].map(k=>(
            <div key={k.label} className="card" style={{textAlign:"center"}}>
              <div className="lbl">{k.label}</div>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:"#1a1a1a",fontWeight:700}}>{k.val}</div>
            </div>
          ))}
        </div>

        <div className="fu3" style={{display:"flex",gap:4,background:"#ede8e2",borderRadius:10,padding:4,marginBottom:24,width:"fit-content"}}>
          <TabBtn id="overview" label="Översikt"/>
          <TabBtn id="log" label="Logg"/>
          <TabBtn id="team" label="Team"/>
        </div>

        {loading&&<div className="spin"/>}

        {!loading&&tab==="overview"&&(
          <div className="card fu">
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:"#1a1a1a",marginBottom:20}}>Frisörer</div>
            {empTotals.map((emp,idx)=>(
              <div key={emp.id}>
                <div onClick={()=>setExpandedEmp(expandedEmp===emp.id?null:emp.id)}
                  style={{display:"grid",gridTemplateColumns:"28px 1fr 110px 110px 80px",alignItems:"center",gap:16,padding:"14px 0",borderBottom:expandedEmp===emp.id?"none":"1px solid #f0ebe3",cursor:"pointer"}}>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,color:"#1a1a1a",fontWeight:700}}>#{idx+1}</div>
                  <div>
                    <div style={{fontWeight:500,color:"#1a1a1a"}}>{emp.name}</div>
                    <div style={{height:4,background:"#f0ece8",borderRadius:9999,marginTop:6,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${(emp.sales/maxSales)*100}%`,background:"#1a1a1a",borderRadius:9999,transition:"width .6s ease"}}/>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#aaa",letterSpacing:"0.1em",textTransform:"uppercase"}}>Försäljning</div><div style={{fontWeight:500}}>{fmt(emp.sales)}</div></div>
                  <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#aaa",letterSpacing:"0.1em",textTransform:"uppercase"}}>Provision</div><div style={{fontWeight:500}}>{fmt(emp.commission)}</div></div>
                  <div style={{textAlign:"right",fontSize:12,color:"#aaa"}}>{emp.count} st ▾</div>
                </div>
                {expandedEmp===emp.id&&(
                  <div style={{background:"#faf7f4",borderRadius:10,padding:"12px 16px",marginBottom:14}}>
                    {periodEntries.filter(e=>e.empId===emp.id).sort((a,b)=>b.date.localeCompare(a.date)).map(e=>(
                      <div key={e.id} className="row" style={{gridTemplateColumns:"90px 1fr auto auto auto"}}>
                        <div style={{fontSize:12,color:"#aaa"}}>{e.date}</div>
                        <div style={{fontSize:13,color:"#333"}}>{e.note||"—"}</div>
                        <div style={{fontSize:13,fontWeight:500}}>{fmt(Number(e.amount))}</div>
                        <span className="pill" style={{background:"#f0ece8",color:"#1a1a1a",fontSize:11}}>+{fmt((Number(e.amount)*emp.rate)/100)}</span>
                        <button className="btn del" onClick={()=>deleteEntry(e.id)}>✕</button>
                      </div>
                    ))}
                    {periodEntries.filter(e=>e.empId===emp.id).length===0&&<div style={{color:"#aaa",fontSize:13,padding:"8px 0"}}>Inga poster</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading&&tab==="log"&&(
          <div className="card fu">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:"#1a1a1a"}}>All logg ({filteredEntries.length} poster)</div>
              <select value={filterEmp} onChange={e=>setFilterEmp(e.target.value)} style={{width:"auto",padding:"8px 12px",fontSize:13}}>
                <option value="all">Alla frisörer</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            {filteredEntries.length===0&&<div style={{color:"#aaa",fontSize:13,textAlign:"center",padding:"20px 0"}}>Inga poster</div>}
            {(()=>{
              const byDate={};
              filteredEntries.forEach(e=>{if(!byDate[e.date])byDate[e.date]=[];byDate[e.date].push(e)});
              return Object.entries(byDate).map(([date,dayEntries])=>{
                const dayTotal=dayEntries.reduce((s,e)=>s+Number(e.amount),0);
                return(
                  <div key={date} style={{marginBottom:20}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#aaa",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8,paddingBottom:6,borderBottom:"1px solid #ede8e2"}}>
                      <span>{date}</span><span>Dagstotal: {fmt(dayTotal)}</span>
                    </div>
                    {dayEntries.map(e=>{
                      const emp=employees.find(em=>em.id===e.empId);
                      return(
                        <div key={e.id} className="row" style={{gridTemplateColumns:"1fr 1fr auto auto auto"}}>
                          <div style={{fontWeight:500,fontSize:13,color:"#1a1a1a"}}>{emp?.name??"Okänd"}</div>
                          <div style={{fontSize:13,color:"#777"}}>{e.note||"—"}</div>
                          <div style={{fontSize:14,fontWeight:500}}>{fmt(Number(e.amount))}</div>
                          <span className="pill" style={{background:"#f0ece8",color:"#1a1a1a",fontSize:11}}>{emp?`+${fmt((Number(e.amount)*emp.rate)/100)}`:""}</span>
                          <button className="btn del" onClick={()=>deleteEntry(e.id)}>✕</button>
                        </div>
                      );
                    })}
                  </div>
                );
              });
            })()}
          </div>
        )}

        {tab==="team"&&(
          <div style={{display:"grid",gap:20}}>
            <AdminPasswordCard setAdminPassword={setAdminPassword} />
            <div className="card fu">
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:"#1a1a1a",marginBottom:18}}>Lägg till frisör</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 80px 110px",gap:12,marginBottom:14}}>
                <div><label className="lbl">Namn</label><input placeholder="Förnamn Efternamn" value={newEmp.name} onChange={e=>setNewEmp(p=>({...p,name:e.target.value}))}/></div>
                <div><label className="lbl">Provision %</label><input type="number" placeholder="10" value={newEmp.rate} onChange={e=>setNewEmp(p=>({...p,rate:e.target.value}))}/></div>
                <div><label className="lbl">PIN (4 siffror)</label><input type="password" maxLength={4} placeholder="••••" value={newEmp.pin} onChange={e=>setNewEmp(p=>({...p,pin:e.target.value}))}/></div>
              </div>
              <button className="btn gold" onClick={addEmp} disabled={adding}>{adding?"Sparar…":"Lägg till frisör →"}</button>
            </div>
            <div className="card fu2">
              <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:"#1a1a1a",marginBottom:18}}>Teamet</div>
              {employees.length===0&&<div style={{color:"#aaa",fontSize:13}}>Inga frisörer ännu</div>}
              {employees.map(emp=>(
                <div key={emp.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid #f0ebe3"}}>
                  <div>
                    <div style={{fontWeight:500,color:"#1a1a1a"}}>{emp.name}</div>
                    <div style={{fontSize:12,color:"#aaa"}}>Provision: {emp.rate}% · PIN: {"•".repeat(emp.pin.length)}</div>
                  </div>
                  <button className="btn del" onClick={()=>deleteEmp(emp.id)}>Ta bort</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [adminPassword, setAdminPassword] = useState(DEFAULT_MANAGER_PASSWORD);
  const [session, setSession] = useState(null);

  useEffect(()=>{
    Promise.all([db.get("employees"), db.get("app_settings", "&key=eq.manager_password")]).then(([employeesData, settingsData])=>{
      if (Array.isArray(employeesData)) {
        setEmployees(employeesData);
      } else {
        setEmployees([]);
        if (employeesData && employeesData.__error) setLoadError(employeesData.__error);
      }
      if (Array.isArray(settingsData) && settingsData[0]?.value) setAdminPassword(settingsData[0].value);
      setLoading(false);
    }).catch(e=>{
      setLoadError(e.message || "Okänt fel");
      setLoading(false);
    });
  },[]);

  if(loading) return (
    <div style={{minHeight:"100vh",background:"#f5f0eb",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{css}</style>
      <div><div className="spin"/><p style={{textAlign:"center",color:"#aaa",fontSize:13,marginTop:16}}>Laddar…</p></div>
    </div>
  );

  if(loadError) return (
    <div style={{minHeight:"100vh",background:"#f5f0eb",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <style>{css}</style>
      <div className="card" style={{maxWidth:520,textAlign:"center"}}>
        <Logo size="lg"/>
        <div style={{marginTop:24,fontFamily:"'Cormorant Garamond',serif",fontSize:22,color:"#c0392b"}}>Kunde inte ansluta till databasen</div>
        <div style={{marginTop:12,fontSize:13,color:"#777",lineHeight:1.6,wordBreak:"break-word"}}>{loadError}</div>
        <div style={{marginTop:20,fontSize:12,color:"#999",lineHeight:1.6}}>Trolig orsak: tabellerna <code>employees</code> och <code>entries</code> är inte skapade i Supabase. Se <code>README.md</code> för SQL-schema.</div>
        <button className="btn gold" style={{marginTop:20}} onClick={()=>window.location.reload()}>Försök igen</button>
      </div>
    </div>
  );

  return (
    <>
      <style>{css}</style>
      {!session
        ?<LoginScreen employees={employees} adminPassword={adminPassword} onLogin={(role,emp)=>setSession({role,emp})}/>
        :session.role==="employee"
          ?<EmployeeView emp={session.emp} onLogout={()=>setSession(null)}/>
          :<ManagerView employees={employees} setEmployees={setEmployees} setAdminPassword={setAdminPassword} onLogout={()=>setSession(null)}/>
      }
    </>
  );
}
