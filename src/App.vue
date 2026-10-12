<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import gsap from 'gsap'
import { ArrowUpRight, ArrowRight, ArrowLeft, ChevronRight, X, Play, Pause, Compass, Map, BookOpen, Bookmark, Sparkles, Headphones, Volume2, VolumeX, Settings2, ZoomIn, ZoomOut, RotateCcw, Check, CheckCircle2, Landmark, Ship, Users, Store, Sun, Moon, CloudSun, Search, Award, Maximize2, Heart, Menu, Share2 } from 'lucide-vue-next'
import { chapters, hotspots, routes, questions } from './data'
import { useMuseum } from './store'
import InkAtmosphere from './components/InkAtmosphere.vue'
const asset = path => import.meta.env.BASE_URL + path
const route = useRoute(), router = useRouter(), museum = useMuseum()
const page = computed(() => route.path.slice(1) || 'home')
const nav = [{ id: 'home', path: '/', name: '展馆首页', icon: Landmark }, { id: 'scroll', path: '/scroll', name: '长卷漫游', icon: Map }, { id: 'explore', path: '/explore', name: '主题探索', icon: Compass }, { id: 'quests', path: '/quests', name: '汴京寻宝', icon: Sparkles }, { id: 'collection', path: '/collection', name: '我的藏阁', icon: Bookmark }]
const icons = { users: Users, landmark: Landmark, store: Store, ship: Ship }
const selected = ref(null), settingsOpen = ref(false), helpOpen = ref(false), mobileMenu = ref(false)
const activeChapter = ref(2), activeRoute = ref('全部'), query = ref(''), zoom = ref(1), offset = ref(.505), width = ref(1000), stage = ref(null), panY = ref(0)
const speaking = ref(false), toast = ref(''), assetError = ref(false)
const guided = ref(false), guideSeconds = ref(0), guidePaused = ref(false)
const quizOpen = ref(false), quizIndex = ref(0), answer = ref(null), quizScore = ref(0), quizDone = ref(false)
const progress = computed(() => Math.round(museum.visited.length / hotspots.length * 100))
const chapter = computed(() => chapters[activeChapter.value])
const tileWidth = computed(() => 21341 / 16 * zoom.value)
const fullWidth = computed(() => tileWidth.value * 16)
const canvasHeight = computed(() => 1000 * zoom.value)
const scrollStyle = computed(() => ({ width: fullWidth.value + 'px', height: canvasHeight.value + 'px', transform: 'translate(' + (width.value / 2 - offset.value * fullWidth.value) + 'px, calc(-50% + ' + panY.value + 'px))' }))
const visibleHotspots = computed(() => hotspots.filter(h => activeRoute.value === '全部' || h.kind === activeRoute.value))
const filteredHotspots = computed(() => hotspots.filter(h => (activeRoute.value === '全部' || h.kind === activeRoute.value) && (!query.value || (h.title + h.text + h.kind).includes(query.value))))
const collection = computed(() => hotspots.filter(h => museum.favorites.includes(h.id)))
const earned = computed(() => [
  { name: '初入汴京', condition: '发现第一个故事', done: museum.visited.length >= 1 },
  { name: '虹桥知音', condition: '发现虹桥的三个故事', done: hotspots.filter(h => h.chapter === 2).every(h => museum.visited.includes(h.id)) },
  { name: '博古通今', condition: '问答答对至少四题', done: museum.quizBest >= 4 },
  { name: '长卷行者', condition: '发现全部十五个故事', done: museum.visited.length === 15 },
])
let cleanupResize, tourTimer, toastTimer, ambient, audioContext, touchPoints = new globalThis.Map(), lastPinch = 0, speechToken = 0
const drag = { down: false, x: 0, y: 0, pan: 0, offset: 0, moved: false, velocity: 0, lastX: 0, lastTime: 0, pinched: false }
function notify(message) { toast.value = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.value = '', 3200) }
function go(path) { mobileMenu.value = false; router.push(path); window.scrollTo({ top: 0, behavior: museum.settings.motion ? 'smooth' : 'instant' }) }
function stopSpeech() { speechToken++; window.speechSynthesis?.cancel(); speaking.value = false }
function speak(text) {
  stopSpeech()
  if (!('speechSynthesis' in window)) { notify('此浏览器不支持语音朗读，请阅读下方文字讲解'); return }
  const u = new SpeechSynthesisUtterance(text); u.lang = 'zh-CN'; u.rate = .92
  const voices = window.speechSynthesis.getVoices()
  const voice = voices.find(v => v.lang.startsWith('zh')); if (voice) u.voice = voice
  const token = speechToken; speaking.value = true
  u.onend = () => { if (token === speechToken) speaking.value = false }
  u.onerror = () => { if (token === speechToken) { speaking.value = false; notify('语音未能播放，文字讲解仍可阅读') } }
  window.speechSynthesis.speak(u)
}
function narration() { if (speaking.value) stopSpeech(); else speak(selected.value ? selected.value.title + '。' + selected.value.text : chapter.value.title + '。' + chapter.value.text) }
async function selectHotspot(h) { if(document.fullscreenElement) await document.exitFullscreen(); stopSpeech(); selected.value = h; museum.visit(h.id) }
function closeDetail() { stopSpeech(); selected.value = null }
function jump(index) {
  activeChapter.value = index
  panY.value = 0
  if (museum.settings.motion) gsap.to(offset, { value: chapters[index].x, duration: 1.3, ease: 'power3.inOut', onUpdate: clamp })
  else offset.value = chapters[index].x
}
function clamp() {
  const half = width.value / fullWidth.value / 2
  offset.value = Math.max(half, Math.min(1 - half, offset.value))
  const limit = Math.max(0, (canvasHeight.value - (stage.value?.clientHeight || 460)) / 2)
  panY.value = Math.max(-limit, Math.min(limit, panY.value))
}
function setZoom(value) { zoom.value = Math.max(.45, Math.min(2.2, value)); clamp() }
function pointerDown(e) {
  if (e.target.closest('button')) return
  touchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY })
  stage.value?.setPointerCapture(e.pointerId)
  if (touchPoints.size === 2) { const [a,b] = [...touchPoints.values()]; lastPinch = Math.hypot(a.x-b.x, a.y-b.y) }
  drag.down = true; drag.x = e.clientX; drag.offset = offset.value; drag.moved = false
  drag.y = e.clientY; drag.pan = panY.value
  drag.velocity = 0; drag.lastX = e.clientX; drag.lastTime = performance.now(); drag.pinched = touchPoints.size > 1
  gsap.killTweensOf(offset)
}
function pointerMove(e) {
  if (!drag.down) return
  touchPoints.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (touchPoints.size === 2) {
    drag.pinched = true
    const [a,b] = [...touchPoints.values()]; const distance = Math.hypot(a.x-b.x, a.y-b.y)
    if (lastPinch) setZoom(zoom.value * distance / lastPinch)
    lastPinch = distance; return
  }
  const dx = e.clientX - drag.x
  const now = performance.now(); drag.velocity = (e.clientX - drag.lastX) / Math.max(1, now-drag.lastTime); drag.lastX = e.clientX; drag.lastTime = now
  if (Math.abs(dx) > 4) drag.moved = true
  offset.value = drag.offset - dx / fullWidth.value; panY.value = drag.pan + e.clientY - drag.y; clamp()
}
function pointerUp(e) {
  touchPoints.delete(e.pointerId)
  if (touchPoints.size) { const a = [...touchPoints.values()][0]; drag.x = a.x; drag.y = a.y; drag.pan = panY.value; drag.offset = offset.value }
  else {
    drag.down = false; lastPinch = 0
    if(museum.settings.motion && drag.moved && !drag.pinched && performance.now()-drag.lastTime < 100) {
      gsap.to(offset, { value: offset.value - drag.velocity * 160 / fullWidth.value, duration: .65, ease:'power3.out', onUpdate:clamp })
    }
  }
}
function onWheel(e) { if (e.ctrlKey) { e.preventDefault(); setZoom(zoom.value - e.deltaY * .002) } else { e.preventDefault(); offset.value += (e.deltaX || e.deltaY) / fullWidth.value; clamp() } }
function focusFromList(h) { activeChapter.value = h.chapter; offset.value = h.x; go('/scroll'); nextTick(() => selectHotspot(h)) }
async function startTour() {
  await router.push('/scroll'); await nextTick(); selected.value = null; activeRoute.value = '全部'; guided.value = true; guidePaused.value = false; guideSeconds.value = 0; jump(0)
  speak(chapters[0].title + '。' + chapters[0].text)
  clearInterval(tourTimer)
  tourTimer = setInterval(() => {
    if (guidePaused.value || selected.value) return
    guideSeconds.value++
    if (guideSeconds.value >= 150) { endTour(); notify('长卷导览已完成，继续探索画中故事吧'); return }
    const index = Math.min(4, Math.floor(guideSeconds.value / 30))
    if (index !== activeChapter.value) { jump(index); speak(chapters[index].title + '。' + chapters[index].text) }
  }, 1000)
}
function endTour() { guided.value = false; clearInterval(tourTimer); stopSpeech() }
function guideStep(delta) { guideSeconds.value = Math.max(0, Math.min(149, (activeChapter.value + delta) * 30)); jump(Math.floor(guideSeconds.value / 30)); if(!guidePaused.value) speak(chapter.value.title + '。' + chapter.value.text) }
async function fullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await stage.value.requestFullscreen() } catch { notify('此设备不支持全屏，可以横屏欣赏画卷') } }
function beginQuiz() { quizOpen.value = true; quizIndex.value = 0; answer.value = null; quizScore.value = 0; quizDone.value = false }
function pickAnswer(index) { if (answer.value !== null) return; answer.value = index; if (index === questions[quizIndex.value].correct) quizScore.value++ }
function nextQuestion() { if (quizIndex.value === questions.length - 1) { quizDone.value = true; museum.score(quizScore.value) } else { quizIndex.value++; answer.value = null } }
async function share() {
  const h = selected.value; const url = location.origin + location.pathname + '#/scroll?spot=' + h.id
  try {
    if (navigator.share) await navigator.share({ title: '入画汴京 · ' + h.title, text: h.text, url })
    else { await navigator.clipboard.writeText(url); notify('故事链接已复制') }
  } catch(e) { if (e.name !== 'AbortError') notify('分享不可用，请复制浏览器地址') }
}
function setAtmosphere(mode) { museum.setting('atmosphere', mode) }
function toggleSound() {
  if (museum.settings.sound) { museum.setting('sound', false); stopAmbient(); return }
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)()
    audioContext.resume()
    const gain = audioContext.createGain(); gain.gain.value = .016; gain.connect(audioContext.destination)
    const notes = [130.81, 196, 261.63]
    const oscillators = notes.map(frequency => { const osc = audioContext.createOscillator(); osc.type = 'sine'; osc.frequency.value = frequency; osc.connect(gain); osc.start(); return osc })
    ambient = { gain, oscillators }; museum.setting('sound', true); notify('轻柔环境音已开启')
  } catch { notify('此设备不支持环境音') }
}
function stopAmbient() { if (ambient) { ambient.oscillators.forEach(o => o.stop()); ambient.gain.disconnect(); ambient = null } }
function toggleMotion() { museum.setting('motion', !museum.settings.motion); if (!museum.settings.motion) gsap.killTweensOf(offset) }
function handleKeyboard(e) {
  if (e.key === 'Escape') { closeDetail(); settingsOpen.value = false; helpOpen.value = false; quizOpen.value = false }
  if (e.key === 'Tab') {
    const dialog = document.querySelector('[role="dialog"]')
    if (dialog) {
      const buttons = [...dialog.querySelectorAll('button:not(:disabled), a[href], input')]
      const first = buttons[0], last = buttons[buttons.length-1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
    }
  }
  if (page.value !== 'scroll' || selected.value || ['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) return
  if (e.key === 'ArrowLeft') { e.preventDefault(); offset.value -= .015; clamp() }
  if (e.key === 'ArrowRight') { e.preventDefault(); offset.value += .015; clamp() }
}
watch(page, async (value) => {
  stopSpeech(); if (value !== 'scroll') endTour()
  await nextTick()
  if (museum.settings.motion) gsap.fromTo('.page-entrance', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .65, stagger: .06, clearProps: 'all' })
  bindStage()
})
watch(() => route.query.spot, value => { const h = hotspots.find(h => h.id === value); if (h) { activeChapter.value = h.chapter; offset.value = h.x; selectHotspot(h) } })
watch(() => museum.settings.motion, value => document.documentElement.classList.toggle('reduced-motion', !value))
watch(guidePaused, value => { if(value) stopSpeech(); else if(guided.value) speak(chapter.value.title + '。' + chapter.value.text) })
let previousFocus
watch(() => Boolean(selected.value || settingsOpen.value || helpOpen.value || quizOpen.value), async open => {
  if(open) { previousFocus = document.activeElement; await nextTick(); document.querySelector('[role="dialog"] button')?.focus(); document.body.style.overflow = 'hidden' }
  else { document.body.style.overflow = ''; previousFocus?.focus() }
})
function bindStage() {
  cleanupResize?.()
  if (stage.value) { const observer = new ResizeObserver(entries => { width.value = entries[0].contentRect.width; clamp() }); observer.observe(stage.value); cleanupResize = () => observer.disconnect() }
}
onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) museum.setting('motion', false)
  document.documentElement.classList.toggle('reduced-motion', !museum.settings.motion)
  window.addEventListener('keydown', handleKeyboard); bindStage()
  if (museum.settings.motion) gsap.fromTo('.page-entrance', { y: 32, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: .1, clearProps: 'all' })
  const spot = hotspots.find(h => h.id === route.query.spot)
  if (spot) { activeChapter.value = spot.chapter; offset.value = spot.x; selectHotspot(spot) }
  museum.setting('sound', false)
})
onBeforeUnmount(() => { endTour(); stopAmbient(); cleanupResize?.(); clearTimeout(toastTimer); window.removeEventListener('keydown', handleKeyboard) })
</script>

