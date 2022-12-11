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
  req.session.touch();
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

  const contents = new Array();

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
  const homeDirPath = path.join(userID, "home", (await last(node.files.ls(`/${path.join(userID, "home")}`))).name);
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
  const readStream = fs.createReadStream(req.file.path);
  // IPFSノードにファイルに暗号化して追加。
  await node.files.write(`/${absFilePath}`, readStream.pipe(cipher), { create: true });
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
  const homeDirPath =  path.join(userID, "home", (await last(node.files.ls(`/${path.join(userID, "home")}`))).name);
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

// /user/{ユーザID}/rmFiles への POST 処理。
// コンテンツの削除。
router.post("/:id/rmFiles", async (req, res) => {
  const userID = req.params.id;
  const reqPath = req.body["path"];
  const targetFiles = req.body["target_files"];

  if (reqPath !== "share") {
    // ホームディレクトリのパス
    const homeDirPath =  path.join(userID, "home", (await last(node.files.ls(`/${path.join(userID, "home")}`))).name);

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
  } else { // 共有ディレクトリからの削除。
    for (const target of targetFiles) {
      await node.files.rm(`/${path.join(userID, "shareKey", `.${target}`)}`, { recursive: true });
      await node.files.rm(`/${path.join(userID, "share", `${target}`)}`, { recursive: true });
    }
  }

  res.status(200).end();
});

// /user/{ユーザID}/share への GET 処理。
// {ユーザID}のユーザに共有されているファイルを表示するための処理。
router.get("/:id/share", async (req, res) => {
  const userID = req.params.id;

  const contents = new Array();

  for await (const content of node.files.ls(`/${path.join(userID, "share")}`)) {
      contents.push({ content: content, cid: content.cid.toString() });
  }

  res.render("share", {
    id: userID,
    data: {
      contents: contents
    }
  });
});

