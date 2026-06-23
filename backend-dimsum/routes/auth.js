const express = require("express");
const router = express.Router();
const db = require("../config/db");

app.post("/api/auth/send-otp", async (req, res) => {
  const { email } = req.body;

  console.log("EMAIL MASUK:", email);

  if (!email) {
    return res.json({ success: false, message: "Email kosong" });
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
        return res.json({
          success: false,
          message: "Email tidak terdaftar"
        });
      }

      try {
        await transporter.sendMail({
          to: email,
          subject: "Kode OTP Reset Password",
          text: `Kode OTP kamu: ${otp}`
        });

        res.json({ success: true });

      } catch (error) {
        console.error("EMAIL ERROR:", error);
        res.status(500).json({
          success: false,
          message: "Gagal kirim email"
        });
      }
    }
  );
});

app.post("/api/auth/reset-password", (req, res) => {
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