"use client";
import { useEffect, useRef, useState } from "react";

/** Full-screen teleprompter: big text, adjustable speed/size, mirror mode, tap to play/pause. */
export default function Prompter({ hook, text, onScreen }: { hook: string; text: string; onScreen: string }) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(40);       // px per second
  const [size, setSize] = useState(44);
  const [mirror, setMirror] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const speedRef = useRef(speed); speedRef.current = speed;
  useEffect(() => {
    if (!playing) return;
    let raf = 0; let last = performance.now(); let acc = 0;
    const tick = (now: number) => {
      acc += ((now - last) / 1000) * speedRef.current; last = now;
      const whole = Math.floor(acc); if (whole > 0 && box.current) { box.current.scrollTop += whole; acc -= whole; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  return (
    <div className="flex h-screen flex-col bg-black text-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-white/20 px-4 py-2 text-sm">
        <button className="rounded bg-[#f2b01e] px-4 py-1.5 font-semibold text-black" onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "Start"}</button>
        <button className="rounded border border-white/30 px-3 py-1.5" onClick={() => { setPlaying(false); box.current?.scrollTo({ top: 0 }); }}>Restart</button>
        <label className="flex items-center gap-2">Speed <input type="range" min={10} max={120} value={speed} onChange={(e) => setSpeed(+e.target.value)} /></label>
        <label className="flex items-center gap-2">Size <input type="range" min={24} max={80} value={size} onChange={(e) => setSize(+e.target.value)} /></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={mirror} onChange={(e) => setMirror(e.target.checked)} /> Mirror</label>
        <span className="ml-auto text-xs text-white/60">{onScreen}</span>
      </div>
      <div ref={box} className="flex-1 overflow-y-scroll px-[8%]" style={{ transform: mirror ? "scaleX(-1)" : undefined }}>
        <div style={{ height: "35vh" }} />
        <p className="mb-10 font-bold text-[#f2b01e]" style={{ fontSize: size * 1.15, lineHeight: 1.25 }}>HOOK: {hook}</p>
        {text.split(/\n+/).map((p, i) => <p key={i} className="mb-8 font-semibold" style={{ fontSize: size, lineHeight: 1.35 }}>{p}</p>)}
        <div style={{ height: "70vh" }} />
      </div>
    </div>
  );
}
