const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const sendEmail = require("../utils/sendEmail");
const { otpEmail } = require("../utils/emailTemplates");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, gender, dob } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone: phone || null,
      gender: gender || null,
      dob: dob || null,
    });

    if (user) {
      const otp = Math.floor(100000 + Math.random() * 900000);

      //       const message = `
      // <div style="background:#f4f4f5; padding:32px 16px; font-family: 'Segoe UI', Arial, sans-serif;">
      //   <div style="max-width:480px; margin:0 auto; background:#ffffff; border-radius:14px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.06);">

      //     <!-- Header -->
      //     <div style="background:linear-gradient(135deg,#f97316,#ea580c); padding:32px; text-align:center;">
      //       <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700; letter-spacing:0.3px;">
      //         Welcome to ${process.env.ORGANIZATION_NAME}
      //       </h1>
      //       <p style="margin:8px 0 0; color:rgba(255,255,255,0.9); font-size:14px;">
      //         We're glad to have you, ${name}
      //       </p>
      //     </div>

      //     <!-- Body -->
      //     <div style="padding:32px;">
      //       <p style="margin:0 0 24px; color:#27272a; font-size:15px; line-height:1.6;">
      //         Thank you for registering on our platform. Use the code below to verify your account.
      //       </p>

      //       <!-- OTP block -->
      //       <div style="background:#fafafa; border:1px dashed #f97316; border-radius:10px; padding:20px; text-align:center; margin-bottom:24px;">
      //         <p style="margin:0 0 8px; font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#a1a1aa; font-weight:600;">
      //           Your Verification Code
      //         </p>
      //         <p style="margin:0; font-size:32px; font-weight:800; letter-spacing:8px; color:#f97316;">
      //           ${otp}
      //         </p>
      //       </div>

      //       <p style="margin:0; color:#71717a; font-size:13px; line-height:1.5;">
      //         This code is valid for a limited time. If you didn't request this, you can safely ignore this email.
      //       </p>
      //     </div>

      //     <!-- Footer -->
      //     <div style="background:#fafafa; padding:18px 32px; text-align:center; border-top:1px solid #ececec;">
      //       <p style="margin:0; font-size:12px; color:#a1a1aa;">
      //         &copy; ${new Date().getFullYear()} ${process.env.ORGANIZATION_NAME}. All rights reserved.
      //       </p>
      //     </div>

      //   </div>
      // </div>
      // `;

      await sendEmail({
        email,
        subject: `${process.env.ORGANIZATION_NAME} - Verify Your Account`,
        message: otpEmail({ name, otp }),
      });

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        gender: user.gender,
        dob: user.dob,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user.isActive) {
      return res.status(403).json({
        message:
          "Your account has been deactivated. Contact support (9869448444).",
      });
    }

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        gender: user.gender,
        dob: user.dob,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res
        .status(400)
        .json({ message: "You cannot deactivate your own account" });
    }

    targetUser.isActive = !targetUser.isActive;
    await targetUser.save();

    res.json({
      message: `User ${targetUser.isActive ? "activated" : "deactivated"}`,
      user: targetUser,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerUser, loginUser, getUsers, toggleUserStatus };
