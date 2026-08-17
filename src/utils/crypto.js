/**
 * 前端加密工具
 * -----------------------------------------------------------------------------
 * 目的：在登录/注册接口中对 password 进行加密，防止明文在网络中裸传
 * 算法：XOR 流加密 + Hex 编码
 * 注意：密钥仅防嗅探，非军用级安全
 */

const SECRET_KEY = 'X1a7b9c3d5e8f2g4';

function strToHex(str) {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    hex += code.toString(16).padStart(4, '0');
  }
  return hex;
}

function hexToStr(hex) {
  let str = '';
  for (let i = 0; i < hex.length; i += 4) {
    const code = parseInt(hex.substr(i, 4), 16);
    str += String.fromCharCode(code);
  }
  return str;
}

/**
 * 加密明文密码
 * @param {string} plaintext
 * @returns {string} hex 密文
 */
export function encryptPassword(plaintext) {
  if (!plaintext) return '';
  const key = SECRET_KEY;
  let encrypted = '';
  for (let i = 0; i < plaintext.length; i++) {
    encrypted += String.fromCharCode(plaintext.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return strToHex(encrypted);
}

/**
 * 解密密文密码
 * @param {string} ciphertext - hex 密文
 * @returns {string}
 */
export function decryptPassword(ciphertext) {
  if (!ciphertext) return '';
  const key = SECRET_KEY;
  const decoded = hexToStr(ciphertext);
  let decrypted = '';
  for (let i = 0; i < decoded.length; i++) {
    decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return decrypted;
}
