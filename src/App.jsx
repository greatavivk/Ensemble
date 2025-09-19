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
const HERO_IMAGES = [
  'https://pin.it/3Blf4IIwc',
  'https://pin.it/594gYVUgI',
  'https://pin.it/7CKNUhA0a'
]

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
function clamp(value, min, max) {
  const num = typeof value === 'number' ? value : parseFloat(value)
  if (Number.isNaN(num)) return min
  return Math.min(Math.max(num, min), max)
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
// ----------------------- App --------------------------------
export default function App() {
  const [tab, setTab] = useState('dashboard')
  const [items, setItems] = useState([]) // start empty (no demo)
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeSeasonsFilter, setActiveSeasonsFilter] = useState([])
  const [canvasItems, setCanvasItems] = useState([])
  const [selectedCanvasId, setSelectedCanvasId] = useState(null)
  const [outfitName, setOutfitName] = useState('Untitled Look')
  const [outfitSeasons, setOutfitSeasons] = useState([])
  const [savedLooks, setSavedLooks] = useState([])

// learned colors cache (for suggestions)
  const [learned, setLearned] = useState(getLearnedColors())
  useEffect(() => setLearned(getLearnedColors()), [])

  useEffect(() => {
    setCanvasItems(prev => {
      if (!prev.length) return prev
      const validIds = new Set(items.map(i => i.id))
      const filtered = prev.filter(ci => validIds.has(ci.itemId))
      return filtered.length === prev.length ? prev : filtered
    })
  }, [items])

  useEffect(() => {
    if (selectedCanvasId && !canvasItems.some(ci => ci.canvasId === selectedCanvasId)) {
      setSelectedCanvasId(null)
    }
  }, [canvasItems, selectedCanvasId])

  // drag data
  const dragDataRef = useRef(null)
  function onDragStart(e, item) {
    if (!item || item.category === 'uncategorized') return // block dragging until categorized
    dragDataRef.current = item
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', item.id)
      e.dataTransfer.effectAllowed = 'move'
    }
  }
  function addItemToCanvas(item, xPercent = 50, yPercent = 50) {
    if (!item || item.category === 'uncategorized') return
    const canvasId = `canvas-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const clampedX = clamp(xPercent, 5, 95)
    const clampedY = clamp(yPercent, 5, 95)
    setCanvasItems(prev => {
      const maxZ = prev.reduce((acc, curr) => Math.max(acc, curr.z || 0), 0)
      return [...prev, { canvasId, itemId: item.id, x: clampedX, y: clampedY, scale: 1, z: maxZ + 1 }]
    })
    setSelectedCanvasId(canvasId)
  }
  function handleCanvasDrop({ xPercent, yPercent, fallbackId }) {
    const baseItem = dragDataRef.current || items.find(i => i.id === fallbackId)
    if (!baseItem) return
    const safeX = Number.isFinite(xPercent) ? xPercent : 50
    const safeY = Number.isFinite(yPercent) ? yPercent : 50
    addItemToCanvas(baseItem, safeX, safeY)
    dragDataRef.current = null
  }
  function handleQuickAdd(id) {
    const item = items.find(i => i.id === id)
    if (!item) return
    addItemToCanvas(item, 50, 50)
  }
  function moveCanvasItem(id, xPercent, yPercent) {
    setCanvasItems(prev => prev.map(ci => ci.canvasId === id ? { ...ci, x: clamp(xPercent, 5, 95), y: clamp(yPercent, 5, 95) } : ci))
  }
  function updateCanvasItem(id, patch) {
    setCanvasItems(prev => prev.map(ci => {
      if (ci.canvasId !== id) return ci
      const next = { ...ci, ...patch }
      if (patch.scale != null) next.scale = clamp(patch.scale, 0.4, 2)
      return next
    }))
  }
  function removeCanvasItem(id) {
    setCanvasItems(prev => prev.filter(ci => ci.canvasId !== id))
    setSelectedCanvasId(prev => (prev === id ? null : prev))
  }
  function clearCanvas() {
    setCanvasItems([])
    setSelectedCanvasId(null)
  }
  function reorderCanvasItem(id, direction) {
    setCanvasItems(prev => {
      if (prev.length < 2) return prev
      const sorted = [...prev].sort((a, b) => (a.z || 0) - (b.z || 0))
      const idx = sorted.findIndex(ci => ci.canvasId === id)
      if (idx === -1) return prev
      if (direction === 'up' && idx < sorted.length - 1) {
        ;[sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]]
      } else if (direction === 'down' && idx > 0) {
        ;[sorted[idx], sorted[idx - 1]] = [sorted[idx - 1], sorted[idx]]
      } else {
        return prev
      }
      const remapped = sorted.map((ci, order) => ({ ...ci, z: order + 1 }))
      const map = new Map(remapped.map(ci => [ci.canvasId, ci]))
      return prev.map(ci => map.get(ci.canvasId) || ci)
    })
  }
  function layerUp(id) { reorderCanvasItem(id, 'up') }
  function layerDown(id) { reorderCanvasItem(id, 'down') }
  function toggleOutfitSeason(season) {
    setOutfitSeasons(prev => prev.includes(season) ? prev.filter(s => s !== season) : [...prev, season])
  }

// filters
const visibleItems = useMemo(() => {
let list = [...items]
if (activeCategory !== 'all') list = list.filter(i => i.category === activeCategory)
if (activeSeasonsFilter.length) list = list.filter(i => activeSeasonsFilter.every(s => i.seasons?.includes(s)))
return list
}, [items, activeCategory, activeSeasonsFilter])

// upload
const fileInputRef = useRef(null)
function onUploadClick() { fileInputRef.current?.click() }
async function onFileChange(e) {
const file = e.target.files?.[0]; if (!file) return
const id = `i${Date.now()}`
// default icon by guessed type? we keep shirt by default; user can change category later
const newItem = {
id,
name: 'Unnamed fashion piece',
category: 'uncategorized',
seasons: [],
colorTags: [],
occasions: [],
description: '',
usageCount: 0,
dateAdded: new Date().toISOString().slice(0, 10),
icon: 'shirt',
}
if (USE_SUPABASE && supabase) {
try {
const path = `anon/${id}-${Date.now()}`
const { error: upErr } = await supabase.storage.from('items').upload(path, file, { upsert: true })
if (upErr) throw upErr
const { data: urlData } = supabase.storage.from('items').getPublicUrl(path)
setItems(prev => [{ ...newItem, imageUrl: urlData.publicUrl, imagePath: path }, ...prev])
await supabase.from('items').insert({
id,
name: newItem.name,
category: newItem.category,
seasons: newItem.seasons,
color_tags: newItem.colorTags,
occasions: newItem.occasions,
description: newItem.description,
usage_count: newItem.usageCount,
image_url: urlData.publicUrl,
image_path: path,
})
} catch (err) {
console.error('Upload failed', err)
// fallback to client-only preview
const reader = new FileReader(); reader.onload = () => setItems(prev => [{ ...newItem, imageUrl: reader.result }, ...prev]); reader.readAsDataURL(file)
}
} else {
const reader = new FileReader(); reader.onload = () => setItems(prev => [{ ...newItem, imageUrl: reader.result }, ...prev]); reader.readAsDataURL(file)
}
e.target.value = ''
}

// save / delete items
async function updateItem(updated) {
// learn colors user typed (new unique values)
const newColors = (updated.colorTags || []).filter(c => !!c && !getLearnedColors().includes(c.toLowerCase()))
if (newColors.length) { const next = Array.from(new Set([...getLearnedColors(), ...newColors.map(c => c.toLowerCase())])); setLearnedColors(next); setLearned(next) }

setItems(prev => prev.map(i => i.id === updated.id ? {
...i,
name: updated.name,
category: updated.category,
seasons: updated.seasons,
colorTags: updated.colorTags,
occasions: updated.occasions,
description: updated.description || '',
} : i))

if (USE_SUPABASE && supabase) {
try {
await supabase.from('items').update({
name: updated.name,
category: updated.category,
seasons: updated.seasons,
color_tags: updated.colorTags,
occasions: updated.occasions,
description: updated.description || '',
}).eq('id', updated.id)
} catch (e) { console.warn('SB update failed', e) }
}
}
async function deleteItem(id) {
const item = items.find(i => i.id === id)
setItems(prev => prev.filter(i => i.id !== id))
if (USE_SUPABASE && supabase) {
try {
if (item?.imagePath) await supabase.storage.from('items').remove([item.imagePath])
await supabase.from('items').delete().eq('id', id)
} catch (e) { console.warn('SB delete failed', e) }
}
}

// looks
  function saveCurrentOutfit() {
    if (!canvasItems.length) return
    const id = `o${Date.now()}`
    const lookName = outfitName.trim() || 'Untitled Look'
    const snapshot = canvasItems.map(ci => {
      const source = items.find(i => i.id === ci.itemId)
      return {
        ...ci,
        snapshot: source ? {
          name: source.name,
          imageUrl: source.imageUrl || '',
          icon: source.icon,
        } : { name: 'Closet item', imageUrl: '', icon: 'shirt' },
      }
    })
    setSavedLooks(prev => [...prev, { id, name: lookName, seasons: [...outfitSeasons], canvas: snapshot }])
    setCanvasItems([])
    setSelectedCanvasId(null)
    setOutfitName('Untitled Look')
    setOutfitSeasons([])
  }
function deleteLook(id) { setSavedLooks(prev => prev.filter(l => l.id !== id)) }

// word rotation for dashboard
const [wordIdx, setWordIdx] = useState(0)
useEffect(() => { const t = setInterval(() => setWordIdx(i => (i + 1) % WORDS.length), 1600); return () => clearInterval(t) }, [])

return (
<div style={styles.app}>
<style>{CSS}</style>

{/* Header */}
<header style={styles.header}>
<div style={styles.brand}>ENSEMBLE</div>
<nav style={styles.nav}>
<NavBtn label="Dashboard" active={tab === 'dashboard'} onClick={() => setTab('dashboard')} />
<NavBtn label="Digital Closet" active={tab === 'closet'} onClick={() => setTab('closet')} />
<NavBtn label="Outfit Builder" active={tab === 'builder'} onClick={() => setTab('builder')} />
<NavBtn label="Saved Looks" active={tab === 'gallery'} onClick={() => setTab('gallery')} />
</nav>
</header>

<main style={styles.main}>
        {tab === 'dashboard' && (
          <Dashboard
            items={items}
            savedLooks={savedLooks}
            heroWord={WORDS[wordIdx]}
            goToCloset={() => setTab('closet')}
          />
        )}

{tab === 'closet' && (
<Closet
items={visibleItems}
onSelectItem={() => { }}
onDragStart={onDragStart}
activeCategory={activeCategory}
onCategory={setActiveCategory}
activeSeasonsFilter={activeSeasonsFilter}
onSeasonsFilter={setActiveSeasonsFilter}
onUploadClick={onUploadClick}
fileInputRef={fileInputRef}
onFileChange={onFileChange}
onUpdateItem={updateItem}
onDeleteItem={deleteItem}
/>
)}

        {tab === 'builder' && (
          <Builder
            items={items}
            canvasItems={canvasItems}
            onDragStart={onDragStart}
            onCanvasDrop={handleCanvasDrop}
            onQuickAdd={handleQuickAdd}
            onSelectCanvas={setSelectedCanvasId}
            selectedCanvasId={selectedCanvasId}
            onMoveCanvasItem={moveCanvasItem}
            onUpdateCanvasItem={updateCanvasItem}
            onRemoveCanvasItem={removeCanvasItem}
            onLayerUp={layerUp}
            onLayerDown={layerDown}
            outfitName={outfitName}
            onOutfitName={setOutfitName}
            outfitSeasons={outfitSeasons}
            onToggleSeason={toggleOutfitSeason}
            onClearCanvas={clearCanvas}
            onSaveOutfit={saveCurrentOutfit}
          />
        )}

{tab === 'gallery' && (
<Gallery items={items} savedLooks={savedLooks} onDeleteLook={deleteLook} />
)}
</main>
</div>
)
}

// ----------------------- Components -------------------------
function NavBtn({ label, active, onClick }) {
return (
<button className={`nav-btn ${active ? 'active' : ''}`} onClick={onClick}>{label}</button>
)
}

function Dashboard({ items, savedLooks, heroWord, goToCloset }) {
  const bgUrl = useMemo(() => HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)], [])
  const heroStyle = { backgroundImage: `url(${bgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
  const recent = (items || []).slice(0, 6)
  const newest = items?.[0]
  const lookCount = savedLooks?.length || 0
  return (
    <section className="section">
      <div className={`hero with-bg`} style={heroStyle}>
        <div className="hero-overlay" aria-hidden="true" />
        <h1 className="hero-title">
<span className="hero-be">BE</span>
<span className="hero-word"><span key={heroWord} className="swap-word">{heroWord}</span></span>
</h1>
<p className="hero-sub">High‑contrast editorial tools for decisive dressing.</p>
<div className="cta-row">
<button className="btn" onClick={goToCloset}>Go to Closet</button>
</div>
</div>

<h2 className="section-title"><span className="section-num">01</span> Recent Items</h2>
<div className="grid">
{recent.map(i => (
<div key={i.id} className="card">
<div className={`card-frame ${i.imageUrl ? 'no-frame' : ''}`}>
{i.imageUrl ? <img src={i.imageUrl} alt={i.name} className="no-frame-img" /> : iconByKey(i.icon, { size: 36 })}
</div>
<div className="card-body">
<div className="card-title">{i.name}</div>
<div className="card-sub">{i.category}</div>
</div>
</div>
))}
</div>

      <h2 className="section-title"><span className="section-num">02</span> Stats</h2>
      <div className="stats">
        <div className="stat-box"><div className="stat-num">{items?.length || 0}</div><div className="stat-label">Items</div></div>
        <div className="stat-box"><div className="stat-num">{lookCount}</div><div className="stat-label">Saved Looks</div></div>
        <div className="stat-box"><div className="stat-num">{newest?.name || '—'}</div><div className="stat-label">Latest Item</div></div>
      </div>
    </section>
  )
}

function Closet({ items, activeCategory, onCategory, onSeasonsFilter, activeSeasonsFilter, onDragStart, onUploadClick, fileInputRef, onFileChange, onUpdateItem, onDeleteItem }) {
const [editing, setEditing] = useState(null) // id
const selected = items.find(i => i.id === editing)
return (
<section className="section">
<div className="toolbar">
<div className="tabs">
{CATEGORIES.map(c => (
<button key={c.key} className={`tab ${activeCategory === c.key ? 'active' : ''}`} onClick={() => onCategory(c.key)}>
{c.icon ? iconByKey(c.icon, { size: 16 }) : null}<span>{c.label}</span>
</button>
))}
</div>
<div className="filters">
<Filter size={16} />
{ALL_SEASONS.map(s => (
<label key={s} className={`badge ${activeSeasonsFilter.includes(s) ? 'active' : ''}`}>
<input type="checkbox" checked={activeSeasonsFilter.includes(s)} onChange={() => onSeasonsFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])} />
{s}
</label>
))}
</div>
<div className="uploader">
<button className="btn" onClick={onUploadClick}><Upload size={16} /> Upload</button>
<input ref={fileInputRef} type="file" accept="image/png,image/webp,image/jpeg" hidden onChange={onFileChange} />
</div>
</div>

<div className="grid">
{items.map(i => (
<div key={i.id} className={`item-card ${i.category==='uncategorized' ? 'hint' : ''}`} draggable={i.category!=='uncategorized'} onDragStart={(e) => onDragStart(e, i)} onClick={() => setEditing(i.id)} title={i.category==='uncategorized' ? 'Set category in editor to enable drag' : 'Drag to Builder board'}>
<div className="polaroid">
<div className={`polaroid-frame ${i.imageUrl ? 'no-frame' : ''}`}>
{i.imageUrl ? (
<img src={i.imageUrl} alt={i.name} className="no-frame-img" />
) : (
iconByKey(i.icon, { size: 40 })
)}
</div>
</div>
<div className="item-meta">
<div className="item-title">{i.name}</div>
<div className="item-sub">{i.category}</div>
<div className="item-tags">
{i.colorTags?.map((c, idx) => <span key={idx} className="tag">{c}</span>)}
{i.seasons?.map((s, idx) => <span key={s+idx} className="tag">{s}</span>)}
</div>
</div>
</div>
))}
</div>

{selected && (
<ItemEditor
item={selected}
onClose={() => setEditing(null)}
onSave={(upd) => { onUpdateItem(upd); setEditing(null) }}
onDelete={(id) => { onDeleteItem(id); setEditing(null) }}
/>
)}
</section>
)
}

