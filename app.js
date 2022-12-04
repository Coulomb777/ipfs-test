import createError from 'http-errors';
import express from 'express';
import "express-async-errors";
import session from 'express-session';
import sqlite3 from 'better-sqlite3';
import connectSqlite3 from 'better-sqlite3-session-store';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import logger from 'morgan';
import * as ipfsDaemon from 'ipfs-daemon'

import indexRouter from './routes/index.js';
import loginRouter from './routes/login.js';
import registerRouter from './routes/register.js';
import userRouter from './routes/user.js';

import * as operateSqlite3 from './src/lib/operate-sqlite3/index.mjs';
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sessionStore = connectSqlite3(session);
const daemon = new ipfsDaemon.Daemon({ repo: `${__dirname}/ipfs/` });
await daemon.start();
export const node = daemon._ipfs;
operateSqlite3.createDB();
operateSqlite3.createTable(
  'user',                             // テーブル名。
  'id PRIMARY KEY',                   // ユーザID。
  'home_cid STRING',                  // ホームディレクトリのCID。
  'encrypt_key_fs STRING',            // 共有コンテンツ暗号化キー。
  'encrypted_decrypt_key_fs STRING',  // 共有コンテンツ復号化キー（暗号化済み）。
  'salt STRING UNIQUE',               // ソルト。
  'iv STRING'                         // 初期化ベクトル。
);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'QdxfZirx8NknNeCU-W3xg9ad4tsc8EQsR-T98KeLmxJLTeBdxnQAwk4QJKtDxNxg',
  cookie: { maxAge: 60 * 60 * 1000 },
  resave: false,
  saveUninitialized: false,
  store: new sessionStore({
    client: new sqlite3('sessions.db')
  })
}));

app.use('/', indexRouter);
app.use('/login/', loginRouter);
app.use('/register/', registerRouter);
app.use('/user/', userRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  console.log(err.message);
  // render the error page
  res.status(err.status || 500);
  res.render('error', { status: err.status, message: err.message});
});

export default app;