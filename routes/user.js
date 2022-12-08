import { Router } from "express";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import fs from "fs-extra";
import multer from "multer";
import { concat as uint8ArrayConcat } from "uint8arrays/concat"
import * as fileType from "file-type";
import all from "it-all";
import last from "it-last";
import stream from "stream";

import * as operateSqlite3 from "../src/lib/operate-sqlite3/index.mjs";
import * as doCrypto from "../src/lib/do-crypto/index.mjs";
import { node } from "../app.js";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cryptoAlgorithm = "aes-256-cbc";
const upload = multer({ dest: `${__dirname}/tmp/` });

// 共通処理
router.use("/*", (req, res, next) => {
  if (!req.session.user) { // セッションが存在しない。
    // /login にリダイレクト。
    return res.redirect("/login");
  }
  next();
});

router.use("/:id/*", (req, res, next) => {
  if (req.session.user != req.params.id) {
    return res.redirect("/user")
  }
  next();
})

// /user への GET 処理。
router.get("/", (req, res) => {
  // /user/{id} にリダイレクト。
  res.redirect(`/user/${req.session.user}/directories/`);
});

// /user/{ユーザID} への GET処理。
router.get("/:id", (req, res) => {
  res.redirect(`/user/${req.params.id}/directories/`);
});

router.get("/:id/directories/:path(*|.?)", async (req, res, next) => {
  const userID = req.params.id;
  const reqPath = req.params.path;
  const db = operateSqlite3.open();
  const dbData = db.prepare("SELECT home_cid FROM users WHERE id = ?").get(userID);
  db.close();
  const dirPath = path.join(dbData["home_cid"], reqPath);

  let contents = new Array();

  try {
    for await (let content of node.ls(dirPath, { timeout: 30000 })) {
      contents.push({ content: content, cid: content.cid.toString() });
    }
  } catch (err) {
    let error = new Error("Not found.");
    error.status = 404;
    return next(error);
  }

  res.render("user", {
    id: userID,
    data: {
      path: reqPath,
      contents: contents
    }
  });
})

router.get("/:id/files/:cid", async (req, res) => {
  res.render("file", { id: req.params.id, cid: req.params.cid });
});

router.get("/:id/download/:cid", async (req, res) => {
  res.render("download", { id: req.params.id, cid: req.params.cid });
});

// /user/{ユーザID}/upload への POST 処理。
// ファイルのアップロードに対する処理。
router.post("/:id/upload", upload.single("file"), async (req, res) => {
  const userID = req.params.id;
  const password = req.body["password"];
  const filePath = req.body["path"];
  const fileName = req.body["file-name"];

  const db = operateSqlite3.open();
  // トランザクション開始。
  db.prepare("BEGIN").run();
  // データベースから salt と iv を取得。
  const dbData = db.prepare("SELECT salt, iv FROM users WHERE id = ?").get(userID);

  // salt、iv、key の設定。
  const salt = Buffer.from(dbData["salt"], "hex");
  const iv = Buffer.from(dbData["iv"], "hex");
  const key = crypto.scryptSync(password, salt, 32);

  // 暗号器
  const cipher = crypto.createCipheriv(cryptoAlgorithm, key, iv);

  // ファイル名の暗号化。
  const encryptedName = doCrypto.encryptString(cryptoAlgorithm, fileName, key, iv);

  // ホームディレクトリからのパス
  const filePathFromHomeDir = path.posix.join(filePath, encryptedName);

  // IPFSノードに追加するためのパス。
  const homeDirPath = path.join(userID, (await last(node.files.ls(`/${userID}`))).name);
  const absFilePath = path.join(homeDirPath, filePathFromHomeDir);

  let isExist = true;
  try { // ファイルの存在確認。
    await node.files.stat(`/${absFilePath}`);
  } catch (err) { // 存在しない場合。
    isExist = false;
  }
  if (isExist) { // 存在していたらファイルを削除。
    await node.files.rm(`/${absFilePath}`);
  }

  // ファイルストリーム。
  const fstream = fs.createReadStream(req.file.path);
  // IPFSノードにファイルの追加。
  await node.files.write(`/${absFilePath}`, fstream.pipe(cipher), { create: true });
  // 元ファイルの削除。
  fs.unlinkSync(req.file.path);
  // クライアントが使うホームディレクトリのCIDを取得。
  const homeCid = (await node.files.stat(`/${homeDirPath}`)).cid.toString();
  // データベースの更新。
  db.prepare("UPDATE users SET home_cid = ? WHERE id = ?").run(homeCid, userID);
  // トランザクションの終了。
  db.prepare("COMMIT").run();
  db.close();

  res.status(200).end();
});

