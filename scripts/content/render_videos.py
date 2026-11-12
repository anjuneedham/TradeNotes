"""Render docs/content/videos/VIDEO_001..060.md from the data files. Run: python3 scripts/content/render_videos.py"""
import pathlib, re, sys, textwrap
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from videos_001_015 import V
from videos_016_060 import D

OUT = pathlib.Path("docs/content/videos"); OUT.mkdir(parents=True, exist_ok=True)
WPS = 2.6  # spoken words per second (calm, clear delivery)
TAGS = {
 "Trading mistakes": ["#tradingmistakes", "#tradingforbeginners", "#forex"], "Trading psychology": ["#tradingpsychology", "#tradingmindset", "#discipline"],
 "Journaling": ["#tradingjournal", "#journaling", "#tradinghabits"], "Risk management": ["#riskmanagement", "#stoploss", "#forex"],
 "Reviewing losing trades": ["#losingtrades", "#tradingjournal", "#tradingreview"], "Discipline": ["#tradingdiscipline", "#discipline", "#tradingrules"],
 "Performance analysis": ["#tradinganalysis", "#tradingstats", "#tradingjournal"], "Beginner trading education": ["#forexforbeginners", "#learntotrade", "#tradingbasics"],
 "TradeNotes demonstrations": ["#tradenotes", "#tradingjournal", "#tradingapp"], "Trading misconceptions": ["#tradingmyths", "#tradingforbeginners", "#forex"],
 "Better trading habits": ["#tradinghabits", "#selfimprovement", "#tradingjournal"], "Backtesting": ["#backtesting", "#tradingstrategy", "#forex"],
}
MUSIC = {"Trading psychology": "Low, reflective pad; no drops.", "TradeNotes demonstrations": "Light UI-tutorial bed; soft click foley.",
         "Trading mistakes": "Muted tension that resolves when the fix appears."}
CTAS = ["Save this for your next review.", "Follow for more honest trading habits.", "Free trading journal — link in bio.", "Comment your take below.", "Share with a trader who needs this."]

def captions(vo):
    words, lines, cur, t, out = vo.split(), [], "", 0.0, []
    for w in words:
        if len(cur) + len(w) + 1 > 24 and cur: lines.append(cur); cur = w
        else: cur = (cur + " " + w).strip()
    if cur: lines.append(cur)
    for i in range(0, len(lines), 2):
        chunk = lines[i:i + 2]; dur = sum(len(l.split()) for l in chunk) / WPS
        out.append(f"| {t:04.1f}–{t + dur:04.1f}s | {' / '.join(chunk)} |"); t += dur
    return out, t

def auto_scenes(hook, vo, demo):
    sents = [s.strip() for s in re.split(r"(?<=[.?!])\s+", vo) if s.strip()]
    scenes, t = [(0, 2, "Bold hook text on navy background", hook, "Text stamps in on the first beat")], 2.0
    for i, s in enumerate(sents[1:] if sents and sents[0].startswith(hook[:12]) else sents):
        d = max(2.5, len(s.split()) / WPS)
        visual = f"Screen recording: TradeNotes — {demo} (SAMPLE DATA)" if demo and i == len(sents) - 2 else "Simple motion graphic illustrating the line (icons, chart, cards)"
        scenes.append((round(t, 1), round(t + d, 1), visual, " ".join(s.split()[:5]).rstrip(",.") + ("…" if len(s.split()) > 5 else ""), "Dip transition; key word highlighted amber"))
        t += d
    scenes.append((round(t, 1), round(t + 2, 1), "End card", "Not financial advice.", "2 s static text card"))
    return scenes

def render(v, draft):
    caps, total = captions(v["vo"])
    tags = v.get("tags") or TAGS.get(v["pillar"], []) + ["#tradingjournal", "#tradingtips"]
    tags = list(dict.fromkeys(tags + ["#notfinancialadvice"]))
    sc = v["scenes"]
    if not draft and sc[-1][1] < total + 2:  # stretch hand-timed storyboards to fit the spoken script (end card stays 2 s after VO)
        k = (total + 2) / sc[-1][1]; sc = [(round(a * k, 1), round(b * k, 1), *r) for a, b, *r in sc]
    rows = "\n".join(f"| {a:g}–{b:g}s | {vis} | {txt} | {anim} |" for a, b, vis, txt, anim in sc)
    status = "DRAFT package — refine script and storyboard before production" if draft else "Production-ready script package (not yet produced)"
    return f"""# VIDEO_{v['n']:03d} — {v['title']}
**Status:** {status}. Nothing has been rendered, voiced or exported.

| Field | Value |
|---|---|
| 1. Number | {v['n']:03d} |
| 2. Content pillar | {v['pillar']} |
| 3. Audience | {v['audience']} |
| 4. Hook (0–2 s) | "{v['hook']}" |
| Length | ~{max(sc[-1][1], total + 2):.0f} s (voiceover ≈ {total:.0f} s at {WPS} words/s) |

## 5. Voiceover script
{textwrap.fill(v['vo'], 110)}

## 6–9. Storyboard, animation, on-screen text, timing
| Time | Scene / visual | On-screen text | Animation |
|---|---|---|---|
{rows}

Burned-in label on any app footage: **SAMPLE DATA · NOT REAL TRADES**. Small persistent corner text: **Not financial advice.**

## 10. Captions (burned in, ≤24 chars/line, ≤2 lines)
| Time | Caption |
|---|---|
{chr(10).join(caps)}

## 11. Music and sound
{v['music']} Use only platform-licensed or royalty-free tracks; narration at −16 LUFS, music ducked −18 dB under voice.

## 12. CTA
{v['cta']}

## 13. Platform captions
- **TikTok:** {v['tiktok']}
- **Instagram Reels:** {v['ig']} Not financial advice.
- **YouTube Shorts title:** {v['yt']} · **Description:** {v['hook']} TradeNotes is a trading journal — it doesn't give trading advice or promise results.

## 14. Hashtags
{' '.join(tags)}
"""

for v in V: (OUT / f"VIDEO_{v['n']:03d}.md").write_text(render(v, False))
for i, (n, pillar, aud, title, hook, vo, demo) in enumerate(D):
    v = dict(n=n, pillar=pillar, audience=aud, title=title, hook=hook, vo=vo, scenes=auto_scenes(hook, vo, demo),
             music=MUSIC.get(pillar, "Calm lo-fi educational bed."), cta=CTAS[i % len(CTAS)] if not demo else "Try it free — link in bio.",
             tiktok=f"{hook} #notfinancialadvice", ig=f"{title}. {hook}", yt=title)
    (OUT / f"VIDEO_{n:03d}.md").write_text(render(v, True))
print(len(list(OUT.glob("VIDEO_*.md"))), "files")