<template>
  <div class="museum-app" :class="{ 'no-motion': !museum.settings.motion }">
    <header class="site-header">
      <a class="brand" href="#/" @click.prevent="go('/')"><span class="brand-seal">汴</span><span><strong>入画汴京</strong><small>BIANJING · A LIVING SCROLL</small></span></a>
      <nav class="desktop-nav" aria-label="主导航"><a v-for="item in nav" :key="item.id" :href="'#' + item.path" :class="{ active: page === item.id }" @click.prevent="go(item.path)">{{ item.name }}<span v-if="page === item.id" class="nav-dot"></span></a></nav>
      <div class="header-actions"><button class="icon-btn" aria-label="环境音" :aria-pressed="museum.settings.sound" @click="toggleSound"><Volume2 v-if="museum.settings.sound" :size="19"/><VolumeX v-else :size="19"/></button><button class="icon-btn" aria-label="打开设置" @click="settingsOpen = true"><Settings2 :size="19"/></button><button class="museum-label" @click="helpOpen = true">数字典藏 <ArrowUpRight :size="14"/></button><button class="icon-btn mobile-menu" aria-label="展开导航" @click="mobileMenu = !mobileMenu"><Menu :size="20"/></button></div>
    </header>
    <nav v-if="mobileMenu" class="mobile-dropdown"><a v-for="item in nav" :key="item.id" :href="'#' + item.path" @click.prevent="go(item.path)">{{ item.name }}</a></nav>

    <main v-if="page === 'home'" class="home-page">
      <section class="hero page-entrance">
        <div class="hero-art"><img :src="asset('art/hero.webp')" alt="张择端清明上河图虹桥区域高清画卷" fetchpriority="high"/><div class="hero-shade"></div></div>
        <div class="float-leaf leaf-one"></div><div class="float-leaf leaf-two"></div><div class="float-leaf leaf-three"></div>
        <InkAtmosphere :enabled="museum.settings.motion" :density="55"/>
        <div class="hero-copy">
          <div class="eyebrow light"><span class="tiny-line"></span> 一幅长卷 · 一座城 · 千年烟火</div>
          <h1>入画，<br>遇见<span>千年汴京。</span></h1>
          <p>让名画不止于凝望。<br>沿着汴河，在每一处细节里，听见大宋的回响。</p>
          <div class="hero-buttons"><button class="btn primary" @click="go('/scroll')">展开画卷 <ArrowUpRight :size="18"/></button><button class="btn ghost" @click="startTour"><span class="play-circle"><Play :size="13" fill="currentColor"/></span> 沉浸式导览</button></div>
          <div class="hero-credit"><span class="credit-dot"></span> 北宋 · 张择端 <span class="credit-divider">/</span> 清明上河图</div>
        </div>
        <div class="hero-side"><span>流动的宋代生活博物馆</span><span class="vertical-line"></span><span class="side-number">01 — 05</span></div>
        <div class="hero-bottom"><span>跨越千年，与画中人相逢</span><button @click="go('/scroll')">SCROLL TO EXPLORE <ArrowRight :size="16"/></button></div>
        <span class="hero-stamp">千年<br>一瞬</span>
      </section>

      <section class="artwork-strip page-entrance">
        <div class="strip-intro"><span class="mini-seal">宋</span><div><h2>一卷尽览，万象人间</h2><p>从郊野的晨光，走进汴京的繁华</p></div></div>
        <div class="strip-stat"><strong>5</strong><span>叙事篇章</span></div><div class="strip-stat"><strong>15</strong><span>画中故事</span></div><div class="strip-stat"><strong>4</strong><span>探索视角</span></div>
        <button class="strip-more" @click="helpOpen = true">关于这幅画 <ArrowUpRight :size="17"/></button>
      </section>

      <section class="section-wrap chapter-section page-entrance">
        <div class="section-heading"><div><div class="eyebrow">FIVE CHAPTERS OF BIANJING</div><h2>循卷入城 <span>五幕汴京</span></h2></div><button class="text-link" @click="go('/scroll')">开启长卷漫游 <ArrowRight :size="17"/></button></div>
        <div class="chapter-grid"><button v-for="(ch, i) in chapters" :key="ch.id" class="chapter-card" @click="activeChapter = i; offset = ch.x; go('/scroll')"><div class="chapter-image"><img :src="asset('art/' + ch.image + '.webp')" :alt="ch.title + '画卷局部'" loading="lazy"/><span class="chapter-tag">{{ ch.tag }}</span><span class="chapter-arrow"><ArrowUpRight :size="20"/></span></div><div class="chapter-caption"><span class="chapter-no">0{{ i+1 }}</span><div><h3>{{ ch.title }}</h3><p>{{ ch.subtitle }}</p></div></div></button></div>
      </section>

      <section class="section-wrap route-home page-entrance">
        <div class="route-intro"><div class="eyebrow">LOOK CLOSER. DISCOVER MORE.</div><h2>换一个视角，<br>发现另一座汴京。</h2><p>人物、营造、商业与交通。<br>沿着你的好奇心，找到属于自己的故事。</p><button class="text-link" @click="go('/explore')">选择你的探索路线 <ArrowRight :size="17"/></button></div>
        <div class="route-home-grid"><button v-for="r in routes" :key="r.id" class="route-mini" @click="activeRoute = r.id; go('/explore')"><span class="route-icon" :style="{ color:r.color }"><component :is="icons[r.icon]" :size="23"/></span><div><h3>{{ r.title }}</h3><p>{{ r.sub }}</p></div><ArrowUpRight :size="17"/></button></div>
      </section>
      <section class="discovery-banner section-wrap page-entrance"><div class="banner-stamp">寻</div><div><div class="eyebrow">YOUR JOURNEY, YOUR DISCOVERIES</div><h2>藏在长卷里的惊喜，等你发现。</h2><p>收集故事，解锁印章，做一回汴京的寻宝人。</p></div><button class="btn primary" @click="go('/quests')">开始寻宝 <ArrowUpRight :size="18"/></button></section>
      <footer class="footer section-wrap"><span>入画汴京 <small>让文化被看见，也被体验。</small></span><button @click="helpOpen = true">画作来源与项目说明 <ArrowUpRight :size="13"/></button><span class="footer-date">北宋风物 · 数字新生</span></footer>
    </main>

    <main v-else-if="page === 'scroll'" class="scroll-page page-entrance">
      <div class="page-top"><div><div class="eyebrow">THE LIVING SCROLL</div><h1>长卷漫游 <span>一步，走进画里。</span></h1></div><button class="btn outlined small" @click="guided ? endTour() : startTour()"><component :is="guided ? Pause : Play" :size="15"/>{{ guided ? '结束导览' : '自动导览' }}</button></div>
      <div class="scroll-toolbar"><div class="filter-row"><button v-for="kind in ['全部', '人物', '建筑', '商业', '交通']" :key="kind" :class="{ active: activeRoute === kind }" @click="activeRoute = kind">{{ kind === '全部' ? '全部故事' : kind }}</button></div><div class="atmosphere-row"><button v-for="mode in [{id:'morning',icon:CloudSun,name:'晨雾'},{id:'day',icon:Sun,name:'日光'},{id:'night',icon:Moon,name:'暮色'}]" :key="mode.id" :class="{ active: museum.settings.atmosphere === mode.id }" @click="setAtmosphere(mode.id)" :aria-label="mode.name"><component :is="mode.icon" :size="16"/><span>{{ mode.name }}</span></button></div></div>
      <div ref="stage" class="scroll-stage" :class="[museum.settings.atmosphere, { dragging: drag.down }]" tabindex="0" aria-label="可拖动的清明上河图长卷，使用方向键左右移动，按钮放大缩小" @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerUp" @pointercancel="pointerUp" @wheel="onWheel">
        <div class="scroll-art-layer" :style="scrollStyle">
          <img v-for="i in 16" :key="i" :src="asset('art/tile-' + (i - 1) + '.webp')" alt="" draggable="false" :style="{ width: tileWidth + 'px' }" @error="assetError = true"/>
          <button v-for="(h,i) in visibleHotspots" :key="h.id" class="hotspot" :class="{ discovered: museum.visited.includes(h.id) }" :style="{ left: (h.x*100) + '%', top: (h.y*100)+'%', '--delay': (i*.23)+'s' }" @click.stop="selectHotspot(h)" :aria-label="'探索' + h.title"><span class="hotspot-core"><Check v-if="museum.visited.includes(h.id)" :size="12"/><span v-else>+</span></span><span class="hotspot-title">{{ h.title }}</span></button>
        </div>
        <div class="atmosphere-overlay"></div><div class="mist"></div>
        <InkAtmosphere :enabled="museum.settings.motion" :density="30"/>
        <div v-if="assetError" class="asset-error">部分画卷未能加载，请检查连接后刷新页面。</div>
        <div class="stage-corner"><span>张择端 · 清明上河图</span><small>北宋 / 绢本设色 / 故宫博物院藏</small></div>
        <div class="stage-instruction"><Map :size="14"/> 拖动画卷 · 点击光点 · 双指缩放</div>
        <div class="zoom-control"><button @click="setZoom(zoom-.2)" aria-label="缩小"><ZoomOut :size="18"/></button><span>{{ Math.round(zoom*100) }}%</span><button @click="setZoom(zoom+.2)" aria-label="放大"><ZoomIn :size="18"/></button><i></i><button @click="setZoom(1); jump(activeChapter)" aria-label="重置视角"><RotateCcw :size="17"/></button><button @click="fullscreen" aria-label="全屏"><Maximize2 :size="17"/></button></div>
      </div>
      <div class="minimap-wrap"><span>城内</span><div class="minimap" @click="offset = Math.max(.02, Math.min(.98, ($event.clientX - $event.currentTarget.getBoundingClientRect().left) / $event.currentTarget.offsetWidth)); clamp()"><img :src="asset('art/overview.webp')" alt="画卷全景导航"/><span class="minimap-window" :style="{ left:(offset*100)+'%', width:Math.max(3,width/fullWidth*100)+'%' }"></span></div><span>郊野</span></div>
      <div v-if="guided" class="tour-bar"><span class="tour-pulse"></span><strong>沉浸导览</strong><span class="tour-time">{{ Math.floor(guideSeconds/60) }}:{{ String(guideSeconds%60).padStart(2,'0') }} / 2:30</span><div class="tour-track"><i :style="{width:guideSeconds/150*100+'%'}"></i></div><button @click="guideStep(-1)" aria-label="上一导览章节"><ArrowLeft :size="17"/></button><button @click="guidePaused = !guidePaused" :aria-label="guidePaused ? '继续导览' : '暂停导览'"><Play v-if="guidePaused" :size="17"/><Pause v-else :size="17"/></button><button @click="guideStep(1)" aria-label="下一导览章节"><ArrowRight :size="17"/></button></div>
      <div class="chapter-tabs"><button v-for="(ch,i) in chapters" :key="ch.id" :class="{ active: activeChapter === i }" @click="jump(i); if(guided) guideSeconds = i*30"><span>{{ ch.tag }}</span>{{ ch.title }}<small>0{{ i+1 }}</small></button></div>
      <section class="chapter-description"><div><div class="eyebrow">CHAPTER 0{{ activeChapter+1 }}</div><h2>{{ chapter.title }}</h2><p>{{ chapter.text }}</p></div><button class="btn outlined" @click="narration"><Pause v-if="speaking" :size="17"/><Headphones v-else :size="17"/>{{ speaking ? '停止讲解' : '聆听本章' }}</button></section>
    </main>

    <main v-else-if="page === 'explore'" class="content-page section-wrap page-entrance">
      <div class="page-top"><div><div class="eyebrow">FOLLOW YOUR CURIOSITY</div><h1>主题探索 <span>看画，也看见生活。</span></h1></div><span class="progress-pill">{{ museum.visited.length }} / 15 个故事已发现</span></div>
      <div class="explore-route-grid"><button v-for="r in routes" :key="r.id" class="explore-route" :class="{active:activeRoute===r.id}" @click="activeRoute = activeRoute === r.id ? '全部' : r.id"><component :is="icons[r.icon]" :size="28" :style="{color:r.color}"/><h2>{{ r.title }}</h2><p>{{ r.sub }}</p><div class="route-progress"><i :style="{width:hotspots.filter(h=>h.kind===r.id && museum.visited.includes(h.id)).length/hotspots.filter(h=>h.kind===r.id).length*100+'%'}"></i></div><small>{{ hotspots.filter(h=>h.kind===r.id && museum.visited.includes(h.id)).length }} / {{ hotspots.filter(h=>h.kind===r.id).length }} 故事 <ArrowRight :size="14"/></small></button></div>
      <div class="stories-heading"><h2>{{ activeRoute === '全部' ? '画中故事' : activeRoute + '故事' }} <span>{{ filteredHotspots.length }}</span></h2><label class="search-field"><Search :size="17"/><input v-model="query" placeholder="寻找人物、建筑或故事" aria-label="搜索故事"/><button v-if="query" @click="query = ''" aria-label="清空搜索"><X :size="15"/></button></label></div>
      <div class="stories-grid"><article v-for="h in filteredHotspots" :key="h.id" class="story-card"><button class="story-image" @click="focusFromList(h)"><img :src="asset('art/'+chapters[h.chapter].image+'.webp')" :alt="h.title" loading="lazy"/><span>{{ h.kind }}</span><i v-if="museum.visited.includes(h.id)"><Check :size="14"/> 已发现</i></button><div class="story-body"><small>{{ chapters[h.chapter].title }}</small><h3><button @click="focusFromList(h)">{{ h.title }}</button><button :aria-label="museum.favorites.includes(h.id) ? '取消收藏'+h.title : '收藏'+h.title" :class="{saved:museum.favorites.includes(h.id)}" @click="museum.favorite(h.id)"><Bookmark :size="18" :fill="museum.favorites.includes(h.id) ? 'currentColor' : 'none'"/></button></h3><p>{{ h.text }}</p><button class="text-link" @click="focusFromList(h)">在画卷中发现 <ArrowUpRight :size="15"/></button></div></article></div>
      <div v-if="!filteredHotspots.length" class="empty-state"><Search :size="40"/><h2>暂未找到这个故事</h2><p>试试“桥”“城门”或“人物”。</p><button class="btn outlined" @click="query=''; activeRoute='全部'">查看全部故事</button></div>
    </main>

    <main v-else-if="page === 'quests'" class="content-page section-wrap page-entrance">
      <div class="page-top"><div><div class="eyebrow">A LITTLE ADVENTURE IN THE SCROLL</div><h1>汴京寻宝 <span>每一次发现，都值得留印。</span></h1></div><span class="progress-pill"><Award :size="16"/> {{ earned.filter(x=>x.done).length }} 枚印章</span></div>
      <section class="quest-hero"><div><div class="eyebrow light">YOUR EXPLORATION</div><h2>十五个故事，<br>一场千年奇遇。</h2><p>触摸长卷中的光点，收集人物与城市的故事。</p><button class="btn primary" @click="go('/scroll')">继续发现 <ArrowUpRight :size="17"/></button></div><div class="progress-ring" :style="{'--progress':progress+'%'}"><div><strong>{{ progress }}<small>%</small></strong><span>{{ museum.visited.length }} / 15 个故事</span></div></div></section>
      <div class="section-heading"><div><div class="eyebrow">COLLECT YOUR SEALS</div><h2>我的汴京印记</h2></div><span class="muted">发现故事，解锁印章</span></div>
      <div class="seals-grid"><article v-for="seal in earned" :key="seal.name" class="seal-card" :class="{earned:seal.done}"><div class="seal-art"><span>{{ seal.name.slice(0,2) }}<br>{{ seal.name.slice(2) }}</span></div><h3>{{ seal.name }}</h3><p>{{ seal.condition }}</p><small><CheckCircle2 v-if="seal.done" :size="14"/>{{ seal.done ? '已获得' : '待解锁' }}</small></article></div>
      <section class="quiz-invite"><span class="quiz-icon"><BookOpen :size="35"/></span><div><div class="eyebrow">HOW WELL DO YOU KNOW BIANJING?</div><h2>汴京知识小试</h2><p>五道小题，重温画卷中的秘密。最高纪录 {{ museum.quizBest }} / 5。</p></div><button class="btn dark" @click="beginQuiz">开始答题 <ArrowRight :size="17"/></button></section>
      <section class="task-list"><h2>探索手记</h2><button v-for="r in routes" :key="r.id" @click="activeRoute=r.id; go('/explore')"><component :is="icons[r.icon]" :size="21"/><span>{{ r.title }}<small>{{ r.sub }}</small></span><strong>{{ hotspots.filter(h=>h.kind===r.id && museum.visited.includes(h.id)).length }}/{{ hotspots.filter(h=>h.kind===r.id).length }}</strong><ChevronRight :size="18"/></button></section>
    </main>

    <main v-else class="content-page section-wrap page-entrance">
      <div class="page-top"><div><div class="eyebrow">KEEP THE STORIES YOU LOVE</div><h1>我的藏阁 <span>让惊鸿一瞥，有迹可循。</span></h1></div><span class="progress-pill">{{ collection.length }} 个收藏</span></div>
      <div class="collection-summary"><div class="mini-seal">藏</div><div><h2>你的汴京私藏</h2><p>收藏画中故事，下次相逢，从这里开始。探索与收藏会保存在当前设备。</p></div></div>
      <div v-if="collection.length" class="stories-grid"><article v-for="h in collection" :key="h.id" class="story-card"><button class="story-image" @click="focusFromList(h)"><img :src="asset('art/'+chapters[h.chapter].image+'.webp')" :alt="h.title"/><span>{{ h.kind }}</span></button><div class="story-body"><small>{{ chapters[h.chapter].title }}</small><h3><button @click="focusFromList(h)">{{ h.title }}</button><button @click="museum.favorite(h.id)" :aria-label="'取消收藏'+h.title" class="saved"><Bookmark :size="18" fill="currentColor"/></button></h3><p>{{ h.text }}</p><button class="text-link" @click="focusFromList(h)">回到画中 <ArrowUpRight :size="15"/></button></div></article></div>
      <div v-else class="empty-state"><Bookmark :size="44" :stroke-width="1"/><h2>还没有收藏的故事</h2><p>在讲解卡片中轻触收藏，把喜欢的细节留在藏阁。</p><button class="btn dark" @click="go('/explore')">发现画中故事 <ArrowRight :size="17"/></button></div>
    </main>

    <nav class="bottom-nav" aria-label="移动端导航"><a v-for="item in nav" :key="item.id" :href="'#'+item.path" :class="{active:page===item.id}" @click.prevent="go(item.path)"><component :is="item.icon" :size="21"/><span>{{ item.name }}</span></a></nav>
    <Transition name="toast"><div v-if="toast" class="toast-message" role="status"><CheckCircle2 :size="18"/>{{ toast }}</div></Transition>

    <Transition name="modal"><div v-if="selected" class="modal-backdrop" @click.self="closeDetail"><section class="detail-panel" role="dialog" aria-modal="true" :aria-label="selected.title"><button class="close-modal" @click="closeDetail" aria-label="关闭讲解"><X :size="20"/></button><div class="detail-image"><img :src="asset('art/'+chapters[selected.chapter].image+'.webp')" :alt="selected.title"/><span>{{ selected.kind }} · {{ chapters[selected.chapter].title }}</span></div><div class="detail-content"><div class="eyebrow">A STORY IN THE SCROLL</div><h2>{{ selected.title }}</h2><p>{{ selected.text }}</p><div class="observation"><span>不妨细看</span><p>{{ selected.question }}</p></div><div class="detail-audio"><button @click="narration" :aria-label="speaking ? '停止语音讲解' : '播放语音讲解'"><Pause v-if="speaking" :size="20"/><Play v-else :size="20" fill="currentColor"/></button><div><strong>{{ speaking ? '正在为你讲述…' : '听见画中故事' }}</strong><small>中文语音朗读 · 文字即讲解内容</small></div><div class="audio-wave" :class="{playing:speaking}"><i v-for="i in 10" :key="i" :style="{'--i':i}"></i></div></div><div class="detail-actions"><button class="btn outlined" @click="museum.favorite(selected.id)"><Bookmark :size="17" :fill="museum.favorites.includes(selected.id)?'currentColor':'none'"/>{{ museum.favorites.includes(selected.id) ? '已收藏' : '收藏故事' }}</button><button class="btn outlined" @click="share"><Share2 :size="17"/> 分享</button></div><div class="discovered-note"><CheckCircle2 :size="14"/> 已记入探索手记 · {{ museum.visited.length }} / 15 个故事</div></div></section></div></Transition>

    <Transition name="modal"><div v-if="settingsOpen" class="modal-backdrop" @click.self="settingsOpen=false"><section class="simple-modal" role="dialog" aria-modal="true" aria-label="体验设置"><button class="close-modal" @click="settingsOpen=false" aria-label="关闭设置"><X :size="20"/></button><div class="eyebrow">MAKE YOURSELF AT HOME</div><h2>体验设置</h2><p class="muted">按照自己的节奏，欣赏这幅长卷。</p><div class="setting-row"><span><strong>沉浸动效</strong><small>镜头转场、热点呼吸与装饰动画</small></span><button class="switch" :class="{on:museum.settings.motion}" role="switch" :aria-checked="museum.settings.motion" aria-label="沉浸动效" @click="toggleMotion"><i></i></button></div><div class="setting-row"><span><strong>环境音</strong><small>轻柔和弦，陪伴你的漫游</small></span><button class="switch" :class="{on:museum.settings.sound}" role="switch" :aria-checked="museum.settings.sound" aria-label="环境音" @click="toggleSound"><i></i></button></div><div class="setting-row"><span><strong>画卷氛围</strong><small>艺术化光影，不改变原画内容</small></span></div><div class="mode-selector"><button v-for="mode in [{id:'morning',name:'晨雾'},{id:'day',name:'日光'},{id:'night',name:'暮色'}]" :key="mode.id" :class="{active:museum.settings.atmosphere===mode.id}" @click="setAtmosphere(mode.id)">{{ mode.name }}</button></div><p class="settings-note">关闭动效可减轻设备负担。收藏、印章与设置均保存在本机，不需要登录。</p></section></div></Transition>

    <Transition name="modal"><div v-if="helpOpen" class="modal-backdrop" @click.self="helpOpen=false"><section class="simple-modal about-modal" role="dialog" aria-modal="true" aria-label="关于作品"><button class="close-modal" @click="helpOpen=false" aria-label="关闭说明"><X :size="20"/></button><div class="mini-seal">宋</div><div class="eyebrow">ART MEETS INTERACTION</div><h2>一幅长卷，一座城。</h2><p>《清明上河图》以细致的笔触描绘北宋城市与市井生活。本展览使用张择端版画卷，以五个章节与十五个观察点带你走近作品。</p><p>作品：北宋 · 张择端 · 绢本设色<br>收藏：故宫博物院<br>图像：Wikimedia Commons · 公共领域</p><a class="text-link" href="https://commons.wikimedia.org/wiki/File:Alongtheriver_QingMing.jpg" target="_blank" rel="noopener noreferrer">查看画作来源 <ArrowUpRight :size="15"/></a><hr/><p class="muted">这是课程项目的互动前端。讲解采用浏览器语音朗读；环境与光影为艺术化效果。热点以区域观察为主，具体人物身份不作确定推断。</p><button class="btn dark" @click="helpOpen=false; go('/scroll')">进入长卷 <ArrowRight :size="17"/></button></section></div></Transition>

    <Transition name="modal"><div v-if="quizOpen" class="modal-backdrop" @click.self="quizOpen=false"><section class="simple-modal quiz-modal" role="dialog" aria-modal="true" aria-label="汴京知识问答"><button class="close-modal" @click="quizOpen=false" aria-label="关闭问答"><X :size="20"/></button><template v-if="!quizDone"><div class="eyebrow">BIANJING QUIZ · 0{{ quizIndex+1 }} / 05</div><div class="quiz-progress"><i v-for="i in 5" :key="i" :class="{active:i<=quizIndex+1}"></i></div><h2>{{ questions[quizIndex].title }}</h2><button v-for="(option,i) in questions[quizIndex].options" :key="option" class="quiz-option" :class="{chosen:answer===i, correct:answer!==null && i===questions[quizIndex].correct, wrong:answer===i && i!==questions[quizIndex].correct}" :disabled="answer!==null" @click="pickAnswer(i)"><span>{{ String.fromCharCode(65+i) }}</span>{{ option }}<Check v-if="answer!==null && i===questions[quizIndex].correct" :size="17"/></button><div v-if="answer!==null" class="quiz-explanation"><strong>{{ answer===questions[quizIndex].correct ? '答对了，慧眼识汴京！' : '再看一眼，这个细节值得记住。' }}</strong><p>{{ questions[quizIndex].reason }}</p><button class="btn dark" @click="nextQuestion">{{ quizIndex===4 ? '查看成绩' : '下一题' }} <ArrowRight :size="16"/></button></div></template><template v-else><div class="quiz-result"><Award :size="48"/><div class="eyebrow">WELL EXPLORED</div><h2>{{ quizScore >= 4 ? '博古通今，汴京知音。' : '每次探索，都有新发现。' }}</h2><strong>{{ quizScore }}<small> / 5</small></strong><p>{{ quizScore >= 4 ? '「博古通今」印章已收入你的探索手记。' : '回到长卷，下一次你会发现更多。' }}</p><button class="btn dark" @click="quizOpen=false">收下这份记忆 <Check :size="17"/></button><button class="text-link" @click="beginQuiz">再试一次 <RotateCcw :size="14"/></button></div></template></section></div></Transition>
  </div>
</template>

