import { z } from 'zod';

export const lifestyleSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  /** Short tag shown as the media "vibe" of this lifestyle. */
  vibe: z.string().min(1),
});

export type Lifestyle = z.infer<typeof lifestyleSchema>;
