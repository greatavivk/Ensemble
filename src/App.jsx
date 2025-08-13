// App.jsx — Ensemble (Unified Single File)
// ✅ Georgia typography, editorial B/W + red
// ✅ Closet: single Upload button; new items are `uncategorized`
// ✅ Item Editor: Category select + free‑form Color/Occasion chips; Seasons checkboxes
// ✅ Color tags: user types + Enter → chips; auto‑detect from Name ONLY when tags are empty; learns new colors
// ✅ Builder + Saved Looks: fixed board layout (Outerwear, Top, Bottom, Shoes, Accessories)
// ✅ Drag & Drop: disabled until category set (not `uncategorized`); accessories capped at 3
// ✅ Delete Items + Delete Looks (best‑effort storage delete when Supabase on)
// ✅ Dashboard: smoother BE/word animation + optional hero image with overlay
// ✅ lucide-react: valid icons only; custom Jacket/Trousers SVGs

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Footprints,
  GraduationCap,
  Shirt,
  Watch,
  Glasses,
  Plus,
  X,
  Upload,
  Filter,
  Star,
  Trash2,
} from 'lucide-react'

// ----------------------- Supabase Toggle ---------------------
const USE_SUPABASE = false // set true when env vars are configured in Vercel
let supabase = null
if (USE_SUPABASE) {
  try {
    // lazy import to avoid bundling errors if not used
    // eslint-disable-next-line no-new-func
    const createClient = (await import('@supabase/supabase-js')).createClient
    const URL = import.meta?.env?.VITE_SUPABASE_URL
    const KEY = import.meta?.env?.VITE_SUPABASE_ANON_KEY
    if (URL && KEY) supabase = createClient(URL, KEY)
  } catch (e) {
    console.warn('Supabase not initialized:', e)
  }
}

// ----------------------- Design Tokens ----------------------
const COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  off: '#FAFAFA',
  charcoal: '#2C2C2C',
  gray: '#666666',
  light: '#CCCCCC',
  red: '#8B0000',
}
const FONT_STACK = 'Georgia, "Times New Roman", Times, serif'

// ----------------------- Custom Icons -----------------------
function TrousersIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M7 3h10l-1 6-1 12h-3l-1.5-8L9 21H6L7 9V3z" stroke="#000" strokeWidth="2" fill="none" />
      <path d="M12 3v4" stroke="#000" strokeWidth="2" />
    </svg>
  )
}
function JacketIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M8 3l4-1 4 1 2 4v12h-3V9l-3-1-3 1v10H6V7l2-4z" stroke="#000" strokeWidth="2" fill="none" />
      <path d="M12 4v4" stroke="#000" strokeWidth="2" />
    </svg>
  )
}
function SquareStub(props) {
  return <div {...props} style={{ width: props.size || 20, height: props.size || 20, border: `2px solid ${COLORS.black}`, boxShadow: `4px 4px 0 ${COLORS.black}` }} />
}

// ----------------------- Helpers ----------------------------
const ALL_SEASONS = ['Spring', 'Summer', 'Fall', 'Winter']
const WORDS = ['stylish', 'chic', 'fashionable', 'YOURSELF']

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'uncategorized', label: 'Uncategorized' },
  { key: 'hats', label: 'Hats', icon: 'hat' },
  { key: 'outerwear', label: 'Outerwear', icon: 'jacket' },
  { key: 'tops', label: 'Tops', icon: 'shirt' },
  { key: 'bottoms', label: 'Bottoms', icon: 'trousers' },
  { key: 'shoes', label: 'Shoes', icon: 'footprints' },
  { key: 'accessories', label: 'Accessories', icon: 'watch' },
]

