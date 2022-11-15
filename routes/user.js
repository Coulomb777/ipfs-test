import { Router } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import fs from 'fs-extra';
import multer from 'multer';
import Iconv from 'iconv-lite';

import * as operateSqlite3 from '../src/lib/operate-sqlite3/index.mjs'; 
import * as doCrypto from '../src/lib/do-crypto/index.mjs';
import { node } from '../app.js';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cryptoAlgorithm = 'aes-256-cbc';
const upload = multer({ dest: `${__dirname}/tmp/` });

// /user への GET 処理。
router.get('/', (req, res) => {
  if (req.session.user) { // セッションが存在。
    // /user/{id} にリダイレクト。
    return res.redirect(`/user/${req.session.user}`);
  }
  // /login にリダイレクト。
  res.redirect('/login');
});

// /user/{ユーザID} への GET処理。
router.get('/:id', (req, res) => {
  if (req.session.user) { // セッションが存在。
    const userID = req.params.id;
    // id からhomeCidを取得。
    const dbData = operateSqlite3.getData('user', `WHERE id='${userID}'`, 'home_cid');
    const homeCid = dbData['home_cid'];
    // ユーザ画面。
    return res.render('user', { id: userID, home_cid: homeCid, cid: "home" });
  }

  // /login にリダイレクト
  res.redirect('/login');
});

router.get('/:id/files/:cid', (req, res) => {
  res.render('download', { id: req.params.id, cid: req.params.cid });
});

// /user/{ユーザID}/upload への POST 処理。
// ファイルのアップロードに対する処理。
router.post('/:id/upload', upload.single('file'), async (req, res) => {
  const userID = req.params.id;
  const password = req.body['password'];
  const allPath = (req.body['path'] == '') ? '' : req.body['path'].slice(1);
  let fileName = req.file.originalname;
  
  // ユーザの存在確認。
  const countUserID = operateSqlite3.getCount('user', `WHERE id='${userID}'`);
  if (countUserID == 0) {
    return res.statusCode(400).send('Bad request');
  }

  // データベースから salt と iv を取得。
  const dbData = operateSqlite3.getData('user', `WHERE id='${userID}'`, 'salt', 'iv');
  
  // salt、iv、key の設定。
  const salt = Buffer.from(dbData['salt'], 'base64');
  const iv = Buffer.from(dbData['iv'], 'base64');
  const key = crypto.scryptSync(password, salt, 32);

  console.log(fileName);

  // ファイル読み込み。
  const buff = fs.readFileSync(req.file.path);
  // ファイルの暗号化。
  const encryptedFile = doCrypto.encryptFile(cryptoAlgorithm, buff, key, iv);
  // ファイル名の暗号化。
  const encryptedName = doCrypto.encryptString(cryptoAlgorithm, fileName, key, iv);
  // 元ファイルの削除。
  await fs.unlink(req.file.path);

  // パスから各ディレクトリ名の配列を取得。
  const Dirs = allPath.split('/');
  // パスを暗号化名に変える。
  let encryptedDirs = [];
  if (Dirs[0] == '') { // パスがホームディレクトリの場合。
    encryptedDirs.push('');
  } else {
    // encryptedDirs の各要素を暗号化後のディレクトリ名にする。
    Dirs.forEach(dir => {
      encryptedDirs.push(
        doCrypto.encryptString(cryptoAlgorithm, dir, key, iv)
      );
    });
  }

  // 暗号化後のパスを作成。
  const joinDirs = path.posix.join(...encryptedDirs);
  const encryptedAllPath = (joinDirs == '.') ? '' : joinDirs;

  // Json 形式で応答。
  res.json({
    file: {
      name: encryptedName,
      path: encryptedAllPath,
      buff: new Array(encryptedFile)
    }
  });

  // サーバ側のパス。
  const encryptedHomeName = doCrypto.encryptString(cryptoAlgorithm, 'home', key, iv);
  const serverPath = `/${userID}/${encryptedHomeName}/${encryptedAllPath}/${encryptedName}`;

  let stat, isExist = true;
  try { // ファイルの存在確認。
    stat = await node.files.stat(serverPath);
  } catch (err) { // 存在しない場合。
    isExist = false;
  }
  if (isExist) { // 存在していたらファイルを削除。
    await node.files.rm(serverPath);
  }
  // サーバ側のIPFSノードにファイルの追加。
  await node.files.write(serverPath, new Uint8Array(encryptedFile), { create: true });
  // クライアント側のホームディレクトリCIDを取得。
  const homeCid = (await node.files.stat(`/${userID}/${encryptedHomeName}`)).cid.toString();
  // データベースの更新。
  operateSqlite3.update('user', `WHERE id='${userID}'`, ["home_cid"], [homeCid]);
});

// /user/{ユーザID}/decrypt/text への POST処理。
// 暗号化文字列の復号化用。
router.post('/:id/decrypt/text', (req, res) => {
  const userID = req.params.id;
  const password = req.body['password'];
  const text = req.body['text'];
  
  // ユーザの存在確認。
  const countUserID = operateSqlite3.getCount('user', `WHERE id='${userID}'`);
  if (countUserID == 0) {
    return res.statusCode(400).send('Bad request');
  }

  // データベースから salt と iv を取得。
  const dbData = operateSqlite3.getData('user', `WHERE id='${userID}'`, 'salt', 'iv');
  
  // salt、iv、key の設定。
  const salt = Buffer.from(dbData['salt'], 'base64');
  const iv = Buffer.from(dbData['iv'], 'base64');
  const key = crypto.scryptSync(password, salt, 32);

  // 文字列の復号化。
  const encryptedString = doCrypto.decryptString(cryptoAlgorithm, text, key, iv);

  // Json 形式で応答。
  res.json({ text: encryptedString });
});

// /user/{ユーザID}/decrypt/file への POST処理。
// 暗号化ファイルの復号化用。
router.post('/:id/decrypt/file', (req, res) => {
  const userID = req.params.id;
  const password = req.body['password'];
  const encryptedBuffer = req.body['buffer'];
  // Json to array
  let encryptedBufferArray = new Array();
  for (let key in encryptedBuffer) {
    encryptedBufferArray.push(encryptedBuffer[key]);
  }

  // ユーザの存在確認。
  const countUserID = operateSqlite3.getCount('user', `WHERE id='${userID}'`);
  if (countUserID == 0) {
    return res.statusCode(400).send('Bad request');
  }

  // データベースから salt と iv を取得。
  const dbData = operateSqlite3.getData('user', `WHERE id='${userID}'`, 'salt', 'iv');
  
  // salt、iv、key の設定。
  const salt = Buffer.from(dbData['salt'], 'base64');
  const iv = Buffer.from(dbData['iv'], 'base64');
  const key = crypto.scryptSync(password, salt, 32);
  
  // ファイルの復号化。
  const fileBuffer = doCrypto.decryptFile(cryptoAlgorithm, new Uint8Array(encryptedBufferArray), key, iv);

  // Json 形式で応答。
  res.json({ fileBuffer: fileBuffer});

});

export default router;
