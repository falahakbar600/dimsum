const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const PDFDocument = require("pdfkit");
const ExcelJS = require("exceljs");

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");

// ✅ TAMBAHKAN DI SINI
const nodemailer = require("nodemailer");

require("dotenv").config();

const app = express();

const multer = require("multer");

// konfigurasi penyimpanan file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "gambar/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });
const paymentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "upload/");
  },
  filename: (req, file, cb) => {
    cb(null, "payment-" + Date.now() + "-" + file.originalname);
  },
});

const uploadPayment = multer({ storage: paymentStorage });

require("dotenv").config();

// =====================
// 🔧 MIDDLEWARE
// =====================
app.use(
  cors({
    origin: [
      "https://dapur-anak-gen-z-inky.vercel.app", // Domain Vercel kamu
      "http://localhost:5500", // Untuk pengujian lokal
      "http://127.0.0.1:5500",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);
app.use(express.json());

// 🔥 WAJIB biar gambar bisa diakses dari browser
app.use("/gambar", express.static(path.join(__dirname, "gambar")));
console.log("DIRNAME:", __dirname);
console.log("GAMBAR PATH:", path.join(__dirname, "gambar"));
console.log("GAMBAR ADA:", fs.existsSync(path.join(__dirname, "gambar")));
app.use("/upload", express.static("upload"));

// 🔥 TAMBAHAN GOOGLE LOGIN (DI SINI)
app.use(
  session({
    secret: "dimsum_secret",
    resave: false,
    saveUninitialized: true,
  }),
);

app.use(passport.initialize());
app.use(passport.session());

// =====================
// 🔗 KONEKSI DATABASE
// =====================
console.log("=== DB CONNECTION INFO ===");
const connectionUri =
  process.env.DATABASE_URL ||
  process.env.MYSQL_URL ||
  process.env.MYSQL_PRIVATE_URL ||
  process.env.MYSQL_URL_NON_POOLED;
if (connectionUri) {
  // Mask password for logs
  const maskedUri = connectionUri.replace(/:([^:@]+)@/, ":******@");
  console.log("Connection URI detected:", maskedUri);
} else {
  console.log(
    "DB_HOST from env:",
    process.env.DB_HOST || process.env.MYSQLHOST || "127.0.0.1 (default)",
  );
  console.log(
    "DB_PORT from env:",
    process.env.DB_PORT || process.env.MYSQLPORT || "3307 (default)",
  );
  console.log(
    "DB_USER from env:",
    process.env.DB_USER || process.env.MYSQLUSER || "root (default)",
  );
  console.log(
    "DB_NAME from env:",
    process.env.DB_NAME || process.env.MYSQLDATABASE || "dimsum_db (default)",
  );
}
console.log("==========================");

let db;
let db_name_log = "dimsum_db";

if (connectionUri) {
  let uriWithParams = connectionUri;
  if (!uriWithParams.includes("multipleStatements=true")) {
    uriWithParams += uriWithParams.includes("?")
      ? "&multipleStatements=true"
      : "?multipleStatements=true";
  }
  db = mysql.createConnection(uriWithParams);

  try {
    const parsedUrl = new URL(connectionUri);
    db_name_log = parsedUrl.pathname.substring(1) || "railway";
  } catch (e) {
    db_name_log = "railway";
  }
} else {
  const db_host = process.env.DB_HOST || process.env.MYSQLHOST || "127.0.0.1";
  const db_user = process.env.DB_USER || process.env.MYSQLUSER || "root";
  const db_password =
    process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || "";
  const db_name =
    process.env.DB_NAME || process.env.MYSQLDATABASE || "dimsum_db";
  const db_port = process.env.DB_PORT
    ? parseInt(process.env.DB_PORT)
    : process.env.MYSQLPORT
      ? parseInt(process.env.MYSQLPORT)
      : 3307;
  db_name_log = db_name;

  db = mysql.createConnection({
    host: db_host,
    user: db_user,
    password: db_password,
    database: db_name,
    port: db_port,
    multipleStatements: true,
  });
}

db.connect((err) => {
  if (err) {
    console.error("Koneksi MySQL gagal ❌:", err);
  } else {
    console.log(`MySQL Connected ✅ (Database: ${db_name_log})`);

    // Jalankan auto migration tabel database
    const sqlPath = path.join(__dirname, "database.sql");
    if (fs.existsSync(sqlPath)) {
      const migrationSql = fs.readFileSync(sqlPath, "utf8");
      db.query(migrationSql, (migrationErr) => {
        if (migrationErr) {
          console.error("Auto migration database gagal ❌:", migrationErr);
        } else {
          console.log(
            "Auto migration database sukses / Tabel siap digunakan ✅",
          );
        }
      });
    } else {
      console.warn("File database.sql tidak ditemukan untuk auto migration.");
    }
  }
});

db.query("SELECT 1", (err, result) => {
  console.log("TEST DB");
  console.log(err);
  console.log(result);
});

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

if (emailConfigured) {
  transporter.verify((err) => {
    if (err) {
      console.error("VERIFY ERROR:", err);
    } else {
      console.log("SMTP READY");
    }
  });
} else {
  console.warn("SMTP belum dikonfigurasi: isi EMAIL_USER dan EMAIL_PASS.");
}

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "backend-dimsum",
    otpPatch: "email-validation-smtp-timeout-v2",
    emailConfigured,
    emailHost: process.env.EMAIL_HOST || "smtp.gmail.com",
    emailPort: Number(process.env.EMAIL_PORT || 587),
    emailSecure: process.env.EMAIL_SECURE === "true",
  });
});