// /user/{ユーザID}/mkdir への POST 処理。
// ディレクトリを作成する。
router.post("/:id/mkdir", async (req, res) => {
  const userID = req.params.id;
  const password = req.body["password"];
  const dirPath = req.body["path"];
  const newDirName = req.body["dir"];
  console.log(newDirName)
  const db = operateSqlite3.open();
  // トランザクション開始。
  db.prepare("BEGIN").run();
  // データベースから salt と iv を取得。
  const dbData = db.prepare("SELECT salt, iv FROM users WHERE id = ?").get(userID);

  // salt、iv、key の設定。
  const salt = Buffer.from(dbData["salt"], "hex");
  const iv = Buffer.from(dbData["iv"], "hex");
  const key = crypto.scryptSync(password, salt, 32);

  // ディレクトリ名の暗号化。
  const encryptedNewDirName = doCrypto.encryptString(cryptoAlgorithm, newDirName, key, iv);
  console.log(encryptedNewDirName)

  // ホームディレクトリからのパス
  const dirPathFromHomeDir = path.posix.join(dirPath, encryptedNewDirName);
  // ホームディレクトリのパス
  const homeDirPath = path.join(userID, (await last(node.files.ls(`/${userID}`))).name);
  // IPFSノードに追加するためのパス。
  const absDirPath = path.join(homeDirPath, dirPathFromHomeDir);

  let stat, isExist = true;
  try { // ファイルの存在確認。
    stat = await node.files.stat(`/${absDirPath}`);
  } catch (err) { // 存在しない場合。
    isExist = false;
  }
  if (isExist) { // 存在していたら何もしない。
    return res.status(200).end();
  }

  // IPFSノードにディレクトリの追加。
  await node.files.mkdir(`/${absDirPath}`, { parent: true });
  // クライアントが使うホームディレクトリのCIDを取得。
  const homeCid = (await node.files.stat(`/${homeDirPath}`)).cid.toString();
  // データベースの更新。
  db.prepare("UPDATE users SET home_cid = ? WHERE id = ?").run(homeCid, userID);
  // トランザクションの終了。
  db.prepare("COMMIT").run();
  db.close();

  res.status(200).end();
});

router.post("/:id/rmFiles", async (req, res) => {
  const userID = req.params.id;
  const reqPath = req.body["path"];
  const targetFiles = req.body["target_files"];

  // ホームディレクトリのパス
  const homeDirPath = path.join(userID, (await last(node.files.ls(`/${userID}`))).name);

  try { //コンテンツの削除
    for (let target of targetFiles) {
      const targetPath = path.posix.join(reqPath, target);
      await node.files.rm(`/${path.join(homeDirPath, targetPath)}`, { recursive: true });
    }
  } catch (err) {
    throw err;
  }

  // クライアントが使うホームディレクトリのCIDを取得。
  const homeCid = (await node.files.stat(`/${homeDirPath}`)).cid.toString();
  // データベースの更新。
  const db = operateSqlite3.open();
  db.prepare("UPDATE users SET home_cid = ? WHERE id = ?").run(homeCid, userID);
  db.close();

  res.status(200).end();
})

// /user/{ユーザID}/decrypt/text への POST処理。
// 暗号化文字列の復号化用。
router.post("/:id/decrypt/text", (req, res) => {
  const userID = req.params.id;
  const password = req.body["password"];
  const text = req.body["text"];

  const db = operateSqlite3.open();
  // データベースから salt と iv を取得。
  const dbData = db.prepare("SELECT salt, iv FROM users WHERE id = ?").get(userID);
  db.close();

  // salt、iv、key の設定。
  const salt = Buffer.from(dbData["salt"], "hex");
  const iv = Buffer.from(dbData["iv"], "hex");
  const key = crypto.scryptSync(password, salt, 32);

  // 文字列の復号化。
  const decryptedString = doCrypto.decryptString(cryptoAlgorithm, text, key, iv);

  // Json 形式で応答。
  res.json({ text: decryptedString });
});

// /user/{ユーザID}/decrypt/file への POST処理。
// 暗号化ファイルの復号化用。
router.post("/:id/decrypt/file", async (req, res) => {
  const userID = req.params.id;
  const password = req.body["password"];
  const cid = req.body["cid"];

  const db = operateSqlite3.open();
  // データベースから salt と iv を取得。
  const dbData = db.prepare("SELECT salt, iv FROM users WHERE id = ?").get(userID);
  db.close();

  // salt、iv、key の設定。
  const salt = Buffer.from(dbData["salt"], "hex");
  const iv = Buffer.from(dbData["iv"], "hex");
  const key = crypto.scryptSync(password, salt, 32);

  // 暗号化されたファイルのバイナリ
  const encryptedBuffer = uint8ArrayConcat(await all(node.cat(cid)));

  // ファイルの復号化。
  const fileBuffer = doCrypto.decryptFile(cryptoAlgorithm, new Uint8Array(encryptedBuffer), key, iv);

  let type = await fileType.fileTypeFromBuffer(fileBuffer);
  if (!type) {
    type = { ext: "text", mime: "text/plain" };
  }

  const dlstream = new stream.PassThrough();
  dlstream.end(Buffer.from(fileBuffer));

  const header = {
    "Content-Disposition": `attachment; filename=${cid}.${type.ext}`,
    "Content-Length": fileBuffer.length,
    "Content-Type": type.mime ? type.mime : "text/plain"
  }

  res.writeHead(200, header);
  dlstream.pipe(res);
});

export default router;