function ItemEditor({ item, onSave, onClose, onDelete }) {
const [name, setName] = useState(item.name)
const [category, setCategory] = useState(item.category)
const [seasons, setSeasons] = useState(item.seasons || [])
const [colorTags, setColorTags] = useState(item.colorTags || [])
const [occasions, setOccasions] = useState(item.occasions || [])
const [desc, setDesc] = useState(item.description || '')

// suggest colors from name only when colorTags is empty
useEffect(() => {
if (!colorTags?.length) {
const suggestions = suggestColorsFromName(name)
if (suggestions.length) setColorTags(suggestions)
}
// do NOT overwrite user chips once they've added any
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [name])

function toggleSeason(s) { setSeasons(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]) }

function addChip(list, setList, value) {
const v = (value || '').trim().toLowerCase(); if (!v) return
setList(prev => Array.from(new Set([...prev, v])))
}
function removeChip(list, setList, idx) { setList(list.filter((_, i) => i !== idx)) }

return (
<div className="drawer">
<div className="drawer-head">
<div className="form-title">Edit Item</div>
<button className="icon-btn" onClick={onClose}><X size={16} /></button>
</div>

<div className="form-row">
<div className="form-label">Name</div>
<input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Red Wool Scarf" />
</div>

<div className="form-row">
<div className="form-label">Category</div>
<select className="select" value={category} onChange={e => setCategory(e.target.value)}>
{CATEGORIES.filter(c => c.key !== 'all').map(c => (
<option key={c.key} value={c.key}>{c.label}</option>
))}
</select>
{category === 'uncategorized' && <div className="help italic">Set a category to enable drag & drop.</div>}
</div>

<div className="form-row">
<div className="form-label">Seasons</div>
<div className="checks">
{ALL_SEASONS.map(s => (
<label key={s} className="check">
<input type="checkbox" checked={seasons.includes(s)} onChange={() => toggleSeason(s)} />
<span>{s}</span>
</label>
))}
</div>
</div>

<div className="form-row">
<div className="form-label">Color Tags</div>
<ChipInput value={colorTags} onAdd={(v) => addChip(colorTags, setColorTags, v)} onRemove={(i) => removeChip(colorTags, setColorTags, i)} placeholder="Type a color and press Enter (e.g., red, olive)" />
<div className="help italic">We auto‑suggest from Name only when empty; you are always in control.</div>
</div>

<div className="form-row">
<div className="form-label">Occasions</div>
<ChipInput value={occasions} onAdd={(v) => addChip(occasions, setOccasions, v)} onRemove={(i) => removeChip(occasions, setOccasions, i)} placeholder="Type an occasion and press Enter (e.g., work, gallery)" />
</div>

<div className="form-row">
<div className="form-label">Notes</div>
<textarea className="textarea" rows={3} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Styling notes, fabric, proportions..." />
</div>

<div className="drawer-actions">
<button className="btn" onClick={() => onSave({ ...item, name, category, seasons, colorTags, occasions, description: desc })}>Save</button>
<button className="btn danger" onClick={() => onDelete(item.id)}><Trash2 size={16} /> Delete</button>
</div>
</div>
)
}

