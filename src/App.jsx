// App.jsx — Ensemble (Unified Single File)
// ✅ Georgia typography, editorial B/W + red
// ✅ Closet: single Upload button; new items are `uncategorized`
// ✅ Item Editor: Category select + free‑form Color/Occasion chips; Seasons checkboxes
// ✅ Color tags: user types + Enter → chips; auto‑detect from Name ONLY when tags are empty; learns new colors
// ✅ Builder + Saved Looks: freeform canvas builder
// ✅ Drag & Drop: disabled until category set (not `uncategorized`); accessories capped at 3
// ✅ Delete Items + Delete Looks (best‑effort storage delete when Supabase on)
// ✅ Dashboard: smoother BE/word animation + optional hero image with overlay
// ✅ lucide-react: valid icons only; custom Jacket/Trousers SVGs

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Rnd } from 'react-rnd'
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
const EMPTY_OUTFIT = { id: 'o1', name: 'Untitled Look', seasons: [], items: [] }

// ----------------------- App --------------------------------
export default function App() {
const [tab, setTab] = useState('dashboard')
const [items, setItems] = useState(() => {
  try { return JSON.parse(localStorage.getItem('ensemble.items') || '[]') } catch { return [] }
})
const [activeCategory, setActiveCategory] = useState('all')
const [activeSeasonsFilter, setActiveSeasonsFilter] = useState([])
const [outfit, setOutfit] = useState(EMPTY_OUTFIT)
const [savedLooks, setSavedLooks] = useState(() => {
  try { return JSON.parse(localStorage.getItem('ensemble.looks') || '[]') } catch { return [] }
})
const [selectedItemId, setSelectedItemId] = useState(null)

// learned colors cache (for suggestions)
const [learned, setLearned] = useState(getLearnedColors())
useEffect(() => setLearned(getLearnedColors()), [])
useEffect(() => { try { localStorage.setItem('ensemble.items', JSON.stringify(items)) } catch { } }, [items])
useEffect(() => { try { localStorage.setItem('ensemble.looks', JSON.stringify(savedLooks)) } catch { } }, [savedLooks])

// drag data
const dragDataRef = useRef(null)
const canvasRef = useRef(null)
function onDragStart(e, item) {
if (!item || item.category === 'uncategorized') return // block dragging until categorized
dragDataRef.current = item
e.dataTransfer.setData('text/plain', item.id)
e.dataTransfer.effectAllowed = 'move'
}
function onDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }
function handleCanvasDrop(e) {
  e.preventDefault();
  const item = dragDataRef.current;
  if (!item) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  setOutfit(prev => ({
    ...prev,
    items: [...prev.items, { id: item.id, x, y, scale: 1, z: prev.items.length + 1 }]
  }));
  snapOk(e.currentTarget);
}
function updateOutfitItem(id, changes) {
  setOutfit(prev => ({
    ...prev,
    items: prev.items.map(o => (o.id === id ? { ...o, ...changes } : o))
  }))
}

function moveLayer(id, dir) {
  setOutfit(prev => {
    const sorted = [...prev.items].sort((a, b) => a.z - b.z)
    const idx = sorted.findIndex(i => i.id === id)
    const swapIdx = idx + dir
    if (idx === -1 || swapIdx < 0 || swapIdx >= sorted.length) return prev
    ;[sorted[idx].z, sorted[swapIdx].z] = [sorted[swapIdx].z, sorted[idx].z]
    return { ...prev, items: sorted.map((it, i) => ({ ...it, z: i + 1 })) }
  })
}

function removeOutfitItem(id) {
  setOutfit(prev => {
    const remaining = prev.items.filter(o => o.id !== id).sort((a, b) => a.z - b.z)
    return { ...prev, items: remaining.map((it, i) => ({ ...it, z: i + 1 })) }
  })
  setSelectedItemId(sid => (sid === id ? null : sid))
}
function snapOk(el) { el.classList.remove('anim-snap'); void el.offsetWidth; el.classList.add('anim-snap') }

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
async function updateClosetItem(updated) {
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
  if (!outfit.items.length) return
  const rect = canvasRef.current?.getBoundingClientRect() || { width: 0, height: 0 }
  const id = `o${Date.now()}`
  const ordered = [...outfit.items].sort((a, b) => a.z - b.z)
  setSavedLooks(prev => [
    ...prev,
    { id, name: outfit.name || 'Saved Look', seasons: outfit.seasons || [], items: structuredClone(ordered), w: rect.width, h: rect.height }
  ])
}
function deleteLook(id) { setSavedLooks(prev => prev.filter(l => l.id !== id)) }
function updateSavedLook(id, changes) {
  setSavedLooks(prev => prev.map(l => (l.id === id ? { ...l, ...changes } : l)))
}

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
onUpdateItem={updateClosetItem}
onDeleteItem={deleteItem}
/>
)}

