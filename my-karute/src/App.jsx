import { useState, useRef, useEffect, useCallback } from "react";

const KEYS = {
  history: "karute_history", records: "karute_records", oriental: "karute_oriental",
  posture: "karute_posture", pain: "karute_pain", worries: "karute_worries", habits: "karute_habits",
};

// ─── IndexedDB ────────────────────────────────────────────────────────────────
const DB_NAME = "MyKaruteDB";
const DB_VERSION = 1;
const STORE = "data";

let dbInstance = null;

const getDB = () => new Promise((resolve, reject) => {
  if (dbInstance) { resolve(dbInstance); return; }
  const req = indexedDB.open(DB_NAME, DB_VERSION);
  req.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
  };
  req.onsuccess = (e) => { dbInstance = e.target.result; resolve(dbInstance); };
  req.onerror = () => reject(req.error);
});

const dbGet = async (key) => {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
};

const dbSet = async (key, val) => {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(val, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch { return false; }
};

// localStorageからIndexedDBへ移行
const migrateFromLocalStorage = async () => {
  for (const key of Object.values(KEYS)) {
    try {
      const existing = await dbGet(key);
      if (existing !== null) continue; // すでにDBにある
      const ls = localStorage.getItem(key);
      if (ls) {
        await dbSet(key, JSON.parse(ls));
        localStorage.removeItem(key);
      }
    } catch {}
  }
};

// バックアップ用（全データをオブジェクトで返す）
const exportAllData = async () => {
  const data = {};
  for (const [k, v] of Object.entries(KEYS)) {
    const d = await dbGet(v);
    if (d !== null) data[k] = d;
  }
  return data;
};

const importAllData = async (data) => {
  for (const [k, v] of Object.entries(KEYS)) {
    if (data[k] !== undefined) await dbSet(v, data[k]);
  }
};

// 画像を強力に圧縮（最大幅500px・品質0.5）で容量を最小化
const compressImage = (dataUrl) => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const maxW = 500;
    const scale = img.width > maxW ? maxW / img.width : 1;
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    resolve(canvas.toDataURL("image/jpeg", 0.5));
  };
  img.onerror = () => resolve(dataUrl);
  img.src = dataUrl;
});

// ─── 各ページ共通のデータ管理フック ──────────────────────────────────────────
function useKaruteData(key, defaultValue = []) {
  const [data, setData] = useState(defaultValue);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    dbGet(key).then(v => {
      if (v !== null) setData(v);
      setReady(true);
    });
  }, [key]);

  const saveData = useCallback(async (newData) => {
    const ok = await dbSet(key, newData);
    if (!ok) { alert("保存に失敗しました。"); return false; }
    setData(newData);
    return true;
  }, [key]);

  return [data, saveData, ready];
}

const Icon = ({ d, size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);
const icons = {
  history: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  record: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  oriental: "M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 0v20M2 12h20",
  posture: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  pain: "M12 2a10 10 0 100 20A10 10 0 0012 2zm-2 14.5v-9l6 4.5-6 4.5z",
  habits: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  plus: "M12 5v14M5 12h14",
  trash: "M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2",
  camera: "M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 17a4 4 0 100-8 4 4 0 000 8z",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  chart: "M18 20V10M12 20V4M6 20v-6",
  calendar: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  timeline: "M4 6h16M4 12h16M4 18h7",
  chevLeft: "M15 18l-6-6 6-6",
  chevRight: "M9 18l6-6-6-6",
  x: "M18 6L6 18M6 6l12 12",
  arrowUp: "M5 15l7-7 7 7",
  arrowDown: "M19 9l-7 7-7-7",
};

const palette = {
  bg: "#0f1117", card: "#1a1d27", cardBorder: "#2a2d3e",
  accent1: "#7c6af7", accent2: "#e06b8b", accent3: "#f7a86a",
  accent4: "#4ecdc4", accent5: "#6be0b0",
  text: "#e8eaf0", textSub: "#8890a4", tabBg: "#13151f",
};
const hp = { banner: "#221a0a", accent: "#e8a020", accentSub: "#c47c10", border: "#3a2e10", text: "#f5e6c0", textSub: "#a08850" };

const tabConfig = [
  { key: "timeline", label: "日別ログ",   color: "#f0c060",       icon: icons.timeline },
  { key: "records",  label: "検査記録",   color: palette.accent2, icon: icons.record   },
  { key: "oriental", label: "東洋医学",   color: palette.accent3, icon: icons.oriental },
  { key: "posture",  label: "姿勢記録",   color: palette.accent4, icon: icons.posture  },
  { key: "worries",  label: "お悩みログ", color: "#a8d8f7",       icon: icons.edit     },
  { key: "pain",     label: "痛みログ",   color: palette.accent5, icon: icons.pain     },
  { key: "habits",   label: "薬・習慣",   color: "#c8a8f7",       icon: icons.habits   },
];

const S = {
  card: { background: palette.card, border: `1px solid ${palette.cardBorder}`, borderRadius: 12, padding: 16, marginBottom: 12 },
  label: { fontSize: 11, color: palette.textSub, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  input: { width: "100%", boxSizing: "border-box", background: "#0f1117", border: `1px solid ${palette.cardBorder}`, borderRadius: 8, color: palette.text, padding: "8px 12px", fontSize: 14, outline: "none" },
  textarea: { width: "100%", boxSizing: "border-box", background: "#0f1117", border: `1px solid ${palette.cardBorder}`, borderRadius: 8, color: palette.text, padding: "8px 12px", fontSize: 14, outline: "none", resize: "vertical", minHeight: 80 },
  btn: (color) => ({ background: color, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }),
  tag: (color) => ({ display: "inline-block", background: color + "25", color, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 600, marginRight: 4, marginBottom: 4 }),
};

// ── ② 画像ビューア（タップで半画面・ピンチアウト・上下で記録間移動）──────────
function ImageViewer({ images, startIndex = 0, onClose, allRecords = null, recordIndex = 0, onRecordChange = null }) {
  const [idx, setIdx] = useState(startIndex);
  const [recIdx, setRecIdx] = useState(recordIndex);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const lastDist = useRef(null);
  const dragStart = useRef(null);
  const lastOff = useRef({ x: 0, y: 0 });
  const touchStartY = useRef(null);

  // 現在表示中の画像リスト（上下移動対応）
  const currentImages = allRecords ? (allRecords[recIdx]?.images || []) : images;
  const currentRecordLabel = allRecords ? allRecords[recIdx]?.date?.replace(/-/g, "/") : null;

  const reset = () => { setScale(1); setOffset({ x: 0, y: 0 }); lastOff.current = { x: 0, y: 0 }; };

  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      lastDist.current = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    } else if (e.touches.length === 1) {
      touchStartY.current = e.touches[0].clientY;
      if (scale > 1) {
        dragStart.current = { x: e.touches[0].clientX - lastOff.current.x, y: e.touches[0].clientY - lastOff.current.y };
      }
    }
  };
  const onTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 2 && lastDist.current) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      setScale(ns => Math.min(5, Math.max(1, ns * (dist / lastDist.current))));
      lastDist.current = dist;
    } else if (e.touches.length === 1 && dragStart.current && scale > 1) {
      const nx = e.touches[0].clientX - dragStart.current.x;
      const ny = e.touches[0].clientY - dragStart.current.y;
      setOffset({ x: nx, y: ny });
      lastOff.current = { x: nx, y: ny };
    }
  };
  const onTouchEnd = (e) => {
    lastDist.current = null;
    dragStart.current = null;
    // 上下スワイプで記録間移動（scale=1のとき）
    if (scale === 1 && touchStartY.current !== null && allRecords) {
      const dy = (e.changedTouches[0]?.clientY || 0) - touchStartY.current;
      if (Math.abs(dy) > 60) {
        if (dy < 0 && recIdx < allRecords.length - 1) { setRecIdx(r => r + 1); setIdx(0); reset(); }
        if (dy > 0 && recIdx > 0) { setRecIdx(r => r - 1); setIdx(0); reset(); }
      }
    }
    touchStartY.current = null;
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ position: "absolute", top: 12, right: 16, zIndex: 10, display: "flex", gap: 8 }}>
        {scale > 1 && <button onClick={e => { e.stopPropagation(); reset(); }} style={{ background: "#ffffff30", border: "none", borderRadius: 8, color: "#fff", padding: "6px 12px", cursor: "pointer", fontSize: 12 }}>リセット</button>}
        <button onClick={onClose} style={{ background: "#ffffff20", border: "none", borderRadius: 8, color: "#fff", padding: "6px 10px", cursor: "pointer" }}><Icon d={icons.x} size={18} /></button>
      </div>

      {/* 上下移動ヒント・記録ラベル */}
      {allRecords && allRecords.length > 1 && (
        <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          {recIdx > 0 && <div style={{ color: "#ffffff60", fontSize: 11 }}>↑ 前の記録</div>}
          <div style={{ color: "#ffffffcc", fontSize: 12, fontWeight: 700 }}>{currentRecordLabel} ({recIdx + 1}/{allRecords.length})</div>
          {recIdx < allRecords.length - 1 && <div style={{ color: "#ffffff60", fontSize: 11 }}>↓ 次の記録</div>}
        </div>
      )}
      {currentImages.length > 1 && <div style={{ position: "absolute", top: allRecords ? 60 : 12, left: "50%", transform: "translateX(-50%)", color: "#ffffff80", fontSize: 12 }}>{idx + 1} / {currentImages.length}</div>}

      <div style={{ width: "100%", maxWidth: 600, height: "55vh", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", touchAction: "none" }}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onClick={e => e.stopPropagation()}>
        {currentImages.length > 0
          ? <img src={currentImages[idx]} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)`, userSelect: "none" }} />
          : <div style={{ color: "#ffffff50", fontSize: 14 }}>この記録に画像はありません</div>
        }
      </div>

      {/* 上下ボタン（記録間） */}
      {allRecords && allRecords.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => { setRecIdx(r => Math.max(0, r - 1)); setIdx(0); reset(); }} disabled={recIdx === 0}
            style={{ ...S.btn(palette.cardBorder), padding: "5px 14px", opacity: recIdx === 0 ? 0.3 : 1 }}>↑ 前</button>
          <button onClick={() => { setRecIdx(r => Math.min(allRecords.length - 1, r + 1)); setIdx(0); reset(); }} disabled={recIdx === allRecords.length - 1}
            style={{ ...S.btn(palette.cardBorder), padding: "5px 14px", opacity: recIdx === allRecords.length - 1 ? 0.3 : 1 }}>↓ 次</button>
        </div>
      )}

      {/* 左右ボタン（同一記録内の画像） */}
      {currentImages.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 6 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => { setIdx(i => Math.max(0, i - 1)); reset(); }} style={{ ...S.btn(palette.cardBorder), padding: "5px 14px" }} disabled={idx === 0}>◀</button>
          <button onClick={() => { setIdx(i => Math.min(currentImages.length - 1, i + 1)); reset(); }} style={{ ...S.btn(palette.cardBorder), padding: "5px 14px" }} disabled={idx === currentImages.length - 1}>▶</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginTop: 8 }} onClick={e => e.stopPropagation()}>
        {currentImages.map((img, i) => <img key={i} src={img} alt="" onClick={() => { setIdx(i); reset(); }} style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, border: `2px solid ${i === idx ? "#fff" : "transparent"}`, cursor: "pointer" }} />)}
      </div>
    </div>
  );
}

function ImageGrid({ images, onRemove, maxImages = 4 }) {
  const [viewerIdx, setViewerIdx] = useState(null);
  return (
    <>
      {viewerIdx !== null && <ImageViewer images={images} startIndex={viewerIdx} onClose={() => setViewerIdx(null)} />}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        {images.map((img, i) => (
          <div key={i} style={{ position: "relative" }}>
            <img src={img} alt="" onClick={() => setViewerIdx(i)} style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: `1px solid ${palette.cardBorder}`, cursor: "pointer" }} />
            {onRemove && <button onClick={() => onRemove(i)} style={{ position: "absolute", top: -4, right: -4, background: palette.accent4, border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", color: "#fff", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>}
          </div>
        ))}
        {images.length < maxImages && <div style={{ width: 72, height: 72, borderRadius: 8, border: `1px dashed ${palette.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "center", color: palette.textSub, fontSize: 10, textAlign: "center", padding: 4 }}>最大{maxImages}枚</div>}
      </div>
    </>
  );
}

