import { z } from 'zod';

/**
 * One-off effects a purchased item applies to the protagonist. The 0-100
 * wellbeing stats and the 0-10000 fame stats (popularity, reputation) are
 * clamped to their own ranges when the purchase is applied.
 */
export const shopItemEffectSchema = z.object({
  morale: z.number().optional(),
  happiness: z.number().optional(),
  motivation: z.number().optional(),
  mentalHealth: z.number().optional(),
  stress: z.number().optional(),
  popularity: z.number().optional(),
  reputation: z.number().optional(),
  condition: z.number().optional(),
  fatigue: z.number().optional(),
});

export const shopItemSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  /**
   * EQUIPMENT | WELLNESS | TRAINING | MEDIA | HOME | FAMILY | LIFESTYLE
   * | GADGET
   */
  category: z.string().min(1),
  price: z.number().int().positive(),
  effects: shopItemEffectSchema,
});

export type ShopItemEffect = z.infer<typeof shopItemEffectSchema>;
export type ShopItem = z.infer<typeof shopItemSchema>;
