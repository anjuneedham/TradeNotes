"use client";
import { useEffect, useRef, useState } from "react";

type Fmt = "money" | "pct" | "num" | "int" | "r";
function fmt(v: number, f: Fmt, cur: string) {
  if (f === "money") return new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 2 }).format(v);
  if (f === "pct") return `${(v * 100).toFixed(1)}%`;
  if (f === "int") return Math.round(v).toString();
  if (f === "r") return `${v.toFixed(2)}R`;
  return v.toFixed(2);
}

/** Animates 0 → value when scrolled into view. Server render shows the final value (works without JS). */
export default function CountUp({ value, format, currency = "USD", duration = 900 }: { value: number; format: Fmt; currency?: string; duration?: number }) {
  const [v, setV] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current; if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / duration);
        setV(value * (1 - Math.pow(1 - p, 3)));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, duration]);
  return <span ref={ref}>{fmt(v, format, currency)}</span>;
}
