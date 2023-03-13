# Baby Hunt

Companion Telegram bot for the SUTD easter egg hunt - **Baby Hunt**

## Deployment

* Node 16
* Firebase Blaze
* Firebase CLI

```bash
firebase functions:config:set telegram.token="<tokenURL>"
firebase functions:config:get > .runtimeconfig.json
npm i
npm run deploy
```

POST `https://api.telegram.org/bot<botToken>/setWebhook?url=<functionURL>`

GET `https://api.telegram.org/bot<botToken>/getwebhookInfo`
