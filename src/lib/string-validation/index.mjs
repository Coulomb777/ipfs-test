/**
 * 半角英数記号チェック
 * @param {string} str 
 * @returns {boolean} 
 */
function isAscii(str) {
    str = (str === null) ? "" : str;
    if (str.match(/^[\x20-\x7e]+$/)) return true;
    else return false;
}

/**
 * 文字列が前後に空白がない半角英数記号かを確認。
 * @param {string} str 
 * @returns {boolean}
 */
export function isCorrectForm(str) {
    str = (str === null || str === undefined) ? "" : str;
    if (str.startsWith(" ") || str.endsWith(" ") || !isAscii(str)) {
        return false;
    }
    return true;
}