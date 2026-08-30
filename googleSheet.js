import { parseCSV } from './csv';

function normalizeHeader(h) {
  return h.trim().toLowerCase();
}

const NAME_KEYS = ['name', 'اسم'];
const PHONE_KEYS = ['phone', 'رقم', 'number', 'هاتف'];
const GROUP_KEYS = ['group', 'مجموعة'];
const STATUS_KEYS = ['status', 'حالة'];

function findColumnIndex(headers, keys) {
  for (let i = 0; i < headers.length; i++) {
    const h = normalizeHeader(headers[i]);
    if (keys.some((k) => h.includes(k))) return i;
  }
  return -1;
}

export async function fetchSheetRows(csvUrl) {
  const res = await fetch(csvUrl);
  if (!res.ok) {
    throw new Error(
      'تعذر تحميل بيانات الشيت. تأكد أن الرابط صحيح وأن الشيت منشور للعامة (File > Share > Publish to web > CSV)'
    );
  }
  const text = await res.text();
  const rows = parseCSV(text);
  if (rows.length < 2) return [];

  const headers = rows[0];
  const nameIdx = findColumnIndex(headers, NAME_KEYS);
  const phoneIdx = findColumnIndex(headers, PHONE_KEYS);
  const groupIdx = findColumnIndex(headers, GROUP_KEYS);
  const statusIdx = findColumnIndex(headers, STATUS_KEYS);

  if (nameIdx === -1 || phoneIdx === -1 || groupIdx === -1) {
    throw new Error(
      'لم يتم العثور على أعمدة الاسم/الرقم/المجموعة في الشيت. تأكد من وجود صف عناوين واضح (مثلاً: الاسم، الرقم، المجموعة).'
    );
  }

  const result = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = (r[nameIdx] || '').trim();
    const phone = (r[phoneIdx] || '').trim();
    const group = (r[groupIdx] || '').trim();
    const statusRaw = statusIdx !== -1 ? (r[statusIdx] || '').trim().toLowerCase() : '';
    if (!name || !phone || !group) continue;
    const isDone = ['done', 'تم', 'تم الاتصال', 'yes', 'نعم', 'مكتمل'].includes(statusRaw);
    result.push({ name, phone, group, status: isDone ? 'done' : 'pending' });
  }
  return result;
}
