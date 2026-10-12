import { test, expect } from '@playwright/test'

test('desktop exhibition loads local art and has no runtime errors', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message))
  await page.setViewportSize({ width:1440, height:1000 })
  await page.goto('/'); await expect(page.getByRole('heading', {name:/千年汴京/})).toBeVisible()
  await expect(page.locator('.chapter-card')).toHaveCount(5)
  await page.locator('.hero-art img').evaluate(img => img.decode())
  await expect(page.locator('.discovery-banner')).toHaveCSS('opacity','1')
  await page.screenshot({ path:'test-results/home-desktop.png', fullPage:true })
  expect(errors).toEqual([])
})

test('scroll, zoom, filtering, story collection and persistence', async ({ page }) => {
  await page.setViewportSize({ width:1280, height:900 })
  await page.goto('/#/scroll'); await expect(page.locator('.scroll-stage')).toBeVisible()
  await page.getByRole('button',{name:'放大',exact:true}).click(); await expect(page.locator('.zoom-control')).toContainText('120%')
  await page.getByRole('button',{name:'重置视角'}).click(); await expect(page.locator('.zoom-control')).toContainText('100%')
  await page.locator('.filter-row').getByRole('button',{name:'建筑',exact:true}).click(); await expect(page.locator('.hotspot')).toHaveCount(4)
  await page.getByRole('button',{name:'探索虹桥结构',exact:true}).click()
  await expect(page.getByRole('dialog')).toContainText('虹桥结构')
  await page.getByRole('button',{name:'收藏故事',exact:true}).click()
  await expect(page.getByRole('button',{name:'已收藏',exact:true})).toBeVisible()
  await page.getByRole('button',{name:'关闭讲解'}).click()
  await page.goto('/#/collection'); await expect(page.locator('.story-card')).toHaveCount(1)
  await page.reload(); await expect(page.locator('.story-card')).toHaveCount(1)
  await page.goto('/#/quests'); await expect(page.locator('.progress-ring')).toContainText('1 / 15')
})

test('search, full score quiz and earned seal', async ({ page }) => {
  await page.goto('/#/explore')
  await page.getByRole('textbox',{name:'搜索故事'}).fill('不存在的故事'); await expect(page.locator('.empty-state')).toBeVisible()
  await page.getByRole('button',{name:'查看全部故事'}).click(); await expect(page.locator('.story-card')).toHaveCount(15)
  await page.goto('/#/quests'); await page.getByRole('button',{name:'开始答题'}).click()
  const answers = ['张择端','从右向左','木构','运输物资','丰富的市井细节']
  for (let i=0;i<answers.length;i++) {
    await page.locator('.quiz-option').filter({hasText:answers[i]}).click()
    await page.getByRole('button',{name:i===4?'查看成绩':'下一题',exact:false}).click()
  }
  await expect(page.locator('.quiz-result')).toContainText('5 / 5')
  await page.getByRole('button',{name:'收下这份记忆'}).click()
  await expect(page.locator('.seal-card.earned')).toHaveCount(1)
  await page.reload(); await expect(page.locator('.seal-card.earned')).toHaveCount(1)
})

test('auto guide progresses and pause stops timer', async ({ page }) => {
  await page.goto('/#/scroll'); await page.getByRole('button',{name:'自动导览',exact:true}).click()
  await expect(page.locator('.tour-bar')).toBeVisible()
  await page.getByRole('button',{name:'下一导览章节'}).click()
  await expect(page.locator('.chapter-tabs button.active')).toContainText('汴河舟楫')
  await page.getByRole('button',{name:'暂停导览'}).click()
  const time = await page.locator('.tour-time').textContent()
  await page.waitForTimeout(1300); expect(await page.locator('.tour-time').textContent()).toBe(time)
  await page.getByRole('button',{name:'结束导览',exact:true}).click(); await expect(page.locator('.tour-bar')).toHaveCount(0)
})

test('settings, atmospheric modes and keyboard dialog dismissal', async ({ page }) => {
  await page.goto('/#/scroll')
  await page.getByRole('button',{name:'暮色',exact:true}).click(); await expect(page.locator('.scroll-stage')).toHaveClass(/night/)
  await page.getByRole('button',{name:'打开设置'}).click()
  await page.getByRole('switch',{name:'沉浸动效'}).click()
  await expect(page.getByRole('switch',{name:'沉浸动效'})).toHaveAttribute('aria-checked','false')
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload(); await expect(page.locator('html')).toHaveClass(/reduced-motion/)
})

test('real touch pinch changes zoom and vertical drag reveals artwork', async ({ browser }) => {
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true})
  const page=await context.newPage();await page.goto('http://localhost:5173/#/scroll')
  const client=await context.newCDPSession(page)
  const box=await page.locator('.scroll-stage').boundingBox()
  const y=box.y+box.height*.3, x=box.x+box.width*.5
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-35,y,id:1},{x:x+35,y,id:2}]})
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-65,y,id:1},{x:x+65,y,id:2}]})
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  await expect(page.locator('.zoom-control')).not.toContainText('100%')
  const before=await page.locator('.scroll-art-layer').getAttribute('style')
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]})
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y+100,id:1}]})
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  expect(await page.locator('.scroll-art-layer').getAttribute('style')).not.toBe(before)
  await context.close()
})

for(const width of [320,390,430]) {
  test('mobile '+width+' layout and long-scroll interaction', async ({ page }) => {
    await page.setViewportSize({width,height:844})
    await page.goto('/')
    await expect(page.locator('.bottom-nav')).toBeVisible()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
    if(width===390) { await expect(page.locator('.discovery-banner')).toHaveCSS('opacity','1'); await page.screenshot({path:'test-results/home-mobile.png',fullPage:true}) }
    await page.locator('.bottom-nav').getByRole('link',{name:'长卷漫游'}).click()
    await expect(page.locator('.scroll-stage')).toBeVisible()
    const before = await page.locator('.scroll-art-layer').getAttribute('style')
    const box = await page.locator('.scroll-stage').boundingBox()
    await page.mouse.move(box.x+box.width*.6,box.y+box.height*.6)
    await page.mouse.down(); await page.mouse.move(box.x+box.width*.2,box.y+box.height*.6,{steps:10}); await page.mouse.up()
    expect(await page.locator('.scroll-art-layer').getAttribute('style')).not.toBe(before)
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
    if(width===390) await page.screenshot({path:'test-results/scroll-mobile.png',fullPage:true})
    await page.locator('.bottom-nav').getByRole('link',{name:'主题探索'}).click()
    expect(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  })
}