function ChipInput({ value = [], onAdd, onRemove, placeholder }) {
const [text, setText] = useState('')
function onKeyDown(e) {
if (e.key === 'Enter') { e.preventDefault(); onAdd?.(text); setText('') }
if (e.key === 'Backspace' && !text && value.length) onRemove?.(value.length - 1)
}
return (
<div className="chips">
<div className="chip-list">
{value.map((v, idx) => (
<span key={idx} className="chip">{v}<button className="chip-x" onClick={() => onRemove?.(idx)} aria-label={`remove ${v}`}><X size={12} /></button></span>
))}
<input className="chip-input" value={text} onChange={e => setText(e.target.value)} onKeyDown={onKeyDown} placeholder={placeholder} />
</div>
</div>
)
}

function Builder({
  items,
  canvasItems,
  onDragStart,
  onCanvasDrop,
  onQuickAdd,
  onSelectCanvas,
  selectedCanvasId,
  onMoveCanvasItem,
  onUpdateCanvasItem,
  onRemoveCanvasItem,
  onLayerUp,
  onLayerDown,
  outfitName,
  onOutfitName,
  outfitSeasons,
  onToggleSeason,
  onClearCanvas,
  onSaveOutfit,
}) {
  const boardRef = useRef(null)
  const closetMap = useMemo(() => {
    const map = new Map()
    items.forEach(item => map.set(item.id, item))
    return map
  }, [items])
  const selected = selectedCanvasId ? canvasItems.find(ci => ci.canvasId === selectedCanvasId) : null
  const selectedItem = selected ? closetMap.get(selected.itemId) : null

  function handleDrop(e) {
    e.preventDefault()
    const board = boardRef.current
    if (!board) return
    const rect = board.getBoundingClientRect()
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100
    const fallbackId = e.dataTransfer?.getData('text/plain') || undefined
    onCanvasDrop({ xPercent, yPercent, fallbackId })
  }

  function handleDragOver(e) {
    e.preventDefault()
  }

  function handleBoardClick() {
    onSelectCanvas(null)
  }

  return (
    <section className="section builder free-builder">
      <div className="builder-left">
        <h2 className="section-title"><span className="section-num">03</span> Outfit Builder</h2>
        <p className="muted">Drag or double-click wardrobe items to place them anywhere.</p>
        <div className="filmstrip">
          {items.map(i => (
            <div
              key={i.id}
              className={`film-cell ${i.category === 'uncategorized' ? 'dim' : ''}`}
              draggable={i.category !== 'uncategorized'}
              onDragStart={e => onDragStart?.(e, i)}
              onDoubleClick={() => {
                if (i.category !== 'uncategorized') onQuickAdd?.(i.id)
              }}
              title={i.category === 'uncategorized' ? 'Edit item to set category before using in builder' : 'Drag or double-click to add'}
            >
              <div className="film-frame">
                {i.imageUrl ? <img src={i.imageUrl} alt={i.name} className="no-frame-img small" /> : iconByKey(i.icon, { size: 28 })}
              </div>
              <div className="film-caption">{i.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="builder-center">
        <div
          ref={boardRef}
          className="free-board"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={handleBoardClick}
        >
          {canvasItems.length === 0 && (
            <div className="board-hint">Drop pieces here and arrange freely.</div>
          )}
          {canvasItems
            .slice()
            .sort((a, b) => (a.z || 0) - (b.z || 0))
            .map(ci => {
              const src = closetMap.get(ci.itemId)
              return (
                <CanvasItem
                  key={ci.canvasId}
                  data={ci}
                  item={src}
                  boardRef={boardRef}
                  selected={ci.canvasId === selectedCanvasId}
                  onSelect={onSelectCanvas}
                  onMove={onMoveCanvasItem}
                />
              )
            })}
        </div>
      </div>

      <div className="builder-right">
        <div className="builder-panel">
          <div className="panel-title">Look Details</div>
          <div className="form-row">
            <div className="form-label">Look Name</div>
            <input
              className="input"
              value={outfitName}
              onChange={e => onOutfitName(e.target.value)}
              placeholder="e.g., Gallery Opening"
            />
          </div>
          <div className="form-row">
            <div className="form-label">Season</div>
            <div className="checks">
              {ALL_SEASONS.map(s => (
                <label key={s} className="check">
                  <input type="checkbox" checked={outfitSeasons.includes(s)} onChange={() => onToggleSeason(s)} />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="panel-actions">
            <button className="btn" onClick={onSaveOutfit} disabled={!canvasItems.length}>Save Look</button>
            <button className="btn" onClick={onClearCanvas} disabled={!canvasItems.length}>Clear Board</button>
          </div>
        </div>

        <div className="builder-panel">
          <div className="panel-title">Item Controls</div>
          {selected ? (
            <div className="panel-body">
              <div className="selected-preview">
                <div className="canvas-inner static">
                  {selectedItem?.imageUrl ? (
                    <img src={selectedItem.imageUrl} alt={selectedItem.name} className="canvas-img" />
                  ) : (
                    iconByKey(selectedItem?.icon || 'shirt', { size: 32 })
                  )}
                </div>
                <div>
                  <div className="item-title">{selectedItem?.name || 'Closet item'}</div>
                  <div className="muted">{selectedItem?.category || 'Uncategorized'}</div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-label">Size</div>
                <input
                  type="range"
                  min="0.5"
                  max="1.8"
                  step="0.05"
                  value={selected.scale || 1}
                  onChange={e => onUpdateCanvasItem(selected.canvasId, { scale: parseFloat(e.target.value) })}
                />
                <div className="muted small">Scale: {selected.scale?.toFixed(2) || '1.00'}</div>
              </div>
              <div className="layer-controls">
                <button className="btn" onClick={() => onLayerUp(selected.canvasId)}>Layer Up</button>
                <button className="btn" onClick={() => onLayerDown(selected.canvasId)}>Layer Down</button>
              </div>
              <div className="panel-actions">
                <button className="btn danger" onClick={() => onRemoveCanvasItem(selected.canvasId)}>Remove Item</button>
              </div>
            </div>
          ) : (
            <p className="muted">Select a canvas item to adjust size, layers, or remove it.</p>
          )}
        </div>
      </div>
    </section>
  )
}

function CanvasItem({ data, item, boardRef, selected, onSelect, onMove }) {
  const [dragging, setDragging] = useState(false)

  function handlePointerDown(e) {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    e.stopPropagation()
    onSelect?.(data.canvasId)
    const board = boardRef.current
    if (!board) return
    const rect = board.getBoundingClientRect()
    const startX = e.clientX
    const startY = e.clientY
    const initialX = data.x
    const initialY = data.y
    const target = e.currentTarget
    setDragging(true)
    target.setPointerCapture(e.pointerId)

    const handleMove = ev => {
      const dx = ((ev.clientX - startX) / rect.width) * 100
      const dy = ((ev.clientY - startY) / rect.height) * 100
      onMove?.(data.canvasId, initialX + dx, initialY + dy)
    }

    const handleUp = ev => {
      setDragging(false)
      target.releasePointerCapture(ev.pointerId)
      target.removeEventListener('pointermove', handleMove)
      target.removeEventListener('pointerup', handleUp)
      target.removeEventListener('pointercancel', handleUp)
    }

    target.addEventListener('pointermove', handleMove)
    target.addEventListener('pointerup', handleUp)
    target.addEventListener('pointercancel', handleUp)
  }

  return (
    <div
      className={`canvas-item ${selected ? 'selected' : ''} ${dragging ? 'dragging' : ''}`}
      style={{
        left: `${data.x}%`,
        top: `${data.y}%`,
        zIndex: data.z || 1,
        transform: `translate(-50%, -50%) scale(${data.scale || 1})`,
      }}
      onPointerDown={handlePointerDown}
      onClick={e => { e.stopPropagation(); onSelect?.(data.canvasId) }}
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect?.(data.canvasId)
        }
      }}
    >
      <div className="canvas-inner">
        {item?.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="canvas-img" />
        ) : (
          iconByKey(item?.icon || 'shirt', { size: 36 })
        )}
      </div>
      <div className="canvas-label">{item?.name || 'Item'}</div>
    </div>
  )
}

function Gallery({ items, savedLooks, onDeleteLook }) {
  const list = savedLooks || []
  const closetMap = useMemo(() => {
    const map = new Map()
    items.forEach(item => map.set(item.id, item))
    return map
  }, [items])

  if (!list.length) {
    return (
      <section className="section">
        <h2 className="section-title"><span className="section-num">04</span> Saved Looks</h2>
        <p className="muted">Save outfits from the builder to revisit them here.</p>
      </section>
    )
  }

  return (
    <section className="section">
      <h2 className="section-title"><span className="section-num">04</span> Saved Looks</h2>
      <div className="masonry">
        {list.map(look => {
          const canvas = (look.canvas || []).slice().sort((a, b) => (a.z || 0) - (b.z || 0))
          return (
            <div key={look.id} className="masonry-card">
              <div className="polaroid">
                <div className="polaroid-frame no-frame">
                  <div className="free-board static">
                    {canvas.map(ci => {
                      const current = closetMap.get(ci.itemId)
                      const display = current || ci.snapshot || {}
                      return (
                        <div
                          key={ci.canvasId}
                          className="canvas-item preview"
                          style={{
                            left: `${ci.x}%`,
                            top: `${ci.y}%`,
                            transform: `translate(-50%, -50%) scale(${ci.scale || 1})`,
                            zIndex: ci.z || 1,
                          }}
                        >
                          <div className="canvas-inner">
                            {display.imageUrl ? (
                              <img src={display.imageUrl} alt={display.name || 'Item'} className="canvas-img" />
                            ) : (
                              iconByKey(display.icon || 'shirt', { size: 28 })
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {!canvas.length && <div className="board-hint small">No items saved</div>}
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="card-title">{look.name}</div>
                <div className="season-tag-row">
                  {look.seasons?.length ? (
                    look.seasons.map(s => <span key={s} className="tag small">{s}</span>)
                  ) : (
                    <span className="muted italic">Any season</span>
                  )}
                </div>
                <button className="btn danger" onClick={() => onDeleteLook(look.id)}><Trash2 size={16} /> Delete Look</button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ----------------------- Styles ------------------------------
const styles = {
app: { fontFamily: FONT_STACK, background: COLORS.off, color: COLORS.black, minHeight: '100vh' },
header: { position: 'sticky', top: 0, zIndex: 10, background: COLORS.black, color: COLORS.white, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: `2px solid ${COLORS.white}` },
brand: { fontWeight: 700, letterSpacing: '2px' },
nav: { display: 'flex', gap: 8 },
main: { padding: 20, maxWidth: 1200, margin: '0 auto' },
}

const CSS = `
:root{ --black:${COLORS.black}; --white:${COLORS.white}; --off:${COLORS.off}; --charcoal:${COLORS.charcoal}; --gray:${COLORS.gray}; --light:${COLORS.light}; --red:${COLORS.red}; }
.italic{font-style:italic} .muted{color:var(--gray)}

.nav-btn{ font-family:${FONT_STACK}; color:var(--white); background:transparent; border:2px solid var(--white); padding:6px 10px; text-transform:uppercase; letter-spacing:1px; box-shadow:4px 4px 0 var(--white); cursor:pointer; transition:transform .12s, background .12s, color .12s }
.nav-btn:hover{ background:var(--white); color:var(--black); transform:translate(-2px,-2px) }
.nav-btn.active{ background:var(--white); color:var(--black) }

.section{ margin:24px 0 }
.section-title{ font-weight:700; font-size:28px; display:flex; align-items:center; gap:12px; border-bottom:2px solid var(--black); padding-bottom:8px; margin-bottom:16px }
.section-num{ font-size:36px; color:var(--light) }

.hero{ position:relative; color:var(--white); padding:28px; box-shadow:4px 4px 0 var(--black) inset; background:var(--black); min-height:220px; display:flex; flex-direction:column; justify-content:center }
.hero.with-bg{ background-color:#000; background-blend-mode:normal }
.hero-overlay{ position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.35)); pointer-events:none }
.hero-title{ font-size:32px; display:flex; flex-direction:column; gap:6px; z-index:1 }
.hero-be{ font-weight:700; letter-spacing:4px }
.hero-word{ font-style:italic; line-height:1 }
.swap-word{ display:inline-block; animation:wordfade .45s ease }
@keyframes wordfade{ 0%{opacity:0; transform:translateY(6px)} 100%{opacity:1; transform:translateY(0)} }
.hero-sub{ font-size:16px; color:var(--off); z-index:1 }
.cta-row{ display:flex; gap:8px; margin-top:12px; z-index:1 }

.grid{ display:grid; grid-template-columns:repeat(auto-fill, minmax(220px,1fr)); gap:16px }
.card{ border:2px solid var(--black); background:var(--white); box-shadow:4px 4px 0 var(--black); display:flex; gap:10px; padding:12px; transition:transform .1s }
.card:hover{ transform:translate(-2px,-2px) }
.card-frame{ width:60px; height:60px; display:grid; place-items:center; border:2px solid var(--black) }
.card-frame.no-frame{ border:none; box-shadow:none; background:transparent }
.card-title{ font-weight:700 }
.card-sub{ color:var(--gray); font-size:14px }

.stats{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:12px }
.stat-box{ background:var(--black); color:var(--white); text-align:center; padding:14px; box-shadow:4px 4px 0 var(--black) }
.stat-num{ font-size:24px; font-weight:700 }
.stat-label{ font-size:12px; letter-spacing:1px }

.toolbar{ display:flex; gap:12px; align-items:center; margin-bottom:12px }
.tabs{ display:flex; gap:8px }
.tab{ display:inline-flex; align-items:center; gap:6px; padding:6px 10px; border:2px solid var(--black); background:var(--white); box-shadow:4px 4px 0 var(--black); cursor:pointer; transition:background .12s, color .12s, transform .12s }
.tab:hover{ background:var(--black); color:var(--white); transform:translate(-2px,-2px) }
.tab.active{ background:var(--black); color:var(--white) }
.filters{ display:flex; gap:6px; align-items:center }
.badge{ border:2px solid var(--black); padding:4px 8px; background:var(--white); cursor:pointer }
.badge.active{ background:var(--black); color:var(--white) }
.uploader{ display:inline-flex; gap:8px; align-items:center }
.select{ border:2px solid var(--black); background:var(--white); padding:6px }
.btn{ border:2px solid var(--black); padding:6px 10px; background:var(--white); box-shadow:4px 4px 0 var(--black); cursor:pointer }
.btn:hover{ transform:translate(-2px,-2px) }
.btn.danger{ border-color:var(--red); color:var(--red) }
.icon-btn{ border:2px solid var(--black); background:var(--white); padding:4px; cursor:pointer }

.item-card{ border:2px solid var(--black); background:var(--white); box-shadow:4px 4px 0 var(--black); cursor:grab }
.item-card:active{ cursor:grabbing }
.item-card.hint{ opacity:.85; outline:2px dashed var(--red) }
.polaroid{ background:var(--white); border-bottom:2px solid var(--black); padding:8px }
.polaroid-frame{ border:2px solid var(--black); height:120px; display:grid; place-items:center }
.polaroid-frame.no-frame{ border:none; box-shadow:none }
.item-meta{ padding:10px }
.item-title{ font-weight:700 }
.item-sub{ color:var(--gray); font-size:12px }
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
.builder{ display:grid; grid-template-columns:240px 1fr 320px; gap:16px }
.free-builder .builder-left{ align-self:flex-start }
.filmstrip{ display:grid; grid-template-columns:repeat(2,1fr); gap:8px }
.film-cell{ background:var(--white); border:2px solid var(--black); padding:8px; cursor:grab; transition:transform .12s, box-shadow .12s }
.film-cell:hover{ transform:translate(-2px,-2px); box-shadow:4px 4px 0 var(--black) }
.film-cell.dim{ opacity:.35; cursor:not-allowed; pointer-events:none }
.film-frame{ border:2px solid var(--black); height:60px; display:grid; place-items:center; box-shadow:4px 4px 0 var(--black); background:var(--white) }
.film-caption{ font-size:12px; text-align:center; margin-top:6px }
.builder-center{ display:flex; justify-content:center; align-items:stretch }
.free-board{ position:relative; border:2px solid var(--black); background:var(--white); box-shadow:4px 4px 0 var(--black); min-height:520px; width:100%; overflow:hidden }
.free-board::before{ content:""; position:absolute; inset:0; background-image:linear-gradient(90deg, rgba(0,0,0,.06) 1px, transparent 1px), linear-gradient(180deg, rgba(0,0,0,.06) 1px, transparent 1px); background-size:80px 80px; opacity:.6; pointer-events:none }
.free-board.static{ min-height:320px; pointer-events:none }
.board-hint{ position:absolute; inset:0; display:flex; align-items:center; justify-content:center; text-align:center; color:var(--gray); font-style:italic; padding:16px; pointer-events:none }
.board-hint.small{ font-size:12px }
.canvas-item{ position:absolute; width:150px; height:150px; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; cursor:grab; transition:box-shadow .12s }
.canvas-item.dragging{ cursor:grabbing }
.canvas-item .canvas-inner{ width:120px; height:110px; border:2px solid var(--black); background:var(--white); display:flex; align-items:center; justify-content:center; box-shadow:4px 4px 0 var(--black) }
.canvas-item.selected .canvas-inner{ border-color:var(--red); box-shadow:4px 4px 0 var(--red) }
.canvas-label{ margin-top:6px; font-size:12px; padding:2px 6px; border:2px solid var(--black); background:var(--white); box-shadow:2px 2px 0 var(--black); text-align:center }
.canvas-item.preview{ cursor:default }
.canvas-item.preview .canvas-inner{ width:100px; height:90px; box-shadow:2px 2px 0 var(--black) }
.canvas-item.preview .canvas-label{ display:none }
.canvas-img{ max-width:100%; max-height:100%; object-fit:contain; background:transparent }
.canvas-inner.static{ width:80px; height:80px; border:2px solid var(--black); display:flex; align-items:center; justify-content:center; box-shadow:4px 4px 0 var(--black) }
.builder-panel{ border:2px solid var(--black); background:var(--white); box-shadow:4px 4px 0 var(--black); padding:12px; margin-bottom:12px }
.panel-title{ font-weight:700; font-size:14px; letter-spacing:1px; text-transform:uppercase; margin-bottom:8px }
.panel-body{ display:flex; flex-direction:column; gap:12px }
.selected-preview{ display:flex; gap:12px; align-items:center }
.layer-controls{ display:flex; gap:8px; flex-wrap:wrap }
.panel-actions{ display:flex; gap:8px; flex-wrap:wrap; margin-top:8px }
.season-tag-row{ display:flex; gap:6px; flex-wrap:wrap; margin:8px 0 }
.tag.small{ font-size:12px; padding:2px 6px }
.muted.small{ font-size:12px; color:var(--gray) }

/* Gallery */
.masonry{ column-count:3; column-gap:12px }
.masonry-card{ break-inside:avoid; border:2px solid var(--black); background:var(--white); box-shadow:4px 4px 0 var(--black); margin-bottom:12px }

.no-frame-img{ max-width:100%; max-height:100%; object-fit:contain; display:block; background:transparent }
.no-frame-img.small{ max-height:40px }
`
