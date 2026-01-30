import os
from dotenv import load_dotenv
from flask import Flask, request, abort

from linebot import (
LineBotApi, WebhookHandler
)
from linebot.exceptions import (
InvalidSignatureError
)
from linebot.models import (
MessageEvent, TextMessage, TextSendMessage,
)

# 從 .env 檔案載入環境變數
load_dotenv()

app = Flask(__name__)

# 從環境變數取得您的 Channel Secret 和 Channel Access Token
channel_secret = os.getenv('CHANNEL_SECRET', None)
channel_access_token = os.getenv('CHANNEL_ACCESS_TOKEN', None)

if channel_secret is None:
 print('Specify CHANNEL_SECRET as environment variable.')
if channel_access_token is None:
 print('Specify CHANNEL_ACCESS_TOKEN as environment variable.')
exit(1)

line_bot_api = LineBotApi(channel_access_token)
handler = WebhookHandler(channel_secret)

# 定義一個簡單的關鍵字回覆字典
keyword_replies = {
"哈囉": "你好！很高興為您服務。",
"你好": "哈囉！有什麼可以幫忙的嗎？",
"謝謝": "不客氣！",
"指令": "目前我能回覆「哈囉」、「你好」、「謝謝」。",
"天氣": "對不起，我還沒有查詢天氣的功能。",
}

@app.route("/callback", methods=['POST'])
def callback():
    # 取得請求標頭中的 X-Line-Signature
    signature = request.headers['X-Line-Signature']

    # 取得請求主體
    body = request.get_data(as_text=True)
    app.logger.info("Request body: " + body)

    # 處理 Webhook 主體
    try:
        handler.handle(body, signature)
    except InvalidSignatureError:
        print("Invalid signature. Please check your channel access token/channel secret.")
        abort(400)

    return 'OK'

@handler.add(MessageEvent, message=TextMessage)
def handle_message(event):
# 取得使用者傳送的訊息文字
 user_message = event.message.text

# 檢查是否有符合的關鍵字
# 轉換為小寫以實現不區分大小寫的匹配
reply_text = keyword_replies.get(user_message.lower(), "對不起，我不太明白您的意思。")

# 回覆訊息
line_bot_api.reply_message(
event.reply_token,
TextSendMessage(text=reply_text)
)

if __name__ == "__main__":
 app.run(host='0.0.0.0', port=5000)