// =====================
// 🔐 GOOGLE STRATEGY
// =====================
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) => {
      const email = profile.emails[0].value;
      const nama = profile.displayName;

      db.query(
        "SELECT * FROM users WHERE email = ?",
        [email],
        (err, result) => {
          if (err) {
            console.error("Error SELECT user:", err);
            return done(err);
          }

          if (result && result.length > 0) {
            return done(null, result[0]);
          }

          db.query(
            "INSERT INTO users (nama, email, role) VALUES (?, ?, 'user')",
            [nama, email],
            (insertErr) => {
              if (insertErr) {
                console.error("Error INSERT user:", insertErr);
                return done(insertErr);
              }

              return done(null, {
                nama,
                email,
                role: "user",
              });
            },
          );
        },
      );
    },
  ),
);

// =====================
// 🔐 PASSPORT SESSION
// =====================
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// =====================
// 🏠 ROUTE TEST
// =====================
app.get("/", (req, res) => {
  res.send("Backend Dimsum Dapur Anak GEN Z jalan 🚀");
});

// =====================
// 🔐 API AUTH (LOGIN)
// =====================
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  const query = "SELECT * FROM users WHERE email = ? AND password = ?";

  db.query(query, [email, password], (err, results) => {
    if (err) {
      console.error("Error login:", err);
      return res.status(500).json({ error: "Server error" });
    }

    if (results.length > 0) {
      const user = results[0];

      res.json({
        success: true,
        id: user.id,
        role: user.role,
        nama: user.nama,
      });
    } else {
      res.json({
        success: false,
        message: "Email / Password salah",
      });
    }
  });
});

// =====================
// 🍜 API PRODUCTS
// =====================
app.get("/api/products", (req, res) => {
  db.query("SELECT * FROM products ORDER BY id DESC", (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        error: "Gagal ambil data produk",
      });
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
    const formatted = results.map((item) => ({
      ...item,
      image: `${backendUrl}/gambar/${encodeURIComponent(
        item.gambar.replace("gambar/", "").trim(),
      )}`,
    }));

    res.json(formatted);
  });
});

app.post("/api/products", upload.single("gambar"), (req, res) => {
  console.log("BODY:", req.body);
  console.log("FILE:", req.file);

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Gambar belum dipilih!",
    });
  }

  const { nama, harga, deskripsi } = req.body;
  const stok = req.body.stok || 100; // 🔥 TAMBAH stok
  const gambar = req.file.filename;

  const desc = deskripsi || "Menu lezat khas Dapur Anak GEN Z.";

  const query =
    "INSERT INTO products (nama, harga, gambar, deskripsi, stok) VALUES (?, ?, ?, ?, ?)";

  db.query(query, [nama, harga, gambar, desc, stok], (err, result) => {
    if (err) {
      console.error("DB ERROR:", err);
      return res.status(500).json({
        success: false,
        message: "Database error",
      });
    }

    res.json({
      success: true,
      message: "Produk berhasil ditambahkan!",
      id: result.insertId,
    });
  });
});

app.delete("/api/products/:id", (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM products WHERE id = ?", [id], (err) => {
    if (err) {
      console.error("Gagal hapus produk:", err);
      return res.status(500).json({ error: "Gagal hapus data" });
    }
    res.json({ message: "Produk berhasil dihapus! 🗑️" });
  });
});
// =====================
// ✏️ UPDATE PRODUK
// =====================
app.put("/api/products/:id", (req, res) => {
  const { nama, harga, stok, deskripsi } = req.body;
  const { id } = req.params;

  const query = `
    UPDATE products
    SET nama=?, harga=?, stok=?, deskripsi=?
    WHERE id=?
  `;

  db.query(query, [nama, harga, stok, deskripsi, id], (err, result) => {
    if (err) {
      console.error("Gagal update produk:", err);
      return res.status(500).json({
        success: false,
        message: "Gagal update produk",
      });
    }

    res.json({
      success: true,
      message: "Produk berhasil diupdate!",
    });
  });
});

// =====================
// 📊 API STATS
// =====================
app.get("/api/stats", (req, res) => {
  const sql = `
    SELECT 
      (SELECT COUNT(*) FROM products) as total_produk,
      (SELECT IFNULL(SUM(total), 0) FROM orders) as total_pendapatan,
      (SELECT COUNT(*) FROM orders) as total_order
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error ambil stats:", err);
      return res.status(500).json({ error: "Gagal ambil statistik" });
    }
    res.json(results[0]);
  });
});

// =====================
// 📊 API CHART DATA
// =====================
app.get("/api/chart-data", (req, res) => {
  const sql = `
    SELECT DATE(created_at) as tanggal, SUM(total) as pendapatan
    FROM orders
    GROUP BY DATE(created_at)
    ORDER BY tanggal ASC
    LIMIT 7
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Gagal ambil chart:", err);
      return res.status(500).json({
        error: "Gagal ambil data chart",
      });
    }

    res.json(results);
  });
});

