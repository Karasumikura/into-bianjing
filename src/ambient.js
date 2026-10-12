// One context per session: cancelled starts cannot revive or overlap a newer session.
export function createAmbient(onState) {
  let session
  function stop() {
    const old = session
    session = null
    onState(false)
    if (!old) return
    old.context.onstatechange = null
    const { context, gain } = old
    if (gain && context.state === 'running') {
      gain.gain.cancelScheduledValues(context.currentTime)
      gain.gain.setTargetAtTime(0, context.currentTime, .06)
      setTimeout(() => { void context.close().catch(() => {}) }, 350)
    } else void context.close().catch(() => {})
  }
  async function start() {
    stop()
    const Audio = window.AudioContext || window.webkitAudioContext
    if (!Audio) throw new Error('unsupported')
    const current = { context: new Audio(), gain: null }
    session = current
    const context = current.context
    try {
      await context.resume()
      if (session !== current) return false
      if (context.state !== 'running') throw new Error('suspended')
      // Filtered noise with slow modulation evokes wind and flowing water.
      const buffer = context.createBuffer(1, context.sampleRate * 8, context.sampleRate)
      const samples = buffer.getChannelData(0)
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
      const source = context.createBufferSource()
      source.buffer = buffer; source.loop = true
      const filter = context.createBiquadFilter()
      filter.type = 'lowpass'; filter.frequency.value = 700; filter.Q.value = .4
      const gain = context.createGain(); current.gain = gain
      gain.gain.value = 0
      gain.gain.setTargetAtTime(.12, context.currentTime, .5)
      source.connect(filter); filter.connect(gain); gain.connect(context.destination)
      const movement = context.createOscillator(), depth = context.createGain()
      movement.frequency.value = .11; depth.gain.value = 160
      movement.connect(depth); depth.connect(filter.frequency)
      source.start(); movement.start()
      context.onstatechange = () => {
        if (session === current && context.state !== 'running') stop()
      }
      onState(true)
      return true
    } catch (error) {
      if (session !== current) return false
      stop()
      throw error
    }
  }
  return { start, stop }
}
