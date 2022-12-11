import { Router } from "express";
import last from "it-last";
import crypto from "crypto";
import path from "path";

import * as doCrypto from "../src/lib/do-crypto/index.mjs";
import * as stringValidation from "../src/lib/string-validation/index.mjs";
import * as operateSqlite3 from "../src/lib/operate-sqlite3/index.mjs";
import { node } from "../app.js";

const router = Router();
const cryptoAlgorithm = "aes-256-cbc";

// /login への GET処理。
router.get("/", (req, res) => {
  // ログイン画面。
  res.render("login", { id: "", invalidInput: false });
});

// /login への POST処理
router.post("/", async (req, res) => {
  const formData = [
    req.body["user-id"],
    req.body["password"]
  ];
  // formのidとpasswordの形式確認。
  let isCorrect = false;
  for await (let flag of formData.map(element =>
    stringValidation.isCorrectForm(element)
  )) isCorrect = flag;

  if (!isCorrect) { // 不正な形式。
    return res.render("login", { id: "", invalidInput: true });
  }

  const userID = formData[0];
  const password = formData[1];

  const db = operateSqlite3.open();
  // トランザクション開始。
  db.prepare("BEGIN").run();
  // ユーザの存在確認。
  let row = db.prepare("SELECT COUNT(*) FROM users WHERE id = ?").get(userID);
  const countUserID = parseInt(row["COUNT(*)"], 10);
  if (countUserID === 0) { // ユーザがいない。
    // 登録画面。
    return res.redirect("/register");
  }
  // データベースからid に対する iv, salt を取得。
  const dbData = db.prepare("SELECT salt, iv FROM users WHERE id = ?").get(userID);;
  // トランザクションの終了。
  db.prepare("COMMIT").run();
  db.close();

  let encryptedHomeDir;

  try { // idからホームディレクトリ情報を取得。
    encryptedHomeDir = (await last(node.files.ls(`/${path.join(userID, "home")}`, { timeout: 30000 }))).name;
  } catch (err) {
    throw err;
  }

  try { // 復号化による認証。
    const salt = Buffer.from(dbData["salt"], "hex");
    const iv = Buffer.from(dbData["iv"], "hex");
    const key = crypto.scryptSync(password, salt, 32);
    // 復号化。
    doCrypto.decryptString(cryptoAlgorithm, encryptedHomeDir, key, iv);
    // セッション情報にidを記録。
    req.session.user = userID;
    // /user/{id} にリダイレクト。
    res.redirect(`/user/${userID}`);
  } catch (err) { // パスワードが違う。
    console.log(err)
    // ログイン画面に戻る。
    res.render("login", { id: userID, invalidInput: true });
  }
});

export default router;