// Audio registry for sharing analyser nodes between Preview and AudioMeter
// This is a simple module-level store

let analyserNodes = new Map<number, AnalyserNode>();
let audioContext: AudioContext | null = null;

export function setAudioContext(ctx: AudioContext | null) {
  audioContext = ctx;
}

export function getAudioContext(): AudioContext | null {
  return audioContext;
}

export function setAnalyserNode(trackNumber: number, node: AnalyserNode) {
  analyserNodes.set(trackNumber, node);
}

export function getAnalyserNode(trackNumber: number): AnalyserNode | null {
  return analyserNodes.get(trackNumber) || null;
}

export function clearAnalyserNodes() {
  analyserNodes.clear();
}
