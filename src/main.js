import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { App as NativeApp } from '@capacitor/app'
const router = createRouter({ history: createWebHashHistory(import.meta.env.BASE_URL), routes: ['/', '/scroll', '/explore', '/quests', '/collection'].map(path => ({ path, component: { template: '<span />' } })) })
createApp(App).use(createPinia()).use(router).mount('#app')
if (Capacitor.isNativePlatform()) {
  NativeApp.addListener('backButton', () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else if (document.querySelector('[role="dialog"]')) window.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape' }))
    else if (router.currentRoute.value.path !== '/') router.push('/')
    else NativeApp.exitApp()
  })
}
if(import.meta.env.PROD && !Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {}))
}
