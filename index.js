import 'dotenv/config';
import express from 'express';
import { middleware as lineMiddleware, messagingApi } from '@line/bot-sdk';
import OpenAI from 'openai';

const app = express();
const PORT = process.env.PORT || 3000;

// LINE 設定（從環境變數讀取，請勿將金鑰寫在程式碼中）
const lineConfig = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

// OpenAI 客戶端（無 key 時用佔位，實際呼叫前會再檢查 OPENAI_API_KEY）
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'not-set',
});

// Line Messaging API 客戶端（用於回覆訊息）
const lineClient = lineConfig.channelAccessToken
  ? new messagingApi.MessagingApiClient({ channelAccessToken: lineConfig.channelAccessToken })
  : null;

// 健康檢查（Render 與本地測試用）
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'LINE + OpenAI Bot is running.',
    env: {
      hasOpenAI: !!process.env.OPENAI_API_KEY,
      hasLineToken: !!process.env.LINE_CHANNEL_ACCESS_TOKEN,
      hasLineSecret: !!process.env.LINE_CHANNEL_SECRET,
    },
  });
});

// LINE Webhook：僅此路由使用 Line middleware（會驗證簽章並解析 body，勿在此前使用 body-parser）
app.post('/webhook', (req, res, next) => {
  if (!lineConfig.channelSecret) {
    return res.status(500).send('LINE_CHANNEL_SECRET not set');
  }
  return lineMiddleware(lineConfig)(req, res, next);
}, (req, res) => {
  try {
    const events = req.body?.events ?? [];
    // 先立即回 200 給 LINE，避免逾時；再在背景處理
    res.status(200).send('OK');

    if (!Array.isArray(events) || events.length === 0) return;

    console.log('[webhook] received events:', events.length);
    for (const ev of events) {
      handleEvent(ev).catch((err) => {
        console.error('handleEvent error:', err);
      });
    }
  } catch (err) {
    console.error('webhook error:', err);
    if (!res.headersSent) res.status(500).end();
  }
});

// 部分環境會對 webhook 發 GET，回 200 避免報錯
app.get('/webhook', (req, res) => res.status(200).send('OK'));

async function handleEvent(event) {
  console.log('[handleEvent] type:', event.type, 'messageType:', event.message?.type);
  if (event.type !== 'message' || event.message?.type !== 'text') {
    return;
  }

  const userText = event.message.text;
  const replyToken = event.replyToken;

  if (!lineClient) {
    console.warn('LINE client not configured, skipping reply');
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    await replyText(replyToken, 'OpenAI API key 未設定，請在環境變數設定 OPENAI_API_KEY。');
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '你是一個友善、有幫助的 LINE 機器人助手。請用簡潔、自然的繁體中文回覆。',
        },
        { role: 'user', content: userText },
      ],
      max_tokens: 1024,
    });

    const replyContent =
      completion.choices?.[0]?.message?.content?.trim() ||
      '抱歉，我暫時無法產生回覆。';

    await replyText(replyToken, replyContent);
    console.log('[handleEvent] replied to user');
  } catch (err) {
    console.error('OpenAI error:', err);
    const message =
      err?.message?.includes('API key') || err?.status === 401
        ? 'OpenAI API 金鑰無效或未設定，請檢查環境變數。'
        : `發生錯誤：${err?.message || '請稍後再試'}`;
    await replyText(replyToken, message);
  }
}

async function replyText(replyToken, text) {
  if (!lineClient) return;
  await lineClient.replyMessage({
    replyToken,
    messages: [{ type: 'text', text }],
  });
}

app.use(express.json());

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
