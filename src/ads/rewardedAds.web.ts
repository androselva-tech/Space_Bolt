// Web build: no ads (Unity LevelPlay is Android and iOS only). The free 50/50 is simply granted
// (the web build is for quick testing).
export type RewardResult = 'earned' | 'skipped' | 'unavailable';
export async function initAds(_audience?: 'child' | 'general'): Promise<void> {}
export async function showRewardedAd(): Promise<RewardResult> {
  return 'earned';
}
