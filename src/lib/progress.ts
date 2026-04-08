import { supabase } from './supabase';

/**
 * Petra Progress & Streak Logic
 * Designed for non-toxic consistency.
 */

export interface UserProgress {
  energy: number;
  streak: number;
  lastUpdate: string | null;
}

/**
 * Updates the user's streak based on the current session completion.
 */
export async function updateProgressOnSessionComplete(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  
  // 1. Log the activity
  const { data: activity, error: activityError } = await supabase
    .from('daily_activity')
    .upsert({ user_id: userId, activity_date: today }, { onConflict: 'user_id,activity_date' })
    .select()
    .single();

  if (activityError) return;

  // 2. Fetch current profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('streak_days, last_streak_update, petra_energy')
    .eq('id', userId)
    .single();

  if (profileError) return;

  let newStreak = profile.streak_days;
  const lastUpdate = profile.last_streak_update ? new_date_from_iso(profile.last_streak_update) : null;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (lastUpdate === null || profile.last_streak_update.split('T')[0] === yesterdayStr) {
    // Consecutive day
    newStreak += 1;
  } else if (profile.last_streak_update.split('T')[0] !== today) {
    // Missed days (Non-toxic: simple reset for now, but in future "dimming")
    newStreak = 1;
  }

  // 3. Update Profile
  await supabase
    .from('profiles')
    .update({ 
      streak_days: newStreak, 
      last_streak_update: new Date().toISOString(),
      petra_energy: Math.min(5, profile.petra_energy + 1) // Session completion restores energy
    })
    .eq('id', userId);
}

function new_date_from_iso(iso: string) {
  return iso.split('T')[0];
}
