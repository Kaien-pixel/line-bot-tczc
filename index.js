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
   // 1. 先把開頭的 # 去掉
  let rawCommand = userText.startsWith('#') ? userText.substring(1).trim() : userText;

  // 2. 【關鍵修改】幫文字洗澡：把所有標點符號和空白都刪掉
  // 這裡的符號包含：空白, ?, !, ., ,, 以及它們的全形版本 (？ ！ 。 ，)
  const command = rawCommand.replace(/[ ?！!。.,，\s]/g, '');


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
    try {
      // === 🧠 設定 AI 的人設 (讓它變有趣) ===
      const prompt = `
        你現在是「TCZC Zinger 車隊」的專屬 AI 助理，也是大家的車友。
        你的個性：幽默、有點「嘴砲」、很講義氣，講話喜歡帶點鄉民梗或顏文字 (XD, www)。
        
        回答規則：
        1. 🚗 **遇到正經的汽車問題** (維修、規格)：請展現專業，認真回答。
        2. 🔮 **遇到無厘頭的問題** (例如：誰什麼時候交女朋友、某某人帥不帥)：
           - 請發揮創意「一本正經地胡說八道」。
           - 可以稍微吐槽使用者，或是給出好笑的預言。
           - 例如問交女友，你可以回：「我看這輩子很難，除非他把 Zinger 改成法拉利。」
        3. 🌌 **遇到星座、運勢**：隨機編一個看起來很準但很好笑的運勢。
        
        現在，使用者問你：${command}
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
