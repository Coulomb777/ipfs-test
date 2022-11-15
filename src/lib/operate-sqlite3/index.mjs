import sqlite3 from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = `${__dirname}/database.db`;

/**
 * データベース作成。
 */
export function createDB() {
    console.log(dbPath);
    // データベースがなければ作る。
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, "", (err) => {
            if (err) console.log(`cannot create ${dbPath}`);
        });
        console.log(`create ${dbPath}`);
    } 
}

/**
 * テーブル作成。
 * @param {string} tableName 
 * @param  {string[]} columns 
 */
export function createTable(tableName, ...columns) {
    try {
        const db = new sqlite3(dbPath);

        // テーブルの存在確認。(個数取得)
        let stmt = "SELECT COUNT(*) FROM sqlite_master "
            + "WHERE TYPE='table' "
            + `AND name='${tableName}';`;
        console.log(stmt);
        let result = db.prepare(stmt).get();
        let count = result['COUNT(*)'];
        console.log(`COUNT(*): ${count}`);
        
        // テーブルがなければ作る。
        if (count == 0) {
            stmt = `CREATE TABLE ${tableName}(`;
            for (let i = 0; i < columns.length; i++) {
                // 列の決定。
                stmt += `${columns[i]}`
                if (i != columns.length - 1) stmt += ', ';
            }
            stmt += ");";
            // stmt = CREATE TABLE {tableName}({column1, column2, ...});
            console.log(stmt);
            // 実行。
            db.prepare(stmt).run();
        }
        db.close();
    } catch (err) {
        throw err;
    }
}

/**
 * テーブルにデータ挿入。
 * @param {string} tableName 
 * @param  {string[] | number[]} data 
 */
export function insertData(tableName, ...data) {
    try {
        const db = new sqlite3(dbPath);

        let stmt = `INSERT INTO ${tableName} VALUES(`
        for (let i = 0; i < data.length; i++) {
            // データの決定。
            stmt += `'${data[i]}'`
            if (i != data.length - 1) stmt += ',';
            stmt += ' ';
        }
        stmt += ");";
        // stmt = INSERT INTO {tableName} VALUES({data1, data2, ...});
        console.log(stmt);
        // 実行。
        db.prepare(stmt).run();
        db.close();
    } catch (err) {
        throw err;
    }
}

/**
 * テーブル内で条件にあうデータの個数を取得。
 * @param {string} tableName 
 * @param {string} condition ex) WHERE [] = {}
 * @returns {number}
 */
export function getCount(tableName, condition) {
    try {
        const db = new sqlite3(dbPath);

        let stmt = `SELECT COUNT(*) FROM ${tableName} ${condition};`;
        let result = db.prepare(stmt).get();
        let count = result['COUNT(*)'];

        db.close();
        return count > 0;
    } catch (err) {
        throw err;
    }
}

/**
 * テーブル内で条件にあうレコードから列を指定して取得。
 * @param {string} tableName 
 * @param {string} condition 
 * @param  {string[]} columns 
 * @returns {any}
 */
export function getData(tableName, condition, ...columns) {
    try {
        const db = new sqlite3(dbPath);

        let stmt = "SELECT ";
        for (let i = 0; i < columns.length; i++) {
            // 列の決定。
            stmt += `${columns[i]}`
            if (i != columns.length - 1) stmt += ',';
            stmt += ' ';
        }
        stmt += `FROM ${tableName} ${condition};`
        // stmt = SELECT {column1, column2, ...} FROM {tableName} {condition};
        console.log(stmt);
        // 実行・取得。
        let result = db.prepare(stmt).get();
        db.close();
        return result;
    } catch (err) {
        throw err;
    }
}

/**
 * テーブル内で条件にあうレコードの指定列を指定値で更新。
 * @param {*} tableName 
 * @param {*} conditon 
 * @param {*} columnsArray 
 * @param {*} valuesArray 
 */
export function update(tableName, conditon, columnsArray, valuesArray) {
    try {
        const db = new sqlite3(dbPath);

        let stmt = `UPDATE ${tableName} SET `;
        for (let i = 0; i < columnsArray.length; i++) {
            // {column}={value} を追加。
            stmt += `${columnsArray[i]}='${valuesArray[i]}'`
            if (i != columnsArray.length - 1) stmt += ',';
            stmt += ' ';
        }
        stmt += `${conditon};`;
        // stmt = UPDATE {tableName} SET {式1, 式2, ...} {condition};
        console.log(stmt);
        // 実行。
        db.prepare(stmt).run();
        db.close();
    } catch (err) {
        throw err;
    }
}