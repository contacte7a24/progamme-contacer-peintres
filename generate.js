import { generateDailyList, formatTelegramMessage } from '../../../lib/rotation';
import { sendTelegramMessage } from '../../../lib/telegram';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const force = !!(req.body && req.body.force);
    const sendToTelegram = !!(req.body && req.body.sendToTelegram);

    const result = await generateDailyList({ force });

    if (!result.skipped && sendToTelegram) {
      const msg = formatTelegramMessage(result.date, result.contacts, result.remainingUnfilled);
      await sendTelegramMessage(msg);
      result.telegramSent = true;
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
