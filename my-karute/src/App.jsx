import { useState, useRef, useEffect } from "react";

// ─── Storage (localStorage) ────────────────────────────────────────────────────
const KEYS = {
  history: "karute_history",
  records: "karute_records",
  oriental: "karute_oriental",
  posture: "karute_posture",
  pain: "karute_pain",
  worries: "karute_worries",
  habits: "karute_habits",
};

const load = (key) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
  catch { return null; }
};
const save = (key, val) => {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
};

// ─── Icons ─────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const icons = {
  history:   "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  record:    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  oriental:  "M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 0v20M2 12h20",
  posture:   "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  pain:      "M12 2a10 10 0 100 20A10 10 0 0012 2zm-2 14.5v-9l6 4.5-6 4.5z",
  habits:    "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  plus:      "M12 5v14M5 12h14",
  trash:     "M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2",
  camera:    "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 17a4 4 0 100-8 4 4 0 000 8z",
  edit:      "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  chart:     "M18 20V10M12 20V4M6 20v-6",
  calendar:  "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  timeline:  "M4 6h16M4 12h16M4 18h7",
  chevLeft:  "M15 18l-6-6 6-6",
  chevRight: "M9 18l6-6-6-6",
};

// ─── Palette ───────────────────────────────────────────────────────────────────
const palette = {
  bg: "#0f1117", card: "#1a1d27", cardBorder: "#2a2d3e",
  accent1: "#7c6af7", accent2: "#4ecdc4", accent3: "#f7a86a",
  accent4: "#e06b8b", accent5: "#6be0b0",
  text: "#e8eaf0", textSub: "#8890a4", tabBg: "#13151f",
};
const historyPalette = {
  banner: "#221a0a", accent: "#e8a020", accentSub: "#c47c10",
  border: "#3a2e10", text: "#f5e6c0", textSub: "#a08850",
};

const tabConfig = [
  { key: "timeline", label: "日別ログ",  color: "#f0c060",        icon: icons.timeline },
  { key: "records",  label: "検査記録",  color: palette.accent2,  icon: icons.record   },
  { key: "oriental", label: "東洋医学",  color: palette.accent3,  icon: icons.oriental },
  { key: "posture",  label: "姿勢記録",  color: palette.accent4,  icon: icons.posture  },
  { key: "worries",  label: "お悩みログ",color: "#a8d8f7",        icon: icons.edit     },
  { key: "pain",     label: "痛みログ",  color: palette.accent5,  icon: icons.pain     },
  { key: "habits",   label: "薬・習慣",  color: "#c8a8f7",        icon: icons.habits   },
];

// ─── Shared styles ─────────────────────────────────────────────────────────────
const S = {
  card: { background: palette.card, border: `1px solid ${palette.cardBorder}`, borderRadius: 12, padding: 16, marginBottom: 12 },
  label: { fontSize: 11, color: palette.textSub, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  input: { width: "100%", boxSizing: "border-box", background: "#0f1117", border: `1px solid ${palette.cardBorder}`, borderRadius: 8, color: palette.text, padding: "8px 12px", fontSize: 14, outline: "none" },
  textarea: { width: "100%", boxSizing: "border-box", background: "#0f1117", border: `1px solid ${palette.cardBorder}`, borderRadius: 8, color: palette.text, padding: "8px 12px", fontSize: 14, outline: "none", resize: "vertical", minHeight: 80 },
  btn: (color) => ({ background: color, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }),
  tag: (color) => ({ display: "inline-block", background: color + "25", color, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600, marginRight: 4, marginBottom: 4 }),
};

// ─── Image Upload ──────────────────────────────────────────────────────────────
function ImageUpload({ onUpload, label = "写真を追加" }) {
  const ref = useRef();
  return (
    <>
      <input type="file" accept="image/*" ref={ref} style={{ display: "none" }}
        onChange={e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => onUpload(ev.target.result); r.readAsDataURL(f); }} />
      <button style={{ ...S.btn(palette.accent2), fontSize: 12, padding: "6px 12px" }} onClick={() => ref.current.click()}>
        <Icon d={icons.camera} size={14} /> {label}
      </button>
    </>
  );
}

