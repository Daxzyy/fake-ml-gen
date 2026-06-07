import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export async function GET(
  _req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const filePath = path.join(
    process.cwd(),
    'node_modules',
    'fake-ml',
    'assets',
    ...params.path
  )

  if (!filePath.startsWith(path.join(process.cwd(), 'node_modules', 'fake-ml', 'assets'))) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  if (!fs.existsSync(filePath)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const ext = path.extname(filePath).toLowerCase()
  const mimeMap: Record<string, string> = {
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf',
  }

  const mime = mimeMap[ext] || 'application/octet-stream'
  const data = fs.readFileSync(filePath)

  return new NextResponse(data, {
    headers: {
      'Content-Type': mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
