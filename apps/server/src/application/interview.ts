import type {
  InterviewEffect,
  InterviewQuestion,
  InterviewSessionQuestion,
} from '@football-life/shared';
import {
  INTERVIEW_QUESTIONS,
  NEWS_INTERVIEW_TEMPLATES,
} from '@football-life/game-data';
import {
  createRandomSource,
  renderTemplate,
} from '@football-life/simulation-engine';
import type {
  InterviewRepository,
  InterviewStats,
} from '../repositories/interview-repository';
import type {
  NewsItemRecord,
  NewsRepository,
} from '../repositories/news-repository';

const SESSION_SIZE = 3;
/** At most this many questions come straight from the news. */
const NEWS_QUESTIONS = 2;
const NEWS_LOOKBACK = 20;

export interface InterviewDeps {
  repo: InterviewRepository;
  news: NewsRepository;
}

/**
 * The journalists have read the same inbox you have: the most recent news
 * with a matching template become the opening questions (one per category,
 * newest first).
 */
function pickNewsQuestions(
  items: readonly NewsItemRecord[],
): { question: InterviewQuestion; headline: string }[] {
  const picked: { question: InterviewQuestion; headline: string }[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const template = NEWS_INTERVIEW_TEMPLATES[item.category];
    if (!template || seen.has(item.category)) continue;
    seen.add(item.category);
    picked.push({ question: template, headline: item.headline });
    if (picked.length >= NEWS_QUESTIONS) break;
  }
  return picked;
}

/** Deterministically pick this week's generic questions (stable per save+week). */
function pickGenericQuestions(
  saveGameId: string,
  weekIndex: number,
  count: number,
): InterviewQuestion[] {
  const rng = createRandomSource(`${saveGameId}:interview:${weekIndex}`);
  return [...INTERVIEW_QUESTIONS]
    .map((q) => ({ q, r: rng.next() }))
    .sort((a, b) => a.r - b.r)
    .slice(0, count)
    .map((x) => x.q);
}

export interface InterviewSession {
  available: boolean;
  weekIndex: number;
  questions: InterviewSessionQuestion[];
}

export async function getInterviewSession(
  deps: InterviewDeps,
  saveGameId: string,
): Promise<InterviewSession | null> {
  const ctx = await deps.repo.loadContext(saveGameId);
  if (!ctx) return null;

  const recentNews = await deps.news.listNews(saveGameId, NEWS_LOOKBACK);
  const newsQuestions = pickNewsQuestions(recentNews);
  const generic = pickGenericQuestions(
    saveGameId,
    ctx.weekIndex,
    SESSION_SIZE - newsQuestions.length,
  );

  const vars = { firstName: ctx.firstName, clubName: ctx.clubName };
  const rendered: InterviewSessionQuestion[] = [
    ...newsQuestions.map(({ question, headline }) => ({
      key: question.key,
      prompt: renderTemplate(question.prompt, {
        ...vars,
        newsHeadline: headline,
      }),
      answers: question.answers.map((a) => ({
        key: a.key,
        label: renderTemplate(a.label, vars),
        tone: a.tone,
      })),
      fromNews: true,
    })),
    ...generic.map((q) => ({
      key: q.key,
      prompt: renderTemplate(q.prompt, vars),
      answers: q.answers.map((a) => ({
        key: a.key,
        label: a.label,
        tone: a.tone,
      })),
      fromNews: false,
    })),
  ];

  return {
    available: ctx.lastInterviewWeek !== ctx.weekIndex,
    weekIndex: ctx.weekIndex,
    questions: rendered,
  };
}

export type SubmitInterviewResult =
  | { status: 'ok'; deltas: InterviewEffect; stats: InterviewStats }
  | { status: 'already-done' }
  | { status: 'save-not-found' };

export async function submitInterview(
  deps: InterviewDeps,
  input: {
    saveGameId: string;
    answers: { questionKey: string; answerKey: string }[];
  },
): Promise<SubmitInterviewResult> {
  const ctx = await deps.repo.loadContext(input.saveGameId);
  if (!ctx) return { status: 'save-not-found' };
  if (ctx.lastInterviewWeek === ctx.weekIndex) {
    return { status: 'already-done' };
  }

  // Answer lookup covers both this week's generic picks and every news
  // template (their consequences don't depend on which headline asked them).
  const byKey = new Map<string, InterviewQuestion>(
    pickGenericQuestions(input.saveGameId, ctx.weekIndex, SESSION_SIZE).map(
      (q) => [q.key, q],
    ),
  );
  for (const template of Object.values(NEWS_INTERVIEW_TEMPLATES)) {
    byKey.set(template.key, template);
  }

  const acc: Record<string, number> = {};
  for (const choice of input.answers) {
    const question = byKey.get(choice.questionKey);
    const answer = question?.answers.find((a) => a.key === choice.answerKey);
    if (!answer) continue;
    for (const [field, value] of Object.entries(answer.consequences)) {
      acc[field] = (acc[field] ?? 0) + (value as number);
    }
  }

  const deltas = acc as InterviewEffect;
  const stats = await deps.repo.applyInterview(
    input.saveGameId,
    deltas,
    ctx.weekIndex,
  );
  if (!stats) return { status: 'save-not-found' };
  return { status: 'ok', deltas, stats };
}
