import { z } from 'zod';

/** Clamped stat deltas an interview answer applies to the protagonist. */
export const interviewEffectSchema = z.object({
  morale: z.number().optional(),
  stress: z.number().optional(),
  happiness: z.number().optional(),
  mentalHealth: z.number().optional(),
  motivation: z.number().optional(),
  popularity: z.number().optional(),
  reputation: z.number().optional(),
});

export const interviewAnswerSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  /** HUMBLE | BOLD | DIPLOMATIC — shown as a tone tag. */
  tone: z.string().min(1),
  consequences: interviewEffectSchema,
});

export const interviewQuestionSchema = z.object({
  key: z.string().min(1),
  prompt: z.string().min(1),
  answers: z.array(interviewAnswerSchema).min(2),
});

export type InterviewEffect = z.infer<typeof interviewEffectSchema>;
export type InterviewAnswer = z.infer<typeof interviewAnswerSchema>;
export type InterviewQuestion = z.infer<typeof interviewQuestionSchema>;

/** A rendered question (prompt interpolated) sent to the client. */
export interface InterviewSessionQuestion {
  key: string;
  prompt: string;
  answers: { key: string; label: string; tone: string }[];
  /** True when the question was triggered by a recent news item. */
  fromNews?: boolean;
}