// =====================
// 🥟 API PRODUCT COMPOSITION
// =====================
app.get("/api/product-composition", (req, res) => {
  const sql = `
    SELECT nama_produk, SUM(jumlah) as total
    FROM order_items
    GROUP BY nama_produk
    ORDER BY total DESC
    LIMIT 5
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Gagal ambil komposisi produk:", err);
      return res.status(500).json({
        error: "Gagal ambil komposisi produk",
      });
    }

    res.json(results);
  });
});

// =====================
// 🧾 API ORDERS
// =====================
app.get("/api/orders", (req, res) => {
  db.query("SELECT * FROM orders ORDER BY id DESC", (err, results) => {
    if (err) {
      console.error("Error ambil orders:", err);
      return res.status(500).json({ error: "Gagal ambil orders" });
    }
    res.json(results);
  });
});

app.get("/api/orders/:id/items", (req, res) => {
  db.query(
    "SELECT * FROM order_items WHERE order_id = ?",
    [req.params.id],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Gagal ambil item" });
      }
      res.json(results);
    },
  );
});

app.post("/api/orders", (req, res) => {
  const {
    user_id,
    nama,
    telepon,
    alamat,
    metode_pembayaran,
    catatan,
    subtotal,
    ongkir,
    total,
    items,
    user_key,
  } = req.body;

  const orderQuery = `
    INSERT INTO orders 
(
  user_id,
  nama,
  telepon,
  alamat,
  metode_pembayaran,
  status,
  catatan,
  subtotal,
  ongkir,
  total,
  user_key
)
VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
  `;

  db.query(
    orderQuery,
    [
      user_id,
      nama,
      telepon,
      alamat,
      metode_pembayaran,
      catatan || "",
      subtotal || 0,
      ongkir || 0,
      total,
      user_key,
    ],
    (err, result) => {
      if (err) {
        console.error("Error simpan order:", err);
        return res.status(500).json({
          error: "Gagal simpan order",
        });
      }

      const orderId = result.insertId;

      // 🔥 CHAT PERTAMA DARI USER
      db.query(
        `
        INSERT INTO live_chat (user_key, nama, sender, message)
        VALUES (?, ?, 'user', ?)
        `,
        [
          user_key || telepon,
          nama,
          `Halo admin, saya baru membuat pesanan #${orderId}`,
        ],
        (userChatErr) => {
          if (userChatErr) {
            console.error("Gagal buat chat user pertama:", userChatErr);
          }
        },
      );

      // 🔥 AUTO RESPON ADMIN
      const welcomeMessage = `
Pesanan #${orderId} berhasil dibuat ✅
Metode pembayaran: ${metode_pembayaran}
Total: Rp ${parseInt(total).toLocaleString("id-ID")}

Silakan upload bukti pembayaran Anda melalui halaman status pesanan.
`;

      db.query(
        `
        INSERT INTO live_chat (user_key, nama, sender, message)
        VALUES (?, ?, 'admin', ?)
        `,
        [user_key || telepon, nama, welcomeMessage],
        (chatErr) => {
          if (chatErr) {
            console.error("Gagal buat chat otomatis:", chatErr);
          }
        },
      );

      // 🔥 SIMPAN DETAIL ITEM PESANAN
      const itemQuery = `
  INSERT INTO order_items 
  (order_id, product_id, nama_produk, jumlah, harga)
  VALUES (?, ?, ?, ?, ?)
`;

      if (items && items.length > 0) {
        items.forEach((item) => {
          db.query(
            itemQuery,
            [
              orderId,
              item.id || null,
              item.nama,
              item.qty || item.jumlah,
              item.harga,
            ],
            (itemErr) => {
              if (itemErr) {
                console.error("Gagal simpan item order:", itemErr);
              }
            },
          );
        });
      }

      res.json({
        success: true,
        message: "Order berhasil masuk ke database! ✅",
        order_id: orderId,
      });
    },
  );
});

app.post(
  "/api/orders/:id/upload-payment",
  uploadPayment.single("bukti"),
  (req, res) => {
    const orderId = req.params.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Bukti pembayaran wajib diupload",
      });
    }

    const buktiPath = req.file.filename;

    db.query(
      `
      UPDATE orders
      SET bukti_bayar = ?, 
          status = 'menunggu_verifikasi'
      WHERE id = ?
      `,
      [buktiPath, orderId],
      (err, result) => {
        if (err) {
          console.error("UPLOAD ERROR:", err);

          return res.status(500).json({
            success: false,
            message: "Gagal simpan bukti pembayaran",
          });
        }

        db.query(
          "SELECT nama, telepon, user_key FROM orders WHERE id = ?",
          [orderId],
          (errUser, userData) => {
            if (!errUser && userData.length > 0) {
              const user = userData[0];

              db.query(
                `
        INSERT INTO live_chat (user_key, nama, sender, message)
        VALUES (?, ?, 'admin', ?)
        `,
                [
                  user.user_key || user.telepon,
                  user.nama,
                  "Bukti pembayaran Anda telah diterima ✅ Menunggu verifikasi admin.",
                ],
              );
            }
          },
        );

        res.json({
          success: true,
          message: "Bukti pembayaran berhasil dikirim",
          file: buktiPath,
        });
      },
    );
  },
);

