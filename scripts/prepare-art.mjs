import sharp from 'sharp'
import fs from 'node:fs/promises'
const input = 'assets-source/scroll.jpg'
await fs.mkdir('public/art', { recursive: true })
const { width, height } = await sharp(input).metadata()
await sharp(input).resize({ width: 6000 }).webp({ quality: 85 }).toFile('public/art/overview.webp')
await sharp(input).resize({ width: 1800 }).png().toFile('assets-source/contact.png')
for (let i = 0; i < 16; i++) {
  const left = Math.floor(width * i / 16)
  const end = Math.floor(width * (i + 1) / 16)
  await sharp(input).extract({ left, top: 0, width: end - left, height }).resize({ height: 1200 }).webp({ quality: 87 }).toFile(`public/art/tile-${i}.webp`)
}
for (const [name, start, span] of [['hero', .39, .2], ['bridge', .45, .13], ['gate', .27, .13], ['market', .08, .13], ['river', .64, .13], ['country', .85, .14]]) {
  await sharp(input).extract({ left: Math.floor(width * start), top: 0, width: Math.floor(width * span), height }).resize({ width: name === 'hero' ? 2400 : 1200 }).webp({ quality: 88 }).toFile(`public/art/${name}.webp`)
}
console.log('Local artwork ready: 16 tiles, overview, 6 scene images.')
