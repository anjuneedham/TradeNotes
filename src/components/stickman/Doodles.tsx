import { Stickman, type Pose } from "./Stickman";

/** A small stickman that sits on a card's corner (stickman theme only). */
export function Mascot({ pose, className = "" }: { pose: Pose; className?: string }) {
  return <Stickman pose={pose} className={`sm-only sm-mascot ${className}`} />;
}

/** The "10 of 30 trades" progress doodle from video 2: a hand-drawn bar that fills to a third. */
export function ThirtyTradesBar() {
  return (
    <div className="sm-only sm-progress" role="img" aria-label="Sample: 10 of 30 trades logged. Under 30 trades, results are mostly luck.">
      <div className="sm-progress-track"><div className="sm-progress-fill" /></div>
      <div className="sm-progress-labels"><span>10 trades</span><span>30 trades</span></div>
    </div>
  );
}
