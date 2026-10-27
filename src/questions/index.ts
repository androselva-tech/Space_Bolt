import { BANK, type Subject } from './data';

export type { Subject } from './data';
export const SUBJECTS: Subject[] = ['physics', 'space', 'chemistry', 'body', 'logic'];
/** How each subject is shown: its name and colour. */
export const SUBJECT_INFO: Record<Subject, { name: string; color: string }> = {
  physics: { name: 'PHYSICS', color: '#ff8a4a' },
  space: { name: 'SPACE', color: '#ffd45c' },
  chemistry: { name: 'CHEMISTRY', color: '#7fd6ff' },
  body: { name: 'HUMAN BODY', color: '#ff7a8a' },
  logic: { name: 'LOGIC & MATHS', color: '#b9a4ff' },
};

/** A question from the bank (data.ts). */
export type QuestionRecord = {
  /** Stable id: subject + position, e.g. `space-12`. */
  id: string;
  subject: Subject;
  tier: number;
  picture: string;
  text: string;
  answer: string;
  /** Wrong answers (one, FALSE/TRUE, for a true/false question). */
  wrong: string[];
  trueFalse: boolean;
  fact: string;
  reward: number;
  timeLimitSec: number;
};

export const TIER_NAMES = ['', 'VERY EASY', 'EASY', 'EASY+', 'MEDIUM', 'MEDIUM+', 'HARD'] as const;
/** Coins per correct answer, by tier. */
export const TIER_REWARD = [0, 5, 8, 12, 18, 25, 35];
/** Seconds counted as a "fast" answer is 40% of this. */
const TIER_TIME = [0, 25, 30, 35, 40, 45, 50];

export function parseBank(bank: Partial<Record<Subject, string>> = BANK): QuestionRecord[] {
  const out: QuestionRecord[] = [];
  for (const subject of SUBJECTS) {
    let i = 0;
    for (const line of (bank[subject] ?? '').split('\n')) {
      if (!line.trim()) continue;
      const [t, picture, text, answer, w1 = '', w2 = '', w3 = '', fact = ''] = line.split('|');
      const tier = Number(t);
      const trueFalse = answer === 'TRUE' || answer === 'FALSE';
      const wrong = trueFalse ? [answer === 'TRUE' ? 'FALSE' : 'TRUE'] : [w1, w2, w3].filter(Boolean);
      out.push({
        id: `${subject}-${i++}`,
        subject, tier, picture, text, answer, wrong, trueFalse, fact,
        reward: TIER_REWARD[tier] ?? TIER_REWARD[6],
        timeLimitSec: TIER_TIME[tier] ?? TIER_TIME[6],
      });
    }
  }
  return out;
}

export const QUESTIONS: QuestionRecord[] = parseBank();
export const MAX_TIER = Math.max(...QUESTIONS.map((q) => q.tier));
const BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));
export const questionById = (id: string) => BY_ID.get(id);
const POOL: Record<string, QuestionRecord[]> = {};
for (const q of QUESTIONS) (POOL[`${q.subject}:${q.tier}`] ??= []).push(q);
const pool = (subject: Subject, tier: number) => POOL[`${subject}:${tier}`] ?? [];

type Rng = () => number;
export const shuffle = <T,>(a: T[], r: Rng = Math.random) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

/** A question as served: its answer buttons in play order. */
export type Quiz = {
  record: QuestionRecord;
  options: string[];
  /** Index of the right answer in `options`. */
  correct: number;
  revision: boolean;
  boss: boolean;
};

export function buildQuiz(record: QuestionRecord, opts: { r?: Rng; revision?: boolean; boss?: boolean } = {}): Quiz {
  // TRUE always comes first on a true/false question; other answers are shuffled
  const options = record.trueFalse ? ['TRUE', 'FALSE'] : shuffle([record.answer, ...record.wrong], opts.r);
  return { record, options, correct: options.indexOf(record.answer), revision: !!opts.revision, boss: !!opts.boss };
}

// --- picking the next question (adaptive difficulty, anti-repetition, revision) -----------

