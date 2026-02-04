# LINE 機器人 + OpenAI（部署於 Render）

使用 LINE Messaging API 接收使用者訊息，並透過 OpenAI API 回覆。可部署在 [Render](https://render.com) 上。

## 環境需求

- Node.js 18+
- LINE Developers 帳號（建立 Messaging API Channel）
- OpenAI API Key

## 本地開發

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.example` 為 `.env` 並填入：

```bash
cp .env.example .env
```

在 `.env` 中設定：

- `OPENAI_API_KEY`：你的 OpenAI API Key
- `LINE_CHANNEL_ACCESS_TOKEN`：LINE Channel 的 Channel access token
- `LINE_CHANNEL_SECRET`：LINE Channel 的 Channel secret

### 3. 啟動伺服器

```bash
npm start
```

或開發時使用監聽檔案變更：

```bash
npm run dev
```

### 4. 本地測試 Webhook（選用）

若要在本機接收 LINE 的 webhook，可使用 [ngrok](https://ngrok.com/) 等工具將 `https://你的網址/webhook` 暴露給 LINE 設定使用。

---

## 部署到 Render

### 1. 程式碼推上 Git

專案已設定遠端 `https://github.com/AllenHsiu/AI_Bot.git`。在專案目錄執行：

```bash
git push -u origin main
```

若使用 SSH，可先改遠端網址再推送：

```bash
git remote set-url origin git@github.com:AllenHsiu/AI_Bot.git
git push -u origin main
```

**請勿將 `.env` 或真實 API Key 提交到版本庫**（`.gitignore` 已排除 `.env`）。

### 2. 在 Render 建立 Web Service

1. 登入 [Render](https://render.com) → **New** → **Web Service**
2. 連接你的 Git 倉庫，選擇此專案
3. 設定：
   - **Name**：例如 `line-openai-bot`
   - **Runtime**：Node
   - **Build Command**：`npm install`
   - **Start Command**：`npm start`
   - **Instance Type**：Free 或付費方案皆可

### 3. 設定環境變數（必做）

在 Render 的 **Environment** 頁籤新增：

| Key | 說明 |
|-----|------|
| `OPENAI_API_KEY` | 你的 OpenAI API Key（例如你提供的 sk-proj-...） |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Channel 的 Channel access token |
| `LINE_CHANNEL_SECRET` | LINE Channel 的 Channel secret |

**重要：** API Key 與 LINE 金鑰請只在 Render 後台或 `.env` 中設定，不要寫進程式碼或提交到 Git。

### 4. 部署

儲存後 Render 會自動建置並部署。完成後會得到一個網址，例如：

`https://line-openai-bot-xxxx.onrender.com`

### 5. 設定 LINE Webhook

1. 前往 [LINE Developers Console](https://developers.line.biz/console/)
2. 選擇你的 **Messaging API** Channel → **Messaging API** 分頁
3. 在 **Webhook URL** 填入：  
   `https://你的-render-網址.onrender.com/webhook`
4. 啟用 **Use webhook**
5. 可關閉 **Auto-reply messages**，改由機器人自己回覆

完成後，使用者傳訊息給你的 LINE 官方帳號，就會由 OpenAI 回覆。

---

## API 說明

- `GET /`：健康檢查，可確認服務與環境變數是否就緒
- `POST /webhook`：LINE Platform 推送事件的端點，由 LINE 呼叫，勿手動帶入金鑰

## 授權

MIT
