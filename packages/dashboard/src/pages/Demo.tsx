import React, { useState, useCallback, useEffect } from "react";

// ═══════════════════════════════════════════
// 3-STEP ADMISSION WORKFLOW DEMO
// Each step is a real action. The UI adapts.
// ═══════════════════════════════════════════

const PATIENTS = [
  { id:"P-1001", name:"James Morrison", age:67, gender:"M", chiefComplaint:"Chest pain radiating to left arm", acuity:"Critical", bp:"158/92", hr:112, temp:37.1, spo2:94, insurance:"Blue Cross PPO", allergies:["Penicillin"], waitTime:8 },
  { id:"P-1002", name:"Maria Gonzalez", age:34, gender:"F", chiefComplaint:"Severe RLQ abdominal pain", acuity:"Urgent", bp:"128/76", hr:98, temp:38.4, spo2:98, insurance:"Medicare", allergies:[], waitTime:15 },
  { id:"P-1003", name:"Robert Kim", age:45, gender:"M", chiefComplaint:"4cm forearm laceration", acuity:"Moderate", bp:"132/80", hr:84, temp:36.9, spo2:99, insurance:"Aetna HMO", allergies:["Codeine"], waitTime:22 },
  { id:"P-1004", name:"William Taylor", age:72, gender:"M", chiefComplaint:"Worsening SOB — 3 days", acuity:"Urgent", bp:"146/88", hr:104, temp:37.4, spo2:89, insurance:"Medicare", allergies:[], waitTime:12 },
  { id:"P-1005", name:"Amanda Foster", age:26, gender:"F", chiefComplaint:"Allergic reaction — hives, facial swelling", acuity:"Urgent", bp:"126/80", hr:94, temp:37.2, spo2:98, insurance:"Aetna PPO", allergies:["Shellfish","Peanuts"], waitTime:10 },
];

const apple = { transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)" };
const acuityColors: Record<string,string> = { Critical:"#dc2626", Urgent:"#ea580c", Moderate:"#f59e0b", Minor:"#22c55e" };

// ═══════════════════════════════════════════
// MAIN DEMO
// ═══════════════════════════════════════════

