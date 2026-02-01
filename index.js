require('dotenv').config();
const line = require('@line/bot-sdk');
const express = require('express');
const axios = require('axios'); // <--- 新增：引入上網抓資料的工具

// 1. 設定 LINE Bot 的參數
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// 2. 建立客戶端與 App
const client = new line.Client(config);
const app = express();

// 3. 設定 Webhook 入口
app.post('/callback', line.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('錯誤發生:', err);
      res.status(500).end();
    });
});

// 4. 處理訊息的邏輯 (注意：這裡加了 async 變成非同步函式)
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userText = event.message.text.trim();
  let replyText = '';

  // === 🛡️ 守門員機制 ===
  const menuKeywords = ['大會師', 'Zinger', '保固', '貼紙', '購買貼紙'];
  if (!userText.startsWith('#') && !menuKeywords.some(key => userText.includes(key))) {
    return Promise.resolve(null);
  }

  // 把 # 去掉
  const command = userText.startsWith('#') ? userText.substring(1).trim() : userText;

  // === 關鍵字判斷區 ===
  
  if (command.includes('大會師')) {
    replyText = '🚗 TCZC 全國大會師資訊：\n日期：2026年3月14日\n地點：台中中科大運河停車場\n期待您的參加！';
    
  } else if (command.includes('Zinger') || command.includes('保固')) {
    replyText = '關於 Zinger 1.5T 保固：\n請參考中華汽車官網，或洽詢原廠技師。';
    
  } else if (command.includes('貼紙')) {
    replyText = '想要購買車隊貼紙嗎？\n請直接私訊版主或管理員喔！';
    
  } else if (command.endsWith('天氣')) {
    // === ☁️ 真實天氣查詢功能 (wttr.in) ===
    const city = command.replace('天氣', '').trim();
    
    if (city) {
      try {
        // 1. 設定 wttr.in 的網址 (lang=zh-tw 是中文，format 是格式)
        // format=%C (天氣狀況) %t (氣溫) %h (濕度) %w (風速)
        const encodedCity = encodeURIComponent(city);
        const url = `https://wttr.in/${encodedCity}?format=%C+%t+濕度:%h+風速:%w&lang=zh-tw`;
        
        // 2. 機器人幫您去這個網址抓資料 (await 等待結果)
        const response = await axios.get(url);
        const weatherData = response.data;

        // 3. 檢查是不是抓失敗 (有時候打錯字會回傳 Unknown location)
        if (weatherData.includes('Unknown') || weatherData.includes('404')) {
          replyText = `找不到【${city}】這個地方耶😅\n請確認地名是否正確！(例如：台中、台北)`;
        } else {
          replyText = `🌤️ 【${city}】即時天氣報告：\n${weatherData}\n(資料來源: wttr.in)`;
        }

      } catch (error) {
        console.error(error);
        replyText = '查詢失敗，氣象衛星連線中斷...請稍後再試 🛰️';
      }
    } else {
      replyText = '想查天氣嗎？請輸入像是「#台中天氣」喔！';
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

// 5. 啟動伺服器
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ 機器人已成功啟動！正在監聽 port ${port}`);
});
