-- DDL untuk Tabel Project Dimsum (otomatis dijalankan saat server start)
-- 1. Tabel Users
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NULL, -- Nullable karena login Google tidak pakai password
  `role` VARCHAR(50) DEFAULT 'user',
  `otp` VARCHAR(10) NULL,
  `otp_expired` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Tabel Products
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nama` VARCHAR(255) NOT NULL,
  `harga` INT NOT NULL,
  `gambar` VARCHAR(255) NOT NULL,
  `deskripsi` TEXT NULL,
  `stok` INT DEFAULT 100,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Tabel Orders
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `nama` VARCHAR(255) NOT NULL,
  `telepon` VARCHAR(50) NOT NULL,
  `alamat` TEXT NOT NULL,
  `metode_pembayaran` VARCHAR(100) NOT NULL,
  `status` VARCHAR(50) DEFAULT 'pending',
  `catatan` TEXT NULL,
  `subtotal` INT DEFAULT 0,
  `ongkir` INT DEFAULT 0,
  `total` INT NOT NULL,
  `bukti_bayar` VARCHAR(255) NULL,
  `user_key` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Tabel Order Items (Detail item per order)
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `product_id` INT NULL,
  `nama_produk` VARCHAR(255) NOT NULL,
  `jumlah` INT NOT NULL,
  `harga` INT NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Tabel Live Chat
CREATE TABLE IF NOT EXISTS `live_chat` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_key` VARCHAR(255) NOT NULL,
  `nama` VARCHAR(255) NULL,
  `sender` VARCHAR(50) NOT NULL, -- 'user' atau 'admin'
  `message` TEXT NOT NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Tabel Reviews
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NULL,
  `product_id` INT NULL,
  `user_key` VARCHAR(255) NULL,
  `nama` VARCHAR(255) NOT NULL,
  `rating` INT NOT NULL,
  `review` TEXT NOT NULL,
  `spam` TINYINT(1) DEFAULT 0,
  `highlight` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