// =====================
// 🔄 UPDATE STATUS ORDER
// =====================
app.put("/api/orders/:id", (req, res) => {
  const { status } = req.body;
  const { id } = req.params;

  db.query(
    "UPDATE orders SET status=? WHERE id=?",
    [status, id],
    (err, result) => {
      if (err) {
        console.error("Gagal update status:", err);
        return res.status(500).json({
          success: false,
          message: "Gagal update status",
        });
      }

      // 🔥 Ambil data user lalu kirim notif ke live chat
      db.query(
        "SELECT nama, telepon, user_key FROM orders WHERE id = ?",
        [id],
        (errUser, userData) => {
          if (!errUser && userData.length > 0) {
            const user = userData[0];

            db.query(
              `
              INSERT INTO live_chat (user_key, nama, sender, message)
              VALUES (?, ?, 'admin', ?)
              `,
              [
                user.user_key || user.telepon,
                user.nama,
                `Status pesanan Anda diperbarui menjadi: ${status} ✅`,
              ],
            );
          }
        },
      );

      res.json({
        success: true,
        message: "Status order berhasil diupdate!",
      });
    },
  );
});

// =====================
// 🧾 CETAK STRUK ORDER
// =====================
app.get("/api/orders/:id/receipt", (req, res) => {
  const orderId = req.params.id;

  db.query(
    "SELECT * FROM orders WHERE id = ?",
    [orderId],
    (err, orderResult) => {
      if (err || orderResult.length === 0) {
        return res.send("Order tidak ditemukan");
      }

      const order = orderResult[0];

      db.query(
        "SELECT * FROM order_items WHERE order_id = ?",
        [orderId],
        (err2, itemResults) => {
          if (err2) {
            return res.send("Item order tidak ditemukan");
          }

          // 🔥 FIX DATA
          const subtotal =
            parseInt(order.subtotal) ||
            parseInt(order.total) - parseInt(order.ongkir || 0);

          const ongkir = parseInt(order.ongkir) || 0;
          const total = parseInt(order.total) || 0;

          let itemsHTML = "";
          itemResults.forEach((item, index) => {
            itemsHTML += `
              <tr>
                <td>${index + 1}</td>
                <td>${item.nama_produk}</td>
                <td>${item.jumlah}</td>
                <td>Rp ${parseInt(item.harga).toLocaleString("id-ID")}</td>
                <td>Rp ${(parseInt(item.harga) * parseInt(item.jumlah)).toLocaleString("id-ID")}</td>
              </tr>
            `;
          });

          res.send(`
            <!DOCTYPE html>
            <html lang="id">
            <head>
              <meta charset="UTF-8">
              <title>Invoice Order #${order.id}</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  margin: 0;
                  padding: 20px;
                  background: white;
                }

                .invoice-container {
                  max-width: 850px;
                  margin: auto;
                  padding: 40px;
                  background: white;
                }

                h1 {
                  color: #5b21b6;
                }

                .header,
                .info-box {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 30px;
                }

                table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-top: 20px;
                }

                table th,
                table td {
                  padding: 12px;
                  border-bottom: 1px solid #ddd;
                  text-align: left;
                }

                .summary {
                  margin-top: 30px;
                  width: 320px;
                  margin-left: auto;
                }

                .summary div {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 8px;
                }

                .grand-total {
                  font-size: 28px;
                  font-weight: bold;
                  color: #5b21b6;
                }

                @media print {
                  body {
                    zoom: 88%;
                  }

                  .invoice-container {
                    page-break-after: avoid;
                  }
                }
              </style>
            </head>
            <body onload="window.print()">

              <div class="invoice-container">
                <div class="header">
                  <div>
                    <h1>Invoice</h1>
                    <p><strong>Invoice #:</strong> #${order.id}</p>
                    <p><strong>Tanggal:</strong> ${new Date(order.created_at).toLocaleDateString("id-ID")}</p>
                  </div>

                  <div>
                    <h1>Dapur Anak GEN Z</h1>
                  </div>
                </div>

                <div class="info-box">
                  <div>
                    <h3>Penjual</h3>
                    <p>Dapur Anak GEN Z</p>
                    <p>BSD, Tangerang Selatan</p>
                    <p>WhatsApp Admin</p>
                  </div>

                  <div>
                    <h3>Pembeli</h3>
                    <p>${order.nama}</p>
                    <p>${order.telepon}</p>
                    <p>${order.alamat}</p>
                    <p>Status: <strong>${order.status}</strong></p>
                  </div>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Menu</th>
                      <th>Qty</th>
                      <th>Harga</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHTML}
                  </tbody>
                </table>

                <div class="summary">
                  <div>
                    <span>Metode:</span>
                    <span>${order.metode_pembayaran}</span>
                  </div>

                  <div>
                    <span>Subtotal:</span>
                    <span>Rp ${subtotal.toLocaleString("id-ID")}</span>
                  </div>

                  <div>
                    <span>Ongkir:</span>
                    <span>Rp ${ongkir.toLocaleString("id-ID")}</span>
                  </div>

                  <hr>

                  <div class="grand-total">
                    <span>Total:</span>
                    <span>Rp ${total.toLocaleString("id-ID")}</span>
                  </div>
                </div>

                <p><strong>Catatan:</strong> ${order.catatan || "-"}</p>
              </div>

            </body>
            </html>
          `);
        },
      );
    },
  );
});

// =====================
// 📝 API REGISTER
// =====================
app.post("/api/auth/register", (req, res) => {
  const { nama, email, password } = req.body;

  // cek apakah email sudah ada
  const checkQuery = "SELECT * FROM users WHERE email = ?";

  db.query(checkQuery, [email], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }

    if (result.length > 0) {
      return res.json({
        success: false,
        message: "Email sudah terdaftar",
      });
    }

    // insert user baru
    const insertQuery = `
      INSERT INTO users (nama, email, password, role)
      VALUES (?, ?, ?, 'user')
    `;

    db.query(insertQuery, [nama, email, password], (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Gagal register" });
      }

      res.json({
        success: true,
        message: "Register berhasil!",
      });
    });
  });
});