export type QuizHistory = {
  /** Question ids, most recent first. */
  recent: string[];
  /** Answered right first time, with a count. */
  mastered: Record<string, number>;
  /** Answered wrong (asked again later as revision), with a count. */
  failed: Record<string, number>;
  /** Last results: tier and right/wrong, for adaptive difficulty and the profile chart. */
  results: Array<{ tier: number; ok: boolean; subject?: Subject }>;
};
export const emptyHistory = (): QuizHistory => ({ recent: [], mastered: {}, failed: {}, results: [] });

const RECENT_WINDOW = 40;

/** Nudge the tier up when the player is acing it, down when they're struggling. */
export function adaptiveTier(base: number, h: QuizHistory, r: Rng = Math.random): number {
  const recent = h.results.slice(-12);
  if (recent.length < 8) return base;
  const acc = recent.filter((x) => x.ok).length / recent.length;
  if (acc >= 0.9 && r() < 0.3) return Math.min(MAX_TIER, base + 1);
  if (acc < 0.5 && r() < 0.4) return Math.max(1, base - 1);
  return base;
}

/**
 * The next question for a subject at about this tier: a missed question again now and then
 * (revision), otherwise one the player hasn't seen lately, preferring ones never answered right.
 */
export function pickQuestion(subject: Subject, baseTier: number, h: QuizHistory, r: Rng = Math.random): { record: QuestionRecord; revision: boolean } {
  const failed = Object.keys(h.failed)
    .map((id) => BY_ID.get(id))
    .filter((q): q is QuestionRecord => !!q && q.subject === subject && Math.abs(q.tier - baseTier) <= 2 && !h.recent.slice(0, 8).includes(q.id));
  if (failed.length && r() < 0.2) return { record: failed[Math.floor(r() * failed.length)], revision: true };

  const tier = adaptiveTier(baseTier, h, r);
  // an empty tier (a short bank) falls back to the nearest tier that has questions
  let list = pool(subject, tier);
  for (let d = 1; !list.length && d <= MAX_TIER; d++) list = pool(subject, tier - d).length ? pool(subject, tier - d) : pool(subject, tier + d);
  const recent = new Set(h.recent.slice(0, RECENT_WINDOW));
  const fresh = list.filter((q) => !recent.has(q.id) && !h.mastered[q.id]);
  const notRecent = list.filter((q) => !recent.has(q.id));
  const choices = fresh.length ? fresh : notRecent.length ? notRecent : list.filter((q) => q.id !== h.recent[0]);
  const from = choices.length ? choices : list;
  return { record: from[Math.floor(r() * from.length)], revision: false };
}

/** A boss question: the tier above, never a true/false. */
export function pickBossQuestion(subject: Subject, tier: number, h: QuizHistory, r: Rng = Math.random): QuestionRecord {
  const list = pool(subject, Math.min(MAX_TIER, tier + 1)).filter((q) => !q.trueFalse);
  const choices = list.filter((q) => !h.recent.slice(0, RECENT_WINDOW).includes(q.id));
  const from = choices.length ? choices : list.length ? list : pool(subject, tier);
  return from[Math.floor(r() * from.length)];
}

export function recordResult(h: QuizHistory, q: QuestionRecord, ok: boolean): QuizHistory {
  const recent = [q.id, ...h.recent.filter((x) => x !== q.id)].slice(0, 120);
  const mastered = { ...h.mastered };
  const failed = { ...h.failed };
  if (ok) {
    mastered[q.id] = (mastered[q.id] ?? 0) + 1;
    if (failed[q.id]) {
      failed[q.id] -= 1; // revised successfully
      if (failed[q.id] <= 0) delete failed[q.id];
    }
  } else {
    failed[q.id] = (failed[q.id] ?? 0) + 1;
  }
  const results = [...h.results, { tier: q.tier, ok, subject: q.subject }].slice(-60);
  return { recent, mastered, failed, results };
}

/** Rows for the profile's accuracy chart, per subject. */
export function accuracyBySubject(h: QuizHistory) {
  return SUBJECTS.map((subject) => {
    const rs = h.results.filter((x) => x.subject === subject);
    return { subject, total: rs.length, ok: rs.filter((x) => x.ok).length };
  }).filter((r) => r.total > 0);
}
