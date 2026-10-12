import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
const root = 'android/app/src/main/res'
for (const [density, size] of Object.entries({ mdpi:48, hdpi:72, xhdpi:96, xxhdpi:144, xxxhdpi:192 })) {
  const dir = `${root}/mipmap-${density}`
  await mkdir(dir, { recursive:true })
  for (const name of ['ic_launcher', 'ic_launcher_round']) {
    await sharp('public/icon-512.png').resize(size, size).png().toFile(`${dir}/${name}.png`)
  }
  const foregroundSize = Math.round(size * 2.25)
  const art = await sharp('public/icon-512.png').resize(size, size).toBuffer()
  await sharp({ create:{ width:foregroundSize, height:foregroundSize, channels:4, background:'#1d4439' } })
    .composite([{input:art, gravity:'centre'}]).png().toFile(`${dir}/ic_launcher_foreground.png`)
}
