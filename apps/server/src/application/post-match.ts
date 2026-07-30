import type { InterviewSessionQuestion } from '@football-life/shared';
import { renderTemplate } from '@football-life/simulation-engine';
import { POST_MATCH_QUESTIONS } from '@football-life/game-data';
import type {
  ProfileRepository,
  StoredPostMatch,
} from '../repositories/profile-repository';
import type {
  InterviewRepository,
  InterviewStats,
} from '../repositories/interview-repository';
import type { MatchdayReport } from './simulate-matchday';

const STAR_RATING = 7.5;

export interface PostMatchDeps {
  profile: ProfileRepository;
  interview: InterviewRepository;
}

/** The pending flash interview rendered for the client. */
export interface PostMatchSession {
  opponent: string;
  resultLine: string;
  question: InterviewSessionQuestion;
}

function questionFor(report: MatchdayReport): string {
  const pagella = report.pagella!;
  if (pagella.rating >= STAR_RATING || pagella.goals >= 2) return 'pm-star';
  const us = report.isHome ? report.homeGoals : report.awayGoals;
  const them = report.isHome ? report.awayGoals : report.homeGoals;
  if (us > them) return 'pm-win';
  if (us < them) return 'pm-loss';
  return 'pm-draw';
}

function render(pending: StoredPostMatch): PostMatchSession | null {
  const question = POST_MATCH_QUESTIONS.find(
    (q) => q.key === pending.questionKey,
  );
  if (!question) return null;
  return {
    opponent: pending.opponent,
    resultLine: pending.resultLine,
    question: {
      key: question.key,
      prompt: renderTemplate(question.prompt, { opponent: pending.opponent }),
      answers: question.answers.map((a) => ({
        key: a.key,
        label: a.label,
        tone: a.tone,
      })),
    },
  };
}

/**
 * After an advance, queue a flash interview for the protagonist's most recent
 * played match (overwrites any stale unanswered one — reporters move on).
 * Returns the rendered session, or null when the protagonist didn't play.
 */
export async function queuePostMatch(
  deps: PostMatchDeps,
  input: { saveGameId: string; matches: readonly MatchdayReport[] },
): Promise<PostMatchSession | null> {
  const played = [...input.matches]
    .reverse()
    .find((match) => match.pagella !== null);
  if (!played) return null;

  const opponent = played.isHome ? played.awayClubName : played.homeClubName;
  const pending: StoredPostMatch = {
    questionKey: questionFor(played),
    opponent,
    resultLine: `${played.homeClubName} ${played.homeGoals}-${played.awayGoals} ${played.awayClubName}`,
  };
  await deps.profile.setPostMatchPending(input.saveGameId, pending);
  return render(pending);
}

/** The still-unanswered flash interview, if any (for the dashboard). */
export async function getPendingPostMatch(
  deps: PostMatchDeps,
  saveGameId: string,
): Promise<PostMatchSession | null> {
  const profile = await deps.profile.getProfile(saveGameId);
  if (!profile?.postMatchPending) return null;
  return render(profile.postMatchPending);
}

export type PostMatchAnswerResult =
  | { status: 'ok'; stats: InterviewStats }
  | { status: 'no-pending' }
  | { status: 'bad-answer' };

/** Answer the pending flash interview: applies the tone's stat trade-off. */
export async function answerPostMatch(
  deps: PostMatchDeps,
  input: { saveGameId: string; answerKey: string },
): Promise<PostMatchAnswerResult> {
  const profile = await deps.profile.getProfile(input.saveGameId);
  const pending = profile?.postMatchPending;
  if (!pending) return { status: 'no-pending' };

  const question = POST_MATCH_QUESTIONS.find(
    (q) => q.key === pending.questionKey,
  );
  const answer = question?.answers.find((a) => a.key === input.answerKey);
  if (!answer) return { status: 'bad-answer' };

  const stats = await deps.interview.applyStatDeltas(
    input.saveGameId,
    answer.consequences,
  );
  if (!stats) return { status: 'no-pending' };
  await deps.profile.setPostMatchPending(input.saveGameId, null);
  return { status: 'ok', stats };
}
