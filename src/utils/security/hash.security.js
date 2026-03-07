import bcrypt from 'bcrypt'
import CryptoJS from "crypto-js"


//// bcrypt hash
export const generateHash = ({ plainText = "", salt = process.env.SALT } = {}) => {
    const hash = bcrypt.hashSync(plainText, parseInt(salt))
    return hash
}
export const compareHash = ({ plainText = "", hashValue = "" } = {}) => {
    const match = bcrypt.compareSync(plainText, hashValue)
    return match
}

//// encrypt hash
export const generateEncryptHash = ({ message = "" } = {}) => {
    const hashEncrypt = CryptoJS.AES.encrypt(message, process.env.ENCRYPTKEY).toString()
    return hashEncrypt
}
export const generateDecryptHash = ({ encryptedMessage = "" } = {}) => {
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, process.env.ENCRYPTKEY);
    const originalMessage = bytes.toString(CryptoJS.enc.Utf8);
    return originalMessage
}

