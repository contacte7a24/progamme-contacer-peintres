import { supabase } from '../../../lib/supabaseClient';
import { getLocalDate } from '../../../lib/rotation';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const dateStr = getLocalDate().toISOString().slice(0, 10);
  const { data: log, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('run_date', dateStr)
    .maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  if (!log) return res.status(200).json({ date: dateStr, contacts: [] });

  const { data: contacts, error: cErr } = await supabase
    .from('contacts')
    .select('*, groups(name)')
    .in('id', log.contact_ids);
  if (cErr) return res.status(500).json({ error: cErr.message });

  return res.status(200).json({ date: dateStr, contacts });
}
