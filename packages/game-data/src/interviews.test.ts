import { describe, expect, it } from 'vitest';
import { interviewQuestionSchema } from '@football-life/shared';
import { INTERVIEW_QUESTIONS, POST_MATCH_QUESTIONS } from './interviews';

describe('INTERVIEW_QUESTIONS', () => {
  it('validates every question against the schema', () => {
    for (const q of INTERVIEW_QUESTIONS) {
      expect(() => interviewQuestionSchema.parse(q)).not.toThrow();
    }
  });

  it('uses unique keys and offers at least three questions', () => {
    const keys = new Set(INTERVIEW_QUESTIONS.map((q) => q.key));
    expect(keys.size).toBe(INTERVIEW_QUESTIONS.length);
    expect(INTERVIEW_QUESTIONS.length).toBeGreaterThanOrEqual(3);
  });
});

describe('POST_MATCH_QUESTIONS', () => {
  it('validates, covers star/win/loss/draw and interpolates {opponent}', () => {
    for (const q of POST_MATCH_QUESTIONS) {
      expect(() => interviewQuestionSchema.parse(q)).not.toThrow();
      expect(q.prompt).toContain('{opponent}');
    }
    const keys = POST_MATCH_QUESTIONS.map((q) => q.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of ['pm-star', 'pm-win', 'pm-loss', 'pm-draw']) {
      expect(keys).toContain(key);
    }
  });
});
