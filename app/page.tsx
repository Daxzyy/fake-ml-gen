'use client'

import { useRef, useState } from 'react'

const RANKS = ['epic', 'glory', 'gm', 'honor', 'imo', 'legend', 'mawi'] as const
const RANK_LABELS: Record<string, string> = {
  epic: 'Epic', glory: 'Glory', gm: 'Grandmaster',
  honor: 'Honor', imo: 'Imo', legend: 'Legend', mawi: 'Mawi',
}
const BORDERS = Array.from({ length: 16 }, (_, i) => i + 1)

const CAPTCHAS = ['givyganteng', 'givysigma', 'givykeren']

function getRandomCaptcha() {
  return CAPTCHAS[Math.floor(Math.random() * CAPTCHAS.length)]
}

function validateEnvelope(data: { t: number; d: string; h: string }): boolean {
  if (!data.t || !data.d || !data.h) return false
  const age = Date.now() - data.t
  if (age > 30_000) return false
  if (!data.d.startsWith('data:image/png;base64,')) return false
  return true
}

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [username, setUsername] = useState('')
  const [rank, setRank] = useState<string>('imo')
  const [border, setBorder] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [resultImg, setResultImg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [captcha, setCaptcha] = useState<string>(getRandomCaptcha)
  const [captchaInput, setCaptchaInput] = useState('')
  const [captchaError, setCaptchaError] = useState<string | null>(null)

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

  async function handleGenerate() {
    if (!username.trim()) {
      setError('Masukkan username terlebih dahulu.')
      return
    }

    if (captchaInput.trim().toLowerCase() !== captcha) {
      setCaptchaError('Salah bro 💀 emang beneran ga mau ngakuin givy ganteng?')
      setCaptcha(getRandomCaptcha())
      setCaptchaInput('')
      return
    }

    setCaptchaError(null)
    setError(null)
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

      if (!validateEnvelope(data)) {
        throw new Error('Response tidak valid atau kadaluarsa.')
      }

      setResultImg(data.d)
      setCaptcha(getRandomCaptcha())
      setCaptchaInput('')
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
    <div className="relative min-h-screen flex flex-col" style={{ background: 'var(--blue-deep)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(ellipse, #1a4a7a 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(ellipse, #c9a84c 0%, transparent 70%)' }} />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute w-px opacity-5"
            style={{
              left: `${10 + i * 16}%`, top: 0, bottom: 0,
              background: 'linear-gradient(to bottom, transparent, #c9a84c, transparent)',
            }} />
        ))}
      </div>

      <header className="relative z-10 pt-5 pb-2 text-center">
        <div className="inline-flex items-center gap-2 mb-1">
          <div className="diamond-icon" />
          <span className="section-title text-xs tracking-widest" style={{ color: 'var(--gold)' }}>
            Mobile Legends
          </span>
          <div className="diamond-icon" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1"
          style={{ fontFamily: 'Cinzel, serif', color: 'var(--gold-light)', letterSpacing: '0.05em' }}>
          Card Generator
        </h1>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Generate fake Mobile Legends lobby card
        </p>
        <div className="divider max-w-sm mx-auto mt-3" />
      </header>

      <main className="relative z-10 flex-1 w-full max-w-2xl mx-auto px-3 py-4 flex flex-col gap-3">

        <section className="panel rounded-xl p-3 gold-border">
          <p className="section-title mb-2">Avatar</p>
          <div
            className="upload-zone rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer"
            style={{ minHeight: 90, padding: 12 }}
            onClick={() => fileInputRef.current?.click()}
          >
            {avatarPreview ? (
              <div className="flex flex-col items-center gap-2">
                <img src={avatarPreview} alt="avatar preview"
                  className="w-16 h-16 rounded-xl object-cover"
                  style={{ border: '2px solid var(--gold-dark)', boxShadow: '0 0 12px rgba(201,168,76,0.3)' }} />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Klik untuk ganti avatar
                </span>
              </div>
            ) : (
              <>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--blue-accent)" strokeWidth="1.5">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Upload avatar <span style={{ color: 'var(--gold)' }}>(opsional)</span>
                </span>
                <span className="text-xs" style={{ color: 'var(--blue-accent)' }}>
                  Tap untuk pilih gambar
                </span>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" onChange={handleFileChange} />
        </section>

        <section className="panel rounded-xl p-3 gold-border">
          <p className="section-title mb-2">Username</p>
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
              fontSize: '0.9rem',
            }}
            onFocus={e => (e.target.style.borderColor = 'var(--gold-dark)')}
            onBlur={e => (e.target.style.borderColor = 'var(--blue-border)')}
          />
          <div className="flex justify-end mt-1">
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {username.length}/15
            </span>
          </div>
        </section>

        <section className="panel rounded-xl p-3 gold-border">
          <p className="section-title mb-2">Rank</p>
          <div className="grid grid-cols-4 gap-1.5">
            {RANKS.map(r => (
              <button
                key={r}
                onClick={() => setRank(r)}
                className="rank-card rounded-lg p-1.5 flex flex-col items-center gap-1"
                style={{
                  background: rank === r ? 'rgba(201,168,76,0.12)' : 'rgba(5,13,26,0.6)',
                  border: rank === r ? '1px solid var(--gold)' : '1px solid var(--blue-border)',
                  boxShadow: rank === r ? '0 0 16px rgba(201,168,76,0.4)' : 'none',
                }}
              >
                <img
                  src={`/fml-assets/rank/${r}.webp`}
                  alt={r}
                  className="w-8 h-8 object-contain"
                  loading="lazy"
                />
                <span className="text-center leading-tight"
                  style={{ fontSize: '0.55rem', color: rank === r ? 'var(--gold-light)' : 'var(--text-secondary)', fontFamily: 'Cinzel, serif', letterSpacing: '0.05em' }}>
                  {RANK_LABELS[r]}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel rounded-xl p-3 gold-border">
          <p className="section-title mb-2">Border Frame</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setBorder(0)}
              className="border-card rounded-lg flex-shrink-0 flex flex-col items-center justify-center gap-1"
              style={{
                width: 52, height: 52,
                background: 'rgba(5,13,26,0.8)',
                border: border === 0 ? '2px solid var(--gold)' : '1px solid var(--blue-border)',
                boxShadow: border === 0 ? '0 0 12px rgba(201,168,76,0.5)' : 'none',
              }}
            >
              <div className="w-7 h-7 rounded flex items-center justify-center"
                style={{ border: '2px solid var(--gold)', background: 'transparent' }}>
                <span style={{ fontSize: '0.45rem', color: 'var(--gold)', fontFamily: 'Cinzel, serif' }}>Gold</span>
              </div>
              <span style={{ fontSize: '0.45rem', color: 'var(--text-secondary)', fontFamily: 'Cinzel, serif' }}>Default</span>
            </button>
            {BORDERS.map(b => (
              <button
                key={b}
                onClick={() => setBorder(b)}
                className="border-card rounded-lg"
                style={{
                  width: 52, height: 52,
                  outline: border === b ? '2px solid var(--gold)' : 'none',
                  outlineOffset: 2,
                  boxShadow: border === b ? '0 0 12px rgba(201,168,76,0.6)' : 'none',
                  background: 'rgba(5,13,26,0.6)',
                  overflow: 'hidden',
                  border: '1px solid var(--blue-border)',
                  flexShrink: 0,
                }}
              >
                <img
                  src={`/fml-assets/border/${b}.webp`}
                  alt={`Border ${b}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
            Border dipilih: <span style={{ color: 'var(--gold)' }}>{border === 0 ? 'Default (Gold Outline)' : `Border #${border}`}</span>
          </p>
        </section>

        <section className="panel rounded-xl p-3 gold-border">
          <p className="section-title mb-1">Verifikasi Kemanusiaan 🤖</p>
          <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
            Ketik <span style={{ color: 'var(--gold)', fontWeight: 700 }}>"{captcha}"</span> untuk lanjut
          </p>
          <input
            type="text"
            value={captchaInput}
            onChange={e => { setCaptchaInput(e.target.value); setCaptchaError(null) }}
            placeholder={`ketik: ${captcha}`}
            className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-all"
            style={{
              background: 'rgba(5,13,26,0.8)',
              border: `1px solid ${captchaError ? 'rgba(180,40,40,0.6)' : 'var(--blue-border)'}`,
              color: 'var(--text-primary)',
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: '0.9rem',
            }}
            onFocus={e => (e.target.style.borderColor = captchaError ? 'rgba(180,40,40,0.6)' : 'var(--gold-dark)')}
            onBlur={e => (e.target.style.borderColor = captchaError ? 'rgba(180,40,40,0.6)' : 'var(--blue-border)')}
          />
          {captchaError && (
            <p className="text-xs mt-1.5" style={{ color: '#f88' }}>
              💀 {captchaError}
            </p>
          )}
        </section>

        {error && (
          <div className="rounded-lg px-3 py-2 text-xs"
            style={{ background: 'rgba(180,40,40,0.15)', border: '1px solid rgba(180,40,40,0.4)', color: '#f88' }}>
            ⚠ {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="btn-gold rounded-xl py-3 text-sm w-full"
          style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Generating...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              Generate Card
            </span>
          )}
        </button>

        {resultImg && (
          <section className="fade-in-up panel rounded-xl p-3 gold-border-bright pulse-gold flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 w-full">
              <div className="diamond-icon" />
              <p className="section-title">Hasil Generate</p>
              <div className="diamond-icon" />
            </div>
            <div className="divider w-full" />
            <img
              src={resultImg}
              alt="Generated ML Card"
              className="w-full max-w-[200px] rounded-xl"
              style={{ boxShadow: '0 8px 40px rgba(201,168,76,0.25), 0 2px 10px rgba(0,0,0,0.6)' }}
            />
            <button
              onClick={handleDownload}
              className="btn-gold rounded-xl py-2 px-6 text-xs"
            >
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7,10 12,15 17,10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download PNG
              </span>
            </button>
            <a
              href="https://wa.me/62895423300395"
              target="_blank"
              rel="noopener noreferrer"
              className="credit-link"
              style={{ fontSize: '0.65rem', opacity: 0.8 }}
            >
              Made by Givy
            </a>
          </section>
        )}
      </main>

      <footer className="relative z-10 py-4 text-center">
        <div className="divider max-w-sm mx-auto mb-3" />
        <div className="flex items-center justify-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <div className="diamond-icon" style={{ width: 4, height: 4 }} />
          <span>Fake ML Card Generator</span>
          <div className="diamond-icon" style={{ width: 4, height: 4 }} />
        </div>
        <div className="mt-2">
          <a
            href="https://wa.me/62895423300395"
            target="_blank"
            rel="noopener noreferrer"
            className="credit-link"
          >
            Made by Givy
          </a>
        </div>
      </footer>
    </div>
  )
}