// =====================
// 🔐 VERIFY OTP
// =====================
app.post("/api/auth/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  db.query(
    "SELECT otp, otp_expired FROM users WHERE email=?",
    [email],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
      }

      if (result.length === 0) {
        return res.json({
          success: false,
          message: "Email tidak ditemukan",
        });
      }

      const user = result[0];

      // cek OTP
      if (user.otp != otp) {
        return res.json({
          success: false,
          message: "OTP salah",
        });
      }

      // cek expired
      if (new Date() > new Date(user.otp_expired)) {
        return res.json({
          success: false,
          message: "OTP sudah kadaluarsa",
        });
      }

      res.json({
        success: true,
        message: "OTP valid",
      });
    },
  );
});

// =====================
// 🔁 RESET PASSWORD
// =====================
app.post("/api/auth/reset-password", (req, res) => {
  const { email, password } = req.body;

  db.query(
    "UPDATE users SET password=? WHERE email=?",
    [password, email],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Gagal reset password" });
      }

      res.json({
        success: true,
        message: "Password berhasil diupdate",
      });
    },
  );
});

// =====================
// 🚀 JALANKAN SERVER
// =====================
const PORT = process.env.PORT || 3001;

// =====================
// 🔗 GOOGLE LOGIN ROUTE
// =====================

// tombol login google
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

// callback dari google
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    const user = req.user;

    const frontendUrl =
      process.env.FRONTEND_URL || "https://dapur-anak-gen-z-inky.vercel.app";

    // kirim data ke frontend
    res.redirect(
      `${frontendUrl}/index.html?nama=${encodeURIComponent(user.nama)}&role=${user.role}&email=${encodeURIComponent(user.email)}&id=${user.id}`,
    );
  },
);

console.log("CLIENT:", process.env.GOOGLE_CLIENT_ID);

app.post("/api/auth/send-otp", async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email wajib diisi",
    });
  }

  if (!emailConfigured) {
    return res.status(500).json({
      success: false,
      message: "Konfigurasi email server belum lengkap",
    });
  }

  const otp = Math.floor(100000 + Math.random() * 900000);
  const expired = new Date(Date.now() + 5 * 60000);

  db.query(
    "UPDATE users SET otp=?, otp_expired=? WHERE email=?",
    [otp, expired, email],
    async (err, result) => {
      if (err) {
        console.error("SEND OTP DB ERROR:", err);
        return res.status(500).json({
          success: false,
          message: "Gagal menyimpan OTP",
        });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Email tidak terdaftar",
        });
      }

      try {
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: email,
          subject: "Kode Reset Password",
          text: `Kode OTP kamu adalah: ${otp}`,
        });

        res.json({ success: true });
      } catch (error) {
        console.error("SENDMAIL ERROR:", error);

        return res.status(500).json({
          success: false,
          message: "Gagal mengirim email OTP",
          error: error.message,
          code: error.code,
          response: error.response,
        });
      }
    },
  );
});

// =====================
// 🛠 ADMIN REVIEW PANEL
// =====================

// Ambil semua review admin
app.get("/api/admin/reviews", (req, res) => {
  db.query("SELECT * FROM reviews ORDER BY created_at DESC", (err, results) => {
    if (err) {
      console.error("Gagal ambil admin review:", err);
      return res.status(500).json([]);
    }

    res.json(results);
  });
});

// Hapus review
app.delete("/api/admin/reviews/:id", (req, res) => {
  db.query("DELETE FROM reviews WHERE id = ?", [req.params.id], (err) => {
    if (err) {
      console.error("Gagal hapus review:", err);
      return res.status(500).json({
        success: false,
      });
    }

    res.json({
      success: true,
    });
  });
});

// Highlight review terbaik
app.put("/api/admin/reviews/highlight/:id", (req, res) => {
  db.query(
    "UPDATE reviews SET highlight = 1 WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) {
        console.error("Gagal highlight review:", err);
        return res.status(500).json({
          success: false,
        });
      }

      res.json({
        success: true,
      });
    },
  );
});

app.put("/api/admin/reviews/unhighlight/:id", (req, res) => {
  const { id } = req.params;

  db.query(
    "UPDATE reviews SET highlight = 0 WHERE id = ?",
    [id],
    (err, result) => {
      if (err) {
        console.error("Gagal unhighlight review:", err);
        return res.status(500).json({ error: err });
      }

      res.json({
        success: true,
        message: "Highlight dibatalkan",
      });
    },
  );
});

// Tandai spam
app.put("/api/admin/reviews/spam/:id", (req, res) => {
  db.query(
    "UPDATE reviews SET spam = 1 WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) {
        console.error("Gagal tandai spam:", err);
        return res.status(500).json({
          success: false,
        });
      }

      res.json({
        success: true,
      });
    },
  );
});

