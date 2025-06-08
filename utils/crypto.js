const crypto = require('crypto');

// Convert string key to 16 bytes
const ENCRYPTION_KEY = crypto.scryptSync('ae1ab64620c54', 'salt', 16);
const IV_LENGTH = 12;

function encrypt(text) {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-128-gcm', ENCRYPTION_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Return IV:AuthTag:CipherText
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (err) {
    console.error('Encryption error:', err);
    return text; // Return original text if encryption fails
  }
}

function decrypt(encryptedText) {
  try {
    const [ivHex, authTagHex, encryptedHex] = encryptedText.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-128-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'binary', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (err) {
    console.error('Decryption error:', err);
    return encryptedText; // Return original text if decryption fails
  }
}

module.exports = {
  encrypt,
  decrypt
};