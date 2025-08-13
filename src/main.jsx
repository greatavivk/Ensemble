import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(<App />)import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(<App />)
// App.jsx (Part 1/2) — ENSEMBLE
// Paste Part 1 directly followed by Part 2 to form a single file.
// What you get:
// - Dashboard with animated hero ("Be stylish → chic → fashionable → YOURSELF")
// - Digital Closet with big Upload button (primary upload point)
// - Frameless transparent images
// - Inline Item Editor Drawer (edit name, seasons, color tags, occasions)
// - Outfit Builder (zones + DnD, accessories capped at 3)
// - Saved Looks gallery
// - Supabase-ready scaffolding (toggle USE_SUPABASE)
// IMPORTANT: No separate "Description Mode" tab; editing is in the Closet.

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
} from 'lucide-react'

// ===================== Config & Supabase scaffold =====================
const USE_SUPABASE = false // set true after you add your keys below
const SUPABASE_URL = (typeof importMeta !== 'undefined' ? importMeta.env?.VITE_SUPABASE_URL : undefined) || window.__SUPABASE_URL__
const SUPABASE_ANON_KEY = (typeof importMeta !== 'undefined' ? importMeta.env?.VITE_SUPABASE_ANON_KEY : undefined) || window.__SUPABASE_ANON_KEY__
let supabase = null

async function initSupabase() {
  if (!USE_SUPABASE) return null
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm')
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  return supabase
}

async function sbUploadImage(file, id) {
  // bucket: 'items' (create as Public)
  const path = `anon/${id}-${Date.now()}`
  const { error } = await supabase.storage.from('items').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('items').getPublicUrl(path)
  return data.publicUrl
}

async function sbCreateItem(record) {
  const { error } = await supabase.from('items').insert(record)
  if (error) throw error
}

async function sbFetchItems() {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ===================== Design Tokens =====================
const COLORS = {
  black: '#000000',
  white: '#FFFFFF',
  offWhite: '#FAFAFA',
  charcoal: '#2C2C2C',
  gray: '#666666',
  lightGray: '#CCCCCC',
  red: '#8B0000',
}
const FONT_STACK = `"Times New Roman", Times, serif`

// ===================== Helpers & Icons =====================
function TrousersIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 3h10l-1 6-1 12h-3l-1.5-8L9 21H6L7 9 7 3z" stroke="#000" strokeWidth="2" fill="none"/>
      <path d="M12 3v4" stroke="#000" strokeWidth="2"/>
    </svg>
  )
}
function iconByKey(key, props = {}) {
  switch (key) {
    case 'hat': return <GraduationCap {...props} />
    case 'shirt': return <Shirt {...props} />
    case 'watch': return <Watch {...props} />
    case 'footprints': return <Footprints {...props} />
    case 'glasses': return <Glasses {...props} />
    case 'trousers': return <TrousersIcon size={props.size || 20} />
    default: return <SquareStub {...props} />
  }
}
function SquareStub(props){
  return <div {...props} style={{ width: props.size||20, height: props.size||20, border: `2px solid ${COLORS.black}`, boxShadow: `4px 4px 0 ${COLORS.black}` }} />
}

const ALL_SEASONS = ['Spring','Summer','Fall','Winter']
const COLOR_WORDS = ['black','white','gray','grey','silver','gold','red','burgundy','maroon','pink','purple','violet','blue','navy','teal','turquoise','green','olive','mint','yellow','mustard','orange','brown','tan','camel','beige','cream','ivory']
const CATEGORIES = [
  { key: 'all', label: 'All', icon: null },
  { key: 'hats', label: 'Hats', icon: 'hat' },
  { key: 'tops', label: 'Tops', icon: 'shirt' },
  { key: 'bottoms', label: 'Bottoms', icon: 'trousers' },
  { key: 'shoes', label: 'Shoes', icon: 'footprints' },
  { key: 'accessories', label: 'Accessories', icon: 'watch' },
]

