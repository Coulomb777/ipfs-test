import crypto from 'crypto';

/**
 * ファイル暗号化
 * @param {string} algorithm 
 * @param {crypto.BinaryLike} buffer 
 * @param {crypto.CipherKey} key 
 * @param {crypto.BinaryLike | null} iv 
 * @returns {Buffer}
 */
export function encryptFile(algorithm, buffer, key, iv) {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return encrypted;
};

/**
 * ファイル復号化
 * @param {string} algorithm 
 * @param {crypto.BinaryLike} buffer 
 * @param {crypto.CipherKey} key 
 * @param {crypto.BinaryLike | null} iv 
 * @returns {Buffer}
 */
export function decryptFile(algorithm, buffer, key, iv) {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    const decrypted = Buffer.concat([decipher.update(buffer), decipher.final()]);
    return decrypted;
};

/**
 * 文字列暗号化
 * @param {string} algorithm 
 * @param {string} string 
 * @param {crypto.CipherKey} key 
 * @param {crypto.BinaryLike | null} iv 
 * @returns {string}
 */
export function encryptString(algorithm, str, key, iv) {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const encrypted = cipher.update(str, 'utf8', 'hex') + cipher.final('hex');
    return encrypted;
};

/**
 * 文字列復号化
 * @param {string} algorithm 
 * @param {string} string 
 * @param {crypto.CipherKey} key 
 * @param {crypto.BinaryLike | null} iv 
 * @returns {string}
 */
export function decryptString(algorithm, str, key, iv) {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    const decrypted = decipher.update(str, 'hex', 'utf8') + decipher.final('utf8');
    return decrypted;
};