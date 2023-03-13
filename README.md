# Baby Hunt

[Companion Telegram bot](https://t.me/babyhuntbot) for the SUTD easter egg hunt - **Baby Hunt**

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

## Additional Notes

This project is purely for entertainment purposes only. I wrote this to learn about Firebase Functions and Telegraf, and completed it in a day.

While you can very easily reverse-engineer the baby code generation, this goes against the spirit of the baby hunt.
