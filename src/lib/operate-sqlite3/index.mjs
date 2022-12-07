import sqlite3 from "better-sqlite3";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = `${__dirname}/database.db`;

/**
 * データベース作成。
 */
export function createDB() {
    // データベースがなければ作る。
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, "", (err) => {
            if (err) console.log(`cannot create ${dbPath}`);
        });
        console.log(`create ${dbPath}`);
    } 
}

/**
 * 開いたデータベースを返す。
 * @param {*} statement 
 * @return 
 */
export function open() {
    try {
        const db = new sqlite3(dbPath, {verbose: console.log()});
        return db;
    } catch (err) {
        throw err;
    }
}