export default function DemoPage() {
  const [step, setStep] = useState(0);          // 0=select, 1=assess, 2=assign
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("waitTime");
  const [acuityFilter, setAcuityFilter] = useState<string>("all");
  const [completedCount, setCompletedCount] = useState(0);
  const [autoSort, setAutoSort] = useState(false);
  const [autoFilter, setAutoFilter] = useState(false);
  const [adaptationLog, setAdaptationLog] = useState<string[]>([]);
  const [showBrain, setShowBrain] = useState(true);
  const [activityLog, setActivityLog] = useState<{ action: string; detail: string; ts: number }[]>([]);

  const p = PATIENTS.find(p => p.id === selectedId);
  const patients = PATIENTS;

  const log = (action: string, detail: string) => {
    setActivityLog(prev => [...prev.slice(-19), { action, detail, ts: Date.now() }]);
  };

  // ── STEP 0: SELECT PATIENT ──
  const handleSelect = (id: string) => {
    setSelectedId(id);
    log("select_patient", PATIENTS.find(p => p.id === id)?.name || id);
    // Auto-advance to step 1 after short delay
    setTimeout(() => { setStep(1); }, 400);
  };

  // ── STEP 1: ASSESS ──
  const handleCompleteTriage = () => {
    if (!p) return;
    log("complete_triage", `${p.name} — ${p.acuity}`);
    setCompletedCount(c => c + 1);
    setStep(2);
  };

  const handleFastTrack = () => {
    if (!p) return;
    log("fast_track", `${p.name} — sent directly to doctor`);
    setCompletedCount(c => c + 1);
    setSelectedId(null);
    setStep(0);
  };

  // ── STEP 2: ASSIGN ──
  const handleAssignBed = (type: string) => {
    if (!p) return;
    log("assign_bed", `${p.name} → ${type}`);
    setCompletedCount(c => c + 1);
    setSelectedId(null);
    setStep(0);
  };

  const handleDischarge = () => {
    if (!p) return;
    log("discharge", `${p.name} — discharged home`);
    setCompletedCount(c => c + 1);
    setSelectedId(null);
    setStep(0);
  };

  // ── ADAPTATION — watches behavior and adjusts UI ──
  useEffect(() => {
    if (activityLog.length < 3) return;

    // Count how many critical/urgent patients selected in last 10 actions
    const recent = activityLog.slice(-10);
    const criticalCount = recent.filter(a => a.action === "select_patient").length;
    const triageCount = recent.filter(a => a.action === "complete_triage").length;
    const fastTrackCount = recent.filter(a => a.action === "fast_track").length;
    const assignedCount = recent.filter(a => a.action === "assign_bed").length;

    const newLog: string[] = [];

    // If user always picks urgent/critical → auto-sort by acuity
    if (criticalCount >= 3 && !autoSort) {
      setAutoSort(true);
      setSortBy("acuity");
      newLog.push("You keep selecting urgent patients → auto-sorted list by acuity");
      log("adaptation", "Auto-sort by acuity enabled");
    }

    // If user always completes triage vs fast-track → auto-show triage form
    if (triageCount >= 3 && fastTrackCount === 0 && !autoFilter) {
      setAutoFilter(true);
      setAcuityFilter("urgent");
      newLog.push("You always do full triage → filtered to show urgent patients first");
      log("adaptation", "Urgent filter enabled");
    }

    // If user fast-tracks and assigns → hide triage step
    if (fastTrackCount >= 2 && assignedCount >= 2 && step === 1) {
      newLog.push("You fast-track and assign quickly → triage step minimized");
      log("adaptation", "Triage step auto-skipped for next patient");
    }

    if (newLog.length > 0) {
      setAdaptationLog(prev => [...prev, ...newLog]);
    }
  }, [activityLog]);

  // ── SORTED AND FILTERED LIST ──
  const displayPatients = [...patients]
    .filter(p => acuityFilter === "all" || p.acuity.toLowerCase() === acuityFilter.toLowerCase())
    .sort((a, b) => {
      const order: Record<string, number> = { Critical: 0, Urgent: 1, Moderate: 2, Minor: 3 };
      if (sortBy === "acuity") return order[a.acuity] - order[b.acuity];
      if (sortBy === "waitTime") return b.waitTime - a.waitTime;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", fontFamily:"-apple-system, BlinkMacSystemFont, system-ui, sans-serif", background:"#f5f5f7", overflow:"hidden" }}>
      
      {/* Header */}
      <div style={{ height:48, background:"rgba(255,255,255,0.9)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(0,0,0,0.08)", display:"flex", alignItems:"center", padding:"0 18px", gap:8 }}>
        <div style={{ width:26, height:26, background:"linear-gradient(135deg,#1d4ed8,#6366f1)", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:12 }}>+</div>
        <span style={{ fontWeight:700, fontSize:14 }}>MedPass</span>
        <span style={{ fontSize:11, color:"#86868b" }}>Admission Workflow</span>
        <div style={{ flex:1 }} />
        <span style={{ fontSize:10, color:"#aeaeb2" }}>
          {completedCount} admitted · {patients.length - completedCount} remaining
        </span>
      </div>

      {/* ── THREE-COLUMN LAYOUT ── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* LEFT: Patient queue */}
        <div style={{ width:340, borderRight:"1px solid rgba(0,0,0,0.06)", display:"flex", flexDirection:"column", background:"#fff" }}>
          <div style={{ padding:"10px 14px", borderBottom:"1px solid rgba(0,0,0,0.06)", display:"flex", gap:4, flexWrap:"wrap", alignItems:"center" }}>
            <span style={{ fontSize:10, color:"#86868b", fontWeight:600 }}>PATIENTS</span>
            <div style={{ flex:1 }} />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ fontSize:10, padding:"2px 6px", borderRadius:4, border:"1px solid #e5e5e5", background:"#fff" }}>
              <option value="waitTime">Sort: Wait</option>
              <option value="acuity">Sort: Acuity</option>
              <option value="name">Sort: Name</option>
            </select>
            <select value={acuityFilter} onChange={e => setAcuityFilter(e.target.value)}
              style={{ fontSize:10, padding:"2px 6px", borderRadius:4, border:"1px solid #e5e5e5", background:"#fff" }}>
              <option value="all">All</option>
              <option value="critical">Critical</option>
              <option value="urgent">Urgent</option>
              <option value="moderate">Moderate</option>
            </select>
          </div>
          <div style={{ flex:1, overflow:"auto", padding:8 }}>
            {displayPatients.map(pat => (
              <div key={pat.id} onClick={() => handleSelect(pat.id)}
                style={{
                  padding:"8px 12px", marginBottom:4, borderRadius:8, cursor:"pointer", ...apple,
                  background: selectedId === pat.id ? "#eff6ff" : "#fff",
                  border: selectedId === pat.id ? "1px solid #93c5fd" : "1px solid transparent",
                  borderLeft: `3px solid ${acuityColors[pat.acuity]}`,
                }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontWeight:600, fontSize:13 }}>{pat.name}</span>
                  <span style={{ fontSize:9, padding:"1px 8px", borderRadius:6, background:"#f5f5f5", color:acuityColors[pat.acuity], fontWeight:600 }}>{pat.acuity}</span>
                </div>
                <div style={{ fontSize:11, color:"#666", marginTop:2 }}>{pat.chiefComplaint.substring(0, 50)}…</div>
                <div style={{ fontSize:10, color:"#aeaeb2", marginTop:2 }}>{pat.age}y · {pat.insurance} · Wait {pat.waitTime}m</div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: Active workflow step */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", background:"#fff" }}>
          {step === 0 && !selectedId && (
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", color:"#aeaeb2", fontSize:13 }}>
              Select a patient from the queue to start the admission workflow
            </div>
          )}

          {step === 1 && p && (
            <div style={{ flex:1, overflow:"auto", padding:24 }}>
              <div style={{ marginBottom:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                  <span style={{ background:"#eff6ff", color:"#1e40af", fontSize:10, fontWeight:700, padding:"2px 10px", borderRadius:6 }}>STEP 1 OF 3 — Triage Assessment</span>
                  <span style={{ fontSize:10, color:"#aeaeb2" }}>{p.name} · {p.id}</span>
                </div>
                <h2 style={{ margin:"4px 0", fontSize:18 }}>{p.chiefComplaint}</h2>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
                <div style={{ background:"#f9fafb", borderRadius:8, padding:12 }}>
                  <div style={{ fontSize:10, color:"#86868b", fontWeight:600, marginBottom:6, textTransform:"uppercase" }}>Vital Signs</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                    <div><span style={{ fontSize:10, color:"#aeaeb2" }}>BP</span><div style={{ fontWeight:700, fontSize:16 }}>{p.bp}</div></div>
                    <div><span style={{ fontSize:10, color:"#aeaeb2" }}>HR</span><div style={{ fontWeight:700, fontSize:16 }}>{p.hr} <span style={{ fontWeight:400, fontSize:11, color:"#86868b" }}>bpm</span></div></div>
                    <div><span style={{ fontSize:10, color:"#aeaeb2" }}>Temp</span><div style={{ fontWeight:700, fontSize:16 }}>{p.temp}°C</div></div>
                    <div><span style={{ fontSize:10, color:"#aeaeb2" }}>SpO₂</span><div style={{ fontWeight:700, fontSize:16 }}>{p.spo2}%</div></div>
                  </div>
                </div>
                <div style={{ background:"#f9fafb", borderRadius:8, padding:12 }}>
                  <div style={{ fontSize:10, color:"#86868b", fontWeight:600, marginBottom:6, textTransform:"uppercase" }}>Patient Info</div>
                  <div style={{ fontSize:12, lineHeight:1.8 }}>
                    <div><span style={{ color:"#86868b" }}>Age:</span> {p.age} · {p.gender}</div>
                    <div><span style={{ color:"#86868b" }}>Insurance:</span> {p.insurance}</div>
                    <div><span style={{ color:"#86868b" }}>Allergies:</span> {p.allergies.join(", ") || "None"}</div>
                    <div><span style={{ color:"#86868b" }}>Wait:</span> {p.waitTime}m</div>
                  </div>
                </div>
              </div>

              <div style={{ background:"#f9fafb", borderRadius:8, padding:12, marginBottom:20 }}>
                <div style={{ fontSize:10, color:"#86868b", fontWeight:600, marginBottom:6, textTransform:"uppercase" }}>Triage Notes</div>
                <textarea placeholder="Enter triage assessment notes…"
                  style={{ width:"100%", minHeight:80, border:"1px solid #e5e5e5", borderRadius:6, padding:10, fontSize:13, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }} />
              </div>

              <div style={{ display:"flex", gap:10 }}>
                <button onClick={handleCompleteTriage}
                  style={{ padding:"10px 24px", background:"#1d4ed8", color:"#fff", border:"none", borderRadius:8, fontWeight:600, fontSize:13, cursor:"pointer", ...apple }}>
                  ✅ Complete Triage → Assign Bed
                </button>
                <button onClick={handleFastTrack}
                  style={{ padding:"10px 24px", background:"#059669", color:"#fff", border:"none", borderRadius:8, fontWeight:600, fontSize:13, cursor:"pointer", ...apple }}>
                  ⚡ Fast Track to Doctor
                </button>
              </div>
            </div>
          )}

          {step === 2 && p && (
            <div style={{ flex:1, overflow:"auto", padding:24 }}>
              <div style={{ marginBottom:20 }}>
                <span style={{ background:"#ecfdf5", color:"#065f46", fontSize:10, fontWeight:700, padding:"2px 10px", borderRadius:6 }}>STEP 2 OF 3 — Bed Assignment</span>
                <h2 style={{ margin:"6px 0 2px", fontSize:18 }}>Assign {p.name}</h2>
                <div style={{ fontSize:12, color:"#86868b" }}>{p.acuity} · {p.chiefComplaint.substring(0, 40)}…</div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
                {[
                  { label:"ICU — Cardiac Monitor", beds:"2 available", color:"#1d4ed8", detail:"For critical patients requiring continuous monitoring" },
                  { label:"Telemetry Floor", beds:"4 available", color:"#059669", detail:"Step-down unit with remote monitoring" },
                  { label:"Medical-Surgical Ward", beds:"7 available", color:"#f59e0b", detail:"General acute care" },
                  { label:"Observation Unit", beds:"3 available", color:"#7C3AED", detail:"Short-stay, <24h expected" },
                ].map(bed => (
                  <div key={bed.label} onClick={() => handleAssignBed(bed.label)}
                    style={{ padding:14, borderRadius:10, border:"1px solid #e5e5e5", cursor:"pointer", ...apple }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontWeight:600, fontSize:13 }}>{bed.label}</span>
                      <span style={{ fontSize:10, color:bed.color, fontWeight:600 }}>{bed.beds}</span>
                    </div>
                    <div style={{ fontSize:11, color:"#86868b" }}>{bed.detail}</div>
                    <button style={{ marginTop:8, padding:"4px 14px", background:bed.color, color:"#fff", border:"none", borderRadius:6, fontSize:11, fontWeight:600, cursor:"pointer", ...apple }}>
                      Assign
                    </button>
                  </div>
                ))}
              </div>

              <button onClick={handleDischarge}
                style={{ padding:"8px 20px", background:"#fff", border:"1px solid #e5e5e5", borderRadius:8, fontSize:12, fontWeight:500, cursor:"pointer", color:"#666", ...apple }}>
                🏠 Discharge Home Instead
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: Adaptation Brain */}
        <div style={{ width:320, borderLeft:"1px solid rgba(0,0,0,0.06)", background:"#fafafa", display:"flex", flexDirection:"column" }}>
          
          {/* Brain header */}
          <div onClick={() => setShowBrain(!showBrain)}
            style={{ padding:"10px 14px", borderBottom:"1px solid rgba(0,0,0,0.06)", cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontSize:10, fontWeight:600, color:"#86868b" }}>
            <span>{showBrain ? "▼" : "▶"}</span>
            <span>🧠 YoXperience Brain</span>
            <span style={{ background:"#1d4ed8", color:"#fff", borderRadius:8, padding:"0 6px", fontSize:9 }}>{activityLog.length}</span>
            {autoSort && <span style={{ fontSize:9, color:"#059669" }}>● Adapting</span>}
          </div>

          {showBrain && (
            <div style={{ flex:1, overflow:"auto", padding:10, display:"flex", flexDirection:"column", gap:8 }}>

              {/* Live activity stream */}
              <div style={{ background:"#fff", borderRadius:8, padding:10, border:"1px solid rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize:9, color:"#86868b", fontWeight:600, marginBottom:6, textTransform:"uppercase" }}>Live Telemetry Stream</div>
                <div style={{ maxHeight:180, overflow:"auto" }}>
                  {activityLog.length === 0 && <div style={{ fontSize:10, color:"#aeaeb2", padding:8, textAlign:"center" }}>Select a patient to start collecting data</div>}
                  {activityLog.slice(-12).reverse().map((a, i) => (
                    <div key={i} style={{ display:"flex", gap:6, padding:"3px 0", fontSize:10, borderBottom:"1px solid rgba(0,0,0,0.03)", alignItems:"center" }}>
                      <span style={{ fontSize:8, color:"#aeaeb2" }}>{(a.ts % 60000).toString().padStart(2,'0')}s</span>
                      <span style={{
                        width:6, height:6, borderRadius:"50%", flexShrink:0,
                        background: a.action === "select_patient" ? "#1d4ed8" : a.action === "complete_triage" ? "#059669" : a.action === "fast_track" ? "#7C3AED" : a.action === "assign_bed" ? "#f59e0b" : a.action === "adaptation" ? "#dc2626" : "#aeaeb2",
                      }} />
                      <span>{a.detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analytics summary */}
              <div style={{ background:"#fff", borderRadius:8, padding:10, border:"1px solid rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize:9, color:"#86868b", fontWeight:600, marginBottom:6, textTransform:"uppercase" }}>Interaction Analytics</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, fontSize:11 }}>
                  <Metric label="Patients Seen" value={completedCount} />
                  <Metric label="Avg Actions/Patient" value={completedCount > 0 ? (activityLog.length / completedCount).toFixed(1) : "—"} />
                  <Metric label="Triaged" value={activityLog.filter(a => a.action === "complete_triage").length} />
                  <Metric label="Fast Tracked" value={activityLog.filter(a => a.action === "fast_track").length} />
                  <Metric label="Admitted" value={activityLog.filter(a => a.action === "assign_bed").length} />
                  <Metric label="Discharged" value={activityLog.filter(a => a.action === "discharge").length} />
                </div>
              </div>

              {/* Adaptation log */}
              <div style={{ background:"#fff", borderRadius:8, padding:10, border:"1px solid rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize:9, color:"#86868b", fontWeight:600, marginBottom:6, textTransform:"uppercase" }}>AI Adaptations</div>
                {adaptationLog.length === 0 ? (
                  <div style={{ fontSize:10, color:"#aeaeb2", padding:4 }}>
                    <span style={{ fontWeight:600 }}>Tip:</span> Process 3+ patients to see the UI adapt. Try consistently choosing critical patients or always using fast-track.
                  </div>
                ) : (
                  adaptationLog.map((a, i) => (
                    <div key={i} style={{ fontSize:10, padding:"4px 8px", marginBottom:3, background:"#ecfdf5", borderRadius:4, color:"#065f46", border:"1px solid #bbf7d0" }}>
                      🧠 {a}
                    </div>
                  ))
                )}
              </div>

              {/* Sort controls visible */}
              <div style={{ background:"#fff", borderRadius:8, padding:10, border:"1px solid rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize:9, color:"#86868b", fontWeight:600, marginBottom:4, textTransform:"uppercase" }}>Current Config</div>
                <div style={{ fontSize:10, color:"#555", display:"flex", flexDirection:"column", gap:3 }}>
                  <span>Sort: <strong>{sortBy}</strong> {autoSort ? <span style={{ color:"#059669", fontSize:9 }}>(AI-adjusted)</span> : ""}</span>
                  <span>Filter: <strong>{acuityFilter}</strong> {autoFilter ? <span style={{ color:"#059669", fontSize:9 }}>(AI-adjusted)</span> : ""}</span>
                  <span>Workflow: {activityLog.filter(a => a.action === "fast_track").length >= 2 ? <strong style={{ color:"#7C3AED" }}>Fast-track mode</strong> : <strong>Standard triage</strong>}</span>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background:"#f9fafb", padding:"6px 10px", borderRadius:6 }}>
      <div style={{ fontSize:9, color:"#86868b" }}>{label}</div>
      <div style={{ fontWeight:700, fontSize:16, color:"#1d1d1f" }}>{value}</div>
    </div>
  );
}
