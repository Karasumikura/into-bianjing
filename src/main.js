import { createApp } from 'vue'
import App from './App.vue'
import './style.css'
import { createPinia } from 'pinia'
import { createRouter, createWebHashHistory } from 'vue-router'
const router = createRouter({ history: createWebHashHistory(import.meta.env.BASE_URL), routes: ['/', '/scroll', '/explore', '/quests', '/collection'].map(path => ({ path, component: { template: '<span />' } })) })
createApp(App).use(createPinia()).use(router).mount('#app')
if(import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js').catch(() => {}))
}