function titleCase(str){ return str.replace(/\w\S*/g, t => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()) }
function detectSeasons(text){ const t=text.toLowerCase(); const out=[]; if(/\bspring\b/.test(t))out.push('Spring'); if(/\bsummer\b/.test(t))out.push('Summer'); if(/\bfall\b|\bautumn\b/.test(t))out.push('Fall'); if(/\bwinter\b/.test(t))out.push('Winter'); return Array.from(new Set(out)) }
function detectColors(text){ const t=text.toLowerCase(); const found=new Set(); COLOR_WORDS.forEach(c=>{ if(new RegExp(`\\b${c}\\b`).test(t)) found.add(c) }); const norm=Array.from(found).map(c=>c==='grey'?'gray':c); return Array.from(new Set(norm)) }

// ===================== Demo Data (guarded) =====================
const USE_DEMO_DATA = true
const DEMO_ITEMS = [
  { id: 'i1', name: 'Wool Fedora', category: 'hats', seasons: ['Fall','Winter'], colorTags: ['black'], occasions: [], description: 'Structured brim; editorial silhouette.', usageCount: 12, dateAdded: '2025-01-05', icon: 'hat' },
  { id: 'i2', name: 'Crisp Oxford Shirt', category: 'tops', seasons: ['Spring','Summer','Fall'], colorTags: ['white'], occasions: [], description: 'Stiff collar; gallery-ready.', usageCount: 22, dateAdded: '2025-02-12', icon: 'shirt' },
  { id: 'i3', name: 'Tailored Trousers', category: 'bottoms', seasons: ['Spring','Fall','Winter'], colorTags: ['black'], occasions: [], description: 'High waist; razor crease.', usageCount: 18, dateAdded: '2025-03-01', icon: 'trousers' },
  { id: 'i4', name: 'Chelsea Boots', category: 'shoes', seasons: ['Fall','Winter'], colorTags: ['black'], occasions: [], description: 'Sharp profile, decisive heel.', usageCount: 30, dateAdded: '2025-01-18', icon: 'footprints' },
]

const EMPTY_OUTFIT = { id:'o1', name:'Untitled Look', description:'', seasons:[], occasions:[], stylingNotes:'', rating:0, lastWorn:null, items:{ hat:null, top:null, bottom:null, shoes:null, accessories:[] } }