app.get("/api/admin/reviews/export/pdf", async (req, res) => {
  try {
    db.query(
      "SELECT * FROM reviews WHERE spam = 0 ORDER BY highlight DESC, created_at DESC",
      async (err, reviews) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Database error");
        }

        const totalReview = reviews.length;
        const avgRating =
          totalReview > 0
            ? (
                reviews.reduce((sum, r) => sum + Number(r.rating), 0) /
                totalReview
              ).toFixed(1)
            : "0.0";

        const positive = reviews.filter((r) => Number(r.rating) >= 4).length;
        const negative = reviews.filter((r) => Number(r.rating) <= 3).length;

        const ratingCounts = {
          5: reviews.filter((r) => r.rating == 5).length,
          4: reviews.filter((r) => r.rating == 4).length,
          3: reviews.filter((r) => r.rating == 3).length,
          2: reviews.filter((r) => r.rating == 2).length,
          1: reviews.filter((r) => r.rating == 1).length,
        };

        const rows = reviews
          .map(
            (r, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${r.nama}</td>
              <td>-</td>
              <td>${"⭐".repeat(r.rating)}</td>
              <td>${r.review}</td>
              <td>${new Date(r.created_at).toLocaleDateString("id-ID")}</td>
            </tr>
          `,
          )
          .join("");

        let html = fs.readFileSync(
          path.join(__dirname, "review-report-template.html"),
          "utf8",
        );

        html = html
          .replace(/{{TOTAL_REVIEW}}/g, totalReview)
          .replace(/{{AVG_RATING}}/g, avgRating)
          .replace(/{{POSITIVE}}/g, positive)
          .replace(/{{NEGATIVE}}/g, negative)
          .replace(/{{ROWS}}/g, rows)
          .replace(/{{RATING_5}}/g, ratingCounts[5])
          .replace(/{{RATING_4}}/g, ratingCounts[4])
          .replace(/{{RATING_3}}/g, ratingCounts[3])
          .replace(/{{RATING_2}}/g, ratingCounts[2])
          .replace(/{{RATING_1}}/g, ratingCounts[1])
          .replace(/{{EXPORT_DATE}}/g, new Date().toLocaleString("id-ID"));

        console.log("Mulai generate PDF...");

        const browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        console.log("Browser launched");

        const page = await browser.newPage();

        await page.setViewport({
          width: 1240,
          height: 1754,
          deviceScaleFactor: 2,
        });

        await page.setContent(html, {
          waitUntil: "domcontentloaded",
        });

        console.log("HTML loaded");

        const pdf = await page.pdf({
          format: "A4",
          printBackground: true,
          margin: {
            top: "10mm",
            bottom: "10mm",
            left: "10mm",
            right: "10mm",
          },
        });

        await browser.close();

        res.set({
          "Content-Type": "application/pdf",
          "Content-Disposition":
            "attachment; filename=laporan-review-customer.pdf",
        });

        res.send(pdf);
      },
    );
  } catch (error) {
    console.error("Export PDF error:", error);
    res.status(500).send("Gagal export PDF");
  }
});

app.get("/api/admin/reviews/export/excel", async (req, res) => {
  try {
    db.query(
      "SELECT * FROM reviews ORDER BY created_at DESC",
      async (err, reviews) => {
        if (err) return res.status(500).send("Database error");

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet("Reviews", {
          views: [{ showGridLines: false }],
        });

        sheet.properties.defaultRowHeight = 28;

        // Column Width
        sheet.columns = Array(20).fill({ width: 15 });
        [
          { width: 8 },
          { width: 25 },
          { width: 18 },
          { width: 35 },
          { width: 18 },
          { width: 12 },
          { width: 12 },
          { width: 12 },
          { width: 12 },
          { width: 12 },
          { width: 12 },
          { width: 12 },
          { width: 12 },
        ];

        // ================= HEADER =================
        sheet.mergeCells("A2:C4");
        sheet.getCell("A2").value = "Dapur Gen Z\nDimsum & More";
        sheet.getCell("A2").font = {
          size: 24,
          bold: true,
          color: { argb: "F97316" },
        };
        sheet.getCell("A2").alignment = {
          wrapText: true,
          vertical: "middle",
        };

        sheet.mergeCells("D2:J3");
        sheet.getCell("D2").value = "LAPORAN REVIEW CUSTOMER";
        sheet.getCell("D2").font = {
          size: 26,
          bold: true,
          color: { argb: "111827" },
        };
        sheet.getCell("D2").alignment = {
          horizontal: "center",
          vertical: "middle",
        };

        sheet.mergeCells("D4:J4");
        sheet.getCell("D4").value =
          `Periode: ${new Date().toLocaleDateString("id-ID")}`;
        sheet.getCell("D4").font = {
          size: 16,
          bold: true,
          color: { argb: "F97316" },
        };
        sheet.getCell("D4").alignment = { horizontal: "center" };

        sheet.mergeCells("K2:M4");
        sheet.getCell("K2").value =
          "Tanggal Export\n" + new Date().toLocaleString("id-ID");
        sheet.getCell("K2").alignment = {
          wrapText: true,
          horizontal: "center",
          vertical: "middle",
        };
        sheet.getCell("K2").fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF7ED" },
        };

        // ================= STATS =================
        const totalReview = reviews.length;
        const avgRating =
          totalReview > 0
            ? (
                reviews.reduce((sum, r) => sum + Number(r.rating), 0) /
                totalReview
              ).toFixed(1)
            : 0;

        const positive = reviews.filter((r) => r.rating >= 4).length;
        const negative = reviews.filter((r) => r.rating <= 2).length;
        const highlight = reviews.filter((r) => r.highlight == 1).length;
        const spam = reviews.filter((r) => r.spam == 1).length;

        function createCard(startCell, title, value, color) {
          const col = startCell.charCodeAt(0);
          const row = parseInt(startCell.slice(1));

          const endCell = `${String.fromCharCode(col + 1)}${row + 2}`;
          sheet.mergeCells(`${startCell}:${endCell}`);

          const cell = sheet.getCell(startCell);
          cell.value = `${title}\n${value}`;
          cell.alignment = {
            wrapText: true,
            horizontal: "center",
            vertical: "middle",
          };
          cell.font = {
            size: 16,
            bold: true,
            color: { argb: color },
          };
          cell.border = {
            top: { style: "thin", color: { argb: color } },
            left: { style: "thin", color: { argb: color } },
            right: { style: "thin", color: { argb: color } },
            bottom: { style: "thin", color: { argb: color } },
          };
        }
        createCard("A6", "TOTAL REVIEW", totalReview, "F97316");
        createCard("D6", "AVG RATING", avgRating + "/5", "EAB308");
        createCard("G6", "POSITIF", positive, "22C55E");
        createCard("J6", "NEGATIF", negative, "EF4444");
        createCard("M6", "HIGHLIGHT", highlight, "F59E0B");
        createCard("P6", "SPAM", spam, "6B7280");

        // ================= DISTRIBUSI RATING =================
        const ratingCounts = [5, 4, 3, 2, 1].map(
          (star) => reviews.filter((r) => Number(r.rating) === star).length,
        );

        sheet.mergeCells("A12:H12");
        sheet.getCell("A12").value = "DISTRIBUSI RATING";
        sheet.getCell("A12").font = {
          size: 18,
          bold: true,
          color: { argb: "F97316" },
        };

        let startRow = 13;

        ratingCounts.forEach((count, i) => {
          const star = 5 - i;

          sheet.getCell(`A${startRow + i}`).value = `${star} ⭐`;

          sheet.mergeCells(`B${startRow + i}:F${startRow + i}`);

          const barCell = sheet.getCell(`B${startRow + i}`);
          barCell.value = "█".repeat(Math.max(1, count));
          barCell.font = {
            color: { argb: "F97316" },
            bold: true,
          };

          sheet.getCell(`G${startRow + i}`).value =
            `${count} (${totalReview ? Math.round((count / totalReview) * 100) : 0}%)`;
        });

        // ================= TABLE =================
        sheet.addRow([]);
        sheet.addRow([]);
        sheet.addRow([
          "No",
          "Nama Customer",
          "Rating",
          "Review",
          "Tanggal",
          "Highlight",
          "Spam",
        ]);

        const header = sheet.lastRow;
        header.eachCell((cell) => {
          cell.font = { bold: true, color: { argb: "FFFFFF" } };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F97316" },
          };
          cell.alignment = { horizontal: "center" };
        });

        reviews.forEach((r, i) => {
          sheet.addRow([
            i + 1,
            r.nama,
            "⭐".repeat(r.rating),
            r.review,
            new Date(r.created_at).toLocaleDateString("id-ID"),
            r.highlight,
            r.spam,
          ]);
        });

        // ================= FOOTER =================
        sheet.addRow([]);
        sheet.mergeCells(
          `A${sheet.lastRow.number + 1}:M${sheet.lastRow.number + 1}`,
        );
        const footer = sheet.getCell(`A${sheet.lastRow.number}`);
        footer.value =
          "✨ Terima kasih atas kepercayaan customer terhadap Dapur Gen Z.";
        footer.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF7ED" },
        };

        // ================= DOWNLOAD =================
        res.setHeader(
          "Content-Type",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=laporan-review-customer.xlsx",
        );

        await workbook.xlsx.write(res);
        res.end();
      },
    );
  } catch (error) {
    console.error(error);
    res.status(500).send("Gagal export Excel");
  }
});

app.get("/api/orders/user/:telepon", (req, res) => {
  const telepon = req.params.telepon;

  db.query(
    "SELECT * FROM orders WHERE telepon = ? ORDER BY id DESC LIMIT 1",
    [telepon],
    (err, results) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Gagal ambil status order",
        });
      }

      if (results.length === 0) {
        return res.json({
          success: false,
          message: "Order tidak ditemukan",
        });
      }

      res.json({
        success: true,
        order: results[0],
      });
    },
  );
});

app.get("/api/livechat/all", (req, res) => {
  const sql = `
    SELECT * FROM live_chat
    ORDER BY created_at ASC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Gagal load chat:", err);
      return res.json({
        success: false,
      });
    }

    res.json({
      success: true,
      chats: results,
    });
  });
});

