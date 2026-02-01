require('dotenv').config();
const line = require('@line/bot-sdk');
const express = require('express');

// 1. 設定 LINE Bot 的參數
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// 2. 建立客戶端與 App
const client = new line.Client(config);
const app = express();

// 3. 設定 Webhook 入口 (這就是 /callback)
app.post('/callback', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('錯誤發生:', err);
      res.status(500).end();
    });
});

// 4. 處理訊息的邏輯 (機器人的大腦)
function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  // 取得使用者文字並去空白
  const userText = event.message.text.trim();
  let replyText = '';

  // === 關鍵字判斷區 ===
  if (userText.includes('大會師')) {
    replyText = '🚗 TCZC 全國大會師資訊：\n日期：2026年3月14日\n地點：台中中科大運河停車場\n期待您的參加！';
  } else if (userText.includes('Zinger') || userText.includes('保固')) {
    replyText = '關於 Zinger 1.5T 保固：\n請參考中華汽車官網，或洽詢原廠技師。';
  } else if (userText.includes('貼紙')) {
    replyText = '想要購買車隊貼紙嗎？\n請直接私訊版主或管理員喔！';
} else if (userText.endsWith('天氣')) {
    // === 這是新加入的天氣車廂 ===
    const city = userText.replace('天氣', '').trim();
    if (city) {
      // 模擬天氣回應
      const weathers = ['晴天 ☀️', '陰天 ☁️', '有雨 🌧️', '適合跑山 🏎️'];
      const randomWeather = weathers[Math.floor(Math.random() * weathers.length)];
      replyText = `正在查詢【${city}】...\n報告！${city}目前：${randomWeather}`;
    } else {
      replyText = '想查天氣嗎？請輸入像是「台中天氣」喔！';
    }
  } else {
    // 如果沒對應到，就重複他的話
    replyText = `收到！您剛剛說了：「${userText}」`;
  }
  // ==========================

  // ===================

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: replyText
  });
}

// 5. 啟動伺服器
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ 機器人已成功啟動！正在監聽 port ${port}`);
});