// ===================== App Root =====================
export default function App(){
  const [tab, setTab] = useState('dashboard')
  const [items, setItems] = useState(USE_DEMO_DATA ? DEMO_ITEMS : [])
  const [activeSeasonsFilter, setActiveSeasonsFilter] = useState([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [outfit, setOutfit] = useState(EMPTY_OUTFIT)

  // Upload UI state
  const [uploadCategory, setUploadCategory] = useState('tops')
  const fileInputRef = useRef(null)

  // Animated hero text control
  const [heroWord, setHeroWord] = useState('stylish')
  const words = ['stylish','chic','fashionable','YOURSELF']

  useEffect(()=>{
    let i = 0
    const id = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? null : setInterval(()=>{
      i = (i+1); if (i >= words.length) { clearInterval(id); setHeroWord('YOURSELF'); return }
      setHeroWord(words[i])
    }, 1400)
    return ()=> id && clearInterval(id)
  },[])

  useEffect(()=>{ (async()=>{ if (USE_SUPABASE){ await initSupabase(); const rows = await sbFetchItems(); if (rows.length) setItems(rows) } })() }, [])

  // Filtering
  const visibleItems = useMemo(()=>{
    let list=[...items]
    if(activeCategory!=='all') list=list.filter(i=>i.category===activeCategory)
    if(activeSeasonsFilter.length) list=list.filter(i=>activeSeasonsFilter.every(s=>i.seasons?.includes(s)))
    return list
  },[items,activeCategory,activeSeasonsFilter])

  // Drag & Drop
  const dragDataRef = useRef(null)
  function onDragStart(e,item){ dragDataRef.current=item; e.dataTransfer.setData('text/plain', item.id); e.dataTransfer.effectAllowed='move' }
  function onDragOver(e){ e.preventDefault(); e.dataTransfer.dropEffect='move' }
  function onDrop(e,zone){
    e.preventDefault(); const item=dragDataRef.current; if(!item) return
    const map={hat:'hats', top:'tops', bottom:'bottoms', shoes:'shoes', accessories:'accessories'}
    const valid = map[zone]===item.category || (zone==='accessories' && item.category==='accessories')
    if(!valid) return bounceInvalid(e.currentTarget)
    setOutfit(prev=>{ const next=structuredClone(prev); switch(zone){
      case 'hat': next.items.hat=item.id; break
      case 'top': next.items.top=item.id; break
      case 'bottom': next.items.bottom=item.id; break
      case 'shoes': next.items.shoes=item.id; break
      case 'accessories': next.items.accessories=[item.id, ...next.items.accessories.filter(id=>id!==item.id)].slice(0,3); break
      default: break }
      return next })
    snapOk(e.currentTarget)
  }
  function bounceInvalid(el){ el.classList.remove('anim-bounce'); void el.offsetWidth; el.classList.add('anim-bounce') }
  function snapOk(el){ el.classList.remove('anim-snap'); void el.offsetWidth; el.classList.add('anim-snap') }

  // ============ Upload (primary in Closet) ============
  function onUploadClick(){ fileInputRef.current?.click() }
  async function onFileChange(e){
    const file=e.target.files?.[0]; if(!file) return
    const id=`i${Date.now()}`
    const iconKey = uploadCategory==='bottoms' ? 'trousers' : uploadCategory==='hats' ? 'hat' : uploadCategory==='shoes' ? 'footprints' : uploadCategory==='accessories' ? 'watch' : 'shirt'

    if (USE_SUPABASE && supabase){
      // Upload to Supabase storage, create DB record
      const imageUrl = await sbUploadImage(file, id)
      const record = { id, name:'Unnamed fashion piece', category:uploadCategory, seasons:[], color_tags:[], occasions:[], description:'', usage_count:0, image_url:imageUrl }
      await sbCreateItem(record)
      setItems(prev=>[{ id, name:'Unnamed fashion piece', category:uploadCategory, seasons:[], colorTags:[], occasions:[], description:'', usageCount:0, dateAdded:new Date().toISOString().slice(0,10), icon:iconKey, imageUrl }, ...prev])
    } else {
      // Local demo: data URL
      const reader=new FileReader()
      reader.onload=()=>{
        const imageUrl = reader.result
        setItems(prev=>[{ id, name:'Unnamed fashion piece', category:uploadCategory, seasons:[], colorTags:[], occasions:[], description:'', usageCount:0, dateAdded:new Date().toISOString().slice(0,10), icon:iconKey, imageUrl }, ...prev])
      }
      reader.readAsDataURL(file)
    }
    e.target.value=''
  }

  return (
    <div style={styles.app}>
      <style>{CSS}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.brand}>ENSEMBLE</div>
        <nav style={styles.nav}>
          <NavBtn label="Dashboard" active={tab==='dashboard'} onClick={()=>setTab('dashboard')}/>
          <NavBtn label="Digital Closet" active={tab==='closet'} onClick={()=>setTab('closet')}/>
          <NavBtn label="Outfit Builder" active={tab==='builder'} onClick={()=>setTab('builder')}/>
          <NavBtn label="Saved Looks" active={tab==='gallery'} onClick={()=>setTab('gallery')}/>
        </nav>
      </header>

      <main style={styles.main}>
        {tab==='dashboard' && <Dashboard heroWord={heroWord} goToCloset={()=>setTab('closet')} />}
        {tab==='closet' && (
          <Closet
            items={items}
            activeCategory={activeCategory}
            onCategory={setActiveCategory}
            onSeasonsFilter={setActiveSeasonsFilter}
            activeSeasonsFilter={activeSeasonsFilter}
            onUploadClick={onUploadClick}
            fileInputRef={fileInputRef}
            onFileChange={onFileChange}
            uploadCategory={uploadCategory}
            setUploadCategory={setUploadCategory}
            onItemUpdated={(updated)=> setItems(prev=> prev.map(i=> i.id===updated.id ? updated : i))}
          />
        )}
        {/* PART SPLIT BOUNDARY — continue in Part 2 */}
// App.jsx (Part 2/2) — ENSEMBLE
// Paste this immediately after Part 1 to complete the file.

        {tab==='builder' && (
          <Builder
            items={items}
            outfit={outfit}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onClearZone={(zone)=> setOutfit(prev=>{ const next=structuredClone(prev); if(zone==='accessories') next.items.accessories=[]; else next.items[zone]=null; return next })}
          />
        )}
        {tab==='gallery' && <Gallery items={items} />}
      </main>
    </div>
  )
}

// ===================== Components =====================
function NavBtn({label, active, onClick}){ return <button className={`nav-btn ${active?'active':''}`} onClick={onClick}>{label}</button> }

function Dashboard({ heroWord, goToCloset }){
  return (
    <section className="section">
      <div className="hero">
        <h1 className="hero-title">Be <span className="hero-rotate">{heroWord}</span></h1>
        <p className="hero-sub">High‑contrast editorial tools for decisive dressing.</p>
        <div className="cta-row">
          <button className="btn" onClick={goToCloset}>Go to Closet</button>
          <a className="btn" href="#builder" onClick={e=>e.preventDefault()}>Build an Outfit</a>
        </div>
      </div>
      <h2 className="section-title"><span className="section-num">01</span> Recent Items</h2>
      <div className="grid">
        {/* Recent items will appear here once saved; tied to Supabase later */}
      </div>
      <h2 className="section-title"><span className="section-num">02</span> Stats</h2>
      <div className="stats">
        <div className="stat-box"><div className="stat-num">—</div><div className="stat-label">Items</div></div>
        <div className="stat-box"><div className="stat-num">—</div><div className="stat-label">Looks</div></div>
        <div className="stat-box"><div className="stat-num">—</div><div className="stat-label">Last Added</div></div>
      </div>
    </section>
  )
}

function Closet({ items, activeCategory, onCategory, onSeasonsFilter, activeSeasonsFilter, onUploadClick, fileInputRef, onFileChange, uploadCategory, setUploadCategory, onItemUpdated }){
  const [editing, setEditing] = useState(null) // item id for the drawer
  const list = useMemo(()=>{
    let l=[...items]
    if(activeCategory!=='all') l=l.filter(i=>i.category===activeCategory)
    if(activeSeasonsFilter.length) l=l.filter(i=>activeSeasonsFilter.every(s=>i.seasons?.includes(s)))
    return l
  },[items,activeCategory,activeSeasonsFilter])

  return (
    <section className="section">
      <div className="toolbar">
        <div className="tabs">
          {CATEGORIES.map(c=> (
            <button key={c.key} className={`tab ${activeCategory===c.key ? 'active' : ''}`} onClick={()=>onCategory(c.key)}>
              {c.icon && iconByKey(c.icon,{size:16})} <span>{c.label}</span>
            </button>
          ))}
        </div>
        <div className="filters">
          <Filter size={16}/>
          {ALL_SEASONS.map(s=> (
            <label key={s} className={`badge ${activeSeasonsFilter.includes(s)?'active':''}`}>
              <input type="checkbox" checked={activeSeasonsFilter.includes(s)} onChange={()=> onSeasonsFilter(prev=> prev.includes(s)? prev.filter(x=>x!==s) : [...prev,s]) }/>
              {s}
            </label>
          ))}
        </div>
        <div className="uploader">
          <select className="select" value={uploadCategory} onChange={e=>setUploadCategory(e.target.value)}>
            {CATEGORIES.filter(c=>c.key!=='all').map(c=> <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
          <button className="btn" onClick={onUploadClick}><Upload size={16}/> Upload</button>
          <input ref={fileInputRef} type="file" accept="image/png,image/webp,image/jpeg" hidden onChange={onFileChange}/>
        </div>
      </div>

      <div className="grid">
        {list.map(i=> (
          <div key={i.id} className="item-card" draggable onDragStart={(e)=>{ e.dataTransfer.setData('text/plain', i.id); }} onClick={()=>setEditing(i)}>
            <div className="polaroid">
              <div className={`polaroid-frame ${i.imageUrl ? 'no-frame' : ''}`}>
                {i.imageUrl ? <img src={i.imageUrl} alt={i.name} className="no-frame-img"/> : iconByKey(i.icon,{size:40})}
              </div>
            </div>
            <div className="item-meta">
              <div className="item-title">{i.name}</div>
              <div className="item-sub">{i.category}</div>
              <div className="item-tags">
                {(i.seasons||[]).map(s=> <span key={s} className="tag">{s}</span>)}
                {(i.colorTags||[]).map(c=> <span key={c} className="tag">{c}</span>)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <ItemEditor item={editing} onClose={()=>setEditing(null)} onSave={(updated)=>{ onItemUpdated(updated); setEditing(null) }} />
      )}
    </section>
  )
}

function ItemEditor({ item, onClose, onSave }){
  const [name, setName] = useState(item.name || 'Unnamed fashion piece')
  const [seasons, setSeasons] = useState(item.seasons || [])
  const [colorTags, setColorTags] = useState(item.colorTags || [])
  const [occasions, setOccasions] = useState(item.occasions || [])

  function toggle(list, value){ return list.includes(value) ? list.filter(v=>v!==value) : [...list, value] }

  function onNameBlur(){
    // Only auto-detect into empty fields
    if (!seasons.length) setSeasons(detectSeasons(name))
    if (!colorTags.length) setColorTags(detectColors(name))
  }

  function handleSave(){ onSave({ ...item, name: name.trim()||'Unnamed fashion piece', seasons, colorTags, occasions }) }

  return (
    <div className="drawer">
      <div className="drawer-head">
        <div className="drawer-title">Edit Item</div>
        <button className="dz-clear" onClick={onClose}><X size={12}/></button>
      </div>
      <div className="drawer-body">
        <label className="form-label">Name</label>
        <input className="input" value={name} onChange={e=>setName(e.target.value)} onBlur={onNameBlur} />

        <label className="form-label">Seasons</label>
        <div className="checks">
          {ALL_SEASONS.map(s=> (
            <label key={s} className="check">
              <input type="checkbox" checked={seasons.includes(s)} onChange={()=> setSeasons(toggle(seasons,s)) }/>
              <span>{s}</span>
            </label>
          ))}
        </div>

        <label className="form-label">Color Tags</label>
        <div className="checks">
          {COLOR_WORDS.map(c=> (
            <label key={c} className="check">
              <input type="checkbox" checked={colorTags.includes(c)} onChange={()=> setColorTags(toggle(colorTags,c)) }/>
              <span>{c}</span>
            </label>
          ))}
        </div>

        <label className="form-label">Occasions (comma-separated)</label>
        <input className="input" value={occasions.join(', ')} onChange={e=> setOccasions(e.target.value.split(',').map(s=>s.trim()).filter(Boolean)) } />

        <div className="drawer-actions">
          <button className="btn" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}

function Builder({ items, outfit, onDrop, onDragOver, onClearZone }){
  const getItem = id => items.find(i=>i.id===id)
  return (
    <section className="section builder">
      <div className="builder-left">
        <h2 className="section-title"><span className="section-num">03</span> Categories</h2>
        <p className="muted">Drag items into the silhouette zones.</p>
        <div className="filmstrip">
          {items.map(i=> (
            <div key={i.id} className="film-cell">
              <div className="film-frame">{i.imageUrl ? <img src={i.imageUrl} alt="img" className="no-frame-img small"/> : iconByKey(i.icon,{size:28})}</div>
              <div className="film-caption">{i.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="builder-center">
        <div className="silhouette">
          <DropZone label="Hat" zone="hat" onDrop={onDrop} onDragOver={onDragOver} filled={!!outfit.items.hat} onClear={()=>onClearZone('hat')}>
            {outfit.items.hat && <ZoneItem item={getItem(outfit.items.hat)} />}
          </DropZone>
          <DropZone label="Top" zone="top" onDrop={onDrop} onDragOver={onDragOver} filled={!!outfit.items.top} onClear={()=>onClearZone('top')}>
            {outfit.items.top && <ZoneItem item={getItem(outfit.items.top)} />}
          </DropZone>
          <DropZone label="Bottom" zone="bottom" onDrop={onDrop} onDragOver={onDragOver} filled={!!outfit.items.bottom} onClear={()=>onClearZone('bottom')}>
            {outfit.items.bottom && <ZoneItem item={getItem(outfit.items.bottom)} />}
          </DropZone>
          <DropZone label="Shoes" zone="shoes" onDrop={onDrop} onDragOver={onDragOver} filled={!!outfit.items.shoes} onClear={()=>onClearZone('shoes')}>
            {outfit.items.shoes && <ZoneItem item={getItem(outfit.items.shoes)} />}
          </DropZone>
          <DropZone label="Accessories" zone="accessories" onDrop={onDrop} onDragOver={onDragOver} filled={outfit.items.accessories.length>0} onClear={()=>onClearZone('accessories')}>
            {outfit.items.accessories.map(id=>{ const item=getItem(id); return <ZoneItem key={id} item={item} small /> })}
          </DropZone>
        </div>
      </div>

      <div className="builder-right">
        <div className="preview">
          <div className="preview-header"><div className="preview-title">Current Look</div><div className="rating"><Star size={14}/></div></div>
          <div className="preview-frame">
            <div className="preview-grid">
              {['hat','top','bottom','shoes'].map(k=>{ const id=outfit.items[k]; const found=id && items.find(i=>i.id===id); return (
                <div key={k} className="preview-cell">
                  <div className="preview-label">{k.toUpperCase()}</div>
                  <div className="preview-icon">{found ? (found.imageUrl ? <img src={found.imageUrl} alt="img" className="no-frame-img"/> : iconByKey(found.icon,{size:28})) : <Plus size={20}/>}</div>
                </div>
              )})}
            </div>
            <div className="preview-acc">{outfit.items.accessories.map(id=>{ const acc=items.find(i=>i.id===id); return <span key={id} className="tag">{acc?.name||'Accessory'}</span> })}</div>
          </div>
        </div>
      </div>
    </section>
  )
}

function DropZone({ label, zone, children, onDrop, onDragOver, filled, onClear }){
  return (
    <div className={`dropzone ${filled?'filled':''}`} onDragOver={onDragOver} onDrop={(e)=>onDrop(e,zone)} tabIndex={0} aria-label={`${label} drop zone`}>
      <div className="dz-label">{label}</div>
      <button className="dz-clear" onClick={onClear} title="Clear"><X size={12}/></button>
      <div className="dz-content">{children}</div>
    </div>
  )
}

function ZoneItem({ item, small }){
  if (!item) return null
  return (
    <div className={`zone-item ${small?'small':''}`} title={item.name}>
      {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className={`no-frame-img ${small?'small':''}`}/> : iconByKey(item.icon,{size: small?18:28})}
      <span className="zone-name">{item.name}</span>
    </div>
  )
}

function Gallery({ items }){
  const list = [...items].slice(0,10)
  return (
    <section className="section">
      <h2 className="section-title"><span className="section-num">04</span> Saved Looks</h2>
      <div className="masonry">
        {list.map((i,idx)=> (
          <div key={idx} className="masonry-card">
            <div className="polaroid">
              <div className={`polaroid-frame ${i.imageUrl ? 'no-frame' : ''}`}>{i.imageUrl ? <img src={i.imageUrl} alt="img" className="no-frame-img"/> : iconByKey(i.icon,{size:36})}</div>
            </div>
            <div className="card-body"><div className="card-title">{i.name}</div><div className="card-sub italic">“Tailored minimalism.”</div></div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ===================== Styles =====================
const styles = { app:{ fontFamily: FONT_STACK, background: COLORS.offWhite, color: COLORS.black, minHeight:'100vh' }, header:{ position:'sticky', top:0, zIndex:10, background: COLORS.black, color: COLORS.white, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 20px', borderBottom:`2px solid ${COLORS.white}` }, brand:{ fontWeight:700, letterSpacing:'2px' }, nav:{ display:'flex', gap:8 }, main:{ padding:20, maxWidth:1200, margin:'0 auto' } }

const CSS = `
:root { --black:${COLORS.black}; --white:${COLORS.white}; --off:${COLORS.offWhite}; --charcoal:${COLORS.charcoal}; --gray:${COLORS.gray}; --light:${COLORS.lightGray}; --red:${COLORS.red}; }
.italic{font-style:italic}.muted{color:var(--gray)}
.nav-btn{font-family:${FONT_STACK};color:var(--white);background:transparent;border:2px solid var(--white);padding:6px 10px;text-transform:uppercase;letter-spacing:1px;box-shadow:4px 4px 0 var(--white);cursor:pointer;transition:transform .12s,background .12s,color .12s}
.nav-btn:hover{background:var(--white);color:var(--black);transform:translate(-2px,-2px)}.nav-btn.active{background:var(--white);color:var(--black)}
.section{margin:24px 0}.section-title{font-weight:700;font-size:28px;display:flex;align-items:center;gap:12px;border-bottom:2px solid var(--black);padding-bottom:8px;margin-bottom:16px}.section-num{font-size:36px;color:var(--light)}
.hero{background:var(--black);color:var(--white);padding:28px;box-shadow:4px 4px 0 var(--black) inset}.hero-title{font-size:32px}.hero-sub{font-size:16px;color:var(--off)}.cta-row{display:flex;gap:8px;margin-top:12px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
.card{border:2px solid var(--black);background:var(--white);box-shadow:4px 4px 0 var(--black);display:flex;gap:10px;padding:12px;transition:transform .1s}.card:hover{transform:translate(-2px,-2px)}
.card-frame{width:60px;height:60px;display:grid;place-items:center;border:2px solid var(--black)}.card-frame.no-frame{border:none;box-shadow:none;background:transparent}
.no-frame-img{max-width:100%;max-height:100%;object-fit:contain;display:block;background:transparent}.no-frame-img.small{max-height:40px}.no-frame-img.tiny{max-height:20px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}.stat-box{background:var(--black);color:var(--white);text-align:center;padding:14px;box-shadow:4px 4px 0 var(--black)}.stat-num{font-size:24px;font-weight:700}.stat-label{font-size:12px;letter-spacing:1px}
.toolbar{display:flex;gap:12px;align-items:center;margin-bottom:12px}.tabs{display:flex;gap:8px}.tab{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border:2px solid var(--black);background:var(--white);box-shadow:4px 4px 0 var(--black);cursor:pointer;transition:background .12s,color .12s,transform .12s}.tab:hover{background:var(--black);color:var(--white);transform:translate(-2px,-2px)}.tab.active{background:var(--black);color:var(--white)}
.filters{display:flex;gap:6px;align-items:center}.badge{border:2px solid var(--black);padding:4px 8px;background:var(--white);cursor:pointer}.badge.active{background:var(--black);color:var(--white)}
.uploader{display:inline-flex;gap:8px;align-items:center}.select{border:2px solid var(--black);background:var(--white);padding:6px}.btn{border:2px solid var(--black);padding:6px 10px;background:var(--white);box-shadow:4px 4px 0 var(--black);cursor:pointer}.btn:hover{transform:translate(-2px,-2px)}
.item-card{border:2px solid var(--black);background:var(--white);box-shadow:4px 4px 0 var(--black);cursor:grab}.item-card:active{cursor:grabbing}.polaroid{background:var(--white);border-bottom:2px solid var(--black);padding:8px}.polaroid-frame{border:2px solid var(--black);height:120px;display:grid;place-items:center}.polaroid-frame.no-frame{border:none;box-shadow:none}
.item-meta{padding:10px}.item-title{font-weight:700}.item-sub{color:var(--gray);font-size:12px}.item-tags .tag{display:inline-block;border:2px solid var(--black);padding:2px 6px;margin:4px 4px 0 0;font-size:12px}
.builder{display:grid;grid-template-columns:240px 1fr 320px;gap:16px}.filmstrip{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.film-cell{background:var(--white);border:2px solid var(--black);padding:8px}.film-frame{border:2px solid var(--black);height:60px;display:grid;place-items:center;box-shadow:4px 4px 0 var(--black)}.film-caption{font-size:12px;text-align:center;margin-top:6px}
.silhouette{position:relative;border:2px solid var(--black);background:linear-gradient(to bottom,#fff,#f0f0f0);height:520px;box-shadow:4px 4px 0 var(--black);display:grid;grid-template-rows:1fr 2fr 2fr 1.2fr 1.2fr;gap:8px;padding:8px}
.dropzone{position:relative;border:2px dashed var(--black);padding:6px;display:grid;place-items:center;transition:transform .08s,border-color .12s;background:var(--white)}.dropzone.filled{border-style:solid}.dropzone:focus{outline:2px solid var(--black);outline-offset:2px}.dz-label{position:absolute;top:-10px;left:8px;background:var(--white);padding:0 6px;font-size:12px;letter-spacing:1px}.dz-clear{position:absolute;top:4px;right:4px;border:2px solid var(--black);background:var(--white);cursor:pointer;padding:2px}.dz-content{display:inline-flex;gap:8px;align-items:center}
.zone-item{display:inline-flex;align-items:center;gap:8px;padding:4px 8px;border:2px solid var(--black);background:var(--white);box-shadow:4px 4px 0 var(--black)}.zone-item.small{transform:scale(.9)}.zone-name{font-size:14px}
@keyframes snap{0%{transform:scale(.98)}100%{transform:scale(1)}}@keyframes bounce{0%{transform:translateY(0)}30%{transform:translateY(-6px)}60%{transform:translateY(0)}100%{transform:translateY(0)}}.anim-snap{animation:snap .15s ease-out}.anim-bounce{animation:bounce .25s cubic-bezier(.2,.6,.3,1.2);border-color:var(--red)!important}
.preview{border:2px solid var(--black);background:var(--white);box-shadow:4px 4px 0 var(--black)}.preview-header{display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:2px solid var(--black)}.preview-title{font-weight:700}.preview-frame{padding:10px}.preview-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.preview-cell{border:2px solid var(--black);height:68px;display:grid;place-items:center;position:relative}.preview-label{position:absolute;top:4px;left:4px;font-size:10px;color:var(--gray)}.preview-icon{display:grid;place-items:center}.preview-acc{margin-top:8px;display:flex;gap:6px;flex-wrap:wrap}.tag{border:2px solid var(--black);padding:2px 6px;background:var(--white)}
.drawer{position:fixed;right:12px;bottom:12px;width:360px;max-width:90vw;background:var(--white);border:2px solid var(--black);box-shadow:4px 4px 0 var(--black);padding:10px;z-index:20}
.drawer-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.drawer-title{font-weight:700}
.form-label{font-weight:700;margin-top:8px;margin-bottom:6px}.input,.textarea{width:100%;border:2px solid var(--black);background:var(--white);padding:8px;box-shadow:4px 4px 0 var(--black);font-family:${FONT_STACK}}
.checks{display:flex;gap:8px;flex-wrap:wrap}.check input{margin-right:6px}.drawer-actions{margin-top:12px;display:flex;justify-content:flex-end;gap:8px}
.masonry{column-count:3;column-gap:12px}.masonry-card{break-inside:avoid;border:2px solid var(--black);background:var(--white);box-shadow:4px 4px 0 var(--black);margin-bottom:12px}
@media (max-width:980px){.builder{grid-template-columns:1fr}.masonry{column-count:2}}
@media (max-width:600px){.masonry{column-count:1}}
`

// ===================== END (Part 2/2) =====================

