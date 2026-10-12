import { test, expect } from '@playwright/test'

test('audio plays, closes completely and recovers after an interruption', async ({ page }) => {
  await page.addInitScript(() => {
    const Native = window.AudioContext
    window.audioSessions = []
    window.AudioContext = class extends Native {
      constructor() { super(); window.audioSessions.push(this) }
    }
  })
  await page.goto('/')
  const toggle = page.getByRole('button', { name: '环境音', exact: true })
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => audioSessions[0].state)).toBe('running')
  await page.evaluate(() => audioSessions[0].suspend())
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(() => page.evaluate(() => audioSessions.every(c => c.state === 'closed'))).toBe(true)
})

test('cancelled pending audio never starts and failed resume stays off', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message))
  await page.addInitScript(() => {
    const Native = window.AudioContext
    window.audioSessions = []
    window.AudioContext = class extends Native {
      constructor() { super(); window.audioSessions.push(this) }
      resume() { return new Promise((resolve, reject) => { window.finishAudio = () => reject(new Error('blocked')) }) }
    }
  })
  await page.goto('/')
  const toggle = page.getByRole('button', { name: '环境音', exact: true })
  await toggle.click(); await toggle.click()
  await page.evaluate(() => finishAudio())
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await toggle.click(); await page.evaluate(() => finishAudio())
  await expect(page.getByText('环境音未能播放，请再次点击开启或检查浏览器声音权限')).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(() => page.evaluate(() => audioSessions.every(c => c.state === 'closed'))).toBe(true)
  expect(errors).toEqual([])
})