function ImageUpload({ onUpload, label = "写真を追加", disabled = false }) {
  const ref = useRef();
  const handleChange = async (e) => {
    const files = Array.from(e.target.files);
    for (const f of files) {
      const reader = new FileReader();
      const dataUrl = await new Promise(res => { reader.onload = ev => res(ev.target.result); reader.readAsDataURL(f); });
      const compressed = await compressImage(dataUrl);
      onUpload(compressed);
    }
    e.target.value = "";
  };
  return (
    <>
      <input type="file" accept="image/*" multiple ref={ref} style={{ display: "none" }} onChange={handleChange} />
      <button style={{ ...S.btn(disabled ? palette.cardBorder : palette.accent2), fontSize: 12, padding: "6px 12px", opacity: disabled ? 0.5 : 1 }} onClick={() => !disabled && ref.current.click()} disabled={disabled}>
        <Icon d={icons.camera} size={14} /> {label}
      </button>
    </>
  );
}

// ── ③ 既往歴（1列・タップ展開・編集）──────────────────────────────────────────
function HistoryPanel({ open, onClose }) {
  const [items, saveItems, ready] = useKaruteData(KEYS.history, []);
  const [form, setForm] = useState({ name: "", year: "", status: "治療中", memo: "" });
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const sc = { "治療中": "#e05050", "経過観察": hp.accent, "完治": "#60c080" };
  const add = () => { if (!form.name) return; saveItems([{ ...form, id: Date.now() }, ...items]); setForm({ name: "", year: "", status: "治療中", memo: "" }); setAdding(false); };
  const startEdit = (item) => { setEditId(item.id); setEditForm({ ...item }); setExpandedId(item.id); };
  const saveEdit = () => { saveItems(items.map(x => x.id === editId ? { ...editForm } : x)); setEditId(null); };
  const Hi = { ...S.input, background: "#120e04", border: `1px solid ${hp.border}`, color: hp.text };
  const Ht = { ...S.textarea, background: "#120e04", border: `1px solid ${hp.border}`, color: hp.text };
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", display: "flex", flexDirection: "column" }} onClick={onClose}>
      <div style={{ background: hp.banner, borderBottom: `2px solid ${hp.accent}`, borderRadius: "0 0 20px 20px", maxWidth: 600, width: "100%", margin: "0 auto", maxHeight: "85vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
        <div style={{ background: "linear-gradient(135deg,#2a1e06,#1a1208)", padding: "16px 20px 12px", borderBottom: `1px solid ${hp.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${hp.accent},${hp.accentSub})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📋</div>
            <div><div style={{ fontSize: 16, fontWeight: 800, color: hp.text }}>既往歴</div><div style={{ fontSize: 11, color: hp.textSub }}>これまでに診断・治療した病気</div></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...S.btn(hp.accent), fontSize: 12, padding: "6px 12px", color: "#1a1208" }} onClick={() => setAdding(!adding)}><Icon d={icons.plus} size={13} color="#1a1208" /> 追加</button>
            <button onClick={onClose} style={{ background: hp.border, border: "none", borderRadius: 8, color: hp.textSub, fontSize: 18, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        </div>
        <div style={{ padding: 16 }}>
          {adding && (
            <div style={{ background: "#160f03", border: `1px solid ${hp.accent}60`, borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div><div style={{ ...S.label, color: hp.textSub }}>病名 *</div><input style={Hi} placeholder="高血圧など" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div><div style={{ ...S.label, color: hp.textSub }}>診断年</div><input style={Hi} placeholder="2020" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} /></div>
              </div>
              <div style={{ marginBottom: 10 }}><div style={{ ...S.label, color: hp.textSub }}>状態</div><div style={{ display: "flex", gap: 8 }}>{["治療中","経過観察","完治"].map(s => <button key={s} onClick={() => setForm(p => ({ ...p, status: s }))} style={{ ...S.btn(form.status === s ? sc[s] : hp.border), fontSize: 12, padding: "5px 12px" }}>{s}</button>)}</div></div>
              <div style={{ marginBottom: 10 }}><div style={{ ...S.label, color: hp.textSub }}>メモ</div><textarea style={Ht} value={form.memo} onChange={e => setForm(p => ({ ...p, memo: e.target.value }))} /></div>
              <div style={{ display: "flex", gap: 8 }}><button style={{ ...S.btn(hp.accent), color: "#1a1208" }} onClick={add}>保存</button><button style={S.btn(hp.border)} onClick={() => setAdding(false)}>キャンセル</button></div>
            </div>
          )}
          {items.length === 0 && !adding && <div style={{ textAlign: "center", color: hp.textSub, padding: 40 }}>病歴がまだ登録されていません</div>}
          {items.map(item => {
            const isExpanded = expandedId === item.id;
            const isEditing = editId === item.id;
            return (
              <div key={item.id} style={{ background: "#160f03", border: `1px solid ${hp.border}`, borderLeft: `3px solid ${sc[item.status] || hp.accent}`, borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", cursor: "pointer", gap: 8 }} onClick={() => { if (!isEditing) setExpandedId(isExpanded ? null : item.id); }}>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: hp.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</span>
                  <span style={{ ...S.tag(sc[item.status] || hp.accent), fontSize: 10, padding: "1px 8px", marginBottom: 0 }}>{item.status}</span>
                  <div style={{ transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}><Icon d={icons.chevRight} size={13} color={hp.textSub} /></div>
                </div>
                {isExpanded && (
                  <div style={{ padding: "0 12px 12px", borderTop: `1px solid ${hp.border}` }}>
                    {isEditing ? (
                      <div style={{ paddingTop: 10 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                          <div><div style={{ ...S.label, color: hp.textSub }}>病名</div><input style={Hi} value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} /></div>
                          <div><div style={{ ...S.label, color: hp.textSub }}>診断年</div><input style={Hi} value={editForm.year} onChange={e => setEditForm(p => ({ ...p, year: e.target.value }))} /></div>
                        </div>
                        <div style={{ marginBottom: 10 }}><div style={{ ...S.label, color: hp.textSub }}>状態</div><div style={{ display: "flex", gap: 6 }}>{["治療中","経過観察","完治"].map(s => <button key={s} onClick={() => setEditForm(p => ({ ...p, status: s }))} style={{ ...S.btn(editForm.status === s ? sc[s] : hp.border), fontSize: 11, padding: "4px 10px" }}>{s}</button>)}</div></div>
                        <div style={{ marginBottom: 10 }}><div style={{ ...S.label, color: hp.textSub }}>メモ</div><textarea style={Ht} value={editForm.memo} onChange={e => setEditForm(p => ({ ...p, memo: e.target.value }))} /></div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button style={{ ...S.btn(hp.accent), fontSize: 12, padding: "5px 14px", color: "#1a1208" }} onClick={saveEdit}>保存</button>
                          <button style={{ ...S.btn(hp.border), fontSize: 12, padding: "5px 14px" }} onClick={() => setEditId(null)}>キャンセル</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ paddingTop: 8 }}>
                        {item.year && <div style={{ color: hp.textSub, fontSize: 12, marginBottom: 4 }}>📅 {item.year}年〜</div>}
                        {item.memo && <div style={{ color: hp.text, fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>{item.memo}</div>}
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => startEdit(item)} style={{ ...S.btn(hp.border), fontSize: 11, padding: "4px 12px" }}><Icon d={icons.edit} size={12} /> 編集</button>
                          <button onClick={() => saveItems(items.filter(x => x.id !== item.id))} style={{ background: "none", border: `1px solid #e0505040`, borderRadius: 8, fontSize: 11, padding: "4px 12px", cursor: "pointer", color: "#e05050", display: "flex", alignItems: "center", gap: 4 }}><Icon d={icons.trash} size={12} /> 削除</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── 検査記録（編集・コンパクト・横スライド比較）──────────────────────────────
function RecordForm({ form, setForm, onSave, onCancel, saveLabel = "保存" }) {
  const c = palette.accent2;
  return (
    <div style={{ ...S.card, borderColor: c + "60", marginBottom: 16 }}>
      {/* 1行目: 日付・種別・タイトル横並び */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <div><div style={S.label}>日付 *</div><input type="date" style={S.input} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
        <div><div style={S.label}>種別</div>
          <select style={S.input} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
            {["採血","レントゲン","MRI/CT","超音波","心電図","尿検査","その他"].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 8 }}><input style={S.input} placeholder="タイトル（例：一般健康診断）" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
      <div style={{ marginBottom: 8 }}><textarea style={{ ...S.textarea, minHeight: 60 }} placeholder="結果・メモ" value={form.memo} onChange={e => setForm(p => ({ ...p, memo: e.target.value }))} /></div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ ...S.label, marginBottom: 0 }}>写真（最大4枚）</div>
          <ImageUpload disabled={form.images.length >= 4} onUpload={img => setForm(p => ({ ...p, images: [...p.images, img] }))} label="追加" />
        </div>
        <ImageGrid images={form.images} onRemove={i => setForm(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }))} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={S.btn(c)} onClick={onSave}>{saveLabel}</button>
        <button style={S.btn(palette.cardBorder)} onClick={onCancel}>キャンセル</button>
      </div>
    </div>
  );
}

function RecordsList({ items, onEdit, onDelete }) {
  const c = palette.accent2;
  const [viewer, setViewer] = useState(null);
  const recordsWithImages = items.filter(item => item.images && item.images.length > 0);

  if (items.length === 0) return <div style={{ textAlign: "center", color: palette.textSub, padding: 40 }}>検査記録がまだありません</div>;

  return (
    <>
      {viewer !== null && (
        <ImageViewer
          images={recordsWithImages[viewer]?.images || []}
          startIndex={0}
          onClose={() => setViewer(null)}
          allRecords={recordsWithImages}
          recordIndex={viewer}
          onRecordChange={setViewer}
        />
      )}
      {items.map(item => {
        const rwIdx = recordsWithImages.findIndex(r => r.id === item.id);
        return (
          <div key={item.id} style={{ ...S.card, display: "flex", flexDirection: "column", gap: 8 }}>
            {/* ヘッダー行 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: c, fontSize: 13, fontWeight: 700 }}>{item.date.replace(/-/g, "/")}</span>
                <span style={S.tag(c)}>{item.type}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => onEdit(item)} style={{ background: "none", border: `1px solid ${palette.cardBorder}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", color: palette.textSub, fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                  <Icon d={icons.edit} size={12} /> 編集
                </button>
                <button onClick={() => onDelete(item.id)} style={{ background: "none", border: "none", cursor: "pointer", color: palette.accent4 }}>
                  <Icon d={icons.trash} size={16} />
                </button>
              </div>
            </div>
            {item.title && <div style={{ fontWeight: 700, color: palette.text, fontSize: 15 }}>{item.title}</div>}
            {item.images && item.images.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {item.images.map((img, i) => (
                  <img key={i} src={img} alt=""
                    onClick={() => rwIdx >= 0 && setViewer(rwIdx)}
                    style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: `1px solid ${palette.cardBorder}` }} />
                ))}
              </div>
            )}
            {item.memo && <div style={{ color: palette.textSub, fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{item.memo}</div>}
          </div>
        );
      })}
      {items.length > 1 && recordsWithImages.length > 1 && (
        <div style={{ textAlign: "center", color: palette.textSub, fontSize: 11, marginBottom: 8 }}>
          画像タップ → 上下スワイプで記録間を移動できます
        </div>
      )}
    </>
  );
}

function RecordsPage() {
  const [items, saveItems, ready] = useKaruteData(KEYS.records, []);
  const [adding, setAdding] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ date: "", type: "採血", title: "", memo: "", images: [] });
  const [editForm, setEditForm] = useState({});

  const add = async () => {
    if (!form.date) return;
    const newItems = [{ ...form, id: Date.now() }, ...items].sort((a, b) => b.date.localeCompare(a.date));
    await saveItems(newItems);
    setForm({ date: "", type: "採血", title: "", memo: "", images: [] });
    setAdding(false);
  };
  const startEdit = (item) => { setEditItem(item); setEditForm({ ...item }); setAdding(false); };
  const saveEdit = async () => {
    const newItems = items.map(x => x.id === editItem.id ? { ...editForm } : x).sort((a, b) => b.date.localeCompare(a.date));
    await saveItems(newItems);
    setEditItem(null);
  };
  const deleteItem = (id) => saveItems(items.filter(x => x.id !== id));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div><div style={{ fontSize: 18, fontWeight: 700, color: palette.text }}>検査記録</div><div style={{ fontSize: 12, color: palette.textSub }}>採血・画像・検査結果の時系列</div></div>
        <button style={S.btn(palette.accent2)} onClick={() => { setAdding(!adding); setEditItem(null); }}><Icon d={icons.plus} size={14} /> 追加</button>
      </div>

      {adding && (
        <RecordForm form={form} setForm={setForm} onSave={add} onCancel={() => setAdding(false)} saveLabel="保存" />
      )}

      {editItem && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: palette.accent2, marginBottom: 6, fontWeight: 700 }}>✏️ 編集中: {editItem.date.replace(/-/g, "/")} {editItem.title}</div>
          <RecordForm form={editForm} setForm={setEditForm} onSave={saveEdit} onCancel={() => setEditItem(null)} saveLabel="更新" />
        </div>
      )}

      <RecordsList items={items} onEdit={startEdit} onDelete={deleteItem} />
    </div>
  );
}

// ── 東洋医学フォーム（OrientalPageの外に定義してinputバグを防ぐ）────────────
const orientalFields = [{ key: "tongue", label: "舌診", ph: "色・形・苔の状態" }, { key: "pulse", label: "脈診", ph: "脈の状態" }, { key: "symptoms", label: "主訴・証", ph: "気血水・五行のバランスなど" }, { key: "treatment", label: "治療内容", ph: "ツボ、施術内容" }, { key: "memo", label: "メモ", ph: "体調変化など" }];

function OrientalFormBlock({ f, setF, onSave, onCancel, label }) {
  const c = palette.accent3;
  return (
    <div style={{ ...S.card, borderColor: c + "60", marginBottom: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div><div style={S.label}>日付 *</div><input type="date" style={S.input} value={f.date} onChange={e => setF(p => ({ ...p, date: e.target.value }))} /></div>
        <div><div style={S.label}>施術者・病院</div><input style={S.input} placeholder="○○鍼灸院" value={f.practitioner} onChange={e => setF(p => ({ ...p, practitioner: e.target.value }))} /></div>
      </div>
      {orientalFields.map(fd => <div key={fd.key} style={{ marginBottom: 10 }}><div style={S.label}>{fd.label}</div><textarea style={{ ...S.textarea, minHeight: 50 }} placeholder={fd.ph} value={f[fd.key] || ""} onChange={e => setF(p => ({ ...p, [fd.key]: e.target.value }))} /></div>)}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ ...S.label, marginBottom: 0 }}>写真（最大4枚・複数同時選択可）</div>
          <ImageUpload disabled={f.images.length >= 4} onUpload={img => setF(p => p.images.length < 4 ? { ...p, images: [...p.images, img] } : p)} label="追加" />
        </div>
        <ImageGrid images={f.images} onRemove={i => setF(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }))} />
      </div>
      <div style={{ display: "flex", gap: 8 }}><button style={S.btn(c)} onClick={onSave}>{label}</button><button style={S.btn(palette.cardBorder)} onClick={onCancel}>キャンセル</button></div>
    </div>
  );
}

// ── 東洋医学（編集対応・複数枚同時選択）──────────────────────────────────────
function OrientalPage() {
  const [items, saveItems, ready] = useKaruteData(KEYS.oriental, []);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ date: "", practitioner: "", tongue: "", pulse: "", symptoms: "", treatment: "", memo: "", images: [] });
  const [editForm, setEditForm] = useState({});

  const c = palette.accent3;
  const emptyForm = { date: "", practitioner: "", tongue: "", pulse: "", symptoms: "", treatment: "", memo: "", images: [] };

  const add = () => { if (!form.date) return; saveItems([{ ...form, id: Date.now() }, ...items].sort((a, b) => b.date.localeCompare(a.date))); setForm(emptyForm); setAdding(false); };
  const startEdit = (item) => { setEditId(item.id); setEditForm({ ...item }); setAdding(false); };
  const saveEdit = () => { saveItems(items.map(x => x.id === editId ? { ...editForm } : x).sort((a, b) => b.date.localeCompare(a.date))); setEditId(null); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div><div style={{ fontSize: 18, fontWeight: 700, color: palette.text }}>東洋医学記録</div><div style={{ fontSize: 12, color: palette.textSub }}>舌診・脈診・治療の時系列</div></div>
        <button style={S.btn(c)} onClick={() => { setAdding(!adding); setEditId(null); }}><Icon d={icons.plus} size={14} /> 追加</button>
      </div>
      {adding && <OrientalFormBlock f={form} setF={setForm} onSave={add} onCancel={() => setAdding(false)} label="保存" />}
      {editId && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 12, color: c, fontWeight: 700, marginBottom: 4 }}>✏️ 編集中</div><OrientalFormBlock f={editForm} setF={setEditForm} onSave={saveEdit} onCancel={() => setEditId(null)} label="更新" /></div>}
      {items.length === 0 && !adding && <div style={{ textAlign: "center", color: palette.textSub, padding: 40 }}>東洋医学の記録がまだありません</div>}
      {items.map(item => (
        <div key={item.id} style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ color: c, fontSize: 12, fontWeight: 700 }}>{item.date.replace(/-/g, "/")}</span>
                {item.practitioner && <span style={S.tag(c)}>{item.practitioner}</span>}
              </div>
              {[["舌診",item.tongue],["脈診",item.pulse],["証",item.symptoms],["治療",item.treatment],["メモ",item.memo]].filter(x=>x[1]).map(x => <div key={x[0]} style={{ marginBottom: 6 }}><span style={{ color: c, fontSize: 11, fontWeight: 700 }}>{x[0]} </span><span style={{ color: palette.textSub, fontSize: 13 }}>{x[1]}</span></div>)}
              {item.images && item.images.length > 0 && <ImageGrid images={item.images} />}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <button onClick={() => startEdit(item)} style={{ background: "none", border: `1px solid ${palette.cardBorder}`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: palette.textSub }}><Icon d={icons.edit} size={13} /></button>
              <button onClick={() => saveItems(items.filter(x => x.id !== item.id))} style={{ background: "none", border: "none", cursor: "pointer", color: palette.accent4 }}><Icon d={icons.trash} size={15} /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 姿勢フォーム（PosturePageの外に定義してinputバグを防ぐ）──────────────────
function PostureFormBlock({ f, setF, onSave, onCancel, label }) {
  const c = palette.accent4;
  return (
    <div style={{ ...S.card, borderColor: c + "60", marginBottom: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div><div style={S.label}>日付 *</div><input type="date" style={S.input} value={f.date} onChange={e => setF(p => ({ ...p, date: e.target.value }))} /></div>
        <div><div style={S.label}>場所</div><input style={S.input} placeholder="○○整骨院" value={f.place} onChange={e => setF(p => ({ ...p, place: e.target.value }))} /></div>
      </div>
      <div style={{ marginBottom: 10 }}><div style={S.label}>メモ</div><textarea style={{ ...S.textarea, minHeight: 50 }} value={f.memo} onChange={e => setF(p => ({ ...p, memo: e.target.value }))} /></div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <div style={{ ...S.label, marginBottom: 0 }}>姿勢写真（最大4枚・複数同時選択可）</div>
          <ImageUpload disabled={f.images.length >= 4} onUpload={img => setF(p => p.images.length < 4 ? { ...p, images: [...p.images, img] } : p)} label="追加" />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {f.images.map((img, i) => (
            <div key={i} style={{ position: "relative" }}>
              <img src={img} alt="" style={{ width: 100, height: 130, objectFit: "cover", borderRadius: 8 }} />
              <button onClick={() => setF(p => ({ ...p, images: p.images.filter((_, j) => j !== i) }))} style={{ position: "absolute", top: -4, right: -4, background: c, border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", color: "#fff", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}><button style={S.btn(c)} onClick={onSave}>{label}</button><button style={S.btn(palette.cardBorder)} onClick={onCancel}>キャンセル</button></div>
    </div>
  );
}

// ── 姿勢記録（編集対応・大きい画像・複数同時選択）──────────────────────────
function PosturePage() {
  const [items, saveItems, ready] = useKaruteData(KEYS.posture, []);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ date: "", place: "", memo: "", images: [] });
  const [editForm, setEditForm] = useState({});
  const [viewer, setViewer] = useState(null);

  const c = palette.accent4;
  const emptyForm = { date: "", place: "", memo: "", images: [] };

  const add = () => { if (!form.date) return; saveItems([{ ...form, id: Date.now() }, ...items].sort((a, b) => b.date.localeCompare(a.date))); setForm(emptyForm); setAdding(false); };
  const startEdit = (item) => { setEditId(item.id); setEditForm({ ...item }); setAdding(false); };
  const saveEdit = () => { saveItems(items.map(x => x.id === editId ? { ...editForm } : x).sort((a, b) => b.date.localeCompare(a.date))); setEditId(null); };

  const recordsWithImages = items.filter(x => x.images && x.images.length > 0);

  return (
    <div>
      {viewer !== null && (
        <ImageViewer
          images={recordsWithImages[viewer]?.images || []}
          startIndex={0}
          onClose={() => setViewer(null)}
          allRecords={recordsWithImages}
          recordIndex={viewer}
        />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div><div style={{ fontSize: 18, fontWeight: 700, color: palette.text }}>姿勢記録</div><div style={{ fontSize: 12, color: palette.textSub }}>体操教室・整骨院での姿勢写真</div></div>
        <button style={S.btn(c)} onClick={() => { setAdding(!adding); setEditId(null); }}><Icon d={icons.plus} size={14} /> 追加</button>
      </div>
      {adding && <PostureFormBlock f={form} setF={setForm} onSave={add} onCancel={() => setAdding(false)} label="保存" />}
      {editId && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 12, color: c, fontWeight: 700, marginBottom: 4 }}>✏️ 編集中</div><PostureFormBlock f={editForm} setF={setEditForm} onSave={saveEdit} onCancel={() => setEditId(null)} label="更新" /></div>}
      {items.map(item => {
        const recordsWithImages = items.filter(x => x.images && x.images.length > 0);
        const rwIdx = recordsWithImages.findIndex(r => r.id === item.id);
        return (
          <div key={item.id} style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: c, fontWeight: 700, fontSize: 13 }}>{item.date.replace(/-/g, "/")}</span>
                  {item.place && <span style={S.tag(c)}>{item.place}</span>}
                </div>
                {item.memo && <div style={{ color: palette.textSub, fontSize: 12, marginTop: 4 }}>{item.memo}</div>}
              </div>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => startEdit(item)} style={{ background: "none", border: `1px solid ${palette.cardBorder}`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: palette.textSub }}><Icon d={icons.edit} size={13} /></button>
                <button onClick={() => saveItems(items.filter(x => x.id !== item.id))} style={{ background: "none", border: "none", cursor: "pointer", color: c }}><Icon d={icons.trash} size={15} /></button>
              </div>
            </div>
            {/* 横スワイプで画像移動 */}
            {item.images && item.images.length > 0 && (
              <div style={{ overflowX: "auto", display: "flex", gap: 8, scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch", paddingBottom: 4 }}>
                {item.images.map((img, i) => (
                  <img key={i} src={img} alt=""
                    onClick={() => rwIdx >= 0 && setViewer(rwIdx)}
                    style={{ width: 140, height: 180, objectFit: "cover", borderRadius: 8, flexShrink: 0, scrollSnapAlign: "start", cursor: "pointer", border: `1px solid ${palette.cardBorder}` }} />
                ))}
              </div>
            )}
            {item.images && item.images.length > 1 && (
              <div style={{ fontSize: 10, color: palette.textSub, textAlign: "center", marginTop: 2 }}>← スワイプで移動 ({item.images.length}枚)</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── お悩みログ ──────────────────────────────────────────────────────────────────
function WorriesPage() {
  const [items, saveItems, ready] = useKaruteData(KEYS.worries, []);
  const [text, setText] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [expanded, setExpanded] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editText, setEditText] = useState("");
  const wc = "#a8d8f7";
  const add = () => { if (!text.trim()) return; saveItems([{ id: Date.now(), date, text: text.trim() }, ...items].sort((a, b) => b.date.localeCompare(a.date))); setText(""); };
  const saveEdit = id => { saveItems(items.map(x => x.id === id ? { ...x, text: editText } : x)); setEditId(null); };
  const grouped = {};
  items.forEach(item => { const ym = item.date.slice(0, 7); if (!grouped[ym]) grouped[ym] = []; grouped[ym].push(item); });
  const sortedYM = Object.keys(grouped).sort().reverse();
  return (
    <div>
      <div style={{ marginBottom: 16 }}><div style={{ fontSize: 18, fontWeight: 700, color: palette.text }}>今のお悩みログ</div><div style={{ fontSize: 12, color: palette.textSub }}>体調・気分・生活の気になることを自由に記録</div></div>
      <div style={{ ...S.card, borderColor: wc + "50", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 10, alignItems: "center" }}>
          <div style={{ flex: 1 }}><div style={S.label}>日付</div><input type="date" style={S.input} value={date} onChange={e => setDate(e.target.value)} /></div>
          <div style={{ paddingTop: 18 }}><button style={{ ...S.btn(wc), color: "#0d1a25", fontWeight: 800, padding: "8px 18px" }} onClick={add}>記録する</button></div>
        </div>
        <textarea style={{ ...S.textarea, minHeight: 100, borderColor: wc + "40", lineHeight: 1.8 }} placeholder={"今日の体調や気になること、なんでも…\n例）最近胃もたれしやすい、疲れが取れない"} value={text} onChange={e => setText(e.target.value)} />
      </div>
      {sortedYM.length === 0 && <div style={{ textAlign: "center", color: palette.textSub, padding: 40 }}>お悩みの記録がまだありません</div>}
      {sortedYM.map(ym => {
        const [y, m] = ym.split("-");
        return (
          <div key={ym} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: wc, letterSpacing: 1, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: wc }} />{y}年 {parseInt(m)}月<div style={{ flex: 1, height: 1, background: wc + "30" }} />
            </div>
            {grouped[ym].map(item => (
              <div key={item.id} style={{ ...S.card, borderLeft: `3px solid ${wc}50`, cursor: editId === item.id ? "default" : "pointer", marginBottom: 8 }} onClick={() => editId !== item.id && setExpanded(expanded === item.id ? null : item.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: 11, color: wc, fontWeight: 700 }}>{item.date.replace(/-/g, "/")}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={e => { e.stopPropagation(); setEditId(item.id); setEditText(item.text); setExpanded(item.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: palette.textSub, padding: 2 }}><Icon d={icons.edit} size={14} /></button>
                    <button onClick={e => { e.stopPropagation(); saveItems(items.filter(x => x.id !== item.id)); }} style={{ background: "none", border: "none", cursor: "pointer", color: palette.accent4 + "90", padding: 2 }}><Icon d={icons.trash} size={14} /></button>
                  </div>
                </div>
                {editId === item.id ? (
                  <div style={{ marginTop: 8 }} onClick={e => e.stopPropagation()}>
                    <textarea style={{ ...S.textarea, minHeight: 80, borderColor: wc + "60" }} value={editText} onChange={e => setEditText(e.target.value)} />
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <button style={{ ...S.btn(wc), fontSize: 12, padding: "5px 14px", color: "#0d1a25" }} onClick={() => saveEdit(item.id)}>保存</button>
                      <button style={{ ...S.btn(palette.cardBorder), fontSize: 12, padding: "5px 14px" }} onClick={() => setEditId(null)}>キャンセル</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: palette.text, fontSize: 14, marginTop: 6, lineHeight: 1.75, whiteSpace: "pre-wrap", ...(expanded !== item.id && item.text.length > 80 ? { overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } : {}) }}>{item.text}</div>
                )}
                {expanded !== item.id && item.text.length > 80 && editId !== item.id && <div style={{ fontSize: 11, color: wc, marginTop: 4 }}>続きを見る…</div>}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ── 痛みログ記録一覧（編集対応）─────────────────────────────────────────────
function PainLogList({ logs, setLogs, painTypes, colors }) {
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  return (
    <div>
      {logs.slice(0, 50).map(item => {
        const ci = painTypes.indexOf(item.type); const c = colors[ci % colors.length] || palette.accent5;
        const isEditing = editId === item.id;
        return (
          <div key={item.id} style={S.card}>
            {isEditing ? (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div><div style={S.label}>日付</div><input type="date" style={S.input} value={editForm.date} onChange={e => setEditForm(p => ({ ...p, date: e.target.value }))} /></div>
                  <div><div style={S.label}>種類</div><select style={S.input} value={editForm.type} onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))}>{painTypes.map(t => <option key={t}>{t}</option>)}</select></div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: palette.textSub }}>← 軽い</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: levelColors[editForm.level - 1] }}>Lv {editForm.level}</span>
                    <span style={{ fontSize: 11, color: palette.textSub }}>辛い →</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[1,2,3,4,5].map(lv => (
                      <button key={lv} onClick={() => setEditForm(p => ({ ...p, level: lv }))}
                        style={{ flex: 1, height: 32, borderRadius: 8, border: `2px solid ${editForm.level === lv ? levelColors[lv-1] : "transparent"}`, background: editForm.level >= lv ? levelColors[lv-1] + "50" : palette.cardBorder + "60", cursor: "pointer" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: editForm.level >= lv ? levelColors[lv-1] : "transparent", margin: "0 auto" }} />
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}><input style={S.input} placeholder="メモ" value={editForm.memo || ""} onChange={e => setEditForm(p => ({ ...p, memo: e.target.value }))} /></div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...S.btn(palette.accent5), fontSize: 12, padding: "5px 14px" }} onClick={() => { setLogs(p => p.map(x => x.id === item.id ? { ...editForm } : x).sort((a, b) => b.date.localeCompare(a.date))); setEditId(null); }}>保存</button>
                  <button style={{ ...S.btn(palette.cardBorder), fontSize: 12, padding: "5px 14px" }} onClick={() => setEditId(null)}>キャンセル</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ color: c, fontSize: 12 }}>{item.date.replace(/-/g, "/")}</span>
                    <span style={S.tag(c)}>{item.type}</span>
                    <div style={{ display: "flex", gap: 3 }}>{[1,2,3,4,5].map(lv => <div key={lv} style={{ width: 8, height: 8, borderRadius: "50%", background: item.level >= lv ? levelColors[lv-1] : palette.cardBorder }} />)}</div>
                  </div>
                  {item.memo && <div style={{ color: palette.textSub, fontSize: 12, marginTop: 2 }}>{item.memo}</div>}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => { setEditId(item.id); setEditForm({ ...item }); }} style={{ background: "none", border: `1px solid ${palette.cardBorder}`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: palette.textSub }}><Icon d={icons.edit} size={13} /></button>
                  <button onClick={() => setLogs(p => p.filter(x => x.id !== item.id))} style={{ background: "none", border: "none", cursor: "pointer", color: palette.accent4 }}><Icon d={icons.trash} size={16} /></button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── ④⑤ 痛みログ（種類編集・5段階メモリ）────────────────────────────────────
const levelColors = ["#6be0b0", "#a8d8f7", "#f0c060", "#f7a86a", "#e06b8b"];

function PainPage() {
  const def = ["頭痛","腰痛","膝痛","肩こり","首痛"];
  const [painData, savePainData, ready] = useKaruteData(KEYS.pain, { types: def, logs: [] });
  const painTypes = painData.types || def;
  const logs = painData.logs || [];
  const setPainTypes = (updater) => {
    const newTypes = typeof updater === "function" ? updater(painTypes) : updater;
    savePainData({ types: newTypes, logs });
  };
  const setLogs = (updater) => {
    const newLogs = typeof updater === "function" ? updater(logs) : updater;
    savePainData({ types: painTypes, logs: newLogs });
  };
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), type: "", level: 3, memo: "" });
  const [view, setView] = useState("week");
  const [newType, setNewType] = useState("");
  const [editingTypes, setEditingTypes] = useState(false);

  useEffect(() => { if (!form.type && painTypes.length > 0) setForm(p => ({ ...p, type: painTypes[0] })); }, [painTypes]);

  const add = () => { if (!form.type) return; setLogs(p => [{ ...form, id: Date.now() }, ...p].sort((a, b) => b.date.localeCompare(a.date))); setForm(p => ({ ...p, memo: "" })); };
  const addType = () => { if (!newType.trim() || painTypes.includes(newType.trim())) return; setPainTypes(p => [...p, newType.trim()]); setNewType(""); };
  const deleteType = (t) => { setPainTypes(p => p.filter(x => x !== t)); if (form.type === t) setForm(p => ({ ...p, type: painTypes.filter(x => x !== t)[0] || "" })); };
  const moveType = (t, dir) => {
    setPainTypes(p => { const idx = p.indexOf(t); const next = [...p]; const target = idx + dir; if (target < 0 || target >= next.length) return p; [next[idx], next[target]] = [next[target], next[idx]]; return next; });
  };

  const getWeekStart = d => { const dt = new Date(d); dt.setDate(dt.getDate() - dt.getDay()); return dt.toISOString().slice(0, 10); };
  const buckets = {};
  logs.forEach(log => { const key = view === "week" ? getWeekStart(log.date) : view === "month" ? log.date.slice(0, 7) : log.date.slice(0, 4); if (!buckets[key]) buckets[key] = {}; buckets[key][log.type] = (buckets[key][log.type] || 0) + 1; });
  const sortedKeys = Object.keys(buckets).sort().reverse().slice(0, 12).reverse();
  const maxVal = Math.max(1, ...sortedKeys.flatMap(k => Object.values(buckets[k])));
  const colors = [palette.accent5, palette.accent4, palette.accent3, palette.accent2, palette.accent1, "#c8a8f7"];
  const fmtKey = k => view === "week" ? k.slice(5).replace("-", "/") + "週" : view === "month" ? k.slice(5) + "月" : k + "年";

  return (
    <div>
      <div style={{ marginBottom: 16 }}><div style={{ fontSize: 18, fontWeight: 700, color: palette.text }}>痛みログ</div><div style={{ fontSize: 12, color: palette.textSub }}>痛みの記録・集計グラフ</div></div>
      <div style={{ ...S.card, borderColor: palette.accent5 + "60", marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: palette.text, marginBottom: 10 }}>今日の痛みを記録</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><div style={S.label}>日付</div><input type="date" style={S.input} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
          <div><div style={S.label}>種類</div><select style={S.input} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>{painTypes.map(t => <option key={t}>{t}</option>)}</select></div>
        </div>
        {/* ⑤ 5段階メモリ（左=軽い、右=辛い） */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: palette.textSub }}>← 軽い</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: levelColors[form.level - 1] }}>Lv {form.level}</span>
            <span style={{ fontSize: 11, color: palette.textSub }}>辛い →</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[1,2,3,4,5].map(lv => (
              <button key={lv} onClick={() => setForm(p => ({ ...p, level: lv }))}
                style={{ flex: 1, height: 40, borderRadius: 8, border: `2px solid ${form.level === lv ? levelColors[lv-1] : "transparent"}`, background: form.level >= lv ? levelColors[lv-1] + "50" : palette.cardBorder + "60", cursor: "pointer", transition: "all 0.15s", position: "relative" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: form.level >= lv ? levelColors[lv-1] : "transparent", margin: "0 auto" }} />
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 10 }}><div style={S.label}>メモ</div><input style={S.input} placeholder="状況など" value={form.memo} onChange={e => setForm(p => ({ ...p, memo: e.target.value }))} /></div>
        <button style={S.btn(palette.accent5)} onClick={add}>記録する</button>
      </div>

      {/* ④ 種類の管理 */}
      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: palette.text }}>痛みの種類</div>
          <button onClick={() => setEditingTypes(e => !e)} style={{ ...S.btn(editingTypes ? palette.accent4 : palette.cardBorder), fontSize: 11, padding: "4px 10px" }}>{editingTypes ? "完了" : "編集"}</button>
        </div>
        {editingTypes ? (
          <div>
            {painTypes.map((t, i) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 0", borderBottom: `1px solid ${palette.cardBorder}` }}>
                <span style={{ flex: 1, color: palette.text, fontSize: 13 }}>{t}</span>
                <button onClick={() => moveType(t, -1)} disabled={i === 0} style={{ background: "none", border: `1px solid ${palette.cardBorder}`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: palette.textSub, opacity: i === 0 ? 0.3 : 1 }}><Icon d={icons.arrowUp} size={12} /></button>
                <button onClick={() => moveType(t, 1)} disabled={i === painTypes.length - 1} style={{ background: "none", border: `1px solid ${palette.cardBorder}`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: palette.textSub, opacity: i === painTypes.length - 1 ? 0.3 : 1 }}><Icon d={icons.arrowDown} size={12} /></button>
                <button onClick={() => deleteType(t)} style={{ background: "none", border: `1px solid ${palette.accent4}40`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: palette.accent4 }}><Icon d={icons.trash} size={12} /></button>
              </div>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input style={{ ...S.input, flex: 1 }} placeholder="種類を追加（例：歯痛）" value={newType} onChange={e => setNewType(e.target.value)} onKeyDown={e => e.key === "Enter" && addType()} />
              <button style={S.btn(palette.accent5)} onClick={addType}>追加</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{painTypes.map((t, i) => <span key={t} style={S.tag(colors[i % colors.length])}>{t}</span>)}</div>
        )}
      </div>

      <div style={{ ...S.card, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: palette.text }}>集計グラフ</div>
          <div style={{ display: "flex", gap: 4 }}>{["week","month","year"].map((v,i) => <button key={v} onClick={() => setView(v)} style={{ ...S.btn(view === v ? palette.accent5 : palette.cardBorder), fontSize: 11, padding: "4px 10px" }}>{["週","月","年"][i]}</button>)}</div>
        </div>
        {sortedKeys.length === 0 ? <div style={{ textAlign: "center", color: palette.textSub, padding: 20 }}>データがありません</div> : (
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "flex", gap: 8, minWidth: sortedKeys.length * 60, alignItems: "flex-end", height: 120 }}>
              {sortedKeys.map(k => (
                <div key={k} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 90 }}>
                    {painTypes.map((t, i) => { const v = buckets[k] && buckets[k][t] ? buckets[k][t] : 0; return v > 0 ? <div key={t} style={{ width: 12, height: `${(v / maxVal) * 80}px`, minHeight: 4, background: colors[i % colors.length], borderRadius: "3px 3px 0 0" }} /> : null; })}
                  </div>
                  <div style={{ fontSize: 9, color: palette.textSub, whiteSpace: "nowrap" }}>{fmtKey(k)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: palette.text, marginBottom: 8 }}>記録一覧</div>
      <PainLogList logs={logs} setLogs={setLogs} painTypes={painTypes} colors={colors} />
    </div>
  );
}

// ── 薬・習慣フォーム（HabitsPageの外に定義）──────────────────────────────────
function HabitForm({ f, setF, onSave, onCancel, label, cc }) {
  return (
    <div style={{ ...S.card, borderColor: "#c8a8f760", marginBottom: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div><div style={S.label}>日付</div><input type="date" style={S.input} value={f.date} onChange={e => setF(p => ({ ...p, date: e.target.value }))} /></div>
        <div><div style={S.label}>カテゴリ</div><select style={S.input} value={f.category} onChange={e => setF(p => ({ ...p, category: e.target.value }))}>{Object.keys(cc).map(c => <option key={c}>{c}</option>)}</select></div>
      </div>
      <div style={{ marginBottom: 10 }}><div style={S.label}>名前 *</div><input style={S.input} placeholder="例：ロキソプロフェン、スクワット" value={f.name} onChange={e => setF(p => ({ ...p, name: e.target.value }))} /></div>
      <div style={{ marginBottom: 10 }}><div style={S.label}>詳細（用量・頻度など）</div><input style={S.input} placeholder="例：1日3回 食後" value={f.detail || ""} onChange={e => setF(p => ({ ...p, detail: e.target.value }))} /></div>
      <div style={{ marginBottom: 10 }}><div style={S.label}>メモ</div><textarea style={{ ...S.textarea, minHeight: 60 }} value={f.memo || ""} onChange={e => setF(p => ({ ...p, memo: e.target.value }))} /></div>
      <div style={{ display: "flex", gap: 8 }}><button style={S.btn("#c8a8f7")} onClick={onSave}>{label}</button><button style={S.btn(palette.cardBorder)} onClick={onCancel}>キャンセル</button></div>
    </div>
  );
}

// ── 薬・習慣 ────────────────────────────────────────────────────────────────────
function HabitsPage() {
  const [items, saveItems, ready] = useKaruteData(KEYS.habits, []);
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), category: "薬", name: "", detail: "", memo: "" });
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState("すべて");
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const cc = { "薬": palette.accent1, "体操": palette.accent2, "健康習慣": palette.accent3, "サプリ": palette.accent5, "その他": palette.textSub };
  const add = () => { if (!form.name) return; saveItems([{ ...form, id: Date.now() }, ...items].sort((a, b) => b.date.localeCompare(a.date))); setForm(p => ({ ...p, name: "", detail: "", memo: "" })); setAdding(false); };
  const startEdit = (item) => { setEditId(item.id); setEditForm({ ...item }); setAdding(false); };
  const saveEdit = () => { saveItems(items.map(x => x.id === editId ? { ...editForm } : x).sort((a, b) => b.date.localeCompare(a.date))); setEditId(null); };
  const cats = ["すべて", ...Object.keys(cc)];
  const filtered = filter === "すべて" ? items : items.filter(x => x.category === filter);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div><div style={{ fontSize: 18, fontWeight: 700, color: palette.text }}>薬・習慣記録</div><div style={{ fontSize: 12, color: palette.textSub }}>薬・体操・健康習慣の管理</div></div>
        <button style={S.btn("#c8a8f7")} onClick={() => { setAdding(!adding); setEditId(null); }}><Icon d={icons.plus} size={14} /> 追加</button>
      </div>
      {adding && <HabitForm f={form} setF={setForm} onSave={add} onCancel={() => setAdding(false)} label="保存" cc={cc} />}
      {editId && <div style={{ marginBottom: 8 }}><div style={{ fontSize: 12, color: "#c8a8f7", fontWeight: 700, marginBottom: 4 }}>✏️ 編集中</div><HabitForm f={editForm} setF={setEditForm} onSave={saveEdit} onCancel={() => setEditId(null)} label="更新" cc={cc} /></div>}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
        {cats.map(c => <button key={c} onClick={() => setFilter(c)} style={{ ...S.btn(filter === c ? (cc[c] || palette.accent1) : palette.cardBorder), fontSize: 11, padding: "5px 10px", whiteSpace: "nowrap" }}>{c}</button>)}
      </div>
      {filtered.length === 0 && <div style={{ textAlign: "center", color: palette.textSub, padding: 40 }}>記録がありません</div>}
      {filtered.map(item => { const c = cc[item.category] || palette.textSub; return (
        <div key={item.id} style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}><span style={{ color: c, fontSize: 12 }}>{item.date.replace(/-/g, "/")}</span><span style={S.tag(c)}>{item.category}</span></div>
              <div style={{ fontWeight: 700, color: palette.text, fontSize: 15 }}>{item.name}</div>
              {item.detail && <div style={{ color: palette.accent2, fontSize: 12, marginTop: 2 }}>{item.detail}</div>}
              {item.memo && <div style={{ color: palette.textSub, fontSize: 12, marginTop: 4 }}>{item.memo}</div>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <button onClick={() => startEdit(item)} style={{ background: "none", border: `1px solid ${palette.cardBorder}`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: palette.textSub }}><Icon d={icons.edit} size={13} /></button>
              <button onClick={() => saveItems(items.filter(x => x.id !== item.id))} style={{ background: "none", border: "none", cursor: "pointer", color: palette.accent4 }}><Icon d={icons.trash} size={16} /></button>
            </div>
          </div>
        </div>
      ); })}
    </div>
  );
}

// ── Mini Calendar ────────────────────────────────────────────────────────────────
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
  const cc = "#f0c060";
  return (
    <div style={{ background: "#161820", border: "1px solid #2a2d3e", borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", color: palette.textSub, padding: 4 }}><Icon d={icons.chevLeft} size={16} /></button>
        <div style={{ fontSize: 13, fontWeight: 800, color: cc }}>{viewYear}年 {viewMonth + 1}月</div>
        <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", color: palette.textSub, padding: 4 }}><Icon d={icons.chevRight} size={16} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", marginBottom: 4 }}>
        {["日","月","火","水","木","金","土"].map((d, i) => <div key={d} style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: i === 0 ? "#e06b8b" : i === 6 ? "#6baae0" : palette.textSub, padding: "2px 0" }}>{d}</div>)}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1 }}>
          {week.map((d, di) => { if (!d) return <div key={di} />; const ds = fmtDate(d); const hasLog = markedDates.has(ds); const isTdy = ds === today; const isSel = ds === selectedDate; return (
            <button key={di} onClick={() => onSelectDate(ds)} style={{ background: isSel ? cc : isTdy ? cc + "22" : "transparent", border: isTdy && !isSel ? `1px solid ${cc}60` : "1px solid transparent", borderRadius: 6, padding: "3px 0", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
              <span style={{ fontSize: 11, fontWeight: isSel || isTdy ? 800 : 400, color: isSel ? "#161820" : di === 0 ? "#e06b8b" : di === 6 ? "#6baae0" : palette.text }}>{d}</span>
              {hasLog && <div style={{ width: 4, height: 4, borderRadius: "50%", background: isSel ? "#161820" : cc }} />}
            </button>
          ); })}
        </div>
      ))}
    </div>
  );
}

