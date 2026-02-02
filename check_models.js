require('dotenv').config();
const axios = require('axios');

async function getModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ 找不到 GEMINI_API_KEY，請確認 .env 檔案設定正確！");
    return;
  }

  // 直接向 Google API 查詢可用模型列表
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    console.log("🛰️ 正在連線 Google 查詢可用模型...");
    const response = await axios.get(url);
    const models = response.data.models;

    console.log("\n📋 === 您的帳號可用模型清單 ===");
    const chatModels = models.filter(m => m.supportedGenerationMethods.includes('generateContent'));
    
    if (chatModels.length === 0) {
      console.log("⚠️ 雖然連線成功，但沒有找到支援對話的模型。");
    } else {
      chatModels.forEach(model => {
        // 只列出模型名稱 (把前面的 models/ 去掉)
        console.log(`✅ ${model.name.replace('models/', '')}`);
      });
    }
    console.log("===============================\n");
    console.log("💡 請從上面選一個名字，填入 index.js 的 model 欄位！");

  } catch (error) {
    console.error("❌ 查詢失敗！原因：");
    if (error.response) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
  }
}

getModels();
