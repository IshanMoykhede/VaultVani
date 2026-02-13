import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
      unique: true, // added uniqueness
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    // New fields for vault encryption (Phase 1)
    salt: {
      type: [Number], // 16-byte salt for password-derived key
      default: undefined,
    },
    encryptedVaultKey: {
      type: [Number], // encrypted Vault Key bytes (using password-derived key)
      default: undefined,
    },
    iv: {
      type: [Number], // 12-byte IV for the password encryption
      default: undefined,
    },
    recoverySalt: {
      type: [Number], // 16-byte salt for recovery phrase derivation
      default: undefined,
    },
    encryptedVaultKeyWithRecovery: {
      type: [Number], // encrypted Vault Key bytes (using recovery-derived key)
      default: undefined,
    },
    recoveryIv: {
      type: [Number], // 12-byte IV for the recovery encryption
      default: undefined,
    },

    // Your existing reset fields (unchanged)
    resetPasswordOtp: { type: String },
    resetPasswordOtpExpires: { type: Date },
    resetToken: { type: String },
    resetTokenExpires: { type: Date },
  },
  {
    timestamps: true,
  },
);

const userCollection = mongoose.model("user", userSchema);
export default userCollection;