// /user/{ユーザID}/share への POST 処理。
// ファイル共有処理を行う。
router.post("/:id/share", async (req, res) => {
  const userID = req.params.id;
  const targetID = req.body["target-id"];
  const password = req.body["password"];
  const cid = req.body["cid"];
  const contentName = req.body["content-name"];

  const db = operateSqlite3.open();
  // トランザクションの開始。
  db.prepare("BEGIN").run();
  // データベースから salt と iv を取得。
  const dbData = db.prepare("SELECT salt, iv FROM users WHERE id = ?").get(userID);
  const dbTargetData = db.prepare("SELECT publick_key FROM users WHERE id = ?").get(targetID);
  // トランザクションの終了。
  db.prepare("COMMIT").run();
  db.close();

  // salt、iv、key の設定。
  const salt = Buffer.from(dbData["salt"], "hex");
  const iv = Buffer.from(dbData["iv"], "hex");
  const key = crypto.scryptSync(password, salt, 32);

  // ファイル名の復号化。
  const fileName = doCrypto.decryptString(cryptoAlgorithm, contentName, key, iv);

  // 暗号化されたファイルのバイナリ
  const encryptedBuffer = uint8ArrayConcat(await all(node.cat(cid)));

  // ファイルの復号化。
  const fileBuffer = doCrypto.decryptFile(cryptoAlgorithm, new Uint8Array(encryptedBuffer), key, iv);

  // 共有用の鍵を作成。
  const shareSalt = crypto.randomBytes(16);
  const shareIv = crypto.randomBytes(16);
  const shareKey = crypto.scryptSync(crypto.randomBytes(32), shareSalt, 32);

  // 暗号器
  const cipher = crypto.createCipheriv(cryptoAlgorithm, shareKey, shareIv);

  // 共有用にファイル名の暗号化。
  const encryptedName = doCrypto.encryptString(cryptoAlgorithm, fileName, shareKey, shareIv);

  const readStream = new stream.PassThrough();
  readStream.end(Buffer.from(fileBuffer));
  
  // 相手の共有ディレクトリにファイルを暗号化して追加。
  await node.files.write(`/${path.join(targetID, "share", encryptedName)}`, readStream.pipe(cipher), { create: true });

  // コンテンツの共有状況の情報。
  let contentInfo;
  try { // コンテンツの共有状況の情報がすでにあればそれを使う。
    const encryptedInfo = Buffer.from(uint8ArrayConcat(
      await all(node.files.read(`/${path.join(userID, "sharedFile", `.${contentName}`)}`))
    )).toString();
    const contentInfoJsonString = doCrypto.decryptString(cryptoAlgorithm, encryptedInfo, key, iv);
    contentInfo = JSON.parse(contentInfoJsonString);
    // 更新のために、情報を手に入れたら削除。
    await node.files.rm(`/${path.join(userID, "sharedFile", `.${contentName}`)}`);

    const currentSharedName = contentInfo[contentName][targetID].sharedName;
    if (currentSharedName) { // 相手にこのコンテンツを共有したことがある場合。
      try {
        // 過去の共有情報は削除。
        await node.files.rm(`/${path.join(targetID, "shareKey", `.${currentSharedName}`)}`);
        await node.files.rm(`/${path.join(targetID, "share", `${currentSharedName}`)}`);
      } catch (err) { // 相手側でコンテンツが共有ディレクトリから削除されている場合。
        // 例外をキャッチしてこのコンテンツの共有状況の情報が初期化されるのを防ぐ。
      }
    }
  } catch (err) { // なければ作る（このコンテンツの共有状況の初期化）。
    console.log(err);
    contentInfo = {};
    contentInfo[contentName] = {};
  }

  /**
   contentInfo = {
      |コンテンツ 1 の暗号化名|: {
        |共有相手のID 1|: { sharedName:共有先でのコンテンツ暗号化名 },
        |共有相手のID 2|: ...,
        ...,
        |共有相手のID n|: ...
      },
      |コンテンツ 2 の暗号化名|: ...,
      ...,
      |コンテンツ n の暗号化名|: ...
   }
   */
  contentInfo[contentName][targetID] = {
    sharedName: encryptedName
  }

  // 暗号化。
  const newEncryptedInfo = doCrypto.encryptString(cryptoAlgorithm, JSON.stringify(contentInfo), key, iv);
  // コンテンツの共有状況の情報を保存。
  await node.files.write(`/${path.join(userID, "sharedFile", `.${contentName}`)}`, Buffer.from(newEncryptedInfo), { create: true });

  // 共有相手が共有コンテンツを復号化するための情報。
  const shareContentInfo = {
    shareKey: shareKey.toString("hex"),
    shareIv: shareIv.toString("hex"),
    from: userID
  }
  // 共有相手の公開鍵で暗号化。
  const encryptedShareContentInfo = crypto.publicEncrypt(
    {
      key: dbTargetData["publick_key"],
      padding: crypto.constants.RSA_PKCS1_PADDING
    },
    Buffer.from(JSON.stringify(shareContentInfo))
  );

  // 保存。
  await node.files.write(`/${path.join(targetID, "shareKey", `.${encryptedName}`)}`, encryptedShareContentInfo, { create: true });

  res.status(200).end();
});

router.get("/:id/share/files/:cid", (req, res) => {
  const contentName = req.query.name;
  if (!contentName) throw new Error("500");
  res.render("shareFile", { id: req.params.id, cid: req.params.cid, contentName: contentName });
});

router.get("/:id/share/download/:cid", (req, res) => {
  const contentName = req.query.name;
  if (!contentName) throw new Error("500");
  res.render("shareDownload", { id: req.params.id, cid: req.params.cid, contentName: contentName });
});

// /user/{ユーザID}/decrypt/text への POST処理。
// 暗号化文字列の復号化用。
router.post("/:id/decrypt/text", async (req, res) => {
  const userID = req.params.id;
  const password = req.body["password"];
  const text = req.body["text"];
  const ownership = req.body["ownership"];

  const db = operateSqlite3.open();
  // データベースから salt と iv、 秘密鍵 を取得。
  const dbData = db.prepare("SELECT salt, iv, encrypted_private_key FROM users WHERE id = ?").get(userID);
  db.close();

  // salt、iv、key の設定。
  const salt = Buffer.from(dbData["salt"], "hex");
  const iv = Buffer.from(dbData["iv"], "hex");
  const key = crypto.scryptSync(password, salt, 32);

  let decryptedString, from = "";
  if (ownership) { // 自身のコンテンツに対して。
    // 文字列の復号化。
    decryptedString = doCrypto.decryptString(cryptoAlgorithm, text, key, iv);
  } else { // 共有コンテンツに対して。
    // 秘密鍵の復号化。
    const privateKey = doCrypto.decryptString(
      cryptoAlgorithm, dbData["encrypted_private_key"], key, iv
    );
    // 共有コンテンツの復号化用情報を取得。
    const encryptedShareContentInfo = uint8ArrayConcat(
      await all(node.files.read(`/${path.join(userID, "shareKey", `.${text}`)}`))
    );
    const shareContentInfo = JSON.parse(
      crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_PADDING
        },
        Buffer.from(encryptedShareContentInfo)
      ).toString("utf-8")
    );

    const shareKey = Buffer.from(shareContentInfo.shareKey, "hex");
    const shareIv = Buffer.from(shareContentInfo.shareIv, "hex");
    from = shareContentInfo.from;

    // 文字列の復号化。
    decryptedString = doCrypto.decryptString(cryptoAlgorithm, text, shareKey, shareIv);
  }

  // Json 形式で応答。
  res.json({ text: decryptedString, from: from });
});

