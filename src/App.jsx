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
const USE_SUPABASE = true // set true after you add your keys below
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
// Ensemble — App (Part 2 of 2)
// Paste this **after** Part 1 inside src/App.jsx
// This part updates the Dashboard with:
// - Hero background image from URL (persisted in localStorage)
// - Smoother "BE / word" animation (stacked layout: BE on top, changing word below)
// - Dark gradient overlay for readability
// It also exports helper CSS you should merge with the main CSS string in Part 1.

// ================= Dashboard =================
function Dashboard({ items, goToCloset }) {
  const words = ['stylish', 'chic', 'fashionable', 'YOURSELF']
  const [idx, setIdx] = React.useState(0)
  const heroWord = words[idx]

  // rotate words (faster, smooth)
  React.useEffect(() => {
    const id = setInterval(() => setIdx(i => (i + 1) % words.length), 1600)
    return () => clearInterval(id)
  }, [])

  // hero background URL (user-paste)
  const [bgUrl, setBgUrl] = React.useState(() => {
    try { return localStorage.getItem('ensemble.heroUrl') || '' } catch { return '' }
  })
  function setHeroFromPrompt(){
    const u = window.prompt('Paste a direct image URL (.jpg/.png works best):', bgUrl)
    if (u != null) {
      setBgUrl(u)
      try { localStorage.setItem('ensemble.heroUrl', u) } catch {}
    }
  }

  const heroStyle = bgUrl ? {
    backgroundImage: `url(${bgUrl})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  } : {}

  // recent items preview (optional)
  const recent = (items || []).slice(0, 6)

  return (
    <section className="section">
      <div className={`hero ${bgUrl ? 'with-bg' : ''}`} style={heroStyle}>
        {bgUrl && <div className="hero-overlay" aria-hidden="true" />}
        <h1 className="hero-title">
          <span className="hero-be">BE</span>
          <span className="hero-word"><span key={heroWord} className="swap-word">{heroWord}</span></span>
        </h1>
        <p className="hero-sub">High‑contrast editorial tools for decisive dressing.</p>
        <div className="cta-row">
          <button className="btn" onClick={goToCloset}>Go to Closet</button>
          <button className="btn" onClick={setHeroFromPrompt}>Set hero image</button>
        </div>
      </div>

      <h2 className="section-title"><span className="section-num">01</span> Recent Items</h2>
      <div className="grid">
        {recent.map(i => (
          <div key={i.id} className="card">
            <div className={`card-frame ${i.imageUrl ? 'no-frame' : ''}`}>
              {i.imageUrl ? <img src={i.imageUrl} alt={i.name} className="no-frame-img"/> : iconByKey(i.icon, { size: 36 })}
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
        <div className="stat-box"><div className="stat-num">—</div><div className="stat-label">Looks</div></div>
        <div className="stat-box"><div className="stat-num">—</div><div className="stat-label">Last Added</div></div>
      </div>
    </section>
  )
}

// ================= CSS to merge =================
// Find the big CSS string in Part 1 and replace the .hero block with this, or append if missing.
const CSS_DASHBOARD = `
.hero{
  position:relative; color:var(--white); padding:28px;
  box-shadow:4px 4px 0 var(--black) inset; background:var(--black);
  min-height:220px; display:flex; flex-direction:column; justify-content:center;
}
.hero.with-bg{ background-color:#000; background-blend-mode:normal; }
.hero-overlay{ position:absolute; inset:0; background:linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.35)); pointer-events:none }
.hero-title{ font-size:32px; display:flex; flex-direction:column; gap:6px; z-index:1 }
.hero-be{ font-weight:700; letter-spacing:4px }
.hero-word{ font-style:italic; line-height:1 }
.swap-word{ display:inline-block; animation:wordfade .45s ease }
@keyframes wordfade{ 0%{opacity:0; transform:translateY(6px)} 100%{opacity:1; transform:translateY(0)} }
.hero-sub{ font-size:16px; color:var(--off); z-index:1 }
.cta-row{ display:flex; gap:8px; margin-top:12px; z-index:1 }
`

// In Part 1, after defining the main CSS string, you can append:
//   const CSS = CSS_BASE + CSS_DASHBOARD
// Or simply copy these rules into your existing CSS template.

// NOTE: This file only contains the updated Dashboard and CSS helper. Other components (Closet, Builder, Gallery, etc.) remain as defined in Part 1.
