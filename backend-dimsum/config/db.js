const mysql = require("mysql2");

// Membuat koneksi ke database
const connectionUri = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PRIVATE_URL || process.env.MYSQL_URL_NON_POOLED;
let db;

if (connectionUri) {
  db = mysql.createConnection(connectionUri);
} else {
  db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "dimsum_db",
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3307
  });
}

// Menjalankan proses koneksi
db.connect((err) => {
  if (err) {
    console.error("❌ Koneksi database gagal: " + err.stack);
    return;
  }
  console.log("✅ MySQL Terhubung dengan ID: " + db.threadId);
});

// Penanganan error untuk mencegah aplikasi berhenti tiba-tiba (Connection Lost)
db.on('error', (err) => {
  console.error('⚠️ Database error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.error('Koneksi database terputus. Silakan restart server.');
  } else {
    throw err;
  }
});

module.exports = db;