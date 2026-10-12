import { defineStore } from 'pinia'
function restore() { try { return JSON.parse(localStorage.getItem('bianjing-v1') || '{}') } catch { return {} } }
const saved = restore()
export const useMuseum = defineStore('museum', {
  state: () => ({ visited: Array.isArray(saved.visited) ? saved.visited : [], favorites: Array.isArray(saved.favorites) ? saved.favorites : [], settings: { motion: true, sound: false, atmosphere: 'day', ...saved.settings }, quizBest: saved.quizBest || 0 }),
  actions: {
    save() { try { localStorage.setItem('bianjing-v1', JSON.stringify(this.$state)) } catch {} },
    visit(id) { if (!this.visited.includes(id)) this.visited.push(id); this.save() },
    favorite(id) { this.favorites = this.favorites.includes(id) ? this.favorites.filter(x => x !== id) : [...this.favorites, id]; this.save() },
    setting(key, value) { this.settings[key] = value; this.save() },
    score(value) { this.quizBest = Math.max(this.quizBest, value); this.save() },
  }
})
