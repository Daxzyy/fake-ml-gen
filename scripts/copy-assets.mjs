import { cpSync, mkdirSync } from 'fs'
import { join } from 'path'

const src = join(process.cwd(), 'node_modules', 'fake-ml', 'assets')
const dest = join(process.cwd(), 'public', 'fml-assets')

mkdirSync(dest, { recursive: true })
cpSync(src, dest, { recursive: true })
console.log('Assets copied to public/fml-assets')
