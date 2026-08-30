import { generateDailyList, formatTelegramMessage } from '../../../lib/rotation';
import { sendTelegramMessage } from '../../../lib/telegram';
import { syncFromGoogleSheet } from '../../../lib/sync';
import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'];
  const queryOk = req.query.secret && req.query.secret === secret;
  const headerOk = authHeader === `Bearer ${secret}`;

  if (secret && !queryOk && !headerOk) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    // مزامنة تلقائية مع جوجل شيت (إن وُجد رابط محفوظ) قبل توليد قائمة اليوم
    let syncResult = null;
    try {
      const { data } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'google_sheet_csv_url')
        .maybeSingle();
      if (data?.value) {
        syncResult = await syncFromGoogleSheet(data.value);
      }
    } catch (syncErr) {
      console.error('sheet sync failed:', syncErr.message);
    }

    const result = await generateDailyList({ force: false });
    if (syncResult) result.sheetSync = syncResult;

    if (result.skipped) {
      return res.status(200).json(result);
    }

    const msg = formatTelegramMessage(result.date, result.contacts, result.remainingUnfilled);
    await sendTelegramMessage(msg);

    return res.status(200).json({ ...result, telegramSent: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
