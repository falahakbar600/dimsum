const express = require("express");
const router = express.Router();
const db = require("../config/db");
const nodemailer = require("nodemailer");


const emailConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT || 587),
  secure: process.env.EMAIL_SECURE === "true",
  requireTLS: true,
  family: 4,
  connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT || 10000),
  greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT || 10000),
  socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT || 10000),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
}); 

router.post("/api/auth/send-otp", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();

  console.log("EMAIL MASUK:", email);

  if (!email) {
    return res.status(400).json({ success: false, message: "Email kosong" });
  }

  if (!emailConfigured) {
    return res.status(500).json({
      success: false,
      message: "Konfigurasi email server belum lengkap"
    });
  }

  const otp = Math.floor(100000 + Math.random() * 900000);
  const expired = new Date(Date.now() + 5 * 60000);

  db.query(
    "UPDATE users SET otp=?, otp_expired=? WHERE email=?",
    [otp, expired, email],
    async (err, result) => {
      if (err) {
        console.error("DB ERROR:", err);
        return res.status(500).json({ error: err });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Email tidak terdaftar"
        });
      }

      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: email,
          subject: "Kode OTP Reset Password",
          text: `Kode OTP kamu: ${otp}`
        });

        res.json({ success: true });

      } catch (error) {
        console.error("EMAIL ERROR:", error);
        return res.status(500).json({
          success: false,
          message: "Gagal kirim email"
        });
      }
    }
  );
});

router.post("/api/auth/reset-password", (req, res) => {
  const { email, password } = req.body;

  db.query(
    "UPDATE users SET password=?, otp=NULL WHERE email=?",
    [password, email],
    (err) => {
      if (err) return res.status(500).json({ error: err });

      res.json({
        success: true,
        message: "Password berhasil diubah"
      });
    }
  );
});

module.exports = router;
