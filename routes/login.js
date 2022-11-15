import { Router } from 'express';
import last from 'it-last';
import crypto from 'crypto';

import * as doCrypto from '../src/lib/do-crypto/index.mjs';
import * as stringValidation from '../src/lib/string-validation/index.mjs';
import * as operateSqlite3 from '../src/lib/operate-sqlite3/index.mjs';
import { node } from '../app.js';

const router = Router();
const cryptoAlgorithm = 'aes-256-cbc';

// /login への GET処理。
router.get('/', (req, res) => {
    if (req.session.user) { // セッションが存在。
        // /user/{ユーザid} にリダイレクト。
        return res.redirect(`/user/${req.session.user}`);
    }
    // ログイン画面。
    res.render('login', { id: '', invalidInput: false });
});

// /login への POST処理
router.post('/', async (req, res) => {
    const formData = [
        req.body['user-id'],
        req.body['password']
    ];
    // formのidとpasswordの形式確認。
    let isCorrect = false;
    for await (let flag of formData.map(element => 
        stringValidation.isCorrectForm(element)
    )) isCorrect = flag;

    if (!isCorrect) { // 不正な形式。
        return res.render('login', { id: '', invalidInput: true });
    }

    // ユーザの存在確認。
    const countUserID = operateSqlite3.getCount('user', `WHERE id='${formData[0]}'`);
    if (countUserID == 0) { // ユーザがいない。
        // 登録画面。
        return res.redirect('/register');
    }

    // データベースからid に対する iv, salt を取得。
    const dbData = operateSqlite3.getData('user', `WHERE id='${formData[0]}'`, 'salt', 'iv');
    let encryptedHomeDir;

    try { // idからホームディレクトリ情報を取得。
        encryptedHomeDir = await last(node.files.ls(`/${formData[0]}`, { timeout: 30000 }));
    } catch (err) {
        throw err;
    }

    try { // 復号化による認証。
        const salt = Buffer.from(dbData['salt'], 'base64');
        const iv = Buffer.from(dbData['iv'], 'base64');
        const key = crypto.scryptSync(formData[1], salt, 32);
        // 復号化。
        doCrypto.decryptString(cryptoAlgorithm, encryptedHomeDir.name, key, iv);
        // セッション情報にidを記録。
        req.session.user = formData[0];
        // /user/{id} にリダイレクト。
        res.redirect(`/user/${formData[0]}`);
    } catch (err) { // パスワードが違う。
        // ログイン画面に戻る。
        console.log('invalid password');
        res.render('login', { id: formData[0], invalidInput: true });
    }
});

export default router;