// ── 日別ログ ────────────────────────────────────────────────────────────────────
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
  const loadAll = () => { const r = {}; LOG_META.forEach(m => { const d = load(KEYS[m.key]); r[m.key] = m.isPain ? (d && d.logs ? d.logs : []) : (Array.isArray(d) ? d : []); }); return r; };
  const [allLogs] = useState(loadAll);
  const [openDate, setOpenDate] = useState(null);
  const [calSel, setCalSel] = useState(null);
  const [calOpen, setCalOpen] = useState(false);
  const dayRefs = useRef({});

  const dateMap = {};
  LOG_META.forEach(m => { (allLogs[m.key] || []).forEach(item => { if (!item.date) return; if (!dateMap[item.date]) dateMap[item.date] = {}; if (!dateMap[item.date][m.key]) dateMap[item.date][m.key] = []; dateMap[item.date][m.key].push(item); }); });
  const allDates = Object.keys(dateMap).sort().reverse();
  const markedDates = new Set(allDates);

  useEffect(() => {
    if (!jumpDate) return;
    const nearest = allDates.length ? allDates.reduce((a, b) => Math.abs(new Date(b) - new Date(jumpDate)) < Math.abs(new Date(a) - new Date(jumpDate)) ? b : a) : null;
    if (nearest) { setOpenDate(nearest); setTimeout(() => { if (dayRefs.current[nearest]) dayRefs.current[nearest].scrollIntoView({ behavior: "smooth", block: "start" }); }, 120); }
    if (onClearJump) onClearJump();
  }, [jumpDate]);

  const handleCalSel = ds => {
    setCalSel(ds); setCalOpen(false);
    const nearest = allDates.length ? allDates.reduce((a, b) => Math.abs(new Date(b) - new Date(ds)) < Math.abs(new Date(a) - new Date(ds)) ? b : a) : null;
    if (nearest) { setOpenDate(nearest); setTimeout(() => { if (dayRefs.current[nearest]) dayRefs.current[nearest].scrollIntoView({ behavior: "smooth", block: "start" }); }, 80); }
  };

  const monthGroups = {};
  allDates.forEach(d => { const ym = d.slice(0, 7); if (!monthGroups[ym]) monthGroups[ym] = []; monthGroups[ym].push(d); });
  const sortedMonths = Object.keys(monthGroups).sort().reverse();
  const dayLabel = d => ["日","月","火","水","木","金","土"][new Date(d).getDay()];
  const preview = item => item.title || item.name || item.type || (item.text ? item.text.slice(0, 28) + (item.text.length > 28 ? "…" : "") : "") || (item.memo ? item.memo.slice(0, 28) : "") || "記録あり";

  return (
    <div>
      <button onClick={() => setCalOpen(o => !o)} style={{ width: "100%", marginBottom: 12, background: calOpen ? tlColor + "18" : palette.card, border: `1px solid ${calOpen ? tlColor + "60" : palette.cardBorder}`, borderRadius: 10, padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon d={icons.calendar} size={15} color={tlColor} />
          <span style={{ fontSize: 13, fontWeight: 700, color: tlColor }}>カレンダー</span>
          {calSel && <span style={{ fontSize: 11, color: palette.textSub }}>{calSel.replace(/-/g, "/")}</span>}
        </div>
        <div style={{ transform: calOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}><Icon d={icons.chevRight} size={14} color={tlColor} /></div>
      </button>
      {calOpen && <div style={{ marginBottom: 16 }}><MiniCalendar markedDates={markedDates} selectedDate={calSel} onSelectDate={handleCalSel} /></div>}

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
                <div key={date} ref={el => { dayRefs.current[date] = el; }} style={{ marginBottom: 6 }}>
                  <button onClick={() => setOpenDate(isOpen ? null : date)} style={{ width: "100%", background: isOpen ? tlColor + "14" : palette.card, border: `1px solid ${isOpen ? tlColor + "50" : palette.cardBorder}`, borderRadius: isOpen ? "10px 10px 0 0" : 10, padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}>
                    <div style={{ minWidth: 80 }}><span style={{ fontSize: 14, fontWeight: 800, color: isOpen ? tlColor : palette.text }}>{date.slice(5).replace("-", "/")}</span><span style={{ fontSize: 11, color: palette.textSub, marginLeft: 5 }}>{dayLabel(date)}</span></div>
                    <div style={{ flex: 1, display: "flex", gap: 5, flexWrap: "wrap" }}>{cats.map(meta => <span key={meta.key} style={{ background: meta.color + "22", color: meta.color, border: `1px solid ${meta.color}40`, borderRadius: 20, fontSize: 10, fontWeight: 700, padding: "1px 8px" }}>{meta.label}</span>)}</div>
                    <div style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }}><Icon d={icons.chevRight} size={14} color={isOpen ? tlColor : palette.textSub} /></div>
                  </button>
                  {isOpen && (
                    <div style={{ background: "#12141e", border: `1px solid ${tlColor}40`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {cats.map(meta => {
                        const its = dayLogs[meta.key];
                        return (
                          <div key={meta.key} style={{ background: meta.color + "0d", border: `1px solid ${meta.color}35`, borderRadius: 8, overflow: "hidden" }}>
                            <div style={{ background: meta.color + "1a", padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                              <Icon d={meta.icon} size={12} color={meta.color} />
                              <span style={{ fontSize: 11, fontWeight: 800, color: meta.color }}>{meta.label}</span>
                              <span style={{ fontSize: 10, color: meta.color + "90", marginLeft: "auto" }}>{its.length}件</span>
                            </div>
                            {its.map((item, idx) => <div key={idx} style={{ padding: "7px 12px", borderTop: idx > 0 ? `1px solid ${meta.color}20` : "none", fontSize: 12, color: palette.text, lineHeight: 1.5 }}>{preview(item)}</div>)}
                            <button onClick={() => { if (onSwitchTab) onSwitchTab(meta.key); }} style={{ width: "100%", background: "none", border: "none", borderTop: `1px solid ${meta.color}25`, padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, color: meta.color, fontSize: 11, fontWeight: 700 }}>
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

// ── バックアップ・復元 ──────────────────────────────────────────────────────────
function BackupPanel({ open, onClose }) {
  const [msg, setMsg] = useState("");
  const fileRef = useRef();

  const backup = async () => {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `my-karute-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("✅ バックアップファイルをダウンロードしました");
  };

  const restore = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        await importAllData(data);
        setMsg("✅ 復元しました。ページをリロードしてください。");
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        setMsg("❌ ファイルが正しくありません");
      }
    };
    reader.readAsText(file);
  };

  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-start", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: palette.card, border: `1px solid ${palette.cardBorder}`, borderRadius: "0 0 20px 20px", maxWidth: 500, width: "100%", padding: 20, boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 800, color: palette.text, marginBottom: 6 }}>💾 データのバックアップ・復元</div>
        <div style={{ fontSize: 12, color: palette.textSub, marginBottom: 16, lineHeight: 1.6 }}>
          定期的にバックアップを取っておくと、データが消えた際に復元できます。
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <button onClick={backup} style={{ ...S.btn(palette.accent2), flex: 1, justifyContent: "center", padding: "10px 16px" }}>
            📥 バックアップを保存
          </button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <input type="file" accept=".json" ref={fileRef} style={{ display: "none" }} onChange={restore} />
          <button onClick={() => fileRef.current.click()} style={{ ...S.btn(palette.accent3), width: "100%", justifyContent: "center", padding: "10px 16px" }}>
            📤 バックアップから復元
          </button>
        </div>

        {msg && <div style={{ fontSize: 12, color: palette.accent5, padding: "8px 12px", background: palette.accent5 + "15", borderRadius: 8, marginBottom: 10 }}>{msg}</div>}

        <button onClick={onClose} style={{ ...S.btn(palette.cardBorder), width: "100%", justifyContent: "center" }}>閉じる</button>
      </div>
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [active, setActive] = useState("timeline");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [calOpen, setCalOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [jumpDate, setJumpDate] = useState(null);
  const [allMarkedDates, setAllMarkedDates] = useState(new Set());

  // localStorageからIndexedDBへの移行（初回のみ）
  useEffect(() => { migrateFromLocalStorage(); }, []);

  // カレンダー用マーク日付を更新
  useEffect(() => {
    const updateDates = async () => {
      const dates = new Set();
      for (const m of LOG_META) {
        const d = await dbGet(KEYS[m.key]);
        const items = m.isPain ? (d && d.logs ? d.logs : []) : (Array.isArray(d) ? d : []);
        items.forEach(x => x.date && dates.add(x.date));
      }
      setAllMarkedDates(dates);
    };
    updateDates();
  }, [active]);

  const activeTab = tabConfig.find(t => t.key === active);

  const handleHeaderCalSel = (ds) => { setCalOpen(false); setJumpDate(ds); setActive("timeline"); };

  return (
    <div style={{ background: palette.bg, minHeight: "100vh", color: palette.text, fontFamily: "'Noto Sans JP','Hiragino Kaku Gothic ProN',sans-serif" }}>
      <div style={{ background: palette.tabBg, borderBottom: `1px solid ${palette.cardBorder}`, padding: "10px 16px 0", position: "sticky", top: 0, zIndex: 100 }}>

        {/* ヘッダー */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg,${palette.accent2},${palette.accent1})`, display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 14 }}>🏥</span></div>
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1 }}>マイカルテ</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {/* バックアップボタン */}
            <button onClick={() => setBackupOpen(true)} style={{ background: "transparent", border: `1px solid ${palette.cardBorder}`, borderRadius: 8, padding: "5px 8px", display: "flex", alignItems: "center", cursor: "pointer" }}
              title="バックアップ・復元">
              <span style={{ fontSize: 14 }}>💾</span>
            </button>
            {/* カレンダーボタン */}
            <button onClick={() => setCalOpen(o => !o)} style={{ background: calOpen ? "#f0c06020" : "transparent", border: `1px solid ${calOpen ? "#f0c06060" : palette.cardBorder}`, borderRadius: 8, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
              <Icon d={icons.calendar} size={14} color="#f0c060" />
              <span style={{ fontSize: 11, fontWeight: 700, color: "#f0c060" }}>カレンダー</span>
            </button>
            {/* 既往歴ボタン */}
            <button onClick={() => setHistoryOpen(true)} style={{ background: `linear-gradient(135deg,${hp.accent},${hp.accentSub})`, border: "none", borderRadius: 8, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
              <span style={{ fontSize: 11 }}>📋</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#1a1208" }}>既往歴</span>
            </button>
          </div>
        </div>

        {/* カレンダー展開（タブの上） */}
        {calOpen && (
          <div style={{ paddingBottom: 10 }}>
            <MiniCalendar markedDates={allMarkedDates} selectedDate={jumpDate} onSelectDate={handleHeaderCalSel} />
          </div>
        )}

        {/* タブバー */}
        <div style={{ display: "flex", overflowX: "auto", gap: 2 }}>
          {tabConfig.map(tab => (
            <button key={tab.key} onClick={() => setActive(tab.key)} style={{ background: active === tab.key ? palette.card : "transparent", border: "none", borderBottom: active === tab.key ? `2px solid ${tab.color}` : "2px solid transparent", color: active === tab.key ? tab.color : palette.textSub, padding: "7px 10px", cursor: "pointer", fontSize: 11, fontWeight: active === tab.key ? 700 : 400, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", borderRadius: "6px 6px 0 0" }}>
              <Icon d={tab.icon} size={12} color={active === tab.key ? tab.color : palette.textSub} />{tab.label}
            </button>
          ))}
        </div>
      </div>

      <HistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <BackupPanel open={backupOpen} onClose={() => setBackupOpen(false)} />

      <div style={{ padding: 16, maxWidth: 600, margin: "0 auto" }}>
        <div style={{ height: 3, background: `linear-gradient(90deg,${activeTab.color},transparent)`, borderRadius: 2, marginBottom: 16 }} />
        {active === "timeline" ? <TimelinePage jumpDate={jumpDate} onClearJump={() => setJumpDate(null)} onSwitchTab={key => setActive(key)} />
          : active === "records"  ? <RecordsPage />
          : active === "oriental" ? <OrientalPage />
          : active === "posture"  ? <PosturePage />
          : active === "worries"  ? <WorriesPage />
          : active === "pain"     ? <PainPage />
          : <HabitsPage />}
      </div>
    </div>
  );
}

