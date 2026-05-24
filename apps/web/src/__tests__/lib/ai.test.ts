import { describe, it, expect, beforeEach } from 'vitest';
import { getRemainingQuestions, incrementQuestionCount } from '@/lib/ai.api';

const TODAY = new Date().toISOString().slice(0, 10);
const d = new Date();
d.setDate(d.getDate() - 1);
const YESTERDAY = d.toISOString().slice(0, 10);

describe('getRemainingQuestions', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('returns 10 when sessionStorage has no entry', () => {
    expect(getRemainingQuestions()).toBe(10);
  });

  it('returns 10 when stored date is yesterday', () => {
    sessionStorage.setItem(
      'ai_questions_today',
      JSON.stringify({ count: 8, date: YESTERDAY }),
    );
    expect(getRemainingQuestions()).toBe(10);
  });

  it('returns correct remaining count for today', () => {
    sessionStorage.setItem(
      'ai_questions_today',
      JSON.stringify({ count: 3, date: TODAY }),
    );
    expect(getRemainingQuestions()).toBe(7);
  });

  it('returns 0 when count equals the limit of 10', () => {
    sessionStorage.setItem(
      'ai_questions_today',
      JSON.stringify({ count: 10, date: TODAY }),
    );
    expect(getRemainingQuestions()).toBe(0);
  });

  it('returns 0 when count exceeds the limit', () => {
    sessionStorage.setItem(
      'ai_questions_today',
      JSON.stringify({ count: 15, date: TODAY }),
    );
    expect(getRemainingQuestions()).toBe(0);
  });

  it('returns 10 for malformed JSON in sessionStorage', () => {
    sessionStorage.setItem('ai_questions_today', 'not-valid-json');
    expect(getRemainingQuestions()).toBe(10);
  });
});

describe('incrementQuestionCount', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('initializes count to 1 on the first call, leaving 9 remaining', () => {
    incrementQuestionCount();
    expect(getRemainingQuestions()).toBe(9);
  });

  it('increments an existing count for today', () => {
    sessionStorage.setItem(
      'ai_questions_today',
      JSON.stringify({ count: 5, date: TODAY }),
    );
    incrementQuestionCount();
    expect(getRemainingQuestions()).toBe(4);
  });

  it('resets to 1 when the stored date is yesterday', () => {
    sessionStorage.setItem(
      'ai_questions_today',
      JSON.stringify({ count: 9, date: YESTERDAY }),
    );
    incrementQuestionCount();
    // count should reset to 1 for today → 9 remaining
    expect(getRemainingQuestions()).toBe(9);
  });

  it('multiple increments accumulate correctly', () => {
    incrementQuestionCount();
    incrementQuestionCount();
    incrementQuestionCount();
    expect(getRemainingQuestions()).toBe(7);
  });
});
