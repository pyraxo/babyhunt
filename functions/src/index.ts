import * as functions from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { Telegraf } from "telegraf";

initializeApp();

const db = getFirestore();

const bot = new Telegraf(functions.config().telegram.token, {
  telegram: { webhookReply: true },
});

bot.catch((err, ctx) => {
  functions.logger.error(`[BabyHunt] Error for ${ctx.updateType}`, err);
});

interface Baby {
  username: string;
  timestamp: number;
}

interface Info {
  count: number;
}

interface User {
  username: string;
  count: number;
}

const encrypt = (text: string) => {
  let val = Buffer.from(text).toString("hex");
  val = val + Array.from(val).reverse().join("");
  return Buffer.from(val).toString("base64");
};

const decrypt = (text: string) => {
  let val = Buffer.from(text, "base64").toString();
  val = val.substring(0, val.length / 2);
  return Buffer.from(val, "hex").toString();
};

bot.start(async (ctx) => {
  if (!ctx.startPayload) {
    return ctx.reply(
      [
        "👋 Hi! I'm the SUTD BabyHunt bot!\n",
        "There are 100 babies 👶 hidden around SUTD. Can you find all of them?",
        "When you find one, scan the NFC sticker located near it!\n",
        "Happy baby hunting! 👶👶👶",
      ].join("\n")
    );
  }
  const url = decrypt(ctx.startPayload);
  const params = Object.fromEntries(new URLSearchParams(url).entries());

  const { babyId } = params;
  if (!babyId) {
    return ctx.reply("Oops! Something went wrong. Contact @aarontzy");
  }

  const babyRef = db.collection("babies").doc(babyId);

  try {
    let newBaby = false;
    const finder = ctx.message.from.username;
    await db.runTransaction(async (t) => {
      const doc = await t.get(babyRef);
      if (!doc.exists) {
        return ctx.reply(
          [
            "😢 Oops! Seems like you found a non-existent baby?!\n",
            "Continue hunting more babies!",
          ].join("\n")
        );
      }
      const { username } = doc.data() as Baby;
      if (!username) {
        const finder = ctx.message.from.username;
        if (!finder) {
          functions.logger.error(
            `Couldn't get finder username: ${ctx.message.from.id}`
          );
          return ctx.reply("Oops! Something went wrong. Contact @aarontzy");
        }
        t.update(babyRef, {
          timestamp: +Date.now(),
          username: finder,
        });
        newBaby = true;
        return ctx.reply(
          [
            `👶 You found Baby \\#*${babyId}*\\!\n`,
            "Congratulations\\! Hope you find more babies\\!",
          ].join("\n"),
          { parse_mode: "MarkdownV2" }
        );
      }
      return ctx.reply(
        [
          `😢 Oops\\! Baby \\#*${babyId}* has already been found\\!\n`,
          "Continue hunting more babies\\!",
        ].join("\n"),
        { parse_mode: "MarkdownV2" }
      );
    });
    if (newBaby) {
      const userRef = db.collection("users").doc(finder as string);
      return await db.runTransaction(async (t) => {
        const userDoc = await t.get(userRef);
        if (!userDoc.exists) {
          t.set(userRef, { username: finder, count: 1 });
        } else {
          t.update(userRef, {
            username: finder,
            count: userDoc.data()?.count + 1,
          });
        }
      });
    }
  } catch (err) {
    functions.logger.error(`[BabyHunt] Error updating baby ${babyId}`, err);
    return ctx.reply("Oops! Something went wrong. Contact @aarontzy");
  }
});

bot.command("add", async (ctx) => {
  if (ctx.message.from.id !== 49398386) return;
  const countRef = db.collection("info").doc("v1");
  try {
    return db.runTransaction(async (t) => {
      const doc = await t.get(countRef);
      if (!doc.exists) {
        t.set(countRef, { count: 0 });
        functions.logger.info("[BabyHunt] Initialising new info data");
        return;
      }
      const { count } = doc.data() as Info;
      const newCount = count + 1;
      await db.collection("babies").doc(`${newCount}`).set({
        timestamp: 0,
        username: "",
      });
      t.update(countRef, { count: newCount });
      functions.logger.info(`[BabyHunt] Adding new baby ${newCount}`);
      const b64 = encrypt(`babyId=${newCount}`);
      return ctx.reply(
        `Adding new baby ${newCount}: https://t.me/babyhuntbot?start=${b64}`
      );
    });
  } catch (err) {
    functions.logger.error("[BabyHunt] Error adding new baby", err);
    return ctx.reply("Oops! Something went wrong.");
  }
});

bot.command("leaderboard", async (ctx) => {
  const userRef = db.collection("users");
  const topFive = await userRef.orderBy("count", "desc").limit(5).get();
  const resp = ["👶 *Baby Hunter Leaderboards*:\n"];
  let num = 0;
  topFive.forEach((doc) => {
    const { username, count } = doc.data() as User;
    resp.push(`${++num}. ${username} - ${count} 👶`);
  });
  if (!num) {
    return ctx.reply(
      "😪 Nobody's found a baby yet! Maybe you can be the first one?"
    );
  }
  return ctx.reply(resp.join("\n"), { parse_mode: "MarkdownV2" });
});

exports.babyHuntBot = functions.https.onRequest(async (request, response) => {
  functions.logger.log("Incoming message", request.body);
  return await bot.handleUpdate(request.body, response);
});
