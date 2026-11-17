/**
 * James's daily notes. One entry per day (Jamaica time). Notes dated in the future stay hidden until their day,
 * so a week can be written ahead. Committing a note here is the human approval: nothing is sent or shown that is not in this file.
 * Rules: educational only, no results or income claims, no tips. Stories are made-up composites and must say so (kind: "story").
 */
export type NoteKind = "article" | "story";
export type Note = { slug: string; date: string; kind: NoteKind; title: string; summary: string; body: string[] };

export const NOTES: Note[] = [
  {
    slug: "the-one-number-that-lies",
    date: "2026-11-13",
    kind: "article",
    title: "The number that lies: win rate on its own",
    summary: "A high win rate can still lose money. Here is the page from my notes on why.",
    body: [
      "Today I wrote one thing at the top of the page: win rate tells you how often you were right, not how much it mattered.",
      "Here is a made-up example, not real results. Imagine ten trades. Eight win, and each win is small: 1 unit. Two lose, and each loss is large: 5 units. Eight wins is 8 units. Two losses is 10 units. Win rate: 80%. Result: down 2 units.",
      "Now flip it. Three wins at 3 units each, seven losses at 1 unit each. Win rate: 30%. Result: up 2 units. Same ten trades, opposite story.",
      "That is why my notes track the average win and the average loss next to the win rate, and why a journal that only counts winners is flattering you.",
      "Small samples also lie. Ten trades is a handful of coin flips; it cannot tell you whether a method has an edge. Write the sample size beside every number.",
      "Trading carries a real risk of losing money. These notes are for learning how to measure honestly, not a promise that measuring makes you profitable.",
    ],
  },
  {
    slug: "the-friday-that-ate-the-week",
    date: "2026-11-14",
    kind: "story",
    title: "The Friday that ate the week",
    summary: "A made-up story about one bad afternoon, and the sentence that would have saved it.",
    body: [
      "This is a made-up story. The people in it are invented, and nothing here is a real result.",
      "Maya had a plan for the week: small risk, a few clean setups, stop when the list was done. By Thursday she was a little up and a little pleased with herself.",
      "Friday afternoon, the first trade hit its stop. Fine. The second one hit its stop too, and she felt that hot, quick feeling in her chest: I'll just win it back.",
      "The third trade was not on the list. It was bigger than the plan allowed, because a bigger size would 'fix it faster'. It did not fix anything. By the close, the week was gone.",
      "That night she opened her notes and did the only useful thing: she wrote down what happened, in plain words, including the feeling. Not 'bad luck'. 'I traded to feel better, not because the plan said so.'",
      "Next Monday her first line of the page was a rule: two stops in a row, I close the laptop and take a walk. A journal cannot make anyone calm, but it can show you the exact minute things went wrong.",
      "Lesson in one line: the plan is for the moment you least want to follow it.",
    ],
  },
  {
    slug: "what-is-risk-per-trade",
    date: "2026-11-15",
    kind: "article",
    title: "Risk per trade, explained like I'm learning it too",
    summary: "What 'risking 1%' actually means, with a worked example you can check yourself.",
    body: [
      "Risk per trade is the amount you would lose if the trade hits your stop. It is decided before you enter, not after.",
      "Worked example with invented numbers: an account of 5,000. You decide the most you will lose on one trade is 1%, which is 50. Your entry is 100 and your stop is 98, so each unit risks 2. 50 divided by 2 is 25 units.",
      "The point is not the 1%. Some people use less, some use more, and no percentage is safe. The point is that the loss was chosen in advance, so one bad trade cannot decide your whole month.",
      "Notes to self: write the stop first, size the trade second, and log the planned risk next to the real result. Over time the gap between the two is its own lesson.",
      "This is education, not advice about how much you should risk. Any amount can be lost.",
    ],
  },
  {
    slug: "the-notebook-in-the-drawer",
    date: "2026-11-16",
    kind: "story",
    title: "The notebook in the drawer",
    summary: "A made-up story about finding your own handwriting and the thing it knew before you did.",
    body: [
      "This is a made-up story. The characters are invented.",
      "Daniel had stopped keeping a journal in the spring. It felt like homework. One evening, looking for a charger, he found the old notebook in a drawer and read it standing up.",
      "Page after page said the same small thing in different words: 'moved my stop', 'moved my stop', 'moved my stop, again'. He had never noticed because each time it felt like a one-off.",
      "He did not feel clever. He felt a little embarrassed, and then oddly relieved, because a pattern you can see is a pattern you can work on.",
      "He started a new page that night with one rule: stops are only allowed to move in the direction of protecting the trade, and every move needs a written reason.",
      "Lesson in one line: you will not remember your habits, but your handwriting will.",
    ],
  },
  {
    slug: "how-many-trades-before-you-can-trust-a-strategy",
    date: "2026-11-17",
    kind: "article",
    title: "How many trades before you can trust a strategy?",
    summary: "There is no magic number. Here is how I think about sample size in my notes.",
    body: [
      "Short answer from my notes: more than feels comfortable, and even then, with humility.",
      "Think of a coin you suspect is slightly loaded. Ten flips will not tell you. A hundred starts to hint. The smaller the edge you are looking for, the more flips you need to separate it from luck.",
      "Trading has an extra problem: markets change, so an old sample may describe a market that is gone. And the trades are not identical coin flips; sizes, timing and your mood all differ.",
      "So I do three things. I write the sample size beside every statistic. I label early numbers 'too early to trust'. And I look at the spread of results, not just the average: a few big winners can hide a lot of ordinary losers.",
      "No count of trades makes a method safe. Losing money is always possible, and these notes are not financial advice.",
    ],
  },
  {
    slug: "the-checklist-that-was-too-long",
    date: "2026-11-18",
    kind: "story",
    title: "The checklist that was too long",
    summary: "A made-up story about a 24-point checklist and the three questions that survived.",
    body: [
      "This is a made-up story. Names and events are invented.",
      "Priya built a pre-trade checklist with twenty-four items. It was beautiful. She never finished it before a trade, so she stopped using it.",
      "A friend asked her one question: which of those twenty-four have ever stopped you from making a mistake? She went through her old notes and found three. Was there a stop? Was the size within the plan? Was I calm?",
      "She kept those three on a sticky note. The long list went into a drawer. The short one she actually read.",
      "Lesson in one line: a checklist you use beats a checklist you admire.",
    ],
  },
  {
    slug: "a-journal-entry-in-sixty-seconds",
    date: "2026-11-19",
    kind: "article",
    title: "A journal entry in sixty seconds",
    summary: "The five lines I write after every trade, and why shorter beats perfect.",
    body: [
      "If journaling takes ten minutes you will skip it on the days you most need it. So here is the version that fits in a minute.",
      "One: what was the plan, in a sentence. Two: what actually happened. Three: did I follow the plan, yes or no. Four: how did I feel at entry and at exit, one word each. Five: one thing to repeat or fix.",
      "Notice there is no 'was it a good trade' line. A trade can follow the plan and lose, or break the plan and win, and the journal's job is to keep those two apart.",
      "Skip a day and write today. Do not apologise to the page.",
      "Trading involves risk of loss. A journal is a tool for noticing, not a way to guarantee results.",
    ],
  },
];