// /user/{ユーザID}/decrypt/file への POST処理。
// 暗号化ファイルの復号化用。
router.post("/:id/decrypt/file", async (req, res) => {
  const userID = req.params.id;
  const password = req.body["password"];
  const cid = req.body["cid"];
  const ownership = req.body["ownership"];

  const db = operateSqlite3.open();
  // データベースから salt と iv、 秘密鍵 を取得。
  const dbData = db.prepare("SELECT salt, iv, encrypted_private_key FROM users WHERE id = ?").get(userID);
  db.close();

  // salt、iv、key の設定。
  const salt = Buffer.from(dbData["salt"], "hex");
  const iv = Buffer.from(dbData["iv"], "hex");
  const key = crypto.scryptSync(password, salt, 32);

  // 暗号化されたファイルのバイナリ
  const encryptedBuffer = uint8ArrayConcat(await all(node.cat(cid)));

  let fileBuffer, type;
  if (ownership) { // 自身のコンテンツに対して。
    console.log("true")
    // ファイルの復号化。
    fileBuffer = doCrypto.decryptFile(cryptoAlgorithm, new Uint8Array(encryptedBuffer), key, iv);

    type = await fileType.fileTypeFromBuffer(fileBuffer);
  } else { // 共有コンテンツに対して。
    const contentName = req.body["contentName"];

    // 秘密鍵の復号化。
    const privateKey = doCrypto.decryptString(
      cryptoAlgorithm, dbData["encrypted_private_key"], key, iv
    );
    console.log(`/${path.join(userID, "shareKey", `.${contentName}`)}`)
    // 共有コンテンツの復号化用情報を取得。
    const encryptedShareContentInfo = uint8ArrayConcat(
      await all(node.files.read(`/${path.join(userID, "shareKey", `.${contentName}`)}`))
    );
    const shareContentInfo = JSON.parse(
      crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_PADDING
        },
        Buffer.from(encryptedShareContentInfo)
      ).toString("utf-8")
    );

    const shareKey = Buffer.from(shareContentInfo.shareKey, "hex");
    const shareIv = Buffer.from(shareContentInfo.shareIv, "hex");

    // ファイルの復号化。
    fileBuffer = doCrypto.decryptFile(cryptoAlgorithm, new Uint8Array(encryptedBuffer), shareKey, shareIv);

    type = await fileType.fileTypeFromBuffer(fileBuffer);
  }

  if (!type) {
    type = { ext: "text", mime: "text/plain" };
  }

  const readStream = new stream.PassThrough();
  readStream.end(Buffer.from(fileBuffer));

  const header = {
    "Content-Disposition": `attachment; filename=${cid}.${type.ext}`,
    "Content-Length": fileBuffer.length,
    "Content-Type": type.mime ? type.mime : "text/plain"
  }

  res.writeHead(200, header);
  readStream.pipe(res);
});

// /user/search/{検索ID} への GET 処理。
// 検索IDから始まるユーザIDに一致するユーザを検索。
router.post("/search", (req, res) => {
  const target = req.body["target"];

  const db = operateSqlite3.open();
  const dbData = db.prepare("SELECT id FROM users WHERE id LIKE ?").all(`${target}%`);
  db.close();

  const users = new Array();
  for (const row of dbData) {
    users.push(row["id"]);
  }

  res.json({ users: users });
});

export default router;