function titleCase(str) { return str.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()) }
function iconByKey(key, props = {}) {
  switch (key) {
    case 'hat': return <GraduationCap {...props} />
    case 'shirt': return <Shirt {...props} />
    case 'watch': return <Watch {...props} />
    case 'footprints': return <Footprints {...props} />
    case 'glasses': return <Glasses {...props} />
    case 'trousers': return <TrousersIcon size={props.size || 20} />
    case 'jacket': return <JacketIcon size={props.size || 20} />
    default: return <SquareStub {...props} />
  }
}
function detectSeasons(text) {
  const t = (text || '').toLowerCase(); const out = []
  if (/\bspring\b/.test(t)) out.push('Spring')
  if (/\bsummer\b/.test(t)) out.push('Summer')
  if (/(\bfall\b|\bautumn\b)/.test(t)) out.push('Fall')
  if (/\bwinter\b/.test(t)) out.push('Winter')
  return Array.from(new Set(out))
}
// learnable color dictionary — used only to SUGGEST when item has no colors yet
function getLearnedColors() { try { return JSON.parse(localStorage.getItem('ensemble.colors') || '[]') } catch { return [] } }
function setLearnedColors(arr) { try { localStorage.setItem('ensemble.colors', JSON.stringify(arr)) } catch { } }
function suggestColorsFromName(name) {
  const base = ['black','white','gray','grey','silver','gold','red','burgundy','maroon','pink','purple','violet','blue','navy','teal','turquoise','green','olive','mint','yellow','mustard','orange','brown','tan','camel','beige','cream','ivory']
  const dict = new Set([...base, ...getLearnedColors()])
  const t = (name || '').toLowerCase()
  const found = []
  dict.forEach(c => { if (new RegExp(`\\b${c}\\b`).test(t)) found.push(c === 'grey' ? 'gray' : c) })
  return Array.from(new Set(found))
}

// ----------------------- Outfit Model -----------------------
const EMPTY_OUTFIT = { id: 'o1', name: 'Untitled Look', items: { outerwear: null, hat: null, top: null, bottom: null, shoes: null, accessories: [] } }

