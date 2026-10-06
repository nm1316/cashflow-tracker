const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8635500877:AAG58sb2F7ukXBDmytsWAvq5jqEKqvOdIo4';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body;

  if (action === 'setup') {
    const baseUrl = req.headers.origin || 'https://cashflow-tracker-kappa-lime.vercel.app';
    const webhookUrl = `${baseUrl}/api/telegram`;

    try {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl })
      });

      const result = await response.json();

      if (result.ok) {
        // Also get bot info
        const botInfo = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
        const bot = await botInfo.json();

        return res.status(200).json({
          success: true,
          message: 'Webhook configured successfully!',
          webhookUrl,
          bot: bot.result ? {
            id: bot.result.id,
            username: bot.result.username,
            name: bot.result.first_name
          } : null
        });
      } else {
        return res.status(400).json({
          success: false,
          error: result.description
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  if (action === 'status') {
    try {
      const [webhook, botInfo] = await Promise.all([
        fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`),
        fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`)
      ]);

      const webhookInfo = await webhook.json();
      const bot = await botInfo.json();

      return res.status(200).json({
        bot: bot.result ? {
          username: bot.result.username,
          name: bot.result.first_name
        } : null,
        webhook: webhookInfo.result
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(400).json({ error: 'Invalid action. Use: setup, status' });
}
