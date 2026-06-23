const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "127.0.0.1",
  user: "root",
  password: "",
  port: 3307,
});

db.connect((err) => {
  if (err) {
    console.error(err);
    return;
  }

  console.log("BERHASIL CONNECT");
});