// ----------------------- App --------------------------------
export default function App() {
  const [tab, setTab] = useState('dashboard')

  // Items: persistent via localStorage
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ensemble.items') || '[]')
    } catch {
      return []
    }
  })

  const [activeCategory, setActiveCategory] = useState('all')
  const [activeSeasonsFilter, setActiveSeasonsFilter] = useState([])
  const [outfit, setOutfit] = useState(EMPTY_OUTFIT)
  const [outfit, setOutfit] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ensemble.currentOutfit') || JSON.stringify(EMPTY_OUTFIT))
    } catch {
      return EMPTY_OUTFIT
    }
  })

  // Saved Looks: persistent via localStorage
  const [savedLooks, setSavedLooks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ensemble.savedLooks') || '[]')
    } catch {
      return []
    }
  })

  // Save to localStorage whenever items change
  useEffect(() => {
    try {
      localStorage.setItem('ensemble.items', JSON.stringify(items))
    } catch {}
  }, [items])

  // Save to localStorage whenever savedLooks change
  useEffect(() => {
    try {
      localStorage.setItem('ensemble.savedLooks', JSON.stringify(savedLooks))
    } catch {}
  }, [savedLooks])

  // Save current outfit to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ensemble.currentOutfit', JSON.stringify(outfit))
    } catch {}
  }, [outfit])

  // ... your existing App logic continues below

  // learned colors cache (for suggestions)
  const [learned, setLearned] = useState(getLearnedColors())
  useEffect(() => setLearned(getLearnedColors()), [])

  // drag data
  const dragDataRef = useRef(null)
  function onDragStart(e, item) {
    if (!item || item.category === 'uncategorized') return // block dragging until categorized
    dragDataRef.current = item
    e.dataTransfer.setData('text/plain', item.id)
    e.dataTransfer.effectAllowed = 'move'
  }
  function onDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }
  function onDrop(e, zone) {
    e.preventDefault(); const item = dragDataRef.current; if (!item) return
    const map = { outerwear: 'outerwear', hat: 'hats', top: 'tops', bottom: 'bottoms', shoes: 'shoes', accessories: 'accessories' }
    const valid = map[zone] === item.category || (zone === 'accessories' && item.category === 'accessories')
    if (!valid) return bounceInvalid(e.currentTarget)
    setOutfit(prev => {
      const next = structuredClone(prev)
      switch (zone) {
        case 'outerwear': next.items.outerwear = item.id; break
        case 'hat': next.items.hat = item.id; break
@@ -594,210 +607,224 @@ function ChipInput({ value = [], onAdd, onRemove, placeholder }) {
  )
}

function Builder({ items, outfit, onDrop, onDragOver, onClearZone, onDragStart, onSaveOutfit }) {
  const getItem = id => items.find(i => i.id === id)
  return (
    <section className="section builder">
      <div className="builder-left">
        <h2 className="section-title"><span className="section-num">03</span> Categories</h2>
        <p className="muted">Drag items into the board boxes.</p>
        <div className="filmstrip">
          {items.map(i => (
            <div key={i.id} className={`film-cell ${i.category==='uncategorized'?'dim':''}`} draggable={i.category!=='uncategorized'} onDragStart={e => onDragStart?.(e, i)}>
              <div className="film-frame">
                {i.imageUrl ? <img src={i.imageUrl} alt="img" className="no-frame-img small" /> : iconByKey(i.icon, { size: 28 })}
              </div>
              <div className="film-caption">{i.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Board center — fixed layout like your reference */}
      <div className="builder-center">
        <div className="board">
          <div className="board-area outerwear">
            <DropZone label="Outerwear" zone="outerwear" onDrop={onDrop} onDragOver={onDragOver} filled={!!outfit.items.outerwear} onClear={() => onClearZone('outerwear')}>
              {outfit.items.outerwear && <ZoneItem item={getItem(outfit.items.outerwear)} />}
          <div className="board-area hat">
            <DropZone label="Hat" zone="hat" onDrop={onDrop} onDragOver={onDragOver} filled={!!outfit.items.hat} onClear={() => onClearZone('hat')}>
              {outfit.items.hat && <ZoneItem item={getItem(outfit.items.hat)} />}
            </DropZone>
          </div>
          <div className="board-area top">
            <DropZone label="Top" zone="top" onDrop={onDrop} onDragOver={onDragOver} filled={!!outfit.items.top} onClear={() => onClearZone('top')}>
              {outfit.items.top && <ZoneItem item={getItem(outfit.items.top)} />}
            </DropZone>
          </div>
          <div className="board-area outerwear">
            <DropZone label="Outerwear" zone="outerwear" onDrop={onDrop} onDragOver={onDragOver} filled={!!outfit.items.outerwear} onClear={() => onClearZone('outerwear')}>
              {outfit.items.outerwear && <ZoneItem item={getItem(outfit.items.outerwear)} />}
            </DropZone>
          </div>
          <div className="board-area top">
            <DropZone label="Top" zone="top" onDrop={onDrop} onDragOver={onDragOver} filled={!!outfit.items.top} onClear={() => onClearZone('top')}>
              {outfit.items.top && <ZoneItem item={getItem(outfit.items.top)} />}
            </DropZone>
          </div>
          <div className="board-area bottom">
            <DropZone label="Bottom" zone="bottom" onDrop={onDrop} onDragOver={onDragOver} filled={!!outfit.items.bottom} onClear={() => onClearZone('bottom')}>
              {outfit.items.bottom && <ZoneItem item={getItem(outfit.items.bottom)} />}
            </DropZone>
          </div>
          <div className="board-area shoes">
            <DropZone label="Shoes" zone="shoes" onDrop={onDrop} onDragOver={onDragOver} filled={!!outfit.items.shoes} onClear={() => onClearZone('shoes')}>
              {outfit.items.shoes && <ZoneItem item={getItem(outfit.items.shoes)} />}
            </DropZone>
          </div>
          <div className="board-area accessories">
            <DropZone label="Accessories" zone="accessories" onDrop={onDrop} onDragOver={onDragOver} filled={outfit.items.accessories.length>0} onClear={() => onClearZone('accessories')}>
              {outfit.items.accessories.map(id => { const it = getItem(id); return <ZoneItem key={id} item={it} small /> })}
            </DropZone>
          </div>
        </div>
      </div>

      <div className="builder-right">
        <div className="preview">
          <div className="preview-header"><div className="preview-title">Current Look</div></div>
          <div className="preview-actions"><button className="btn" onClick={onSaveOutfit}>Save Look</button></div>
        </div>
      </div>
    </section>
@@ -630,51 +635,51 @@ function DropZone({ label, zone, children, onDrop, onDragOver, filled, onClear }
  )
}

function DropZone({ label, zone, children, onDrop, onDragOver, filled, onClear }) {
  return (
    <div
      className={`dropzone ${filled ? 'filled' : ''}`}
      onDrop={e => onDrop(e, zone)}
      onDragOver={onDragOver}
    >
      <span className="dz-label">{label}</span>
      {filled && (
        <button className="dz-clear" onClick={onClear} aria-label={`clear ${zone}`}>
          <X size={14} />
        </button>
      )}
      <div className="dz-content">{children}</div>
    </div>
  )
}

function ZoneItem({ item, small }) {
  if (!item) return null
  return (
    <div className={`zone-item ${small ? 'small' : ''}`} title={item.name}>
      {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className={`no-frame-img ${small ? 'small' : ''}`} /> : iconByKey(item.icon, { size: small ? 18 : 28 })}
      <span className="zone-name">{item.name}</span>
    </div>
  )
}

function Gallery({ items, savedLooks, onDeleteLook }) {
  const list = savedLooks || []
  return (
    <section className="section">
      <h2 className="section-title"><span className="section-num">04</span> Saved Looks</h2>
      <div className="masonry">
        {list.map(look => (
          <div key={look.id} className="masonry-card">
            <div className="polaroid">
              <div className="polaroid-frame no-frame">
                <div className="board board-static">
                  {['outerwear','top','bottom','shoes','accessories'].map(zone => {
                  {['hat','top','outerwear','bottom','shoes','accessories'].map(zone => {
                    if (zone === 'accessories') return (
                      <div key={zone} className={`board-area ${zone}`}>
                        <div className="acc-stack">
                          {(look.items.accessories || []).map(aid => { const acc = items.find(i => i.id === aid); return <span key={aid} className="tag">{acc?.name || 'Accessory'}</span> })}
                        </div>
                      </div>
                    )
                    const id = look.items[zone]
                    const it = id && items.find(i => i.id === id)
                    return (
                      <div key={zone} className={`board-area ${zone}`}>
                        {it ? (it.imageUrl ? <img src={it.imageUrl} alt={it.name} className="no-frame-img" /> : iconByKey(it.icon, { size: 36 })) : <div className="look-empty" />}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="card-title">{look.name}</div>
              <div className="card-sub italic">Saved outfit</div>
              <button className="btn danger" onClick={() => onDeleteLook(look.id)}><Trash2 size={16}/> Delete Look</button>
            </div>
          </div>
        ))}
@@ -754,68 +759,70 @@ const CSS = `
.item-sub{ color:var(--gray); font-size:12px }
const CSS = `
.item-card{ transform:scale(1.15); transform-origin:top left }
.item-title{ font-size:18px; font-weight:700 }
.item-sub{ color:var(--gray); font-size:14px }
.item-tags .tag{ display:inline-block; border:2px solid var(--black); padding:2px 6px; margin:4px 4px 0 0; font-size:12px; font-weight:700; background:var(--white) }

/* Drawer */
.drawer{ position:fixed; right:16px; bottom:16px; width:360px; max-width:calc(100vw - 32px); background:var(--white); border:2px solid var(--black); box-shadow:6px 6px 0 var(--black); padding:12px; z-index:20 }
.drawer-head{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px }
.form-title{ font-weight:700; font-size:18px }
.form-row{ margin:10px 0; display:flex; flex-direction:column; gap:6px }
.form-label{ font-weight:700 }
.input, .textarea, .select{ border:2px solid var(--black); padding:6px; background:var(--white); font-family:${FONT_STACK} }
.checks{ display:flex; gap:8px; flex-wrap:wrap }
.check{ display:inline-flex; gap:6px; align-items:center }
.help{ color:var(--gray); font-size:12px }
.drawer-actions{ display:flex; gap:8px; margin-top:8px }

/* Chip input */
.chips{ border:2px solid var(--black); padding:6px; background:var(--white) }
.chip-list{ display:flex; gap:6px; flex-wrap:wrap }
.chip{ display:inline-flex; align-items:center; gap:6px; border:2px solid var(--black); padding:2px 6px; background:var(--white); box-shadow:4px 4px 0 var(--black) }
.chip-x{ border:none; background:transparent; cursor:pointer; display:inline-grid; place-items:center }
.chip-input{ border:none; outline:none; font-family:${FONT_STACK} }

/* Builder */
.builder{ display:grid; grid-template-columns: 240px 1fr 320px; gap:16px }
.filmstrip{ display:grid; grid-template-columns:repeat(2,1fr); gap:8px }
.film-cell{ background:var(--white); border:2px solid var(--black); padding:8px }
.film-cell{ background:var(--white); border:2px solid var(--black); padding:9px }
.film-cell.dim{ opacity:.5 }
.film-frame{ border:2px solid var(--black); height:60px; display:grid; place-items:center; box-shadow:4px 4px 0 var(--black) }
.film-frame{ border:2px solid var(--black); width:70px; height:70px; display:grid; place-items:center; box-shadow:4px 4px 0 var(--black) }
.film-caption{ font-size:12px; text-align:center; margin-top:6px }

/* Board layout */
.board{ position:relative; display:grid; grid-template-columns:1fr 1fr; grid-template-rows:160px 160px 140px; gap:10px }
.board{ position:relative; width:420px; height:420px; margin:0 auto }
.board{ position:relative; width:504px; height:504px; margin:0 auto }
.board-static .dropzone{ pointer-events:none }
.board-area.outerwear{ grid-column:1/2; grid-row:1/2 }
.board-area.top{ grid-column:2/3; grid-row:1/2 }
.board-area.bottom{ grid-column:2/3; grid-row:2/3 }
.board-area.shoes{ grid-column:1/2; grid-row:3/4 }
.board-area.accessories{ grid-column:2/3; grid-row:3/4 }

.dropzone{ position:relative; border:2px dashed var(--black); padding:6px; display:grid; place-items:center; transition:transform .08s, border-color .12s; background:var(--white) }
.board-area{ position:absolute; display:flex; align-items:center; justify-content:center }
.board-area.hat{ top:0; right:0; width:180px; height:180px; z-index:5 }
.board-area.top{ top:120px; right:10px; width:260px; height:260px; z-index:4 }
.board-area.outerwear{ top:120px; left:0; width:260px; height:260px; z-index:3 }
.board-area.bottom{ bottom:0; right:20px; width:250px; height:250px; z-index:2 }
.board-area.shoes{ bottom:0; left:0; width:250px; height:250px; z-index:1 }
.board-area.accessories{ top:0; left:0; width:190px; min-height:140px; z-index:3 }
.board-area.hat{ top:0; right:0; width:216px; height:216px; z-index:5 }
.board-area.top{ top:144px; right:12px; width:312px; height:312px; z-index:4 }
.board-area.outerwear{ top:144px; left:0; width:312px; height:312px; z-index:3 }
.board-area.bottom{ bottom:0; right:24px; width:300px; height:300px; z-index:2 }
.board-area.shoes{ bottom:0; left:0; width:300px; height:300px; z-index:1 }
.board-area.accessories{ top:0; left:0; width:228px; min-height:168px; z-index:3 }

.dropzone{ position:relative; border:2px dashed var(--light); padding:6px; display:grid; place-items:center; transition:transform .08s, border-color .12s; background:var(--white); width:100%; height:100% }
.dropzone.filled{ border-style:solid }
.dz-label{ position:absolute; top:-10px; left:8px; background:var(--white); padding:0 6px; font-size:12px; letter-spacing:1px }
.dz-clear{ position:absolute; top:4px; right:4px; border:2px solid var(--black); background:var(--white); cursor:pointer; padding:2px }
.dz-content{ display:inline-flex; gap:8px; align-items:center }

.zone-item{ display:inline-flex; align-items:center; gap:8px; padding:4px 8px; border:2px solid var(--black); background:var(--white); box-shadow:4px 4px 0 var(--black) }
.zone-item.small{ transform:scale(.9) }
.zone-name{ font-size:14px }

@keyframes snap{ 0%{transform:scale(.98)} 100%{transform:scale(1)} }
@keyframes bounce{ 0%{transform:translateY(0)} 30%{transform:translateY(-6px)} 60%{transform:translateY(0)} 100%{transform:translateY(0)} }
.anim-snap{ animation:snap .15s ease-out }
.anim-bounce{ animation:bounce .25s cubic-bezier(.2,.6,.3,1.2); border-color:var(--red)!important }

/* Preview / Gallery */
.preview{ border:2px solid var(--black); background:var(--white); box-shadow:4px 4px 0 var(--black) }
.preview-header{ display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:2px solid var(--black) }
.preview-title{ font-weight:700 }
.preview-actions{ padding:8px }

/* Saved Looks board size boost */
.masonry-card .board.board-static {
  transform: scale(1.3);
  transform: scale(1.25);
  transform-origin: top left;
}

.masonry-card .board.board-static img {
  max-width: 80%; /* shrink images to fit bigger board */
  max-height: 80%;
}


.no-frame-img{ max-width:100%; max-height:100%; object-fit:contain; display:block; background:transparent }
.no-frame-img.small{ max-height:40px }
.no-frame-img.small{ max-height:46px }
`
