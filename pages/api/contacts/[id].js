import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === 'PATCH') {
    const { status, name, phone, group_id } = req.body || {};
    const update = { updated_at: new Date().toISOString() };
    if (status) update.status = status;
    if (name) update.name = name;
    if (phone) update.phone = phone;
    if (group_id) update.group_id = group_id;

    const { data, error } = await supabase
      .from('contacts')
      .update(update)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
