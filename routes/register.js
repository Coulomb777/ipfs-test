import { Router } from "express";
import crypto from "crypto";
import path from "path";

import * as doCrypto from "../src/lib/do-crypto/index.mjs";
import * as stringValidation from "../src/lib/string-validation/index.mjs";
import * as operateSqlite3 from "../src/lib/operate-sqlite3/index.mjs";
import { node } from "../app.js";

const router = Router();
const cryptoAlgorithm = "aes-256-cbc";

// /register への GET処理。
router.get("/", (req, res) => {
  // 登録画面。
  res.render("register");
});

// /register への POST 処理。
router.post("/", (req, res) => {
  const userID = req.body["user-id"];
  const db = operateSqlite3.open();
  // ユーザの存在確認。
  let row = db.prepare("SELECT COUNT(*) FROM users WHERE id = ?").get(userID);
  const userCount = parseInt(row["COUNT(*)"], 10);
  if (userCount > 0) { // ユーザが存在。
    // ログイン画面。
    return res.render("login", { id: userID, invalidInput: false });
  }
  // /register/confirm に POST情報をもってリダイレクト。
  res.redirect(307, "/register/confirm");
});

// /register/confirm への GET処理。
router.get("/confirm", (req, res) => {
  // 登録画面。
  res.redirect("/register");
});

// /register/confirm への POST処理。
router.post("/confirm", async (req, res) => {
  const formData = [
    req.body["user-id"],
    req.body["password"]
  ];
  // formのidとpasswordの形式確認。
  let isCorrect = false;
  for await (let flag of formData.map(element =>
    stringValidation.isCorrectForm(element)
  )) isCorrect = flag;

  if (isCorrect) {
    // 登録確認画面。
    return res.render("registerConfirm",
      { userID: formData[0], password: formData[1] }
    );
  }
  // /register にリダイレクト。
  res.redirect("/register");
});

// /register への GET処理。
router.get("/processing", (req, res) => {
  // 登録画面。
  res.redirect("/register");
});

// /register/processin への POST処理。
router.post("/processing", async (req, res) => {
  const formData = [
    req.body["user-id"],
    req.body["password"]
  ];
  // formのidとpasswordの形式確認。
  let isCorrect = false;
  for await (let flag of formData.map(element =>
    stringValidation.isCorrectForm(element)
  )) isCorrect = flag;

  const db = operateSqlite3.open();
  // トランザクション開始。
  db.prepare("BEGIN").run();
  // ユーザの存在確認。
  let row = db.prepare("SELECT COUNT(*) FROM users WHERE id = ?").get(formData[0]);
  const userCount = parseInt(row["COUNT(*)"], 10);
  isCorrect = (isCorrect && userCount === 0);

  if (!isCorrect) { // formの形式が不正か、ユーザがすでに存在するとき。
    // ロールバック。
    db.prepare("ROLLBACK").run();
    // /register にリダイレクト
    return res.redirect("/register")
  }

  const userID = formData[0];
  const password = formData[1];

  let salt;
  while (true) { // ソルトの生成。
    salt = crypto.randomBytes(16);
    // salt の重複確認。
    row = db.prepare("SELECT COUNT(*) FROM users WHERE salt = ?").get(salt.toString("hex"));
    let saltCount = parseInt(row["COUNT(*)"], 10);
    // 重複してないものを使う。
    if (saltCount === 0) break;
  }
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 32);
  // 文字列 "home" を暗号化。
  const encryptedHomeName = doCrypto.encryptString(cryptoAlgorithm, "home", key, iv);
  // ホームディレクトリのパス
  const homeDirPath = path.join(userID, encryptedHomeName);

  // IPFSノードにホームディレクトリを追加。
  await node.files.mkdir(`/${homeDirPath}`, { parents: true });
  // homeCid: ホームディレクトリのCIDを取得。
  const homeCid = (await node.files.stat(`/${homeDirPath}`)).cid.toString();

  // コンテンツの共有用RSA鍵ペア。
  const {
    publicKey,
    privateKey
  } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  const encryptedPrivateKey = doCrypto.encryptString(cryptoAlgorithm, privateKey, key, iv);

  // データベースにユーザ情報を保存。
  db.prepare("INSERT INTO users VALUES(?, ?, ?, ?, ?, ?)").run(
    userID,
    homeCid,
    publicKey,
    encryptedPrivateKey,
    salt.toString("hex"),
    iv.toString("hex")
  );

  // トランザクションの終了。
  db.prepare("COMMIT").run();
  db.close();

  // セッション情報をリセットし、ログイン画面にリダイレクト。
  req.session.user = null;
  res.redirect("/login")
});

export default router;