import { BANK } from '../data';
import {
  MAX_TIER, QUESTIONS, SUBJECTS, buildQuiz, emptyHistory, parseBank, pickBossQuestion, pickQuestion, recordResult,
} from '..';

describe('the question bank', () => {
  it('has every line in the right shape', () => {
    for (const subject of SUBJECTS) {
      for (const line of BANK[subject].split('\n').filter((l) => l.trim())) {
        const f = line.split('|');
        expect(f).toHaveLength(8);
        expect(Number(f[0])).toBeGreaterThanOrEqual(1);
        expect(Number(f[0])).toBeLessThanOrEqual(6);
        expect(f[1].trim()).not.toBe('');
        expect(f[2].trim().length).toBeGreaterThan(5);
        expect(f[7].trim().length).toBeGreaterThan(5); // the fact
      }
    }
  });

  it('has enough questions for every subject at every tier', () => {
    for (const subject of SUBJECTS) {
      for (let tier = 1; tier <= 6; tier++) {
        expect(QUESTIONS.filter((q) => q.subject === subject && q.tier === tier).length).toBeGreaterThanOrEqual(8);
      }
    }
    expect(MAX_TIER).toBe(6);
  });

  it('gives multiple-choice questions three different wrong answers, and true/false questions none', () => {
    for (const q of QUESTIONS) {
      if (q.trueFalse) {
        expect(q.wrong).toEqual([q.answer === 'TRUE' ? 'FALSE' : 'TRUE']);
      } else {
        expect(q.wrong).toHaveLength(3);
        expect(new Set([q.answer, ...q.wrong]).size).toBe(4);
      }
    }
  });

  it('never asks the same question twice', () => {
    const texts = QUESTIONS.map((q) => q.text.toLowerCase());
    expect(new Set(texts).size).toBe(texts.length);
  });

  it('keeps ids stable and unique', () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
    expect(QUESTIONS[0].id).toMatch(/^(physics|space|chemistry|body)-0$/);
  });

  it('parses a bank from a server in the same format', () => {
    const qs = parseBank({ physics: '1|🧲|Q?|A|B|C|D|Fact here.', space: '', chemistry: '', body: '2|❤️|S.|TRUE|FALSE|||Fact two.' });
    expect(qs).toHaveLength(2);
    expect(qs[1].trueFalse).toBe(true);
  });
});

describe('serving questions', () => {
  it('shuffles the answers but always includes the right one', () => {
    for (const q of QUESTIONS.slice(0, 60)) {
      const quiz = buildQuiz(q);
      expect(quiz.options[quiz.correct]).toBe(q.answer);
      expect(quiz.options).toHaveLength(q.trueFalse ? 2 : 4);
      if (q.trueFalse) expect(quiz.options).toEqual(['TRUE', 'FALSE']);
    }
  });

  it('picks from the subject and about the tier asked for, and avoids repeats', () => {
    let h = emptyHistory();
    const seen = new Set<string>();
    for (let i = 0; i < 8; i++) {
      const { record } = pickQuestion('space', 2, h);
      expect(record.subject).toBe('space');
      expect(record.tier).toBe(2);
      expect(seen.has(record.id)).toBe(false);
      seen.add(record.id);
      h = { ...h, recent: [record.id, ...h.recent] };
    }
  });

  it('brings missed questions back for revision', () => {
    const q = QUESTIONS.find((x) => x.subject === 'body' && x.tier === 3)!;
    let h = recordResult(emptyHistory(), q, false);
    expect(h.failed[q.id]).toBe(1);
    h = { ...h, recent: [] };
    const picks = Array.from({ length: 60 }, () => pickQuestion('body', 3, h));
    expect(picks.some((p) => p.revision && p.record.id === q.id)).toBe(true);
    h = recordResult(h, q, true);
    expect(h.failed[q.id]).toBeUndefined();
  });

  it('serves boss questions from the tier above, never true/false', () => {
    for (let i = 0; i < 20; i++) {
      const q = pickBossQuestion('physics', 3, emptyHistory());
      expect(q.tier).toBe(4);
      expect(q.trueFalse).toBe(false);
    }
  });
});
