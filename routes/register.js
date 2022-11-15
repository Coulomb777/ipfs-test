import { Router } from 'express';
import crypto from 'crypto';

import * as doCrypto from '../src/lib/do-crypto/index.mjs';
import * as stringValidation from '../src/lib/string-validation/index.mjs';
import * as operateSqlite3 from '../src/lib/operate-sqlite3/index.mjs';
import { node } from '../app.js';

const router = Router();
const cryptoAlgorithm = 'aes-256-cbc';

// /register への GET処理。
router.get('/', (req, res) => {
    // 登録画面。
    res.render('register');
});

// /register への POST 処理。
router.post('/', (req, res) => {
    const userID = req.body['user-id'];
    // ユーザの存在確認。
    const userCount = operateSqlite3.getCount('user', `WHERE id='${userID}'`);
    if (userCount > 0) { // ユーザが存在。
        // ログイン画面。
       return res.render('login', { id: userID, invalidInput: false });
    }
    // /register/confirm に POST情報をもってリダイレクト。
    res.redirect(307, '/register/confirm');
});

// /register/confirm への GET処理。
router.get('/confirm', (req, res) => {
    // 登録画面。
    res.redirect('/register');
});

// /register/confirm への POST処理。
router.post('/confirm', async (req, res) => {
    const formData = [
        req.body['user-id'],
        req.body['password']
    ];
    // formのidとpasswordの形式確認。
    let isCorrect = false;
    for await (let flag of formData.map(element =>
        stringValidation.isCorrectForm(element)
    )) isCorrect = flag;

    if (isCorrect) {
        // 登録確認画面。
        return res.render('registerConfirm',
            { userID: formData[0], password: formData[1] }
        );
    }
    // /register にリダイレクト。
    res.redirect('/register');
});

// /register への GET処理。
router.get('/processing', (req, res) => {
    // 登録画面。
    res.redirect('/register');
});

// /register/processin への POST処理。
router.post('/processing', async (req, res) => {
    const formData = [
        req.body['user-id'],
        req.body['password']
    ];
    // formのidとpasswordの形式確認。
    let isCorrect = false;
    for await (let flag of formData.map(element =>
        stringValidation.isCorrectForm(element)
    )) isCorrect = flag;
    // ユーザの存在確認。
    const userCount = operateSqlite3.getCount('user', `WHERE id='${formData[0]}'`);
    isCorrect = (isCorrect && userCount == 0);

    if (!isCorrect) { // formの形式が不正か、ユーザがすでに存在するとき。
        // /register にリダイレクト
        return res.redirect('/register')
    }

    let salt;
    while (true) { // ソルトの生成。
        salt = crypto.randomBytes(16);
        // salt の重複確認。
        let saltCount = operateSqlite3.getCount('user', `WHERE salt='${salt.toString('base64')}'`);
        // 重複してないものを使う。
        if (saltCount == 0) break;
    }
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(formData[1], salt, 32);
    // 文字列 'home' を暗号化。
    const encryptedHomeName = doCrypto.encryptString(cryptoAlgorithm, 'home', key, iv);
    console.log(`/${formData[0]}/${encryptedHomeName}`);

    // サーバ側のIPFSノードにホームディレクトリとそれを参照するためのディレクトリを追加。
    await node.files.mkdir(`/${formData[0]}/${encryptedHomeName}`, { parents: true });
    // homeCid: クライアント側のホームディレクトリのCIDを取得。
    const homeCid = (await node.files.stat(`/${formData[0]}/${encryptedHomeName}`)).cid.toString();
    // データベースにユーザ情報を保存。
    operateSqlite3.insertData('user', formData[0], homeCid, salt.toString('base64'), iv.toString('base64'));
    // セッション情報をリセットし、ログイン画面にリダイレクト。
    req.session.user = null;
    res.redirect('/login')
});

export default router;