{tab === 'builder' && (
<Builder
        items={items}
        outfit={outfit}
        selectedItemId={selectedItemId}
        setSelectedItemId={setSelectedItemId}
        onDragOver={onDragOver}
        onDragStart={onDragStart}
        handleCanvasDrop={handleCanvasDrop}
        updateOutfitItem={updateOutfitItem}
        moveLayer={moveLayer}
        removeOutfitItem={removeOutfitItem}
        onSaveOutfit={saveCurrentOutfit}
        canvasRef={canvasRef}
        setOutfit={setOutfit}
      />
)}

{tab === 'gallery' && (
<Gallery items={items} savedLooks={savedLooks} onDeleteLook={deleteLook} onUpdateLook={updateSavedLook} />
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

function Dashboard({ items, heroWord, goToCloset }) {
const HERO_BG = 'https://i.pinimg.com/1200x/f9/74/0b/f9740b79ef42a33a3ccba2b913654573.jpg'
const heroStyle = { backgroundImage: `url(${HERO_BG})`, backgroundSize: 'cover', backgroundPosition: 'center' }
const recent = (items || []).slice(0, 6)
return (
<section className="section">
<div className="hero with-bg" style={heroStyle}>
<div className="hero-overlay" aria-hidden="true" />
<div className="hero-content">
<h1 className="hero-title">
<span className="hero-be">BE</span>
<span className="hero-word"><span key={heroWord} className="swap-word">{heroWord}</span></span>
</h1>
<p className="hero-sub">High‑contrast editorial tools for decisive dressing.</p>
<div className="cta-row">
<button className="btn" onClick={goToCloset}>Go to Closet</button>
</div>
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
<div className="stat-box"><div className="stat-num">{0 + ''}</div><div className="stat-label">Looks</div></div>
<div className="stat-box"><div className="stat-num">—</div><div className="stat-label">Last Added</div></div>
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
<div className="item-overlay">
<div className="overlay-title">{i.name}</div>
<div className="overlay-tags">
{i.seasons?.map((s, idx) => <span key={s+idx} className="overlay-tag">{s}</span>)}
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

function DraggableResizable({ data, onUpdate, onSelect, children }) {
  return (
    <Rnd
      size={{ width: 100 * data.scale, height: 100 * data.scale }}
      position={{ x: data.x, y: data.y }}
      onDragStop={(e, d) => onUpdate({ x: d.x, y: d.y })}
      dragHandleClassName="drag-handle"
      dragGrid={[1, 1]}
      bounds=".free-canvas"
      enableResizing={false}
      style={{ cursor: 'grab', zIndex: data.z, userSelect: 'none', position: 'absolute' }}
      onMouseDown={onSelect}
    >
      <div className="drag-handle" style={{ width: '100%', height: '100%' }}>
        <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
          {children}
        </div>
      </div>
    </Rnd>
  )
}

function Builder({ items, outfit, selectedItemId, setSelectedItemId, onDragOver, onDragStart, handleCanvasDrop, updateOutfitItem, moveLayer, removeOutfitItem, onSaveOutfit, canvasRef, setOutfit }) {
  const getItem = id => items.find(i => i.id === id)
  const selectedItem = outfit.items.find(i => i.id === selectedItemId)
  const itemsSortedByZ = [...outfit.items].sort((a, b) => b.z - a.z)
  return (
    <section className="section builder">
      <div className="builder-left">
        <h2 className="section-title"><span className="section-num">03</span> Categories</h2>
        <p className="muted">Drag items onto the canvas.</p>
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

      <div className="builder-center">
        <div ref={canvasRef} className="free-canvas" onDragOver={onDragOver} onDrop={handleCanvasDrop}>
          {outfit.items.map(o => {
            const it = getItem(o.id)
            return (
              <DraggableResizable
                key={o.id}
                data={o}
                onUpdate={changes => updateOutfitItem(o.id, changes)}
                onSelect={() => setSelectedItemId(o.id)}
              >
                {it?.imageUrl ? (
                  <img src={it.imageUrl} alt={it.name} draggable={false} />
                ) : (
                  iconByKey(it.icon, { size: 36 })
                )}
              </DraggableResizable>
            )
          })}
        </div>
      </div>

      <div className="builder-right">
        <div className="form-row">
          <div className="form-label">Look Name</div>
          <input value={outfit.name} onChange={e => setOutfit(prev => ({ ...prev, name: e.target.value }))} />
        </div>
        <div className="filters">
          {ALL_SEASONS.map(s => (
            <label key={s} className={`badge ${outfit.seasons?.includes(s) ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={outfit.seasons?.includes(s) || false}
                onChange={() =>
                  setOutfit(prev => {
                    const list = prev.seasons || []
                    const next = list.includes(s) ? list.filter(x => x !== s) : [...list, s]
                    return { ...prev, seasons: next }
                  })
                }
              />
              {s}
            </label>
          ))}
        </div>
        {selectedItem && (
          <div className="size-control">
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.05"
              value={selectedItem.scale}
              onChange={e => updateOutfitItem(selectedItem.id, { scale: parseFloat(e.target.value) })}
            />
            <button className="btn danger" onClick={() => removeOutfitItem(selectedItem.id)}>Delete Item</button>
          </div>
        )}
        <div className="layer-panel">
          {itemsSortedByZ.map(it => {
            const meta = getItem(it.id)
            return (
              <div
                key={it.id}
                className={`layer-row ${selectedItemId === it.id ? 'selected' : ''}`}
                onClick={() => setSelectedItemId(it.id)}
              >
                <span>{meta?.name || it.id}</span>
                <span>
                  <button onClick={e => { e.stopPropagation(); moveLayer(it.id, 1) }}>↑</button>
                  <button onClick={e => { e.stopPropagation(); moveLayer(it.id, -1) }}>↓</button>
                  <button onClick={e => { e.stopPropagation(); removeOutfitItem(it.id) }}><X size={12} /></button>
                </span>
              </div>
            )
          })}
        </div>
        <div className="preview">
          <div className="preview-header"><div className="preview-title">Current Look</div></div>
          <div className="preview-actions"><button className="btn" onClick={onSaveOutfit}>Save Look</button></div>
        </div>
      </div>
    </section>
  )
}


function Gallery({ items, savedLooks, onDeleteLook, onUpdateLook }) {
  const [activeSeasons, setActiveSeasons] = useState([])
  const [editingId, setEditingId] = useState(null)
  const list = (savedLooks || []).filter(l => activeSeasons.length ? activeSeasons.every(s => l.seasons?.includes(s)) : true)
  const getItem = id => items.find(i => i.id === id)
  const editing = savedLooks.find(l => l.id === editingId)
  return (
    <section className="section">
      <h2 className="section-title"><span className="section-num">04</span> Saved Looks</h2>
      <div className="filters">
        {ALL_SEASONS.map(s => (
          <label key={s} className={`badge ${activeSeasons.includes(s) ? 'active' : ''}`}>
            <input type="checkbox" checked={activeSeasons.includes(s)} onChange={() => setActiveSeasons(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])} />
            {s}
          </label>
        ))}
      </div>
      <div className="masonry">
        {list.map(look => (
          <div key={look.id} className="masonry-card">
            <div className="polaroid">
              <div className="polaroid-frame no-frame">
                <div className="free-canvas static" style={{ width: look.w, height: look.h }}>
                  {look.items.map(o => {
                    const it = getItem(o.id)
                    const style = { position: 'absolute', left: o.x, top: o.y, width: 100 * o.scale, height: 100 * o.scale, zIndex: o.z }
                    return (
                      <div key={o.id} style={style}>
                        {it?.imageUrl ? <img src={it.imageUrl} alt={it.name} className="no-frame-img" /> : iconByKey(it?.icon, { size: 36 })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <div className="card-body">
              <div className="card-title">{look.name}</div>
              <div className="card-sub italic">{look.seasons?.join(', ') || 'Saved outfit'}</div>
              <button className="btn" onClick={() => setEditingId(look.id)}>Edit</button>
              <button className="btn danger" onClick={() => onDeleteLook(look.id)}><Trash2 size={16}/> Delete Look</button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <LookEditor
          look={editing}
          onClose={() => setEditingId(null)}
          onSave={changes => { onUpdateLook(editing.id, changes); setEditingId(null) }}
        />
      )}
    </section>
  )
}

function LookEditor({ look, onSave, onClose }) {
  const [name, setName] = useState(look.name)
  const [seasons, setSeasons] = useState(look.seasons || [])
  function toggleSeason(s) { setSeasons(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]) }
  return (
    <div className="drawer">
      <div className="drawer-head">
        <div className="form-title">Edit Look</div>
        <button className="icon-btn" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="form-row">
        <div className="form-label">Name</div>
        <input value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="form-row">
        <div className="form-label">Seasons</div>
        <div className="filters">
          {ALL_SEASONS.map(s => (
            <label key={s} className={`badge ${seasons.includes(s) ? 'active' : ''}`}>
              <input type="checkbox" checked={seasons.includes(s)} onChange={() => toggleSeason(s)} />
              {s}
            </label>
          ))}
        </div>
      </div>
      <div className="drawer-actions">
        <button className="btn" onClick={() => onSave({ name, seasons })}>Save</button>
      </div>
    </div>
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
.hero-overlay{ position:absolute; inset:0; background:rgba(0,0,0,.5); pointer-events:none; z-index:0 }
.hero-content{ position:relative; z-index:1 }
.hero-title{ font-size:32px; display:flex; flex-direction:column; gap:6px }
.hero-be{ font-weight:700; letter-spacing:4px }
.hero-word{ font-style:italic; line-height:1 }
.swap-word{ display:inline-block; animation:wordfade .45s ease }
@keyframes wordfade{ 0%{opacity:0; transform:translateY(6px)} 100%{opacity:1; transform:translateY(0)} }
.hero-sub{ font-size:16px; color:var(--off) }
.cta-row{ display:flex; gap:8px; margin-top:12px }

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

.item-card{ border:2px solid var(--black); background:var(--white); box-shadow:4px 4px 0 var(--black); cursor:grab; position:relative; overflow:visible }
.item-card:active{ cursor:grabbing }
.item-card.hint{ opacity:.85; outline:2px dashed var(--red) }
.polaroid{ background:var(--white); border-bottom:2px solid var(--black); padding:8px }
.polaroid-frame{ border:2px solid var(--black); height:120px; display:grid; place-items:center }
.polaroid-frame.no-frame{ border:none; box-shadow:none }
.masonry-card .polaroid-frame{ height:auto; overflow:hidden }
.item-overlay{ position:absolute; inset:0; background:rgba(0,0,0,.6); color:var(--white); display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; opacity:0; transition:opacity .3s; pointer-events:none }
.item-card:hover .item-overlay{ opacity:1 }
.overlay-title{ font-weight:700; margin-bottom:4px }
.overlay-tags{ display:flex; gap:4px; flex-wrap:wrap; justify-content:center }
.overlay-tag{ border:1px solid var(--white); padding:2px 6px; font-size:12px; font-weight:700; color:var(--white) }

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
.film-cell.dim{ opacity:.5 }
.film-frame{ border:2px solid var(--black); height:60px; display:grid; place-items:center; box-shadow:4px 4px 0 var(--black) }
.film-caption{ font-size:12px; text-align:center; margin-top:6px }
.size-control{ margin-bottom:12px }
.layer-panel{ border:2px solid var(--black); background:var(--white); margin-bottom:12px }
.layer-row{ display:flex; justify-content:space-between; align-items:center; padding:4px 8px; cursor:pointer }
.layer-row.selected{ background:var(--black); color:var(--white) }
.layer-row button{ margin-left:4px }

/* Free canvas */
.free-canvas{ position:relative; width:100%; height:400px; border:2px dashed var(--black); background:var(--white) }
.free-canvas.static{ pointer-events:none; border:none; overflow:hidden }
.free-canvas img{ width:100%; height:100%; object-fit:contain; pointer-events:none }

@keyframes snap{ 0%{transform:scale(.98)} 100%{transform:scale(1)} }
@keyframes bounce{ 0%{transform:translateY(0)} 30%{transform:translateY(-6px)} 60%{transform:translateY(0)} 100%{transform:translateY(0)} }
.anim-snap{ animation:snap .15s ease-out }
.anim-bounce{ animation:bounce .25s cubic-bezier(.2,.6,.3,1.2); border-color:var(--red)!important }

/* Preview / Gallery */
.preview{ border:2px solid var(--black); background:var(--white); box-shadow:4px 4px 0 var(--black) }
.preview-header{ display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:2px solid var(--black) }
.preview-title{ font-weight:700 }
.preview-actions{ padding:8px }

.masonry{ display:grid; grid-template-columns:repeat(2,1fr); gap:12px }
.masonry-card{ border:2px solid var(--black); background:var(--white); box-shadow:4px 4px 0 var(--black) }

.no-frame-img{ max-width:100%; max-height:100%; object-fit:contain; display:block; background:transparent }
.no-frame-img.small{ max-height:40px }
`