app.post("/api/livechat/reply", (req, res) => {
  const { user_key, message } = req.body;

  if (!user_key || !message) {
    return res.json({
      success: false,
      message: "Data balasan tidak lengkap",
    });
  }

  const sql =
    "INSERT INTO live_chat (user_key, sender, message, is_read) VALUES (?, 'admin', ?, 1)";

  db.query(sql, [user_key, message], (err, result) => {
    if (err) {
      console.error("Gagal balas chat:", err);
      return res.json({
        success: false,
      });
    }

    res.json({
      success: true,
    });
  });
});

app.get("/api/livechat/user/:telepon", (req, res) => {
  const telepon = req.params.telepon;

  const sql = `
    SELECT * FROM live_chat
    WHERE user_key = ?
    ORDER BY created_at ASC
  `;

  db.query(sql, [telepon], (err, results) => {
    if (err) {
      console.error("Gagal load chat user:", err);
      return res.json({
        success: false,
      });
    }

    res.json({
      success: true,
      chats: results,
    });
  });
});

// =========================
// LIVE CHAT USER SEND
// =========================
app.post("/api/livechat/send", (req, res) => {
  const { user_key, nama, sender, message } = req.body;

  if (!user_key || !message) {
    return res.json({
      success: false,
      message: "Data tidak lengkap",
    });
  }

  const sql = `
    INSERT INTO live_chat (user_key, nama, sender, message, is_read)
    VALUES (?, ?, ?, ?, 0)
  `;

  db.query(sql, [user_key, nama, sender, message], (err, result) => {
    if (err) {
      console.error("Gagal simpan live chat:", err);
      return res.status(500).json({
        success: false,
      });
    }

    res.json({
      success: true,
      message: "Chat tersimpan",
    });
  });
});

