import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { status, group_id } = req.query;
    let query = supabase
      .from('contacts')
      .select('*, groups(name)')
      .order('created_at', { ascending: true });
    if (status) query = query.eq('status', status);
    if (group_id) query = query.eq('group_id', group_id);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { name, phone, group_id, bulk } = req.body || {};

    // استيراد جماعي: كل سطر بصيغة الاسم,الرقم,المجموعة
    if (bulk) {
      const lines = bulk
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      const { data: groups } = await supabase.from('groups').select('*');
      const groupMap = {};
      for (const g of groups || []) groupMap[g.name.trim().toLowerCase()] = g.id;

      let maxOrder = groups && groups.length ? Math.max(...groups.map((g) => g.order_index)) : -1;

      const rowsToInsert = [];
      for (const line of lines) {
        const parts = line.split(',').map((p) => p.trim());
        if (parts.length < 3) continue;
        const [cname, cphone, cgroup] = parts;
        const key = cgroup.toLowerCase();
        let gid = groupMap[key];
        if (!gid) {
          maxOrder += 1;
          const { data: newGroup, error: gErr } = await supabase
            .from('groups')
            .insert({ name: cgroup, order_index: maxOrder })
            .select()
            .maybeSingle();
          if (gErr) return res.status(500).json({ error: gErr.message });
          gid = newGroup.id;
          groupMap[key] = gid;
        }
        rowsToInsert.push({ name: cname, phone: cphone, group_id: gid, status: 'pending' });
      }

      if (rowsToInsert.length === 0) {
        return res.status(400).json({
          error: 'لم يتم العثور على أي صف صالح. الصيغة المطلوبة كل سطر: الاسم,الرقم,المجموعة',
        });
      }

      const { data, error } = await supabase.from('contacts').insert(rowsToInsert).select();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json({ inserted: data.length });
    }

    if (!name || !phone || !group_id) {
      return res.status(400).json({ error: 'الاسم والرقم والمجموعة مطلوبين' });
    }
    const { data, error } = await supabase
      .from('contacts')
      .insert({ name, phone, group_id, status: 'pending' })
      .select()
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json(data);
  }

  res.status(405).end();
}
