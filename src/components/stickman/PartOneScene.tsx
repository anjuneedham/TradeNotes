import { Chip, Stickman } from "./Stickman";
import { PencilArrow } from "./PencilArrow";

// The Part 1 story ("A 70% win rate can still lose you money"), redrawn as the page's hero.
// SAMPLE data, same as the video: seven +$20 wins, three -$80 losses => -$100 over ten trades.
const TRADES: ("win" | "loss")[] = ["win", "win", "loss", "win", "win", "loss", "win", "win", "loss", "win"];
const won = TRADES.filter((t) => t === "win").length * 20;
const lost = TRADES.filter((t) => t === "loss").length * 80;

export function PartOneScene() {
  return (
    <figure className="sm-only sm-scene" aria-label="Ten sample trades: seven wins of $20 and three losses of $80 add up to a net loss of $100.">
      <figcaption className="sm-scene-tag">Part 1 · the win-rate trap</figcaption>
      <div className="sm-scene-row">
        <Stickman pose="win" className="sm-actor sm-actor-win" />
        <div className="sm-chips">
          {TRADES.map((k, i) => (
            <Chip key={i} kind={k} text={k === "win" ? "+$20" : "-$80"} delay={0.5 + i * 0.28} />
          ))}
        </div>
        <Stickman pose="lose" className="sm-actor sm-actor-lose" />
      </div>
      <div className="sm-sum">
        <span className="sm-sum-line" style={{ animationDelay: "3.5s" }}>won <b className="sm-win">${won}</b></span>
        <span className="sm-sum-line" style={{ animationDelay: "4.1s" }}>lost <b className="sm-loss">${lost}</b></span>
        <span className="sm-sum-line sm-sum-total" style={{ animationDelay: "4.9s" }}>net <b className="sm-loss">-${lost - won}</b></span>
      </div>
      <p className="sm-scene-foot">SAMPLE DATA · NOT REAL TRADES · NOT FINANCIAL ADVICE</p>
      <PencilArrow dir="left" label="so one number can't fool you" className="sm-scene-arrow" delay={5.3} />
    </figure>
  );
}
