declare module 'zzfx' {
  // zzfx allows sparse / holey parameter arrays
  export function zzfx(
    ...parameters: unknown[]
  ): AudioBufferSourceNode | undefined
  export const ZZFX: {
    volume: number
    sampleRate: number
    audioContext: AudioContext
    play: (...parameters: unknown[]) => AudioBufferSourceNode | undefined
  }
}
