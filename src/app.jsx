import { useState, useRef } from 'react'

const s = {
  app: { maxWidth: 480, margin: '0 auto', background: '#fff', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid #eee' },
  back: { background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#666', padding: '0 8px 0 0' },
  title: { fontWeight: 600, fontSize: 17 },
  histBtn: { fontSize: 13, color: '#666', background: 'none', border: 'none', cursor: 'pointer' },
  body: { padding: '1.25rem 1rem' },
  subtitle: { color: '#666', fontSize: 14, marginBottom: '1.25rem', lineHeight: 1.6 },
  dropzone: { border: '2px dashed #ddd', borderRadius: 16, padding: '2.5rem 1rem', textAlign: 'center', cursor: 'pointer', background: '#fafafa' },
  dropIcon: { fontSize: 40, marginBottom: 8 },
  dropTitle: { fontWeight: 600, marginBottom: 4, fontSize: 15 },
  dropSub: { fontSize: 13, color: '#888' },
  previewWrap: { position: 'relative' },
  previewImg: { width: '100%', borderRadius: 16, display: 'block', maxHeight: 300, objectFit: 'cover' },
  removeBtn: { position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 15, lineHeight: '28px', textAlign: 'center' },
  scanBtn: { width: '100%', marginTop: '1rem', padding: 14, borderRadius: 12, border: 'none', background: '#111', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer' },
  scanBtnDis: { width: '100%', marginTop: '1rem', padding: 14, borderRadius: 12, border: 'none', background: '#666', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'wait' },
  errBox: { marginTop: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#dc2626', lineHeight: 1.5 },
  recentLabel: { fontSize: 13, color: '#666', marginBottom: 12, fontWeight: 600 },
  histCard: { display: 'flex', alignItems: 'center', gap: 12, background: '#f9f9f9', borderRadius: 12, padding: '10px 12px', cursor: 'pointer', border: '1px solid #eee', marginBottom: 8 },
  dishCard: { background: '#fff', border: '1px solid #eee', borderRadius: 16, padding: '12px 14px', cursor: 'pointer', marginBottom: 8 },
  dishName: { fontWeight: 600, fontSize: 15, margin: 0 },
  dishOrig: { fontSize: 13, color: '#888', margin: '2px 0 0' },
  dishIngs: { fontSize: 12, color: '#aaa', margin: '4px 0 0' },
  dishArrow: { color: '#ccc', fontSize: 20 },
  resultImg: { width: '100%', borderRadius: 16, display: 'block', maxHeight: 320, objectFit: 'cover', background: '#f0f0f0' },
  imgPlaceholder: { width: '100%', borderRadius: 16, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72 },
  dishTitle: { fontWeight: 600, fontSize: 22, margin: '1rem 0 2px' },
  dishOrigTitle: { fontSize: 14, color: '#888', margin: '0 0 10px' },
  tagWrap: { display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' },
  tag: { fontSize: 12, background: '#f5f5f5', border: '1px solid #eee', borderRadius: 20, padding: '3px 10px', color: '#666' },
  desc: { fontSize: 14, color: '#555', lineHeight: 1.7, marginTop: 12 },
  backBtn: { width: '100%', marginTop: 20, padding: 12, borderRadius: 12, border: '1px solid #ddd', background: '#f9f9f9', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  loading: { textAlign: 'center', padding: '4rem 1rem' },
  loadIcon: { fontSize: 48, marginBottom: 16 },
  loadText: { color: '#888', fontSize: 14 }
}

export default function App() {
  const [screen, setScreen] = useState('home')
  const [menuImage, setMenuImage] = useState(null)
  const [menuB64, setMenuB64] = useState(null)
  const [menuMime, setMenuMime] = useState('image/jpeg')
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [dishes, setDishes] = useState([])
  const [language, setLanguage] = useState('')
  const [selected, setSelected] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const fileRef = useRef()

  const toB64 = file => new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result.split(',')[1])
    r.onerror = rej
    r.readAsDataURL(file)
  })

  const handleFile = async file => {
    if (!file) return
    setScanError('')
    setMenuImage(URL.createObjectURL(file))
    setMenuMime(file.type || 'image/jpeg')
    setMenuB64(await toB64(file))
  }

  const scanMenu = async () => {
    if (!menuB64) return
    setScanning(true)
    setScanError('')
    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageB64: menuB64, mimeType: menuMime })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      if (!Array.isArray(data.dishes)) throw new Error('Invalid response')
      setLanguage(data.language || 'Unknown')
      setDishes(data.dishes)
      setScreen('dishes')
    } catch (e) {
      setScanError(e.message)
    }
    setScanning(false)
  }

  const generateResult = async dish => {
    setSelected(dish)
    setGenerating(true)
    setResult(null)
    setScreen('result')

    let dishInfo = { description: 'A delicious dish.', color1: '#e67e22', color2: '#f39c12', emoji: '🍽' }
    let imgUrl = null

    try {
      const res = await fetch('/api/dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: dish.name, ingredients: dish.ingredients })
      })
      const data = await res.json()
      if (res.ok) Object.assign(dishInfo, data)
    } catch (e) { console.error('Dish info error:', e) }

    try {
      const searchName = dish.nameOriginal && dish.nameOriginal !== dish.name ? dish.nameOriginal : dish.name
      const imgRes = await fetch(`/api/image?dish=${encodeURIComponent(searchName)}`)
      if (imgRes.ok && imgRes.headers.get('content-type')?.startsWith('image/')) {
        const blob = await imgRes.blob()
        imgUrl = URL.createObjectURL(blob)
      }
    } catch (e) { console.error('Image error:', e) }

    const entry = { dish, ...dishInfo, imgUrl, id: Date.now() }
    setResult(entry)
    setHistory(h => [entry, ...h.slice(0, 19)])
    setGenerating(false)
  }

  const langFlag = l => ({ Japanese: '🇯🇵', French: '🇫🇷', Italian: '🇮🇹', 'Traditional Chinese': '🇹🇼', 'Simplified Chinese': '🇨🇳', English: '🇬🇧' })[l] || '🌐'

  return (
    <div style={s.app}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {screen !== 'home' && (
            <button style={s.back} onClick={() => setScreen(screen === 'result' ? 'dishes' : 'home')}>‹</button>
          )}
          <span style={s.title}>
            {screen === 'home' ? '🍽 Food Visualizer'
              : screen === 'dishes' ? `${langFlag(language)} ${language} menu`
              : screen === 'history' ? 'History'
              : selected?.name || 'Dish'}
          </span>
        </div>
        {(screen === 'home' || screen === 'dishes') && history.length > 0 && (
          <button style={s.histBtn} onClick={() => setScreen('history')}>History ({history.length})</button>
        )}
        {screen === 'history' && (
          <button style={s.histBtn} onClick={() => setScreen('home')}>Done</button>
        )}
      </div>

      {/* HOME */}
      {screen === 'home' && (
        <div style={s.body}>
          <p style={s.subtitle}>Upload or photograph a restaurant menu. The app detects the language, lists all dishes, and shows you what each one looks like.</p>
          {!menuImage ? (
            <div style={s.dropzone} onClick={() => fileRef.current.click()}>
              <div style={s.dropIcon}>📷</div>
              <p style={s.dropTitle}>Scan a menu</p>
              <p style={s.dropSub}>Tap to upload or take a photo</p>
            </div>
          ) : (
            <div style={s.previewWrap}>
              <img src={menuImage} alt="Menu" style={s.previewImg} />
              <button style={s.removeBtn} onClick={() => { setMenuImage(null); setMenuB64(null); setScanError('') }}>✕</button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
          {menuImage && (
            <button style={scanning ? s.scanBtnDis : s.scanBtn} onClick={scanMenu} disabled={scanning}>
              {scanning ? '⏳ Scanning menu…' : 'Detect dishes →'}
            </button>
          )}
          {scanError && <div style={s.errBox}><strong>Scan failed:</strong> {scanError}</div>}
          {history.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <p style={s.recentLabel}>Recent lookups</p>
              {history.slice(0, 3).map(h => (
                <div key={h.id} style={s.histCard} onClick={() => { setSelected(h.dish); setResult(h); setScreen('result') }}>
                  <span style={{ fontSize: 22 }}>🍴</span>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{h.dish.name}</p>
                    {h.dish.nameOriginal && h.dish.nameOriginal !== h.dish.name && (
                      <p style={{ fontSize: 12, color: '#888', margin: 0 }}>{h.dish.nameOriginal}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DISHES */}
      {screen === 'dishes' && (
        <div style={s.body}>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>{dishes.length} dish{dishes.length !== 1 ? 'es' : ''} found — tap to visualise</p>
          {dishes.map((d, i) => (
            <div key={i} style={s.dishCard} onClick={() => generateResult(d)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <p style={s.dishName}>{d.name}</p>
                  {d.nameOriginal && d.nameOriginal !== d.name && <p style={s.dishOrig}>{d.nameOriginal}</p>}
                  {d.ingredients?.length > 0 && (
                    <p style={s.dishIngs}>{d.ingredients.slice(0, 4).join(', ')}{d.ingredients.length > 4 ? '…' : ''}</p>
                  )}
                </div>
                <span style={s.dishArrow}>›</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* RESULT */}
      {screen === 'result' && (
        <div style={s.body}>
          {generating ? (
            <div style={s.loading}>
              <div style={s.loadIcon}>🍳</div>
              <p style={s.loadText}>Finding dish…</p>
            </div>
          ) : result && (
            <div>
              {result.imgUrl
                ? <img src={result.imgUrl} alt={selected?.name} style={s.resultImg} />
                : <div style={{ ...s.imgPlaceholder, background: `linear-gradient(135deg, ${result.color1}22, ${result.color2}33)` }}>{result.emoji}</div>
              }
              <h2 style={s.dishTitle}>{selected?.name}</h2>
              {selected?.nameOriginal && selected.nameOriginal !== selected.name && (
                <p style={s.dishOrigTitle}>{selected.nameOriginal}</p>
              )}
              {selected?.ingredients?.length > 0 && (
                <div style={s.tagWrap}>
                  {selected.ingredients.map((ing, i) => <span key={i} style={s.tag}>{ing}</span>)}
                </div>
              )}
              <p style={s.desc}>{result.description || 'A delicious dish.'}</p>
              <button style={s.backBtn} onClick={() => setScreen('dishes')}>← Back to menu</button>
            </div>
          )}
        </div>
      )}

      {/* HISTORY */}
      {screen === 'history' && (
        <div style={s.body}>
          {history.map(h => (
            <div key={h.id} style={s.histCard} onClick={() => { setSelected(h.dish); setResult(h); setScreen('result') }}>
              <span style={{ fontSize: 22 }}>🍴</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{h.dish.name}</p>
                {h.dish.nameOriginal && h.dish.nameOriginal !== h.dish.name && (
                  <p style={{ fontSize: 12, color: '#888', margin: 0 }}>{h.dish.nameOriginal}</p>
                )}
              </div>
              <span style={{ color: '#ccc', fontSize: 18 }}>›</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
