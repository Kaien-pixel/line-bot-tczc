require('dotenv').config();
const line = require('@line/bot-sdk');
const express = require('express');
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai'); // 引入 Gemini

// 1. 設定參數
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// 設定 Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// 使用最新的 Gemini 模型
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview"});

const client = new line.Client(config);
const app = express();

app.post('/callback', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('錯誤發生:', err);
      res.status(500).end();
    });
});

// 4. 處理訊息的邏輯
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userText = event.message.text.trim();
  let replyText = '';

  // === 🛡️ 守門員機制 ===
  // 只有 # 開頭、或圖文選單關鍵字才理會
  const menuKeywords = ['大會師', 'Zinger', '保固', '貼紙', '購買貼紙'];
  
  if (!userText.startsWith('#') && !menuKeywords.some(key => userText.includes(key))) {
    return Promise.resolve(null);
  }

  // 去掉 #
  const command = userText.startsWith('#') ? userText.substring(1).trim() : userText;

  // === 優先處理：固定的車隊指令 (硬規則) ===
  
  if (command.includes('大會師')) {
    replyText = '🚗 TCZC 全國大會師資訊：\n日期：2026年3月14日\n地點：台中中科大運河停車場';
    
  } else if (command.includes('Zinger') || command.includes('保固')) {
    replyText = '關於 Zinger 1.5T 保固：\n請參考中華汽車官網，或洽詢原廠技師。';
    
  } else if (command.includes('貼紙')) {
    replyText = '想要購買車隊貼紙嗎？\n請直接私訊版主或管理員喔！';
    
  } else if (command.endsWith('天氣')) {
    // 呼叫 wttr.in 天氣
    const city = command.replace('天氣', '').trim();
    if (city) {
      try {
        const url = `https://wttr.in/${encodeURIComponent(city)}?format=%C+%t+濕度:%h&lang=zh-tw&m`;
        const response = await axios.get(url);
        replyText = `🌤️ 【${city}】天氣報告：\n${response.data}`;
      } catch (e) {
        replyText = '氣象衛星連線失敗...';
      }
    }
  
  } else {
    // === 🧠 這裡就是 AI 發揮的地方！ ===
    // 如果上面的關鍵字都沒對中，就交給 Gemini 回答
    try {
      // 1. 設定 AI 的人設 (這句很重要，決定他說話像不像車友)
      const prompt = `
        你現在是一個熱愛汽車的車友，也是「TCZC Zinger 車隊」的專屬小幫手。
        請用繁體中文、輕鬆幽默、有點像真人的語氣回答。
        如果有人問你不知道的事，就說這可能要問問版主。
        使用者說：${command}
      `;

      // 2. 呼叫 Gemini
      const result = await model.generateContent(prompt);
      const response = await result.response;
      replyText = response.text();
      
    } catch (error) {
      console.error('AI 思考失敗:', error);
      replyText = '抱歉，我的 AI 大腦現在有點過熱，請稍後再試... 🤯';
    }
  }

  // 發送回覆
  if (replyText) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: replyText
    });
  }
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ 機器人啟動 (Powered by Gemini)`);
});
