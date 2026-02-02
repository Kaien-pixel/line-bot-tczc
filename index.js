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
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

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
  const menuKeywords = ['大會師', 'Zinger', '保固', '貼紙', '購買貼紙', '運勢', '帥嗎', '交女朋友'];
  
  if (!userText.startsWith('#') && !menuKeywords.some(key => userText.includes(key))) {
    return Promise.resolve(null);
  }

  // 1. 去掉 #
  let rawCommand = userText.startsWith('#') ? userText.substring(1).trim() : userText;

  // 2. 幫文字洗澡
  const command = rawCommand.replace(/[ ?！!。.,，\s]/g, '');

  // 3. 【關鍵修正】如果是空的 (例如只打 #? )，直接結束，不要送給 AI
  if (!command) {
    return Promise.resolve(null);
  }

  // === 優先處理：固定的車隊指令 ===
  
  if (command.includes('大會師')) {
    replyText = '🚗 TCZC 全國大會師資訊：\n日期：2026年3月14日\n地點：台中中科大運河停車場';
    
  } else if (command.includes('Zinger') || command.includes('保固')) {
    replyText = '關於 Zinger 1.5T 保固：\n請參考中華汽車官網，或洽詢原廠技師。';
    
  } else if (command.includes('貼紙')) {
    replyText = '想要購買車隊貼紙嗎？\n請直接私訊版主或管理員喔！';
    
  } else if (command.endsWith('天氣')) {
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
    try {
      // === 🧠 AI 區域 ===
      const prompt = `
        你現在是「TCZC Zinger 車隊」的專屬 AI 助理，也是大家的車友。
        你的個性：幽默、有點「嘴砲」、很講義氣，講話喜歡帶點鄉民梗或顏文字 (XD, www)。
        
        回答規則：
        1. 🚗 遇到正經問題：認真回答。
        2. 🔮 遇到瞎聊 (交女友、帥不帥)：發揮創意瞎掰、吐槽。
        3. 🌌 遇到星座運勢：隨機編一個好笑的。
        
        使用者問你：${command}
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      replyText = response.text();
      
    } catch (error) {
      // 建議：把這個 error 印出來，這樣去 Render Log 才知道真正死因
      console.error('AI 思考失敗 (真實原因):', error);
      replyText = '抱歉，我的 AI 大腦現在有點過熱，請稍後再試... 🤯';
    }
  }

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
