import type { Lifestyle } from '@football-life/shared';
import { LIFESTYLES } from '@football-life/game-data';
import type { ProfileRepository } from '../repositories/profile-repository';

export async function listLifestyles(
  profileRepo: ProfileRepository,
  saveGameId: string,
): Promise<{ lifestyles: Lifestyle[]; current: string | null } | null> {
  const profile = await profileRepo.getProfile(saveGameId);
  if (!profile) return null;
  return { lifestyles: LIFESTYLES, current: profile.lifestyle };
}

export async function chooseLifestyle(
  profileRepo: ProfileRepository,
  input: { saveGameId: string; lifestyle: string },
): Promise<{ status: 'ok' | 'not-found' | 'save-not-found' }> {
  if (!LIFESTYLES.some((l) => l.key === input.lifestyle)) {
    return { status: 'not-found' };
  }
  const ok = await profileRepo.setLifestyle(input.saveGameId, input.lifestyle);
  return { status: ok ? 'ok' : 'save-not-found' };
}
