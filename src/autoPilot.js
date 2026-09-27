import { supabase } from './supabaseClient';

export const getRoundNameByCount = (contestantCount) => {
  if (contestantCount <= 2) return 'Grand Finale';
  if (contestantCount <= 4) return 'Semi-Final';
  if (contestantCount <= 8) return 'Quarter-Final';
  return 'Round 2';
};

export const runAutoPilotCheck = async () => {
  try {
    const { data: settings } = await supabase
      .from('mehfil_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (!settings || settings.phase !== 'voting' || !settings.phase_end_time) {
      return settings;
    }

    const endTime = new Date(settings.phase_end_time).getTime();
    if (Date.now() < endTime) {
      return settings;
    }

    const { data: currentBattles } = await supabase
      .from('battles')
      .select('*')
      .order('id', { ascending: true });

    if (!currentBattles || currentBattles.length === 0) return settings;

    // CASE A: GRAND FINALE KHATAM -> AUTO CROWN WINNER (WITH FINALE SONG) & RUNNER-UP
    if (currentBattles.length === 1) {
      const finalMatch = currentBattles[0];
      const aWon = (finalMatch.votes_a || 0) >= (finalMatch.votes_b || 0) || !finalMatch.audio_b;

      const winner = aWon
        ? { name: finalMatch.singer_a, insta: finalMatch.insta_a, dp: finalMatch.dp_a, audio: finalMatch.audio_a }
        : { name: finalMatch.singer_b, insta: finalMatch.insta_b, dp: finalMatch.dp_b, audio: finalMatch.audio_b };

      const runnerUp = aWon
        ? { name: finalMatch.singer_b, insta: finalMatch.insta_b, dp: finalMatch.dp_b }
        : { name: finalMatch.singer_a, insta: finalMatch.insta_a, dp: finalMatch.dp_a };

      await supabase.from('hall_of_fame').insert([{
        season_title: `Mehfil (${new Date().toLocaleDateString()})`,
        winner_name: winner.name,
        winner_insta: winner.insta || '',
        winner_dp: winner.dp || '',
        winner_audio: winner.audio || '', // Sirf Winner ka Finale Song save hoga!
        runner_up_name: runnerUp.name !== 'Wildcard Entry' ? runnerUp.name : '',
        runner_up_insta: runnerUp.insta || '',
        runner_up_dp: runnerUp.dp || ''
      }]);

      await supabase.from('battles').delete().neq('id', 0);
      await supabase.from('contestants').delete().neq('id', 0);

      const prevHistory = Array.isArray(settings.bracket_history) ? settings.bracket_history : [];
      const updatedHistory = [...prevHistory, currentBattles];

      const { data: updated } = await supabase
        .from('mehfil_settings')
        .update({
          phase: 'completed',
          round_name: `👑 Sartaaj: ${winner.name}`,
          phase_end_time: null,
          bracket_history: updatedHistory
        })
        .eq('id', 1)
        .select()
        .single();

      return updated;
    }

    // CASE B: WINNERS KO UNKE SECRET PIN KE SATH AGLE ROUND MEIN PROMOTE KARO
    const winners = currentBattles.map(b => {
      if ((b.votes_a || 0) >= (b.votes_b || 0) || !b.audio_b) {
        return {
          name: b.singer_a,
          contact: b.insta_a ? `@${b.insta_a.replace('@', '')}` : 'Private',
          insta_handle: b.insta_a || '',
          audio_url: b.audio_a,
          dp_url: b.dp_a,
          secret_pin: b.pin_a,
          song_updated: false
        };
      } else {
        return {
          name: b.singer_b,
          contact: b.insta_b ? `@${b.insta_b.replace('@', '')}` : 'Private',
          insta_handle: b.insta_b || '',
          audio_url: b.audio_b,
          dp_url: b.dp_b,
          secret_pin: b.pin_b,
          song_updated: false
        };
      }
    });

    await supabase.from('contestants').delete().neq('id', 0);
    await supabase.from('contestants').insert(winners);

    const nextRoundName = getRoundNameByCount(winners.length);
    const next24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const prevHistory = Array.isArray(settings.bracket_history) ? settings.bracket_history : [];
    const updatedHistory = [...prevHistory, currentBattles];

    const { data: updated } = await supabase
      .from('mehfil_settings')
      .update({
        phase: 'next_round_upload',
        round_name: nextRoundName,
        phase_end_time: next24h,
        bracket_history: updatedHistory
      })
      .eq('id', 1)
      .select()
      .single();

    return updated;
  } catch (err) {
    console.error('AutoPilot Error:', err);
    return null;
  }
};