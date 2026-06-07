import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'

const rateMap = new Map<string, { count: number; reset: number }>()

function getIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  )
}

function checkRate(ip: string): boolean {
  const now = Date.now()
  const entry = rateMap.get(ip)
  if (!entry || now > entry.reset) {
    rateMap.set(ip, { count: 1, reset: now + 60_000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

function hmac(ts: number, img: string): string {
  const secret = process.env.CARD_SECRET || 'default-secret-change-me'
  return crypto.createHmac('sha256', secret).update(`${ts}${img}`).digest('hex')
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

function getBrowser(ua: string): string {
  if (/Edg\//i.test(ua))          return 'Microsoft Edge'
  if (/OPR\/|Opera/i.test(ua))    return 'Opera'
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Browser'
  if (/UCBrowser/i.test(ua))      return 'UC Browser'
  if (/YaBrowser/i.test(ua))      return 'Yandex Browser'
  if (/Firefox\//i.test(ua))      return 'Firefox'
  if (/Chrome\//i.test(ua))       return 'Chrome'
  if (/Safari\//i.test(ua))       return 'Safari'
  if (/MSIE|Trident/i.test(ua))   return 'Internet Explorer'
  return 'Unknown Browser'
}

function getDevice(ua: string): string {
  if (/iPad/i.test(ua))                           return 'iPad (iOS)'
  if (/iPhone/i.test(ua))                         return 'iPhone (iOS)'
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) return 'Android Phone'
  if (/Android/i.test(ua))                        return 'Android Tablet'
  if (/Windows NT/i.test(ua))                     return 'Windows PC'
  if (/Macintosh|Mac OS X/i.test(ua))             return 'Mac'
  if (/Linux/i.test(ua))                          return 'Linux'
  return 'Unknown Device'
}

async function sendTelegramNotif(
  req: NextRequest,
  username: string,
  rank: string,
  border: number,
  avatarBuffer: Buffer | null
) {
  const botToken = process.env.TG_BOT_TOKEN
  const chatId   = process.env.TG_CHAT_ID
  if (!botToken || !chatId) return

  const ip      = getIP(req)
  const ua      = req.headers.get('user-agent') || ''
  const browser = getBrowser(ua)
  const device  = getDevice(ua)
  const ts      = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })

  let city = '?', region = '?', country = '?', isp = '?'
  try {
    const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=city,regionName,country,isp,status`, {
      signal: AbortSignal.timeout(3000),
    })
    const geo = await geoRes.json()
    if (geo.status === 'success') {
      city    = geo.city
      region  = geo.regionName
      country = geo.country
      isp     = geo.isp
    }
  } catch (_) {}

  const borderLabel = border === 0 ? 'Default' : `#${border}`
  const caption = [
    `🎴 <b>Card Generated!</b>`,
    ``,
    `👤 <b>Username:</b> <code>${username}</code>`,
    `🏆 <b>Rank:</b> ${rank}`,
    `🖼️ <b>Border:</b> ${borderLabel}`,
    ``,
    `🌐 <b>IP:</b> <code>${ip}</code>`,
    `📍 <b>Lokasi:</b> ${city}, ${region}, ${country}`,
    `📡 <b>ISP:</b> ${isp}`,
    `🖥️ <b>Device:</b> ${device}`,
    `🌏 <b>Browser:</b> ${browser}`,
    ``,
    `🕐 <b>Waktu:</b> ${ts}`,
  ].join('\n')

  try {
    if (avatarBuffer) {
      // Kirim avatar sebagai foto dengan caption info user
      const form = new FormData()
      form.append('chat_id', chatId)
      form.append('caption', caption)
      form.append('parse_mode', 'HTML')
      form.append(
        'photo',
        new Blob([new Uint8Array(avatarBuffer)], { type: 'image/jpeg' }),
        `${username}-avatar.jpg`
      )
      await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        body: form,
      })
    } else {
      // Fallback: kirim teks aja kalau ga ada avatar
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: caption, parse_mode: 'HTML' }),
      })
    }
  } catch (_) {}
}

async function generateCardPatched({ avatarBuffer, username, rank, border, outputDir }: {
  avatarBuffer: Buffer | null
  username: string
  rank: string
  border: number
  outputDir: string
}) {
  const { Canvas, loadImage, FontLibrary } = require('skia-canvas')
  const ASSETS_DIR = path.join(process.cwd(), 'public', 'fml-assets')

  const ASSETS = {
    lobby: path.join(ASSETS_DIR, 'Lobby.jpg'),
    flag:  path.join(ASSETS_DIR, 'Bendera.svg'),
    font:  path.join(ASSETS_DIR, 'noto-sans.regular.ttf'),
  }

  const BORDER_OFFSET: Record<number, number> = {
    1: 26, 2: 36, 3: 26, 4: 26, 5: 26,
    6: 26, 7: 26, 8: 26, 9: 26,
    10: 26, 11: 22, 12: 28, 13: 26,
    14: 21, 15: 26, 16: 26,
  }

  const RANK_CONFIG: Record<string, { size: number; x: number; y: number }> = {
    epic:   { size: 210, x: 388, y: 760 },
    glory:  { size: 210, x: 387, y: 760 },
    gm:     { size: 260, x: 358, y: 760 },
    honor:  { size: 210, x: 384, y: 760 },
    imo:    { size: 260, x: 358, y: 760 },
    legend: { size: 260, x: 360, y: 760 },
    mawi:   { size: 210, x: 387, y: 760 },
  }

  const config = {
    canvas:   { width: 960, height: 1706 },
    avatar:   { x: 389, y: 446, size: 204, borderRadius: 12 },
    outline:  { color: '#b8956f', thickness: 4 },
    rank:     { x: 387, y: 760, size: 210 },
    flag:     { x: 364, y: 428, size: 55 },
    username: { a: 681, b: 727, c: 400, centerX: 496, d: 609, fontSize: 36, maxChars: 15, color: '#ffffff' },
  }

  FontLibrary.use('NotoSans', [ASSETS.font])

  const useBorder = border && border > 0

  const avatarImg = avatarBuffer
    ? await loadImage(avatarBuffer)
    : await loadImage(path.join(ASSETS_DIR, 'avatar.jpg'))

  const baseImages: Promise<unknown>[] = [
    loadImage(ASSETS.lobby),
    Promise.resolve(avatarImg),
    loadImage(ASSETS.flag),
    loadImage(path.join(ASSETS_DIR, 'rank', `${rank}.webp`)),
  ]

  if (useBorder) baseImages.push(loadImage(path.join(ASSETS_DIR, 'border', `${border}.webp`)))

  const [lobbyImg, avatarImgLoaded, flagImg, rankImg, borderImg] = await Promise.all(baseImages) as any[]

  const { width, height } = config.canvas
  const canvas = new Canvas(width, height)
  const ctx = canvas.getContext('2d')

  ctx.drawImage(lobbyImg, 0, 0, width, height)

  const { x, y, size, borderRadius } = config.avatar
  const sw = Math.min(avatarImgLoaded.width, avatarImgLoaded.height)
  const sx = (avatarImgLoaded.width - sw) / 2
  const sy = (avatarImgLoaded.height - sw) / 2

  ctx.save()
  if (!useBorder) {
    const { color, thickness } = config.outline
    ctx.beginPath()
    ctx.roundRect(x - thickness, y - thickness, size + thickness * 2, size + thickness * 2, borderRadius + thickness)
    ctx.strokeStyle = color
    ctx.lineWidth = thickness * 2
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.roundRect(x, y, size, size, borderRadius)
  ctx.clip()
  ctx.drawImage(avatarImgLoaded, sx, sy, sw, sw, x, y, size, size)
  ctx.restore()

  if (useBorder) {
    const offset = BORDER_OFFSET[border] ?? 26
    const bSize = size + offset * 2
    ctx.drawImage(borderImg, x - offset, y - offset, bSize, bSize)
  }

  const rankCfg = RANK_CONFIG[rank] ?? { size: config.rank.size, x: config.rank.x, y: config.rank.y }
  const rankHeight = rankCfg.size * (rankImg.height / rankImg.width)
  ctx.drawImage(rankImg, rankCfg.x, rankCfg.y, rankCfg.size, rankHeight)

  const { x: fx, y: fy, size: fs2 } = config.flag
  const radius = fs2 / 2
  ctx.save()
  ctx.beginPath()
  ctx.arc(fx + radius, fy + radius, radius, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(flagImg, fx, fy, fs2, fs2)
  ctx.restore()

  const { a, b, c, d, centerX, fontSize, maxChars, color: uColor } = config.username
  const name = username.slice(0, maxChars)
  const uw = d - c
  const uh = b - a
  let uSize = fontSize
  ctx.textAlign = 'center'
  while (uSize > 8) {
    ctx.font = `${uSize}px NotoSans`
    if (ctx.measureText(name).width <= uw) break
    uSize -= 1
  }
  ctx.fillStyle = uColor
  ctx.font = `${uSize}px NotoSans`
  ctx.fillText(name, centerX, a + uh / 2 + uSize / 3)

  const buffer = await canvas.toBuffer('png', { quality: 1.0 })

  const outputFolder = path.join(outputDir, 'fake-ml')
  if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder, { recursive: true })
  const outputPath = path.join(outputFolder, `${username}.png`)
  fs.writeFileSync(outputPath, buffer)

  return { result: outputPath }
}

export async function POST(req: NextRequest) {
  const ip = getIP(req)

  const origin  = req.headers.get('origin')  || ''
  const referer = req.headers.get('referer') || ''
  const xrw     = req.headers.get('x-requested-with') || ''

  const host      = req.headers.get('host') || ''
  const ownDomain = host.split(':')[0]

  const refererOk =
    referer === '' ||
    referer.includes(ownDomain) ||
    referer.includes('localhost') ||
    origin.includes(ownDomain) ||
    origin.includes('localhost')

  if (!refererOk) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (xrw.toLowerCase() !== 'xmlhttprequest') {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
  }

  if (!checkRate(ip)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
  }

  await delay(300 + Math.floor(Math.random() * 500))

  try {
    const formData = await req.formData()
    const username   = (formData.get('username') as string) || 'Player'
    const rank       = (formData.get('rank')     as string) || 'imo'
    const border     = parseInt((formData.get('border') as string) || '0', 10)
    const avatarFile = formData.get('avatar') as File | null

    let avatarBuffer: Buffer | null = null
    if (avatarFile && avatarFile.size > 0) {
      avatarBuffer = Buffer.from(await avatarFile.arrayBuffer())
    }

    const outputDir = path.join(os.tmpdir(), `fml-out-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    fs.mkdirSync(outputDir, { recursive: true })

    const result = await generateCardPatched({ avatarBuffer, username, rank, border, outputDir })

    const imgBuffer = fs.readFileSync(result.result)
    const base64    = `data:image/png;base64,${imgBuffer.toString('base64')}`

    try { fs.rmSync(outputDir, { recursive: true, force: true }) } catch {}

    // Fire-and-forget — ga nunggu, ga nge-block response ke user
    sendTelegramNotif(req, username, rank, border, avatarBuffer).catch(() => {})

    const ts = Date.now()
    const h  = hmac(ts, base64)

    const headers = new Headers({
      'Cache-Control':         'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options':'nosniff',
      'X-Robots-Tag':          'noindex',
      'Content-Type':          'application/json',
    })

    return new NextResponse(
      JSON.stringify({ t: ts, d: base64, h }),
      { status: 200, headers }
    )
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
