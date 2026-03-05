import userCollection from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sendMail from "./utils/sendMail.js";
import crypto from "crypto";

const neoBrutalistEmailTemplate = (title, content, accentColor = "#fef08a") => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Space Mono', monospace;
      background: #ffffff;
      color: #000000;
      line-height: 1.4;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border: 8px solid #000000;
      box-shadow: 16px 16px 0 #000000;
      padding: 40px 30px;
    }
    h1, h2 {
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: -1px;
      margin: 0 0 24px;
      font-size: 36px;
      line-height: 1.1;
    }
    h2 {
      font-size: 28px;
      border-left: 12px solid ${accentColor};
      padding-left: 16px;
    }
    p {
      font-size: 18px;
      margin: 0 0 20px;
      font-weight: 400;
    }
    .highlight {
      background: ${accentColor};
      padding: 4px 12px;
      border: 4px solid #000;
      display: inline-block;
      font-weight: 700;
      font-size: 32px;
      margin: 16px 0;
    }
    .warning {
      color: #dc2626;
      font-weight: 700;
      font-size: 20px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 6px solid #000;
      font-size: 14px;
      text-align: center;
      color: #444;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    ${content}
    <div class="footer">
      VaultVani – Raw Privacy. No Apologies.<br/>
      © ${new Date().getFullYear()}
    </div>
  </div>
</body>
</html>
`;

const signUp = async (req, res) => {
  try {
    const { userName, email, password } = req.body;

    const existingUser = await userCollection.findOne({ email });
    if (existingUser) {
      return res.status(401).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await userCollection.create({
      userName,
      email,
      password: hashedPassword,
    });

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.MODE === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const welcomeContent = `
      <h2>Welcome, ${userName.toUpperCase()}!</h2>
      <p>Your VaultVani account is now live.</p>
      <div class="highlight">SECURE. PRIVATE. YOURS.</div>
      <p>Login and start protecting your documents.</p>
      <p class="warning">Never share your recovery phrase.</p>
    `;
    // 📧 Send welcome email (doesn't break signup if fails)
    sendMail({
      to: email,
      subject: "Welcome to our app 🎉",
      text: `Hi ${userName}, your account was created successfully!`,
      html: neoBrutalistEmailTemplate(
        "WELCOME TO VAULTVANI",
        welcomeContent,
        "#fef08a",
      ),
    });

    const userObj = newUser.toObject();
    delete userObj.password;
    delete userObj.resetPasswordOtp;
    delete userObj.resetPasswordOtpExpires;
    delete userObj.resetToken;
    delete userObj.resetTokenExpires;

    res.status(200).json({
      success: true,
      message: "Account created successfully",
      user: userObj,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Error occurred during signup: ${error.message}`,
    });
  }
};

const signIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(401).json({
        success: false,
        message: "All fields are required",
      });
    }

    const userExist = await userCollection.findOne({ email });

    if (!userExist) {
      return res.status(401).json({
        success: false,
        message: "Invalid email/username or password",
      });
    }

    const flag = await bcrypt.compare(password, userExist.password);

    if (!flag) {
      return res.status(401).json({
        success: false,
        message: "Invalid email/username or password",
      });
    }

    const token = jwt.sign({ id: userExist._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.MODE === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    sendMail({
      to: email,
      subject: "New Login to Your Account 🔐",
      text: `Hi ${userExist.userName}, your account was just logged in.`,
      html: `<h3>New Login Detected 🔐</h3><p>Hi ${userExist.userName}, your account was just logged in. If this wasn't you, reset your password immediately.</p>`,
    });

    const user = userExist.toObject();
    delete user.password;

    return res.status(200).json({
      success: true,
      message: "Logged In successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong while logging in",
    });
  }
};

const signOut = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.MODE === "production",
      sameSite: "lax",
    });

    return res.status(200).json({
      success: true,
      message: "User logged out successfully !!",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong while logging out !!",
    });
  }
};

const genResetPassOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "All feilds are required",
      });
    }

    const userExist = await userCollection.findOne({ email });

    if (!userExist) {
      return res.status(400).json({
        success: false,
        message: "User does not exist with email!!",
      });
    }

    const otp = crypto.randomInt(100000, 999999);

    const hashedOtp = crypto
      .createHash("sha256")
      .update(otp.toString())
      .digest("hex");

    userExist.resetPasswordOtp = hashedOtp;
    userExist.resetPasswordOtpExpires = Date.now() + 10 * 60 * 1000; // 10 min

    await userExist.save();

    await sendMail({
      to: email,
      subject: "Password Reset OTP 🔐",
      text: `Your password reset OTP is ${otp}. It will expire in 10 minutes.`,
      html: `
        <h2>Password Reset Request</h2>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>This OTP will expire in 10 minutes.</p>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "If the account exists, an OTP has been sent",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Something went wrong while sending OTP !!",
    });
  }
};

const verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "All feilds are required",
      });
    }
    const userExist = await userCollection.findOne({ email });
    if (!userExist) {
      return res.status(400).json({
        success: false,
        message: "Invalid email/OTP",
      });
    }

    const hashedOtp = crypto
      .createHash("sha256")
      .update(otp.toString())
      .digest("hex");

    if (hashedOtp !== userExist.resetPasswordOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }
    if (Date.now() > userExist.resetPasswordOtpExpires) {
      return res.status(400).json({
        success: false,
        message: "OTP expired!!",
      });
    }
    const resetTokenForPass = crypto.randomBytes(32).toString("hex");
    const hashToken = crypto
      .createHash("sha256")
      .update(resetTokenForPass)
      .digest("hex");

    userExist.resetToken = hashToken;
    userExist.resetPasswordOtp = undefined;
    userExist.resetPasswordOtpExpires = undefined;

    await userExist.save();
    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      resetTokenForPass,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong while verifying otp !!",
    });
  }
};

const setNewPass = async (req, res) => {
  try {
    const { resetToken, password } = req.body;

    if (!resetToken || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required!!",
      });
    }

    const hashToken = crypto
      .createHash("sha256")
      .update(resetToken.toString())
      .digest("hex");

    const userExist = await userCollection.findOne({ resetToken: hashToken });

    if (!userExist) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset token",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password should be of more then 6 characters",
      });
    }

    const hashPass = await bcrypt.hash(password, 10);
    userExist.password = hashPass;
    userExist.resetToken = undefined;

    await userExist.save();

    return res.status(200).json({
      success: true,
      message: "Password updated successsfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong while updating the password!!",
    });
  }
};

const getUser = async (req, res) => {
  try {
    const id = req.id;
    const user = await userCollection
      .findById(id)
      .select(
        "-password -resetPasswordOtp -resetPasswordOtpExpires -resetToken -resetTokenExpires",
      );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User doesnt exit with this email",
      });
    }

    const userObj = user.toObject();
    return res.status(200).json({
      success: true,
      message: "user details fetched successfully",
      user: userObj,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Something went wrong while fetching user details",
    });
  }
};

// NEW CONTROLLER FUNCTION: cryptoSetup
const cryptoSetup = async (req, res) => {
  try {
    const {
      salt,
      encryptedVaultKey,
      iv,
      recoverySalt,
      encryptedVaultKeyWithRecovery,
      recoveryIv,
    } = req.body;

    // req.id comes from your auth middleware (assuming it sets req.id)
    const user = await userCollection.findById(req.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update user with encrypted vault data
    user.salt = salt;
    user.encryptedVaultKey = encryptedVaultKey;
    user.iv = iv;
    user.recoverySalt = recoverySalt;
    user.encryptedVaultKeyWithRecovery = encryptedVaultKeyWithRecovery;
    user.recoveryIv = recoveryIv;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Vault encryption setup completed",
    });
  } catch (error) {
    console.error("Crypto setup error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to setup vault encryption",
    });
  }
};
// NEW FUNCTION: getSalt
const getSalt = async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await userCollection.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (!user.salt) {
      return res
        .status(404)
        .json({ success: false, message: "Salt not found" });
    }

    res.status(200).json({
      success: true,
      salt: user.salt, // array of 16 numbers
    });
  } catch (error) {
    console.error("Get salt error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
const getVaultKeyData = async (req, res) => {
  try {
    const userId = req.params.userId;

    const user = await userCollection.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({
      success: true,
      encryptedVaultKey: user.encryptedVaultKey,
      iv: user.iv,
      salt: user.salt,
    });
  } catch (error) {
    console.error("Get vault key data error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export {
  signUp,
  signIn,
  signOut,
  genResetPassOtp,
  verifyResetOtp,
  setNewPass,
  getUser,
  cryptoSetup,
  getSalt, // export the new function
  getVaultKeyData,
};
