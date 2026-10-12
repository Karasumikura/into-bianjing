<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
const props = defineProps({ enabled: Boolean, density: { type: Number, default: 40 } })
const canvas = ref(null)
let ctx, frame, observer, width=1, height=1, particles=[], ripples=[], visible=true, previous=0
function resize() {
  const box=canvas.value.getBoundingClientRect(); width=box.width; height=box.height
  const ratio=Math.min(devicePixelRatio, 2)
  canvas.value.width=width*ratio; canvas.value.height=height*ratio; ctx.setTransform(ratio,0,0,ratio,0,0)
  particles=Array.from({length:props.density},()=>({x:Math.random()*width,y:Math.random()*height,r:.4+Math.random()*1.5,v:.06+Math.random()*.25,phase:Math.random()*Math.PI*2}))
}
function move(e) { const rect=canvas.value.getBoundingClientRect(); if(ripples.length<7) ripples.push({x:e.clientX-rect.left,y:e.clientY-rect.top,r:0,life:1}) }
function animate(time) {
  frame=requestAnimationFrame(animate)
  if(!visible || !props.enabled || time-previous<32) return
  previous=time; ctx.clearRect(0,0,width,height)
  for(const p of particles){
    p.x+=p.v; p.y+=Math.sin(time*.0003+p.phase)*.13
    if(p.x>width+5) p.x=-5
    ctx.beginPath(); ctx.fillStyle='rgba(233,205,142,'+(.1+Math.sin(time*.001+p.phase)*.08)+')'; ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill()
  }
  ripples=ripples.filter(p=>p.life>0)
  for(const p of ripples){p.r+=.9;p.life-=.016;ctx.beginPath();ctx.strokeStyle='rgba(228,202,146,'+p.life*.13+')';ctx.lineWidth=.6;ctx.ellipse(p.x,p.y,p.r,p.r*.4,-.15,0,Math.PI*2);ctx.stroke()}
}
watch(()=>props.enabled, enabled=>{if(!enabled)ctx?.clearRect(0,0,width,height)})
onMounted(()=>{ctx=canvas.value.getContext('2d');resize();observer=new ResizeObserver(resize);observer.observe(canvas.value);canvas.value.parentElement.addEventListener('pointermove',move);document.addEventListener('visibilitychange',visibility);frame=requestAnimationFrame(animate)})
function visibility(){visible=!document.hidden}
onBeforeUnmount(()=>{cancelAnimationFrame(frame);observer?.disconnect();canvas.value?.parentElement?.removeEventListener('pointermove',move);document.removeEventListener('visibilitychange',visibility)})
</script>
<template><canvas ref="canvas" class="ink-atmosphere" aria-hidden="true"></canvas></template>
<style scoped>.ink-atmosphere{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:3;mix-blend-mode:screen}</style>
