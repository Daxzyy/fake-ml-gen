'use client'

import { useRef, useState, useEffect } from 'react'

const RANKS = ['epic', 'glory', 'gm', 'honor', 'imo', 'legend', 'mawi'] as const
const RANK_LABELS: Record<string, string> = {
  epic: 'Epic', glory: 'Glory', gm: 'Grandmaster',
  honor: 'Honor', imo: 'Imo', legend: 'Legend', mawi: 'Mawi',
}
const BORDERS = Array.from({ length: 16 }, (_, i) => i + 1)
const CAPTCHAS = ['givyganteng', 'givysigma', 'givykeren']

// urutan clockwise: top-left(0) → top-right(1) → bottom-right(3) → bottom-left(2)
const CLOCKWISE = [0, 1, 3, 2]

function getRandomCaptcha() {
  return CAPTCHAS[Math.floor(Math.random() * CAPTCHAS.length)]
}

function validateEnvelope(data: { t: number; d: string; h: string }): boolean {
  if (!data.t || !data.d || !data.h) return false
  if (!data.d.startsWith('data:image/png;base64,')) return false
  return true
}

function PagePreloader({ hidden }: { hidden: boolean }) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(p => p + 1), 280)
    return () => clearInterval(id)
  }, [])

  // kotak mana yang aktif sekarang berdasarkan tick
  const activeBox = CLOCKWISE[tick % 4]

  return (
    <div id="page-preloader" className={hidden ? 'hidden' : ''}>
      <div className="preloader-grid">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`box${activeBox === i ? ' active' : ''}`} />
        ))}
      </div>
      <span className="preloader-label">Loading</span>
    </div>
  )
}

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [pageReady, setPageReady] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [username, setUsername] = useState('')
  const [rank, setRank] = useState<string>('imo')
  const [border, setBorder] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [resultImg, setResultImg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [captcha, setCaptcha] = useState<string>(getRandomCaptcha)
  const [captchaInput, setCaptchaInput] = useState('')
  const [captchaError, setCaptchaError] = useState<string | null>(null)

  useEffect(() => {
    const done = () => {
      setTimeout(() => setPageReady(true), 600)
    }
    if (document.readyState === 'complete') {
      done()
    } else {
      window.addEventListener('load', done)
      return () => window.removeEventListener('load', done)
    }
  }, [])

  function playClick() {
    if (!audioRef.current) {
      audioRef.current = new Audio('/click-ml.mp3')
    }
    const sound = audioRef.current.cloneNode() as HTMLAudioElement
    sound.play().catch(() => {})
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Pilih file gambar yang valid.')
      return
    }
    setError(null)
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function handleClickGenerate() {
    if (!username.trim()) {
      setError('Masukin dulu username lu🥰')
      return
    }
    if (!avatarFile) {
      setError('Upload avatar dulu bro, wajib nih!')
      return
    }
    setError(null)
    setCaptcha(getRandomCaptcha())
    setCaptchaInput('')
    setCaptchaError(null)
    setShowModal(true)
    document.body.style.overflow = 'hidden'
  }

  async function handleModalConfirm() {
    if (captchaInput.trim().toLowerCase() !== captcha) {
      setCaptchaError('salah bro💀 masa ga mau ngakuin sih?🤭😎')
      setCaptcha(getRandomCaptcha())
      setCaptchaInput('')
      return
    }

    setShowModal(false)
    document.body.style.overflow = ''
    setCaptchaError(null)
    setCaptchaInput('')
    setLoading(true)
    setResultImg(null)

    try {
      const fd = new FormData()
      fd.append('username', username.trim())
      fd.append('rank', rank)
      fd.append('border', String(border))
      if (avatarFile) fd.append('avatar', avatarFile)

      const res = await fetch('/api/card', {
        method: 'POST',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: fd,
      })

      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        if (res.status === 429) throw new Error('Terlalu banyak request. Tunggu 1 menit.')
        throw new Error(j.error || `Server error ${res.status}`)
      }

      const data = await res.json()
      if (!validateEnvelope(data)) throw new Error('Response tidak valid.')
      setResultImg(data.d)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal generate card.')
    } finally {
      setLoading(false)
    }
  }

  function handleDownload() {
    if (!resultImg) return
    const a = document.createElement('a')
    a.href = resultImg
    a.download = `${username || 'card'}-ml-card.png`
    a.click()
  }

  return (
    <>
      <PagePreloader hidden={pageReady} />

      <div
        className="relative min-h-screen flex flex-col"
        style={{ background: 'var(--blue-deep)' }}
        onClick={playClick}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(ellipse, #1a4a7a 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 right-0 w-[350px] h-[250px] rounded-full opacity-10"
            style={{ background: 'radial-gradient(ellipse, #c9a84c 0%, transparent 70%)' }} />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="absolute w-px opacity-5"
              style={{
                left: `${12 + i * 18}%`, top: 0, bottom: 0,
                background: 'linear-gradient(to bottom, transparent, #c9a84c, transparent)',
              }} />
          ))}
        </div>

        {showModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
            onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); document.body.style.overflow = '' } }}
          >
            <div className="panel rounded-2xl p-5 w-full max-w-xs gold-border flex flex-col gap-3"
              style={{ boxShadow: '0 0 40px rgba(201,168,76,0.2)' }}>
              <div className="text-center">
                <p className="text-base font-bold" style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold-light)' }}>
                  Verifikasi Dulu 😜
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Buktiin kalo lu manusia yang asli
                </p>
              </div>
              <div className="divider" />
              <p className="text-sm text-center" style={{ color: 'var(--text-primary)' }}>
                Ketik: <span style={{ color: 'var(--gold)', fontWeight: 700 }}>"{captcha}"</span>
              </p>
              <input
                autoFocus
                type="text"
                value={captchaInput}
                onChange={e => { setCaptchaInput(e.target.value); setCaptchaError(null) }}
                onKeyDown={e => { if (e.key === 'Enter') handleModalConfirm() }}
                placeholder={captcha}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none text-center"
                style={{
                  background: 'rgba(5,13,26,0.8)',
                  border: `1px solid ${captchaError ? 'rgba(180,40,40,0.6)' : 'var(--blue-border)'}`,
                  color: 'var(--text-primary)',
                  fontFamily: 'Rajdhani, sans-serif',
                }}
              />
              {captchaError && (
                <p className="text-xs text-center" style={{ color: '#f88' }}>{captchaError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowModal(false); document.body.style.overflow = '' }}
                  className="flex-1 rounded-xl py-2 text-xs"
                  style={{ background: 'rgba(5,13,26,0.8)', border: '1px solid var(--blue-border)', color: 'var(--text-secondary)' }}
                >
                  Batal
                </button>
                <button onClick={handleModalConfirm} className="btn-gold flex-1 rounded-xl py-2 text-xs">
                  Lanjut →
                </button>
              </div>
            </div>
          </div>
        )}

        <header className="relative z-10 pt-3 pb-2 text-center">
          <div className="inline-flex items-center gap-1 mb-0.5">
            <div className="diamond-icon" />
            <span className="section-title tracking-widest" style={{ color: 'var(--gold)', fontSize: '0.6rem' }}>
              Mobile Legends
            </span>
            <div className="diamond-icon" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold mb-0.5"
            style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold-light)', letterSpacing: '0.05em' }}>
            Card Generator
          </h1>
          <div className="divider max-w-xs mx-auto mt-2" />
        </header>

        <main className="relative z-10 flex-1 w-full max-w-md mx-auto px-4 py-3 flex flex-col gap-2">

          <section className="panel rounded-xl p-2.5 gold-border">
            <p className="section-title mb-1.5">
              Avatar <span style={{ color: '#f88', fontSize: '0.55rem' }}>* wajib</span>
            </p>
            <div
              className="upload-zone rounded-lg flex flex-col items-center justify-center gap-1.5 cursor-pointer"
              style={{ minHeight: 72, padding: 10 }}
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarPreview ? (
                <div className="flex flex-col items-center gap-1.5">
                  <img src={avatarPreview} alt="avatar preview"
                    className="w-14 h-14 rounded-xl object-cover"
                    style={{ border: '2px solid var(--gold-dark)', boxShadow: '0 0 10px rgba(201,168,76,0.3)' }} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Klik untuk ganti</span>
                </div>
              ) : (
                <>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--blue-accent)" strokeWidth="1.5">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Upload foto kamu</span>
                  <span style={{ fontSize: '0.6rem', color: 'var(--blue-accent)' }}>Tap untuk pilih gambar</span>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" onChange={handleFileChange} />
          </section>

          <section className="panel rounded-xl p-2.5 gold-border">
            <p className="section-title mb-1.5">Username</p>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              maxLength={15}
              placeholder="Masukkan username..."
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all"
              style={{
                background: 'rgba(5,13,26,0.8)',
                border: '1px solid var(--blue-border)',
                color: 'var(--text-primary)',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '0.88rem',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--gold-dark)')}
              onBlur={e => (e.target.style.borderColor = 'var(--blue-border)')}
            />
            <div className="flex justify-end mt-0.5">
              <span style={{ fontSize: '0.6rem', color: 'var(--text-secondary)' }}>{username.length}/15</span>
            </div>
          </section>

          <section className="panel rounded-xl p-2.5 gold-border">
            <p className="section-title mb-1.5">Rank</p>
            <div className="grid grid-cols-4 gap-1">
              {RANKS.map(r => (
                <button
                  key={r}
                  onClick={() => setRank(r)}
                  className="rank-card rounded-lg p-1 flex flex-col items-center gap-0.5"
                  style={{
                    background: rank === r ? 'rgba(201,168,76,0.12)' : 'rgba(5,13,26,0.6)',
                    border: rank === r ? '1px solid var(--gold)' : '1px solid var(--blue-border)',
                    boxShadow: rank === r ? '0 0 14px rgba(201,168,76,0.4)' : 'none',
                  }}
                >
                  <img src={`/fml-assets/rank/${r}.webp`} alt={r} className="w-7 h-7 object-contain" loading="lazy" />
                  <span className="text-center leading-tight"
                    style={{ fontSize: '0.5rem', color: rank === r ? 'var(--gold-light)' : 'var(--text-secondary)', fontFamily: 'Cinzel, serif', letterSpacing: '0.04em' }}>
                    {RANK_LABELS[r]}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="panel rounded-xl p-2.5 gold-border">
            <p className="section-title mb-1.5">Border Frame</p>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
              <button
                onClick={() => setBorder(0)}
                className="border-card rounded-lg flex-shrink-0 flex flex-col items-center justify-center gap-0.5"
                style={{
                  width: 46, height: 46,
                  background: 'rgba(5,13,26,0.8)',
                  border: border === 0 ? '2px solid var(--gold)' : '1px solid var(--blue-border)',
                  boxShadow: border === 0 ? '0 0 10px rgba(201,168,76,0.5)' : 'none',
                }}
              >
                <div className="w-6 h-6 rounded flex items-center justify-center"
                  style={{ border: '1.5px solid var(--gold)', background: 'transparent' }}>
                  <span style={{ fontSize: '0.4rem', color: 'var(--gold)', fontFamily: 'Cinzel, serif' }}>Gold</span>
                </div>
                <span style={{ fontSize: '0.4rem', color: 'var(--text-secondary)', fontFamily: 'Cinzel, serif' }}>Default</span>
              </button>
              {BORDERS.map(b => (
                <button
                  key={b}
                  onClick={() => setBorder(b)}
                  className="border-card rounded-lg"
                  style={{
                    width: 46, height: 46,
                    outline: border === b ? '2px solid var(--gold)' : 'none',
                    outlineOffset: 2,
                    boxShadow: border === b ? '0 0 10px rgba(201,168,76,0.6)' : 'none',
                    background: 'rgba(5,13,26,0.6)',
                    overflow: 'hidden',
                    border: '1px solid var(--blue-border)',
                    flexShrink: 0,
                  }}
                >
                  <img src={`/fml-assets/border/${b}.webp`} alt={`Border ${b}`} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)', fontSize: '0.6rem' }}>
              Dipilih: <span style={{ color: 'var(--gold)' }}>{border === 0 ? 'Default (Gold Outline)' : `Border #${border}`}</span>
            </p>
          </section>

          {error && (
            <div className="rounded-lg px-3 py-2 text-xs"
              style={{ background: 'rgba(180,40,40,0.15)', border: '1px solid rgba(180,40,40,0.4)', color: '#f88' }}>
              ⚠ {error}
            </div>
          )}

          <button
            onClick={handleClickGenerate}
            disabled={loading}
            className="btn-gold rounded-xl py-2.5 text-sm w-full"
            style={{ opacity: loading ? 0.75 : 1, cursor: loading ? 'wait' : 'pointer' }}
          >
            <span className="flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <span className="btn-spinner" />
                  Generating...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                  Generate Card
                </>
              )}
            </span>
          </button>

          {resultImg && (
            <section className="fade-in-up panel rounded-xl p-3 gold-border-bright pulse-gold flex flex-col items-center gap-2.5">
              <div className="flex items-center gap-1.5 w-full">
                <div className="diamond-icon" />
                <p className="section-title">Hasil Generate</p>
                <div className="diamond-icon" />
              </div>
              <div className="divider w-full" />
              <img
                src={resultImg}
                alt="Generated ML Card"
                className="w-full max-w-[180px] rounded-xl"
                style={{ boxShadow: '0 8px 40px rgba(201,168,76,0.25), 0 2px 10px rgba(0,0,0,0.6)' }}
              />
              <button onClick={handleDownload} className="btn-gold rounded-xl py-2 px-6 text-xs">
                <span className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7,10 12,15 17,10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download PNG
                </span>
              </button>
              <a href="https://wa.me/62895423300395" target="_blank" rel="noopener noreferrer"
                className="credit-link" style={{ fontSize: '0.6rem', opacity: 0.7 }}>
                Made by Givy
              </a>
            </section>
          )}
        </main>

        <footer className="relative z-10 py-3 text-center">
          <div className="divider max-w-xs mx-auto mb-2" />
          <div className="flex items-center justify-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)', fontSize: '0.6rem' }}>
            <div className="diamond-icon" style={{ width: 4, height: 4 }} />
            <span>Fake ML Card Generator</span>
            <div className="diamond-icon" style={{ width: 4, height: 4 }} />
          </div>
          <div className="mt-1">
            <a href="https://wa.me/62895423300395" target="_blank" rel="noopener noreferrer" className="credit-link">
              Made by Givy
            </a>
          </div>
        </footer>
      </div>
    </>
  )
}
