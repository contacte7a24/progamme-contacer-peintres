import { supabase } from './supabaseClient';
import { fetchSheetRows } from './googleSheet';

export async function syncFromGoogleSheet(csvUrl) {
  const rows = await fetchSheetRows(csvUrl);

  const { data: existingGroups } = await supabase.from('groups').select('*');
  const groupMap = {};
  for (const g of existingGroups || []) groupMap[g.name.trim().toLowerCase()] = g.id;
  let maxOrder =
    existingGroups && existingGroups.length ? Math.max(...existingGroups.map((g) => g.order_index)) : -1;

  const { data: existingContacts } = await supabase.from('contacts').select('phone');
  const existingPhones = new Set((existingContacts || []).map((c) => c.phone.trim()));

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    if (existingPhones.has(row.phone)) {
      skipped++;
      continue;
    }

    const key = row.group.toLowerCase();
    let gid = groupMap[key];
    if (!gid) {
      maxOrder += 1;
      const { data: newGroup, error: gErr } = await supabase
        .from('groups')
        .insert({ name: row.group, order_index: maxOrder })
        .select()
        .maybeSingle();
      if (gErr) throw gErr;
      gid = newGroup.id;
      groupMap[key] = gid;
    }

    const { error: insErr } = await supabase
      .from('contacts')
      .insert({ name: row.name, phone: row.phone, group_id: gid, status: row.status });
    if (insErr) throw insErr;

    existingPhones.add(row.phone);
    inserted++;
  }

  return { inserted, skipped, total: rows.length };
}
