import { supabase } from '../../../lib/supabaseClient';
import { syncFromGoogleSheet } from '../../../lib/sync';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { data } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'google_sheet_csv_url')
      .maybeSingle();

    const url = data?.value;
    if (!url) return res.status(400).json({ error: 'لم يتم إعداد رابط جوجل شيت بعد' });

    const result = await syncFromGoogleSheet(url);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
