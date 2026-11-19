/**
 * 매장 목 사진(800×600)의 작은 변형을 만든다 — 목록·카드 썸네일용
 * 결과: public/images/stores/photos/thumbs/{이름}-{폭}.webp (폭은 src/shared/lib/image.ts 의 THUMB_WIDTHS 와 같아야 함)
 * 사진을 추가하거나 바꾼 뒤 `npm run images:thumbs` 로 다시 만든다
 */
import { mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const WIDTHS = [240, 480]
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/images/stores/photos')
const out = path.join(dir, 'thumbs')

await mkdir(out, { recursive: true })
const files = (await readdir(dir)).filter((f) => f.endsWith('.webp'))
for (const file of files) {
  const name = path.basename(file, '.webp')
  for (const width of WIDTHS) {
    await sharp(path.join(dir, file)).resize({ width }).webp({ quality: 72 }).toFile(path.join(out, `${name}-${width}.webp`))
  }
}
console.log(`썸네일 ${files.length * WIDTHS.length}개 생성 (${WIDTHS.join(', ')}px)`)