// =========================
// AMBIL DAFTAR CUSTOMER LIVE CHAT
// =========================
app.get("/api/livechat/customers", (req, res) => {
  const sql = ` SELECT user_key, MAX(nama) as nama, MAX(created_at) as last_time, SUM( CASE WHEN sender='user' AND is_read=0 THEN 1 ELSE 0 END ) as unread FROM live_chat WHERE user_key IS NOT NULL GROUP BY user_key ORDER BY last_time DESC `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json([]);
    }

    res.json(result);
  });
});

// =========================
// AMBIL CHAT PER CUSTOMER
// =========================
app.get("/api/livechat/:userKey", (req, res) => {
  const userKey = req.params.userKey;

  const query = `
    SELECT *
    FROM live_chat
    WHERE user_key = ?
    ORDER BY created_at ASC
  `;

  db.query(query, [userKey], (err, results) => {
    if (err) {
      console.error("Gagal ambil isi chat:", err);
      return res.status(500).json([]);
    }

    res.json(results);
  });
});

app.put("/api/livechat/read/:userKey", (req, res) => {
  const userKey = req.params.userKey;

  const query = `
    UPDATE live_chat
    SET is_read = 1
    WHERE user_key = ?
      AND sender = 'user'
      AND is_read = 0
  `;

  db.query(query, [userKey], (err, result) => {
    if (err) {
      console.error("Gagal update read status:", err);
      return res.status(500).json({
        success: false,
      });
    }

    res.json({
      success: true,
      updated: result.affectedRows,
    });
  });
});

app.post("/api/contact", async (req, res) => {
  const { nama, telepon, email, pesan } = req.body;

  try {
    await transporter.sendMail({
      from: "falah.akbar304@gmail.com",
      replyTo: email,
      to: "falah.akbar304@gmail.com",
      subject: "Pesan Baru dari Website Dapur Anak GEN Z",
      html: `
        <h2>Pesan Baru</h2>
        <p><strong>Nama:</strong> ${nama}</p>
        <p><strong>Telepon:</strong> ${telepon}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Pesan:</strong><br>${pesan}</p>
      `,
    });

    res.json({
      success: true,
      message: "Pesan berhasil dikirim",
    });
  } catch (err) {
    console.error("EMAIL ERROR:", err);

    res.status(500).json({
      success: false,
      message: "Gagal kirim email",
      error: err.message,
    });
  }
});

app.post("/api/reviews", (req, res) => {
  const { order_id, product_id, user_key, nama, rating, review } = req.body;

  const sql = `
    INSERT INTO reviews 
    (order_id, product_id, user_key, nama, rating, review)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [order_id, product_id, user_key, nama, rating, review],
    (err, result) => {
      if (err) {
        console.error("Gagal simpan review:", err);
        return res.status(500).json({ error: "Gagal simpan review" });
      }

      res.json({
        success: true,
        message: "Review berhasil dikirim",
      });
    },
  );
});

app.get("/api/reviews/stats", (req, res) => {
  const query = `
    SELECT 
      COALESCE(ROUND(AVG(rating), 1), 0) AS avg_rating,
      COUNT(*) AS total_reviews
    FROM reviews
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error("Gagal ambil statistik review:", err);

      return res.status(500).json({
        avg_rating: 0,
        total_reviews: 0,
      });
    }

    res.json({
      avg_rating: results[0].avg_rating,
      total_reviews: results[0].total_reviews,
    });
  });
});

app.get("/api/reviews/product/:productId", (req, res) => {
  const productId = req.params.productId;

  const query = `
    SELECT 
      COALESCE(ROUND(AVG(rating),1),0) AS avg_rating,
      COUNT(*) AS total_reviews
    FROM reviews
    WHERE product_id = ?
  `;

  db.query(query, [productId], (err, results) => {
    if (err) {
      console.error("Gagal ambil review produk:", err);
      return res.status(500).json({
        avg_rating: 0,
        total_reviews: 0,
      });
    }

    res.json(results[0]);
  });
});

app.get("/api/reviews/:productId", (req, res) => {
  const productId = req.params.productId;

  db.query(
    "SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC",
    [productId],
    (err, results) => {
      if (err) {
        return res.status(500).json([]);
      }

      res.json(results);
    },
  );
});

app.get("/api/reviews", (req, res) => {
  const sql = `
    SELECT *
    FROM reviews WHERE spam = 0
    ORDER BY highlight DESC, created_at DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Gagal ambil review:", err);
      return res.status(500).json([]);
    }

    res.json(results);
  });
});

app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});