// ─── 既往歴パネル ──────────────────────────────────────────────────────────────
function HistoryPanel({ open, onClose }) {
  const [items, setItems] = useState(() => load(KEYS.history) || []);
  const [form, setForm] = useState({ name: "", year: "", status: "治療中", memo: "" });
  const [adding, setAdding] = useState(false);
  useEffect(() => { save(KEYS.history, items); }, [items]);
  const statusColors = { "治療中": "#e05050", "経過観察": historyPalette.accent, "完治": "#60c080" };
  const add = () => {
    if (!form.name) return;
    setItems(p => [{ ...form, id: Date.now() }, ...p]);
    setForm({ name: "", year: "", status: "治療中", memo: "" });
    setAdding(false);
  };
  const Hi = { ...S.input, background: "#120e04", border: `1px solid ${historyPalette.border}`, color: historyPalette.text };
  const Ht = { ...S.textarea, background: "#120e04", border: `1px solid ${historyPalette.border}`, color: historyPalette.text };
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", display: "flex", flexDirection: "column" }} onClick={onClose}>
      <div style={{ background: historyPalette.banner, borderBottom: `2px solid ${historyPalette.accent}`, borderRadius: "0 0 20px 20px", maxWidth: 600, width: "100%", margin: "0 auto", maxHeight: "85vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ background: "linear-gradient(135deg,#2a1e06,#1a1208)", padding: "16px 20px 12px", borderBottom: `1px solid ${historyPalette.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${historyPalette.accent},${historyPalette.accentSub})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📋</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: historyPalette.text }}>既往歴</div>
              <div style={{ fontSize: 11, color: historyPalette.textSub }}>これまでに診断・治療した病気</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...S.btn(historyPalette.accent), fontSize: 12, padding: "6px 12px", color: "#1a1208" }} onClick={() => setAdding(!adding)}>
              <Icon d={icons.plus} size={13} color="#1a1208" /> 追加
            </button>
            <button onClick={onClose} style={{ background: historyPalette.border, border: "none", borderRadius: 8, color: historyPalette.textSub, fontSize: 18, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        </div>
        <div style={{ padding: 16 }}>
          {adding && (
            <div style={{ background: "#160f03", border: `1px solid ${historyPalette.accent}60`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div><div style={{ ...S.label, color: historyPalette.textSub }}>病名 *</div><input style={Hi} placeholder="高血圧、糖尿病など" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div><div style={{ ...S.label, color: historyPalette.textSub }}>診断年</div><input style={Hi} placeholder="2020" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} /></div>
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ ...S.label, color: historyPalette.textSub }}>状態</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {["治療中", "経過観察", "完治"].map(s => <button key={s} onClick={() => setForm(p => ({ ...p, status: s }))} style={{ ...S.btn(form.status === s ? statusColors[s] : historyPalette.border), fontSize: 12, padding: "5px 12px" }}>{s}</button>)}
                </div>
              </div>
              <div style={{ marginBottom: 10 }}><div style={{ ...S.label, color: historyPalette.textSub }}>メモ</div><textarea style={Ht} value={form.memo} onChange={e => setForm(p => ({ ...p, memo: e.target.value }))} /></div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ ...S.btn(historyPalette.accent), color: "#1a1208" }} onClick={add}>保存</button>
                <button style={S.btn(historyPalette.border)} onClick={() => setAdding(false)}>キャンセル</button>
              </div>
            </div>
          )}
          {items.length === 0 && !adding && <div style={{ textAlign: "center", color: historyPalette.textSub, padding: 40 }}>病歴がまだ登録されていません</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {items.map(item => (
              <div key={item.id} style={{ background: "#160f03", border: `1px solid ${historyPalette.border}`, borderLeft: `3px solid ${statusColors[item.status] || historyPalette.accent}`, borderRadius: 10, padding: 12, position: "relative" }}>
                <button onClick={() => setItems(p => p.filter(x => x.id !== item.id))} style={{ position: "absolute", top: 6, right: 6, background: "none", border: "none", cursor: "pointer", color: "#e0504060", fontSize: 14 }}>✕</button>
                <div style={{ fontSize: 14, fontWeight: 700, color: historyPalette.text, marginBottom: 4, paddingRight: 16 }}>{item.name}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  <span style={{ ...S.tag(statusColors[item.status] || historyPalette.accent), fontSize: 10, padding: "1px 8px" }}>{item.status}</span>
                  {item.year && <span style={{ color: historyPalette.textSub, fontSize: 11 }}>{item.year}年〜</span>}
                </div>
                {item.memo && <div style={{ color: historyPalette.textSub, fontSize: 11, lineHeight: 1.5, marginTop: 4 }}>{item.memo}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 検査記録 ──────────────────────────────────────────────────────────────────
function RecordsPage() {
  const [items, setItems] = useState(() => load(KEYS.records) || []);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ date: "", type: "採血", title: "", memo: "", images: [] });
  useEffect(() => { save(KEYS.records, items); }, [items]);
  const add = () => { if (!form.date) return; setItems(p => [{ ...form, id: Date.now() }, ...p].sort((a, b) => b.date.localeCompare(a.date))); setForm({ date: "", type: "採血", title: "", memo: "", images: [] }); setAdding(false); };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div><div style={{ fontSize: 18, fontWeight: 700, color: palette.text }}>検査記録</div><div style={{ fontSize: 12, color: palette.textSub }}>採血・画像・検査結果の時系列</div></div>
        <button style={S.btn(palette.accent2)} onClick={() => setAdding(!adding)}><Icon d={icons.plus} size={14} /> 追加</button>
      </div>
      {adding && (
        <div style={{ ...S.card, borderColor: palette.accent2 + "60", marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><div style={S.label}>日付 *</div><input type="date" style={S.input} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
            <div><div style={S.label}>種別</div><select style={S.input} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>{["採血","レントゲン","MRI/CT","超音波","心電図","尿検査","その他"].map(t => <option key={t}>{t}</option>)}</select></div>
          </div>
          <div style={{ marginBottom: 10 }}><div style={S.label}>タイトル</div><input style={S.input} placeholder="例：一般健康診断" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
          <div style={{ marginBottom: 10 }}><div style={S.label}>結果・メモ</div><textarea style={S.textarea} value={form.memo} onChange={e => setForm(p => ({ ...p, memo: e.target.value }))} /></div>
          <div style={{ marginBottom: 10 }}>
            <div style={S.label}>写真</div>
            <ImageUpload onUpload={img => setForm(p => ({ ...p, images: [...p.images, img] }))} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {form.images.map((img, i) => <div key={i} style={{ position: "relative" }}><img src={img} alt="" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 6 }} /><button onClick={() => setForm(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }))} style={{ position: "absolute", top: -4, right: -4, background: palette.accent4, border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", color: "#fff", fontSize: 10 }}>✕</button></div>)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}><button style={S.btn(palette.accent2)} onClick={add}>保存</button><button style={S.btn(palette.cardBorder)} onClick={() => setAdding(false)}>キャンセル</button></div>
        </div>
      )}
      {items.length === 0 && !adding && <div style={{ textAlign: "center", color: palette.textSub, padding: 40 }}>検査記録がまだありません</div>}
      {items.map(item => (
        <div key={item.id} style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}><span style={{ color: palette.accent2, fontSize: 12, fontWeight: 700 }}>{item.date.replace(/-/g, "/")}</span><span style={S.tag(palette.accent2)}>{item.type}</span></div>
              {item.title && <div style={{ fontWeight: 700, color: palette.text, fontSize: 15, marginBottom: 4 }}>{item.title}</div>}
              {item.memo && <div style={{ color: palette.textSub, fontSize: 13, whiteSpace: "pre-wrap" }}>{item.memo}</div>}
              {item.images?.length > 0 && <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>{item.images.map((img, i) => <img key={i} src={img} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: `1px solid ${palette.cardBorder}` }} />)}</div>}
            </div>
            <button onClick={() => setItems(p => p.filter(x => x.id !== item.id))} style={{ background: "none", border: "none", cursor: "pointer", color: palette.accent4 }}><Icon d={icons.trash} size={16} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 東洋医学 ──────────────────────────────────────────────────────────────────
function OrientalPage() {
  const [items, setItems] = useState(() => load(KEYS.oriental) || []);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ date: "", practitioner: "", tongue: "", pulse: "", symptoms: "", treatment: "", memo: "" });
  useEffect(() => { save(KEYS.oriental, items); }, [items]);
  const add = () => { if (!form.date) return; setItems(p => [{ ...form, id: Date.now() }, ...p].sort((a, b) => b.date.localeCompare(a.date))); setForm({ date: "", practitioner: "", tongue: "", pulse: "", symptoms: "", treatment: "", memo: "" }); setAdding(false); };
  const fields = [{ key: "tongue", label: "舌診", placeholder: "色・形・苔の状態" }, { key: "pulse", label: "脈診", placeholder: "脈の状態" }, { key: "symptoms", label: "主訴・証", placeholder: "気血水・五行のバランスなど" }, { key: "treatment", label: "治療内容", placeholder: "ツボ、施術内容" }, { key: "memo", label: "メモ", placeholder: "体調変化など" }];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div><div style={{ fontSize: 18, fontWeight: 700, color: palette.text }}>東洋医学記録</div><div style={{ fontSize: 12, color: palette.textSub }}>舌診・脈診・治療の時系列</div></div>
        <button style={S.btn(palette.accent3)} onClick={() => setAdding(!adding)}><Icon d={icons.plus} size={14} /> 追加</button>
      </div>
      {adding && (
        <div style={{ ...S.card, borderColor: palette.accent3 + "60", marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><div style={S.label}>日付 *</div><input type="date" style={S.input} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
            <div><div style={S.label}>施術者・病院</div><input style={S.input} placeholder="○○鍼灸院" value={form.practitioner} onChange={e => setForm(p => ({ ...p, practitioner: e.target.value }))} /></div>
          </div>
          {fields.map(f => <div key={f.key} style={{ marginBottom: 10 }}><div style={S.label}>{f.label}</div><textarea style={{ ...S.textarea, minHeight: 60 }} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} /></div>)}
          <div style={{ display: "flex", gap: 8 }}><button style={S.btn(palette.accent3)} onClick={add}>保存</button><button style={S.btn(palette.cardBorder)} onClick={() => setAdding(false)}>キャンセル</button></div>
        </div>
      )}
      {items.length === 0 && !adding && <div style={{ textAlign: "center", color: palette.textSub, padding: 40 }}>東洋医学の記録がまだありません</div>}
      {items.map(item => (
        <div key={item.id} style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}><span style={{ color: palette.accent3, fontSize: 12, fontWeight: 700 }}>{item.date.replace(/-/g, "/")}</span>{item.practitioner && <span style={S.tag(palette.accent3)}>{item.practitioner}</span>}</div>
              {[{ label: "舌診", val: item.tongue }, { label: "脈診", val: item.pulse }, { label: "証", val: item.symptoms }, { label: "治療", val: item.treatment }, { label: "メモ", val: item.memo }].filter(x => x.val).map(x => <div key={x.label} style={{ marginBottom: 6 }}><span style={{ color: palette.accent3, fontSize: 11, fontWeight: 700 }}>{x.label} </span><span style={{ color: palette.textSub, fontSize: 13 }}>{x.val}</span></div>)}
            </div>
            <button onClick={() => setItems(p => p.filter(x => x.id !== item.id))} style={{ background: "none", border: "none", cursor: "pointer", color: palette.accent4 }}><Icon d={icons.trash} size={16} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── 姿勢記録 ──────────────────────────────────────────────────────────────────
function PosturePage() {
  const [items, setItems] = useState(() => load(KEYS.posture) || []);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ date: "", place: "", memo: "", images: [] });
  const [expanded, setExpanded] = useState(null);
  useEffect(() => { save(KEYS.posture, items); }, [items]);
  const add = () => { if (!form.date) return; setItems(p => [{ ...form, id: Date.now() }, ...p].sort((a, b) => b.date.localeCompare(a.date))); setForm({ date: "", place: "", memo: "", images: [] }); setAdding(false); };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div><div style={{ fontSize: 18, fontWeight: 700, color: palette.text }}>姿勢記録</div><div style={{ fontSize: 12, color: palette.textSub }}>体操教室・整骨院での姿勢写真</div></div>
        <button style={S.btn(palette.accent4)} onClick={() => setAdding(!adding)}><Icon d={icons.plus} size={14} /> 追加</button>
      </div>
      {adding && (
        <div style={{ ...S.card, borderColor: palette.accent4 + "60", marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><div style={S.label}>日付 *</div><input type="date" style={S.input} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
            <div><div style={S.label}>場所</div><input style={S.input} placeholder="○○整骨院" value={form.place} onChange={e => setForm(p => ({ ...p, place: e.target.value }))} /></div>
          </div>
          <div style={{ marginBottom: 10 }}><div style={S.label}>メモ</div><textarea style={{ ...S.textarea, minHeight: 60 }} value={form.memo} onChange={e => setForm(p => ({ ...p, memo: e.target.value }))} /></div>
          <div style={{ marginBottom: 10 }}>
            <div style={S.label}>姿勢写真（複数可）</div>
            <ImageUpload onUpload={img => setForm(p => ({ ...p, images: [...p.images, img] }))} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {form.images.map((img, i) => <div key={i} style={{ position: "relative" }}><img src={img} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }} /><button onClick={() => setForm(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }))} style={{ position: "absolute", top: -4, right: -4, background: palette.accent4, border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", color: "#fff", fontSize: 10 }}>✕</button></div>)}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}><button style={S.btn(palette.accent4)} onClick={add}>保存</button><button style={S.btn(palette.cardBorder)} onClick={() => setAdding(false)}>キャンセル</button></div>
        </div>
      )}
      {items.length === 0 && !adding && <div style={{ textAlign: "center", color: palette.textSub, padding: 40 }}>姿勢記録がまだありません</div>}
      {items.map(item => (
        <div key={item.id} style={{ ...S.card, cursor: "pointer" }} onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ color: palette.accent4, fontWeight: 700, fontSize: 14 }}>{item.date.replace(/-/g, "/")}</span>{item.place && <span style={S.tag(palette.accent4)}>{item.place}</span>}</div>
              {item.memo && <div style={{ color: palette.textSub, fontSize: 12, marginTop: 4 }}>{item.memo}</div>}
              <div style={{ color: palette.textSub, fontSize: 11, marginTop: 4 }}>📷 {item.images?.length || 0}枚の写真</div>
            </div>
            <button onClick={e => { e.stopPropagation(); setItems(p => p.filter(x => x.id !== item.id)); }} style={{ background: "none", border: "none", cursor: "pointer", color: palette.accent4 }}><Icon d={icons.trash} size={16} /></button>
          </div>
          {expanded === item.id && item.images?.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>{item.images.map((img, i) => <img key={i} src={img} alt="" style={{ width: "calc(50% - 4px)", borderRadius: 8, objectFit: "cover" }} />)}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── お悩みログ ────────────────────────────────────────────────────────────────
function WorriesPage() {
  const [items, setItems] = useState(() => load(KEYS.worries) || []);
  const [text, setText] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [expanded, setExpanded] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const wColor = "#a8d8f7";
  useEffect(() => { save(KEYS.worries, items); }, [items]);
  const add = () => { if (!text.trim()) return; setItems(p => [{ id: Date.now(), date, text: text.trim() }, ...p].sort((a, b) => b.date.localeCompare(a.date))); setText(""); };
  const saveEdit = id => { setItems(p => p.map(x => x.id === id ? { ...x, text: editText } : x)); setEditId(null); };
  const grouped = {};
  items.forEach(item => { const ym = item.date.slice(0, 7); if (!grouped[ym]) grouped[ym] = []; grouped[ym].push(item); });
  const sortedYM = Object.keys(grouped).sort().reverse();
  return (
    <div>
      <div style={{ marginBottom: 16 }}><div style={{ fontSize: 18, fontWeight: 700, color: palette.text }}>今のお悩みログ</div><div style={{ fontSize: 12, color: palette.textSub }}>体調・気分・生活の気になることを自由に記録</div></div>
      <div style={{ ...S.card, borderColor: wColor + "50", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center" }}>
          <div style={{ flex: 1 }}><div style={S.label}>日付</div><input type="date" style={S.input} value={date} onChange={e => setDate(e.target.value)} /></div>
          <div style={{ paddingTop: 18 }}><button style={{ ...S.btn(wColor), color: "#0d1a25", fontWeight: 800, padding: "8px 18px" }} onClick={add}>記録する</button></div>
        </div>
        <textarea style={{ ...S.textarea, minHeight: 100, borderColor: wColor + "40", lineHeight: 1.8 }} placeholder={"今日の体調や気になること、なんでも…\n例）最近胃もたれしやすい、なんとなく疲れが取れない"} value={text} onChange={e => setText(e.target.value)} />
      </div>
      {sortedYM.length === 0 && <div style={{ textAlign: "center", color: palette.textSub, padding: 40 }}>お悩みの記録がまだありません</div>}
      {sortedYM.map(ym => {
        const [y, m] = ym.split("-");
        return (
          <div key={ym} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: wColor, letterSpacing: 1, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: wColor }} />{y}年 {parseInt(m)}月<div style={{ flex: 1, height: 1, background: wColor + "30" }} />
            </div>
            {grouped[ym].map(item => (
              <div key={item.id} style={{ ...S.card, borderLeft: `3px solid ${wColor}50`, cursor: editId === item.id ? "default" : "pointer", marginBottom: 8 }} onClick={() => editId !== item.id && setExpanded(expanded === item.id ? null : item.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 11, color: wColor, fontWeight: 700 }}>{item.date.replace(/-/g, "/")}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={e => { e.stopPropagation(); setEditId(item.id); setEditText(item.text); setExpanded(item.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: palette.textSub, padding: 2 }}><Icon d={icons.edit} size={14} /></button>
                    <button onClick={e => { e.stopPropagation(); setItems(p => p.filter(x => x.id !== item.id)); }} style={{ background: "none", border: "none", cursor: "pointer", color: palette.accent4 + "90", padding: 2 }}><Icon d={icons.trash} size={14} /></button>
                  </div>
                </div>
                {editId === item.id ? (
                  <div style={{ marginTop: 8 }} onClick={e => e.stopPropagation()}>
                    <textarea style={{ ...S.textarea, minHeight: 80, borderColor: wColor + "60" }} value={editText} onChange={e => setEditText(e.target.value)} />
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <button style={{ ...S.btn(wColor), fontSize: 12, padding: "5px 14px", color: "#0d1a25" }} onClick={() => saveEdit(item.id)}>保存</button>
                      <button style={{ ...S.btn(palette.cardBorder), fontSize: 12, padding: "5px 14px" }} onClick={() => setEditId(null)}>キャンセル</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: palette.text, fontSize: 14, marginTop: 6, lineHeight: 1.75, whiteSpace: "pre-wrap", ...(expanded !== item.id && item.text.length > 80 ? { overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } : {}) }}>{item.text}</div>
                )}
                {expanded !== item.id && item.text.length > 80 && editId !== item.id && <div style={{ fontSize: 11, color: wColor, marginTop: 4 }}>続きを見る…</div>}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── 痛みログ ──────────────────────────────────────────────────────────────────
function PainPage() {
  const defaultTypes = ["頭痛", "腰痛", "膝痛", "肩こり", "首痛"];
  const stored = load(KEYS.pain);
  const [painTypes, setPainTypes] = useState(() => stored?.types || defaultTypes);
  const [logs, setLogs] = useState(() => stored?.logs || []);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), type: "頭痛", level: 3, memo: "" });
  const [view, setView] = useState("week");
  const [newType, setNewType] = useState("");
  useEffect(() => { save(KEYS.pain, { types: painTypes, logs }); }, [painTypes, logs]);
  const add = () => { setLogs(p => [{ ...form, id: Date.now() }, ...p].sort((a, b) => b.date.localeCompare(a.date))); setForm(p => ({ ...p, memo: "" })); };
  const addType = () => { if (!newType || painTypes.includes(newType)) return; setPainTypes(p => [...p, newType]); setNewType(""); };
  const getWeekStart = d => { const dt = new Date(d); dt.setDate(dt.getDate() - dt.getDay()); return dt.toISOString().slice(0, 10); };
  const buckets = {};
  logs.forEach(log => { const key = view === "week" ? getWeekStart(log.date) : view === "month" ? log.date.slice(0, 7) : log.date.slice(0, 4); if (!buckets[key]) buckets[key] = {}; buckets[key][log.type] = (buckets[key][log.type] || 0) + 1; });
  const sortedKeys = Object.keys(buckets).sort().reverse().slice(0, 12).reverse();
  const maxVal = Math.max(1, ...sortedKeys.flatMap(k => Object.values(buckets[k])));
  const colors = [palette.accent5, palette.accent4, palette.accent3, palette.accent2, palette.accent1, "#c8a8f7"];
  const formatKey = k => view === "week" ? k.slice(5).replace("-", "/") + "週" : view === "month" ? k.slice(5) + "月" : k + "年";
  return (
    <div>
      <div style={{ marginBottom: 16 }}><div style={{ fontSize: 18, fontWeight: 700, color: palette.text }}>痛みログ</div><div style={{ fontSize: 12, color: palette.textSub }}>痛みの記録・集計グラフ</div></div>
      <div style={{ ...S.card, borderColor: palette.accent5 + "60", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: palette.text, marginBottom: 10 }}>今日の痛みを記録</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><div style={S.label}>日付</div><input type="date" style={S.input} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
          <div><div style={S.label}>種類</div><select style={S.input} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>{painTypes.map(t => <option key={t}>{t}</option>)}</select></div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={S.label}>辛さ: {form.level}/5</div>
          <input type="range" min="1" max="5" value={form.level} onChange={e => setForm(p => ({ ...p, level: +e.target.value }))} style={{ width: "100%", accentColor: palette.accent5 }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: palette.textSub }}><span>軽い</span><span>普通</span><span>辛い</span></div>
        </div>
        <div style={{ marginBottom: 10 }}><div style={S.label}>メモ</div><input style={S.input} placeholder="状況など" value={form.memo} onChange={e => setForm(p => ({ ...p, memo: e.target.value }))} /></div>
        <button style={S.btn(palette.accent5)} onClick={add}>記録する</button>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input style={{ ...S.input, flex: 1 }} placeholder="痛みの種類を追加（例：歯痛）" value={newType} onChange={e => setNewType(e.target.value)} />
        <button style={S.btn(palette.accent5)} onClick={addType}>追加</button>
      </div>
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: palette.text }}>集計グラフ</div>
          <div style={{ display: "flex", gap: 4 }}>{["week","month","year"].map((v,i) => <button key={v} onClick={() => setView(v)} style={{ ...S.btn(view === v ? palette.accent5 : palette.cardBorder), fontSize: 11, padding: "4px 10px" }}>{["週","月","年"][i]}</button>)}</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>{painTypes.map((t, i) => <span key={t} style={S.tag(colors[i % colors.length])}>{t}</span>)}</div>
        {sortedKeys.length === 0 ? <div style={{ textAlign: "center", color: palette.textSub, padding: 20 }}>データがありません</div> : (
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "flex", gap: 8, minWidth: sortedKeys.length * 60, alignItems: "flex-end", height: 120 }}>
              {sortedKeys.map(k => (
                <div key={k} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 90 }}>
                    {painTypes.map((t, i) => { const v = buckets[k]?.[t] || 0; return v > 0 ? <div key={t} title={`${t}: ${v}回`} style={{ width: 12, height: `${(v / maxVal) * 80}px`, minHeight: 4, background: colors[i % colors.length], borderRadius: "3px 3px 0 0" }} /> : null; })}
                  </div>
                  <div style={{ fontSize: 9, color: palette.textSub, whiteSpace: "nowrap" }}>{formatKey(k)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: palette.text, marginBottom: 8 }}>記録一覧</div>
      {logs.slice(0, 30).map(item => { const ci = painTypes.indexOf(item.type); const c = colors[ci % colors.length] || palette.accent5; return (
        <div key={item.id} style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ color: c, fontSize: 12 }}>{item.date.replace(/-/g, "/")}</span><span style={S.tag(c)}>{item.type}</span><span style={{ fontSize: 12, color: palette.textSub }}>{"★".repeat(item.level)}{"☆".repeat(5 - item.level)}</span></div>
            {item.memo && <div style={{ color: palette.textSub, fontSize: 12, marginTop: 2 }}>{item.memo}</div>}
          </div>
          <button onClick={() => setLogs(p => p.filter(x => x.id !== item.id))} style={{ background: "none", border: "none", cursor: "pointer", color: palette.accent4 }}><Icon d={icons.trash} size={16} /></button>
        </div>
      ); })}
    </div>
  );
}

// ─── 薬・習慣 ──────────────────────────────────────────────────────────────────
function HabitsPage() {
  const [items, setItems] = useState(() => load(KEYS.habits) || []);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), category: "薬", name: "", detail: "", memo: "" });
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState("すべて");
  useEffect(() => { save(KEYS.habits, items); }, [items]);
  const catColors = { "薬": palette.accent1, "体操": palette.accent2, "健康習慣": palette.accent3, "サプリ": palette.accent5, "その他": palette.textSub };
  const add = () => { if (!form.name) return; setItems(p => [{ ...form, id: Date.now() }, ...p].sort((a, b) => b.date.localeCompare(a.date))); setForm(p => ({ ...p, name: "", detail: "", memo: "" })); setAdding(false); };
  const cats = ["すべて", ...Object.keys(catColors)];
  const filtered = filter === "すべて" ? items : items.filter(x => x.category === filter);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div><div style={{ fontSize: 18, fontWeight: 700, color: palette.text }}>薬・習慣記録</div><div style={{ fontSize: 12, color: palette.textSub }}>薬・体操・健康習慣の管理</div></div>
        <button style={S.btn("#c8a8f7")} onClick={() => setAdding(!adding)}><Icon d={icons.plus} size={14} /> 追加</button>
      </div>
      {adding && (
        <div style={{ ...S.card, borderColor: "#c8a8f760", marginBottom: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><div style={S.label}>日付</div><input type="date" style={S.input} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
            <div><div style={S.label}>カテゴリ</div><select style={S.input} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>{Object.keys(catColors).map(c => <option key={c}>{c}</option>)}</select></div>
          </div>
          <div style={{ marginBottom: 10 }}><div style={S.label}>名前 *</div><input style={S.input} placeholder="例：ロキソプロフェン、スクワット" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div style={{ marginBottom: 10 }}><div style={S.label}>詳細（用量・頻度など）</div><input style={S.input} placeholder="例：1日3回 食後" value={form.detail} onChange={e => setForm(p => ({ ...p, detail: e.target.value }))} /></div>
          <div style={{ marginBottom: 10 }}><div style={S.label}>メモ</div><textarea style={{ ...S.textarea, minHeight: 60 }} value={form.memo} onChange={e => setForm(p => ({ ...p, memo: e.target.value }))} /></div>
          <div style={{ display: "flex", gap: 8 }}><button style={S.btn("#c8a8f7")} onClick={add}>保存</button><button style={S.btn(palette.cardBorder)} onClick={() => setAdding(false)}>キャンセル</button></div>
        </div>
      )}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
        {cats.map(c => <button key={c} onClick={() => setFilter(c)} style={{ ...S.btn(filter === c ? (catColors[c] || palette.accent1) : palette.cardBorder), fontSize: 11, padding: "5px 10px", whiteSpace: "nowrap" }}>{c}</button>)}
      </div>
      {filtered.length === 0 && <div style={{ textAlign: "center", color: palette.textSub, padding: 40 }}>記録がありません</div>}
      {filtered.map(item => { const c = catColors[item.category] || palette.textSub; return (
        <div key={item.id} style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}><span style={{ color: c, fontSize: 12 }}>{item.date.replace(/-/g, "/")}</span><span style={S.tag(c)}>{item.category}</span></div>
              <div style={{ fontWeight: 700, color: palette.text, fontSize: 15 }}>{item.name}</div>
              {item.detail && <div style={{ color: palette.accent2, fontSize: 12, marginTop: 2 }}>{item.detail}</div>}
              {item.memo && <div style={{ color: palette.textSub, fontSize: 12, marginTop: 4 }}>{item.memo}</div>}
            </div>
            <button onClick={() => setItems(p => p.filter(x => x.id !== item.id))} style={{ background: "none", border: "none", cursor: "pointer", color: palette.accent4 }}><Icon d={icons.trash} size={16} /></button>
          </div>
        </div>
      ); })}
    </div>
  );
}

// ─── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCalendar({ markedDates, onSelectDate, selectedDate }) {
  const today = new Date().toISOString().slice(0, 10);
  const [viewYear, setViewYear] = useState(() => parseInt((selectedDate || today).slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => parseInt((selectedDate || today).slice(5, 7)) - 1);
  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const weeks = []; let day = 1 - firstDay;
  while (day <= daysInMonth) { const week = []; for (let i = 0; i < 7; i++, day++) week.push(day >= 1 && day <= daysInMonth ? day : null); weeks.push(week); }
  const fmtDate = d => `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const calColor = "#f0c060";
  return (
    <div style={{ background: "#161820", border: "1px solid #2a2d3e", borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", color: palette.textSub, padding: 4 }}><Icon d={icons.chevLeft} size={16} /></button>
        <div style={{ fontSize: 13, fontWeight: 800, color: calColor }}>{viewYear}年 {viewMonth + 1}月</div>
        <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", color: palette.textSub, padding: 4 }}><Icon d={icons.chevRight} size={16} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 }}>
        {["日","月","火","水","木","金","土"].map((d, i) => <div key={d} style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: i === 0 ? "#e06b8b" : i === 6 ? "#6baae0" : palette.textSub, padding: "2px 0" }}>{d}</div>)}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1 }}>
          {week.map((d, di) => { if (!d) return <div key={di} />; const ds = fmtDate(d); const hasLog = markedDates.has(ds); const isTdy = ds === today; const isSel = ds === selectedDate; return (
            <button key={di} onClick={() => onSelectDate(ds)} style={{ background: isSel ? calColor : isTdy ? calColor + "22" : "transparent", border: isTdy && !isSel ? `1px solid ${calColor}60` : "1px solid transparent", borderRadius: 6, padding: "3px 0", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 11, fontWeight: isSel || isTdy ? 800 : 400, color: isSel ? "#161820" : di === 0 ? "#e06b8b" : di === 6 ? "#6baae0" : palette.text }}>{d}</span>
              {hasLog && <div style={{ width: 4, height: 4, borderRadius: "50%", background: isSel ? "#161820" : calColor }} />}
            </button>
          ); })}
        </div>
      ))}
    </div>
  );
}

// ─── 日別ログ ──────────────────────────────────────────────────────────────────
const LOG_META = [
  { key: "records",  label: "検査記録",   color: palette.accent2, icon: icons.record   },
  { key: "oriental", label: "東洋医学",   color: palette.accent3, icon: icons.oriental },
  { key: "posture",  label: "姿勢記録",   color: palette.accent4, icon: icons.posture  },
  { key: "worries",  label: "お悩みログ", color: "#a8d8f7",       icon: icons.edit     },
  { key: "pain",     label: "痛みログ",   color: palette.accent5, icon: icons.pain,    isPain: true },
  { key: "habits",   label: "薬・習慣",   color: "#c8a8f7",       icon: icons.habits   },
];
const tlColor = "#f0c060";

function TimelinePage({ jumpDate, onClearJump, onSwitchTab }) {
  const loadAll = () => {
    const result = {};
    LOG_META.forEach(m => { const d = load(KEYS[m.key]); result[m.key] = m.isPain ? (d?.logs || []) : (Array.isArray(d) ? d : []); });
    return result;
  };
  const [allLogs, setAllLogs] = useState(loadAll);
  const [openDate, setOpenDate] = useState(null);
  const dayRefs = useRef({});

  const dateMap = {};
  LOG_META.forEach(m => { (allLogs[m.key] || []).forEach(item => { if (!item.date) return; if (!dateMap[item.date]) dateMap[item.date] = {}; if (!dateMap[item.date][m.key]) dateMap[item.date][m.key] = []; dateMap[item.date][m.key].push(item); }); });
  const allDates = Object.keys(dateMap).sort().reverse();
  const markedDates = new Set(allDates);

  useEffect(() => {
    if (!jumpDate) return;
    const nearest = allDates.length ? allDates.reduce((a, b) => Math.abs(new Date(b) - new Date(jumpDate)) < Math.abs(new Date(a) - new Date(jumpDate)) ? b : a) : null;
    if (nearest) { setOpenDate(nearest); setTimeout(() => dayRefs.current[nearest]?.scrollIntoView({ behavior: "smooth", block: "start" }), 120); }
    onClearJump?.();
  }, [jumpDate]);

  const monthGroups = {};
  allDates.forEach(d => { const ym = d.slice(0, 7); if (!monthGroups[ym]) monthGroups[ym] = []; monthGroups[ym].push(d); });
  const sortedMonths = Object.keys(monthGroups).sort().reverse();
  const dayLabel = d => ["日","月","火","水","木","金","土"][new Date(d).getDay()];
  const preview = item => item.title || item.name || item.type || (item.text ? item.text.slice(0, 28) + (item.text.length > 28 ? "…" : "") : "") || item.memo?.slice(0, 28) || "記録あり";

  const [calSel, setCalSel] = useState(null);
  const handleCalSel = ds => {
    setCalSel(ds);
    const nearest = allDates.length ? allDates.reduce((a, b) => Math.abs(new Date(b) - new Date(ds)) < Math.abs(new Date(a) - new Date(ds)) ? b : a) : null;
    if (nearest) { setOpenDate(nearest); setTimeout(() => dayRefs.current[nearest]?.scrollIntoView({ behavior: "smooth", block: "start" }), 80); }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}><MiniCalendar markedDates={markedDates} selectedDate={calSel} onSelectDate={handleCalSel} /></div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ background: palette.card, border: `1px solid ${palette.cardBorder}`, borderRadius: 10, padding: "8px 14px" }}>
          <div style={{ fontSize: 10, color: palette.textSub }}>記録のある日</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: tlColor }}>{allDates.length}<span style={{ fontSize: 11, fontWeight: 400 }}> 日</span></div>
        </div>
        {LOG_META.map(m => { const cnt = (allLogs[m.key] || []).length; if (!cnt) return null; return <div key={m.key} style={{ background: palette.card, border: `1px solid ${m.color}30`, borderRadius: 10, padding: "8px 14px" }}><div style={{ fontSize: 10, color: m.color }}>{m.label}</div><div style={{ fontSize: 18, fontWeight: 800, color: m.color }}>{cnt}<span style={{ fontSize: 11, fontWeight: 400 }}> 件</span></div></div>; })}
      </div>
      {allDates.length === 0 && <div style={{ textAlign: "center", color: palette.textSub, padding: 48 }}>まだ記録がありません。<br />各タブから記録を追加してください。</div>}
      {sortedMonths.map(ym => {
        const [y, m] = ym.split("-");
        return (
          <div key={ym} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: tlColor, letterSpacing: 1 }}>{y}年 {parseInt(m)}月</div>
              <div style={{ flex: 1, height: 1, background: tlColor + "30" }} />
            </div>
            {monthGroups[ym].map(date => {
              const dayLogs = dateMap[date];
              const cats = LOG_META.filter(meta => dayLogs[meta.key]);
              const isOpen = openDate === date;
              return (
                <div key={date} ref={el => dayRefs.current[date] = el} style={{ marginBottom: 6 }}>
                  <button onClick={() => setOpenDate(isOpen ? null : date)} style={{ width: "100%", background: isOpen ? tlColor + "14" : palette.card, border: `1px solid ${isOpen ? tlColor + "50" : palette.cardBorder}`, borderRadius: isOpen ? "10px 10px 0 0" : 10, padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left", transition: "all 0.15s" }}>
                    <div style={{ minWidth: 80 }}><span style={{ fontSize: 14, fontWeight: 800, color: isOpen ? tlColor : palette.text }}>{date.slice(5).replace("-", "/")}</span><span style={{ fontSize: 11, color: palette.textSub, marginLeft: 5 }}>{dayLabel(date)}</span></div>
                    <div style={{ flex: 1, display: "flex", gap: 5, flexWrap: "wrap" }}>{cats.map(meta => <span key={meta.key} style={{ background: meta.color + "22", color: meta.color, border: `1px solid ${meta.color}40`, borderRadius: 20, fontSize: 10, fontWeight: 700, padding: "1px 8px" }}>{meta.label}</span>)}</div>
                    <div style={{ color: isOpen ? tlColor : palette.textSub, transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}><Icon d={icons.chevRight} size={14} /></div>
                  </button>
                  {isOpen && (
                    <div style={{ background: "#12141e", border: `1px solid ${tlColor}40`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {cats.map(meta => {
                        const items = dayLogs[meta.key];
                        return (
                          <div key={meta.key} style={{ background: meta.color + "0d", border: `1px solid ${meta.color}35`, borderRadius: 8, overflow: "hidden" }}>
                            <div style={{ background: meta.color + "1a", padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                              <Icon d={meta.icon} size={12} color={meta.color} />
                              <span style={{ fontSize: 11, fontWeight: 800, color: meta.color }}>{meta.label}</span>
                              <span style={{ fontSize: 10, color: meta.color + "90", marginLeft: "auto" }}>{items.length}件</span>
                            </div>
                            {items.map((item, idx) => <div key={idx} style={{ padding: "7px 12px", borderTop: idx > 0 ? `1px solid ${meta.color}20` : "none", fontSize: 12, color: palette.text, lineHeight: 1.5 }}>{preview(item)}</div>)}
                            <button onClick={() => onSwitchTab?.(meta.key)} style={{ width: "100%", background: "none", border: "none", borderTop: `1px solid ${meta.color}25`, padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, color: meta.color, fontSize: 11, fontWeight: 700 }}>
                              {meta.label}のページへ <Icon d={icons.chevRight} size={12} color={meta.color} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [active, setActive] = useState("timeline");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [jumpDate, setJumpDate] = useState(null);
  const activeTab = tabConfig.find(t => t.key === active);

  return (
    <div style={{ background: palette.bg, minHeight: "100vh", color: palette.text, fontFamily: "'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" }}>
      <div style={{ background: palette.tabBg, borderBottom: `1px solid ${palette.cardBorder}`, padding: "10px 16px 0", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg,${palette.accent2},${palette.accent1})`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 16 }}>🏥</span></div>
            <div><div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1 }}>マイカルテ</div><div style={{ fontSize: 9, color: palette.textSub }}>My Health Record</div></div>
          </div>
          <button onClick={() => setHistoryOpen(true)} style={{ background: `linear-gradient(135deg,${historyPalette.accent},${historyPalette.accentSub})`, border: "none", borderRadius: 8, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
            <span style={{ fontSize: 12 }}>📋</span><span style={{ fontSize: 11, fontWeight: 800, color: "#1a1208" }}>既往歴</span>
          </button>
        </div>
        <div style={{ display: "flex", overflowX: "auto", gap: 2 }}>
          {tabConfig.map(tab => (
            <button key={tab.key} onClick={() => setActive(tab.key)} style={{ background: active === tab.key ? palette.card : "transparent", border: "none", borderBottom: active === tab.key ? `2px solid ${tab.color}` : "2px solid transparent", color: active === tab.key ? tab.color : palette.textSub, padding: "7px 10px", cursor: "pointer", fontSize: 11, fontWeight: active === tab.key ? 700 : 400, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", borderRadius: "6px 6px 0 0", transition: "all 0.15s" }}>
              <Icon d={tab.icon} size={12} color={active === tab.key ? tab.color : palette.textSub} />{tab.label}
            </button>
          ))}
        </div>
      </div>
      <HistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <div style={{ padding: 16, maxWidth: 600, margin: "0 auto" }}>
        <div style={{ height: 3, background: `linear-gradient(90deg,${activeTab.color},transparent)`, borderRadius: 2, marginBottom: 16 }} />
        {active === "timeline"
          ? <TimelinePage jumpDate={jumpDate} onClearJump={() => setJumpDate(null)} onSwitchTab={key => setActive(key)} />
          : active === "records"  ? <RecordsPage />
          : active === "oriental" ? <OrientalPage />
          : active === "posture"  ? <PosturePage />
          : active === "worries"  ? <WorriesPage />
          : active === "pain"     ? <PainPage />
          : <HabitsPage />
        }
      </div>
    </div>
  );
}
