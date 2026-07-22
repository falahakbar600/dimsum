/* ==========================================
    FULL JS UTAMA - DAPUR ANAK GEN Z
    ========================================== */

// ===== 1. DATA GLOBAL & INISIALISASI =====
let keranjang = [];

// 🔥 SAFE LOAD (ANTI ERROR DATA RUSAK)
try {
  const userKey = localStorage.getItem("userKey");
  const data = JSON.parse(localStorage.getItem("keranjang_" + userKey));
  keranjang = Array.isArray(data) ? data : [];
} catch (e) {
  keranjang = [];
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DATA AWAL:", keranjang);

  createToastContainer();
  updateCartCount();
  loadProductsFromAPI();
  renderKeranjang();

  initQRISValidation();
  initFormValidation();
  initContactValidation();
  initHamburgerMenu();
  updateQRISState();
  updateCheckoutButton();
  cekStatusPesananUser();
  setInterval(cekStatusPesananUser, 5000);
});

// ===== 2. FORMAT RUPIAH =====
function formatRupiah(angka) {
  angka = Number(angka) || 0;
  return "Rp " + angka.toLocaleString("id-ID");
}

// ===== 3. API FETCH PRODUK =====
function loadProductsFromAPI() {
  const container = document.getElementById("menu-dynamic");
  if (!container) return;

  container.innerHTML = "";

  fetch("https://dimsum-production-216a.up.railway.app/api/products")
    .then((res) => res.json())
    .then((data) => {
      data.forEach((item) => {
        container.innerHTML += `
            <div class="menu-item" onclick="this.classList.toggle('is-flipped')">
              <div class="menu-front">
                <div class="circle-frame">
                  <img src="${item.image}" alt="${item.name}" />
                </div>
                <h3>${item.name}</h3>
              </div>
              <div class="menu-back">
                <h3>${item.name}</h3>
                <p>${item.description}</p>
                <div class="price-tag">${formatRupiah(item.price)}</div>
                
                <button class="btn-add"
                  onclick='event.stopPropagation(); tambahKeKeranjang(${JSON.stringify(
                    item.name,
                  )}, ${Number(item.price)}, ${JSON.stringify(item.image)})'>
                  + Keranjang
                </button>
              </div>
            </div>
          `;
      });
    })
    .catch((err) => {
      console.error("Gagal ambil produk:", err);
      showToast("Gagal memuat produk dari database!", "error");
    });
}

// ===== 4. TOAST =====
function createToastContainer() {
  if (!document.getElementById("toast-container")) {
    const container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText =
      "position: fixed; top: 100px; right: 20px; z-index: 99999; display:flex; flex-direction:column; gap:10px;";
    document.body.appendChild(container);
  }
}

function showToast(pesan, tipe = "sukses") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast-notif";

  if (tipe === "info") {
    toast.classList.add("toast-info");
  } else {
    toast.classList.add("toast-success");
  }

  let icon = "✅";
  if (tipe === "error") icon = "❌";
  if (tipe === "peringatan") icon = "⚠️";
  if (tipe === "info") icon = "ℹ️";

  toast.innerHTML = `<span>${icon}</span><span>${pesan}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

// ===== 5. KERANJANG =====//
function tambahKeKeranjang(nama, harga, fotoUrl) {
  // 🔥 CEK LOGIN DULU
  const isLogin = localStorage.getItem("isLogin");

  if (!isLogin) {
    showToast("Harus login dulu!", "peringatan");

    // simpan halaman sekarang
    localStorage.setItem("redirectAfterLogin", window.location.href);

    // kalau pakai modal
    if (typeof openLogin === "function") {
      openLogin();
    } else {
      window.location.href = "login.html";
    }

    return; // ❌ STOP disini
  }

  // =========================
  // 🔥 CODE LAMA KAMU (JANGAN DIUBAH)
  // =========================

  console.log("FIX DATA:", nama, harga, fotoUrl);

  if (typeof nama !== "string") {
    console.error("ERROR: nama bukan string", nama);
    return;
  }

  harga = Number(harga) || 0;
  fotoUrl = String(fotoUrl);

  const existing = keranjang.find((item) => item.nama === nama);

  if (existing) {
    existing.qty += 1;
  } else {
    keranjang.push({
      id: productId, // 🔥 PENTING
      nama: nama,
      harga: harga,
      fotoUrl: fotoUrl,
      qty: 1,
    });
  }

  const userKey = localStorage.getItem("userKey");
  localStorage.setItem("keranjang_" + userKey, JSON.stringify(keranjang));
  updateCartCount();
  renderKeranjang();
  showToast(nama + " ditambahkan!");
}

function updateCartCount() {
  const count = document.getElementById("cart-count");
  if (count) {
    const totalQty = keranjang.reduce((sum, item) => sum + (item.qty || 1), 0);
    count.innerText = totalQty;
  }
}

function renderKeranjang() {
  const list = document.getElementById("cart-items-list");
  const totalElem = document.getElementById("cart-total-price");

  console.log("RENDER:", keranjang); // DEBUG

  if (!list || !totalElem) return;

  if (!keranjang || keranjang.length === 0) {
    list.innerHTML =
      '<p style="text-align:center;color:#888;padding:20px;">Keranjang kosong</p>';
    totalElem.innerText = "Rp 0";
    return;
  }

  // ===== FIX renderKeranjang TAMPILKAN CATATAN =====
  list.innerHTML = keranjang
    .map(
      (item, index) => `
      <div class="cart-item">
        <div class="product-info">
          <img src="${item.fotoUrl}" class="cart-product-img">

          <div class="product-text">
            <strong>${item.nama}</strong>
            <span class="cart-product-price">${formatRupiah(item.harga)}</span>

            ${
              item.catatan && item.catatan !== "-"
                ? `<small style="color:#666; display:block; margin-top:4px;">
                    Catatan: ${item.catatan}
                   </small>`
                : ""
            }
          </div>
        </div>

        <div class="qty-control">
          <button onclick="kurangQty(${index})">-</button>
          <span>${item.qty}</span>
          <button onclick="tambahQty(${index})">+</button>
        </div>

        <button onclick="hapusItem(${index})"
          style="background:#ff4757; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">
          Hapus
        </button>
      </div>
    `,
    )
    .join("");

  const total = keranjang.reduce(
    (sum, item) => sum + Number(item.harga) * item.qty,
    0,
  );

  totalElem.innerText = formatRupiah(total);
  const totalBayarEl = document.getElementById("total-bayar");
  if (totalBayarEl) {
    totalBayarEl.innerText = formatRupiah(total + 5000);
  }
  updateTotalHarga();
}

function tambahQty(index) {
  keranjang[index].qty += 1;
  const userKey = localStorage.getItem("userKey");
  localStorage.setItem("keranjang_" + userKey, JSON.stringify(keranjang));
  renderKeranjang();
  updateCartCount();
}

function kurangQty(index) {
  if (keranjang[index].qty > 1) {
    keranjang[index].qty -= 1;
  } else {
    keranjang.splice(index, 1);
  }

  const userKey = localStorage.getItem("userKey");
  localStorage.setItem("keranjang_" + userKey, JSON.stringify(keranjang));
  renderKeranjang();
  updateCartCount();
}

function hapusItem(index) {
  const namaItem = keranjang[index].nama;
  keranjang.splice(index, 1);
  const userKey = localStorage.getItem("userKey");
  localStorage.setItem("keranjang_" + userKey, JSON.stringify(keranjang));
  renderKeranjang();
  updateCartCount();
  showToast(namaItem + " dihapus", "info");
}

// ===== 6. QRIS =====
function perbaruiTampilanPembayaran(tampilkan) {
  const qrisBox = document.getElementById("qris-display");
  if (!qrisBox) return;

  qrisBox.style.display = tampilkan ? "block" : "none";
}

// ===== VALIDASI QRIS =====
function initQRISValidation() {
  const qrisRadio = document.querySelector("input[value='QRIS']");
  const codRadio = document.querySelector("input[value='COD']");
  const qrisBox = document.getElementById("qris-display");

  if (!qrisRadio || !codRadio || !qrisBox) return;

  function isFormValid() {
    const nama = document.getElementById("customer-name")?.value.trim();
    const hp = document.getElementById("customer-phone")?.value.trim();
    const alamat = document.getElementById("customer-address")?.value.trim();
    return nama && hp && alamat;
  }

  qrisRadio.addEventListener("change", () => {
    if (isFormValid()) {
      qrisBox.style.display = "block";
      updateCheckoutButton();
    } else {
      showToast("Isi data dulu sebelum pilih QRIS!", "peringatan");
      codRadio.checked = true; // Balikin ke COD kalo data belum lengkap
    }
  });

  codRadio.addEventListener("change", () => {
    qrisBox.style.display = "none";
    updateCheckoutButton();
  });
}

// ===== 🔥 TETAP ADA =====
function updateQRISState() {}

function updateCheckoutButton() {
  const metode = document.querySelector(
    'input[name="payment-option"]:checked',
  )?.value;

  const btn = document.querySelector(".checkout-btn");

  if (!btn) return;

  if (metode === "QRIS") {
    btn.innerText = "Konfirmasi Pembayaran";
  } else {
    btn.innerText = "Pesan via WhatsApp Sekarang";
  }
}

// ===== 7. CHECKOUT (DATABASE + WA LENGKAP + RESET) =====
function checkoutWhatsApp() {
  if (!keranjang || keranjang.length === 0) {
    showToast("Keranjang kosong!", "peringatan");
    return;
  }

  const nama = document.getElementById("customer-name")?.value;
  const hp = document.getElementById("customer-phone")?.value;
  const alamat = document.getElementById("customer-address")?.value;
  const note = document.getElementById("customer-note")?.value;
  const metodeBayar = document.querySelector(
    'input[name="payment-option"]:checked',
  )?.value;

  if (!nama || !hp || !alamat) {
    showToast("Lengkapi data pengiriman dulu!", "peringatan");
    return;
  }

  localStorage.setItem("lastCustomerPhone", hp);
  localStorage.removeItem("notifDiproses");
  localStorage.removeItem("lastOrderId");

  const pembayaran = updateTotalHarga();

  const subtotal = pembayaran.subtotal;
  const ongkir = pembayaran.ongkir;
  const total = pembayaran.total;

  // =========================
  // 📝 SUSUN PESAN WA
  // =========================
  let pesan = `*PESANAN BARU - DAPUR ANAK GEN Z*\n`;
  pesan += `------------------------------------------\n`;
  pesan += `Daftar Pesanan:\n`;

  keranjang.forEach((item, i) => {
    pesan += `${i + 1}. ${item.nama} (x${item.qty}) - ${formatRupiah(item.harga * item.qty)}\n`;
  });

  pesan += `\nSubtotal: ${formatRupiah(subtotal)}\n`;
  pesan += `Ongkir: ${formatRupiah(ongkir)}\n`;
  pesan += `*Total Tagihan: ${formatRupiah(total)}*\n`;
  pesan += `------------------------------------------\n`;
  pesan += `*Data Pengiriman:*\n`;
  pesan += `Nama: ${nama}\n`;
  pesan += `HP: ${hp}\n`;
  pesan += `Alamat: ${alamat}\n`;
  pesan += `Metode Bayar: *${metodeBayar}*\n`;
  pesan += `Catatan: ${note || "-"}\n`;
  pesan += `------------------------------------------\n`;

  if (metodeBayar === "QRIS") {
    pesan += `_(Pembayaran via QRIS, mohon upload bukti pembayaran)_`;
  }

  // =========================
  // 🔥 KIRIM KE DATABASE
  // =========================
  fetch("https://dimsum-production-216a.up.railway.app/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: localStorage.getItem("userId"),
      nama,
      telepon: hp,
      alamat,
      metode_pembayaran: metodeBayar,
      catatan: note,
      subtotal,
      ongkir,
      total,
      items: keranjang,
      user_key:
        localStorage.getItem("userKey") ||
        localStorage.getItem("userEmail") ||
        localStorage.getItem("email") ||
        hp,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      const userKey = localStorage.getItem("userKey");

      let orderHistory =
        JSON.parse(localStorage.getItem("orders_" + userKey)) || [];

      orderHistory.push({
        id: data.order_id,
        tanggal: new Date().toLocaleString("id-ID"),
        items: [...keranjang],
        nama,
        hp,
        alamat,
        metode: metodeBayar,
        catatan: note || "-",
        subtotal,
        ongkir,
        total,
        status: metodeBayar === "COD" ? "Diproses" : "Menunggu Verifikasi",
      });

      localStorage.setItem("orders_" + userKey, JSON.stringify(orderHistory));
      localStorage.setItem("lastOrderId", data.order_id);
      localStorage.setItem("lastOrderTotal", total);

      if (metodeBayar === "COD") {
        // =========================
        // 🚀 COD = LANGSUNG WA
        // =========================
        window.open(
          "https://wa.me/6281219520330?text=" + encodeURIComponent(pesan),
          "_blank",
        );

        localStorage.setItem("pendingOrder", "true");

        showToast("Pesanan COD berhasil dikirim!");

        keranjang = [];

        const userKey = localStorage.getItem("userKey");
        localStorage.setItem("keranjang_" + userKey, JSON.stringify([]));

        renderKeranjang();
        updateCartCount();

        document.getElementById("customer-name").value = "";
        document.getElementById("customer-phone").value = "";
        document.getElementById("customer-address").value = "";
        document.getElementById("customer-note").value = "";

        const codRadio = document.querySelector("input[value='COD']");
        if (codRadio) codRadio.checked = true;

        const qrisBox = document.getElementById("qris-display");
        if (qrisBox) qrisBox.style.display = "none";
      } else {
        // =========================
        // 🔥 QRIS = UPLOAD BUKTI
        // =========================
        showToast("Pesanan berhasil dibuat. Upload bukti pembayaran.", "info");

        keranjang = [];

        const userKey = localStorage.getItem("userKey");
        localStorage.setItem("keranjang_" + userKey, JSON.stringify([]));

        renderKeranjang();
        updateCartCount();

        const uploadSection = document.getElementById("upload-payment-section");

        if (uploadSection) {
          uploadSection.style.display = "block";
        }

        const statusMessage = document.getElementById("payment-status-message");

        if (statusMessage) {
          statusMessage.innerHTML =
            "Pesanan tersimpan. Silakan upload bukti pembayaran.";
        }

        // 🔥 Tombol checkout berubah
        const checkoutBtn = document.querySelector(".checkout-btn");

        if (checkoutBtn) {
          checkoutBtn.style.display = "none";
          checkoutBtn.disabled = true;
          checkoutBtn.style.background = "#999";
          checkoutBtn.style.cursor = "not-allowed";
        }
      }
    })
    .catch((err) => {
      console.error("Database Error:", err);
      showToast("Gagal menyimpan pesanan!", "error");
    });
}

// ===== 8. VALIDASI FORM CHECKOUT =====
function initFormValidation() {
  const namaInput = document.getElementById("customer-name");
  const phoneInput = document.getElementById("customer-phone");

  if (!namaInput || !phoneInput) return;

  namaInput.addEventListener("input", () => {
    namaInput.value = namaInput.value.replace(/[^a-zA-Z\s]/g, "");
  });

  phoneInput.addEventListener("input", () => {
    phoneInput.value = phoneInput.value.replace(/[^0-9]/g, "");
  });
}

// ===== 9. VALIDASI FORM KONTAK =====
function initContactValidation() {
  const nama = document.querySelector("input[placeholder='Your Name']");
  const phone = document.querySelector("input[placeholder='Contact No']");

  if (!nama || !phone) return;

  nama.addEventListener("input", () => {
    nama.value = nama.value.replace(/[^a-zA-Z\s]/g, "");
  });

  phone.addEventListener("input", () => {
    phone.value = phone.value.replace(/[^0-9]/g, "");
  });
}

// ===== 10. HAMBURGER MENU (SOLUSI TOMBOL TIDAK BISA DIPENCET) =====
function initHamburgerMenu() {
  // Ambil elemen berdasarkan class yang umum dipakai (sesuaikan jika class di HTML berbeda)
  const menuIcon =
    document.querySelector(".navbar-toggler") ||
    document.querySelector(".hamburger-menu") ||
    document.querySelector(".menu-icon");
  const navList =
    document.querySelector(".nav-list") ||
    document.querySelector(".navbar-nav") ||
    document.querySelector(".menu-wrapper");

  if (menuIcon && navList) {
    menuIcon.addEventListener("click", (e) => {
      e.stopPropagation(); // Biar tidak bentrok dengan klik lain
      navList.classList.toggle("active");
      console.log("Hamburger diklik!"); // Cek di konsol browser
    });

    // Menutup menu saat link di dalamnya diklik
    document.querySelectorAll(".nav-list a").forEach((link) => {
      link.addEventListener("click", () => {
        navList.classList.remove("active");
      });
    });
  }
}

function openLogin() {
  document.getElementById("loginModal").style.display = "flex";
  document.body.style.overflow = "hidden";
}

function closeLogin() {
  document.getElementById("loginModal").style.display = "none";
  document.body.style.overflow = "auto";
}

window.onclick = function (e) {
  const modal = document.getElementById("loginModal");
  if (e.target === modal) {
    closeLogin();
  }
};

function toggleLang() {
  const menu = document.getElementById("langMenu");
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}

// 🔥 DATA TRANSLATE
const translations = {
  id: {
    home: "Home",
    menu: "Menu",
    about: "Tentang Kami",
    contact: "Kontak",
    title: "Dimsum Anak GEN Z",
    subtitle: "Pelopor Dimsum Kaki 5 - Tangerang Selatan",
  },

  en: {
    home: "Home",
    menu: "Menu",
    about: "About Us",
    contact: "Contact",
    title: "Dimsum Anak GEN Z",
    subtitle: "Street Dimsum Pioneer - South Tangerang",
  },
};

function setLang(lang) {
  localStorage.setItem("lang", lang);

  document.querySelectorAll("[data-lang]").forEach((el) => {
    const key = el.getAttribute("data-lang");

    if (translations[lang][key]) {
      el.innerText = translations[lang][key];
    }
  });

  const menu = document.getElementById("langMenu");
  if (menu) {
    menu.style.display = "none"; // 🔥 tambah ini
  }
}

function toggleLang() {
  const menu = document.getElementById("langMenu");
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}

document.addEventListener("DOMContentLoaded", () => {
  const savedLang = localStorage.getItem("lang") || "id";

  if (typeof setLang === "function") {
    setLang(savedLang);
  }
});

// ===== LOGIN FINAL FIX RIWAYAT KERANJANG =====
function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    showToast("Isi email dan password!", "peringatan");
    return;
  }

  fetch("https://dimsum-production-216a.up.railway.app/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: email,
      password: password,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        const userKey = email;

        // 🔥 SIMPAN SESSION LOGIN
        localStorage.setItem("isLogin", "true");
        localStorage.setItem("nama", data.nama || "");
        localStorage.setItem("username", data.nama || "");
        localStorage.setItem("name", data.nama || "");
        localStorage.setItem("role", data.role);
        localStorage.setItem("userId", data.id);
        localStorage.setItem("userEmail", email || "");
        localStorage.setItem("email", email || "");
        localStorage.setItem("userKey", email || "");
        localStorage.setItem("phone", data.phone || data.telepon || "");
        localStorage.setItem("telepon", data.phone || data.telepon || "");

        let savedCart = [];

        try {
          // 🔥 AMBIL CART USER
          savedCart =
            JSON.parse(localStorage.getItem("keranjang_" + userKey)) || [];
        } catch (e) {
          savedCart = [];
        }

        // 🔥 JIKA USER BELUM PUNYA CART, CEK GUEST CART
        if (savedCart.length === 0) {
          try {
            const guestCart =
              JSON.parse(localStorage.getItem("keranjang_null")) || [];

            if (guestCart.length > 0) {
              savedCart = guestCart;

              // pindahkan ke akun user
              localStorage.setItem(
                "keranjang_" + userKey,
                JSON.stringify(savedCart),
              );

              // hapus cart guest
              localStorage.removeItem("keranjang_null");
            }
          } catch (e) {
            console.log("Guest cart kosong");
          }
        }

        // 🔥 GLOBAL CART
        keranjang = savedCart;

        // 🔥 SIMPAN FINAL
        localStorage.setItem("keranjang_" + userKey, JSON.stringify(keranjang));

        // 🔥 UPDATE UI
        updateCartCount();
        renderKeranjang();

        showToast("Login berhasil!", "sukses");

        if (data.role === "admin") {
          window.location.href = "admin/dashboard.html";
        } else {
          const redirectPage = localStorage.getItem("redirectAfterLogin");

          if (redirectPage) {
            localStorage.removeItem("redirectAfterLogin");
            window.location.href = redirectPage;
          } else {
            window.location.href = "menu.html";
          }
        }
      } else {
        showToast(data.message, "error");
      }
    })
    .catch((err) => {
      console.error(err);
      showToast("Server error!", "error");
    });
}

// ===== LOGIN STATUS NAVBAR =====
function checkLoginStatus() {
  const isLogin = localStorage.getItem("isLogin");
  const role = localStorage.getItem("role");
  const nama = localStorage.getItem("nama") || "User";

  const authMenu = document.querySelector(".auth-menu");

  // 🔥 Jika elemen tidak ada di halaman ini, hentikan
  if (!authMenu) return;

  if (isLogin === "true") {
    if (role === "admin") {
      authMenu.innerHTML = `
          <span>Halo, ${nama}</span>
          <a href="admin/dashboard.html">Dashboard</a>
          <a href="#" onclick="logout()">Logout</a>
        `;
    } else {
      authMenu.innerHTML = `
          <span>Halo, ${nama}</span>
          <a href="#" onclick="logout()">Logout</a>
        `;
    }
  } else {
    authMenu.innerHTML = `
        <a href="#" onclick="openLogin()">Masuk</a>
        <a href="register.html">Daftar</a>
      `;
  }
}

function register() {
  const nama = document.getElementById("nama").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  // validasi
  if (!nama || !email || !password) {
    alert("Semua field harus diisi!");
    return;
  }

  fetch("https://dimsum-production-216a.up.railway.app/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nama: nama,
      email: email,
      password: password,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("REGISTER:", data);

      if (data.success) {
        alert("Register berhasil!");

        // redirect ke home / login
        window.location.href = "index.html";
      } else {
        alert(data.message);
      }
    })
    .catch((err) => {
      console.error(err);
      alert("Server error!");
    });
}
document.addEventListener("DOMContentLoaded", checkLoginStatus);

function logout() {
  const userKey = localStorage.getItem("userKey");

  // Simpan keranjang user sebelum logout
  if (userKey) {
    localStorage.setItem("keranjang_" + userKey, JSON.stringify(keranjang));
  }

  // Reset global cart
  keranjang = [];

  // 🔥 HAPUS keranjang sementara/null
  localStorage.removeItem("keranjang_null");
  localStorage.removeItem("keranjang_undefined");

  // Hapus seluruh session login
  localStorage.removeItem("isLogin");
  localStorage.removeItem("role");
  localStorage.removeItem("nama");
  localStorage.removeItem("redirectAfterLogin");
  localStorage.removeItem("userKey");
  localStorage.removeItem("email");
  localStorage.removeItem("userEmail");

  localStorage.removeItem("livechat_guest");

  // Reset badge
  const count = document.getElementById("cart-count");
  if (count) count.innerText = "0";

  // Reset tampilan keranjang
  const list = document.getElementById("cart-items-list");
  const total = document.getElementById("cart-total-price");

  if (list) {
    list.innerHTML =
      '<p style="text-align:center;color:#888;padding:20px;">Keranjang kosong</p>';
  }

  if (total) {
    total.innerText = "Rp 0";
  }

  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("modernLiveChat_")) {
      localStorage.removeItem(key);
    }
  });

  // Force reload bersih tanpa cache
  window.location.replace("index.html");
}

function loginGoogle() {
  window.location.href =
    "https://dimsum-production-216a.up.railway.app/auth/google";
}

function handleGoogleLogin() {
  const params = new URLSearchParams(window.location.search);

  const nama = params.get("nama");
  const role = params.get("role");
  const email = params.get("email");
  const userId = params.get("id");

  if (nama) {
    localStorage.setItem("isLogin", "true");
    localStorage.setItem("nama", nama);
    localStorage.setItem("role", role || "user");
    localStorage.setItem("userEmail", email);
    localStorage.setItem("email", email);
    localStorage.setItem("userKey", email);
    localStorage.setItem("userId", userId);

    window.history.replaceState({}, document.title, window.location.pathname);
    
    if (role === "admin") {
      window.location.href = "admin/dashboard.html";
    } else {
      const redirectPage = localStorage.getItem("redirectAfterLogin");

      if (redirectPage) {
        localStorage.removeItem("redirectAfterLogin");
        window.location.href = redirectPage;
      } else {
        window.location.href = "menu.html";
      }
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  handleGoogleLogin();
});


function kirimOTP() {
  const emailInput = document.getElementById("emailReset");
  const button = document.getElementById("btnKirimOTP");
  const email = emailInput ? emailInput.value.trim().toLowerCase() : "";

  if (!email) {
    alert("Masukkan email!");
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Mengirim...";
  }

  fetch("https://dimsum-production-216a.up.railway.app/api/auth/send-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || "Server error");
      }
      return data;
    })
    .then((data) => {
      if (data.success) {
        alert("Kode OTP dikirim!");

        // pindah ke halaman verifikasi
        window.location.href =
          "verifikasi.html?email=" + encodeURIComponent(email);
      } else {
        alert(data.message || "Gagal mengirim OTP");
      }
    })
    .catch((err) => {
      console.error(err);
      alert(err.message || "Server error!");
    })
    .finally(() => {
      if (button) {
        button.disabled = false;
        button.textContent = "Kirim Kode Pemulihan";
      }
    });
}
// ===== FIX OTP INPUT (VERSI PASTI JALAN) =====
document.addEventListener("DOMContentLoaded", () => {
  const inputs = document.querySelectorAll(".otp-container input");

  if (inputs.length === 0) {
    console.log("OTP input tidak ditemukan");
    return;
  }

  console.log("OTP aktif"); // DEBUG

  inputs.forEach((input, index) => {
    // 🔥 BLOK HURUF DARI KEYBOARD
    input.addEventListener("keypress", (e) => {
      if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    });

    // 🔥 FILTER JIKA ADA YANG LOLOS
    input.addEventListener("input", () => {
      input.value = input.value.replace(/[^0-9]/g, "");

      if (input.value.length === 1 && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });

    // 🔥 BACKSPACE PINDAH
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && index > 0) {
        inputs[index - 1].focus();
      }
    });

    // 🔥 ANTI PASTE HURUF
    input.addEventListener("paste", (e) => {
      e.preventDefault();

      const paste = e.clipboardData.getData("text").replace(/[^0-9]/g, "");

      paste.split("").forEach((char, i) => {
        if (inputs[i]) inputs[i].value = char;
      });
    });
  });
});
// ===== OTP INPUT ONLY NUMBER =====
function initOTPInput() {
  const inputs = document.querySelectorAll(".otp-container input");

  if (!inputs.length) return; // kalau bukan halaman OTP, skip

  inputs.forEach((input, index) => {
    input.addEventListener("input", () => {
      // 🔥 HANYA ANGKA
      input.value = input.value.replace(/[^0-9]/g, "");

      // AUTO PINDAH
      if (input.value.length === 1 && index < inputs.length - 1) {
        inputs[index + 1].focus();
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && index > 0) {
        inputs[index - 1].focus();
      }
    });

    // 🔥 ANTI PASTE HURUF
    input.addEventListener("paste", (e) => {
      e.preventDefault();

      const pasteData = e.clipboardData.getData("text").replace(/[^0-9]/g, "");

      const boxes = document.querySelectorAll(".otp-container input");

      pasteData.split("").forEach((char, i) => {
        if (boxes[i]) boxes[i].value = char;
      });
    });
  });
}
// ===== PASSWORD VALIDATION (RESET PASSWORD PAGE) =====
function initPasswordValidation() {
  const passwordInput = document.getElementById("passwordBaru");

  if (!passwordInput) return; // kalau bukan halaman reset, skip

  passwordInput.addEventListener("input", () => {
    const val = passwordInput.value;

    const length = val.length >= 6;
    const upper = /[A-Z]/.test(val);
    const lower = /[a-z]/.test(val);
    const number = /[0-9]/.test(val);

    updateRule("rule-length", length);
    updateRule("rule-upper", upper);
    updateRule("rule-lower", lower);
    updateRule("rule-number", number);
  });
}

function updateRule(id, valid) {
  const el = document.getElementById(id);
  if (!el) return;

  if (valid) {
    el.classList.add("valid");
  } else {
    el.classList.remove("valid");
  }
}

function updateTotalHarga() {
  const userKey = localStorage.getItem("userKey");
  let keranjang =
    JSON.parse(localStorage.getItem("keranjang_" + userKey)) || [];

  let subtotal = 0;

  keranjang.forEach((item) => {
    subtotal += Number(item.harga) * Number(item.qty);
  });

  const ongkirSelect = document.getElementById("delivery-area");
  let ongkir = ongkirSelect ? parseInt(ongkirSelect.value) : 5000;

  // Gratis ongkir jika subtotal >= 100rb
  if (subtotal >= 100000) {
    ongkir = 0;
  }

  const total = subtotal + ongkir;

  // Update UI
  const subtotalEl = document.getElementById("subtotal-price");
  const ongkirEl = document.getElementById("shipping-price");
  const totalEl = document.getElementById("cart-total-price");

  if (subtotalEl) {
    subtotalEl.innerText = "Rp " + subtotal.toLocaleString("id-ID");
  }

  if (ongkirEl) {
    ongkirEl.innerText = "Rp " + ongkir.toLocaleString("id-ID");
  }

  if (totalEl) {
    totalEl.innerText = "Rp " + total.toLocaleString("id-ID");
  }

  const totalBayarEl = document.getElementById("total-bayar");
  if (totalBayarEl) {
    totalBayarEl.innerText = "Rp " + total.toLocaleString("id-ID");
  }

  return {
    subtotal,
    ongkir,
    total,
  };
}

// AUTO INIT
document.addEventListener("DOMContentLoaded", initPasswordValidation);

// AUTO JALAN SAAT PAGE LOAD
document.addEventListener("DOMContentLoaded", initOTPInput);

/* ==========================================
   🔥 TOGGLE PASSWORD SHOW / HIDE
   ========================================== */
function togglePassword() {
  const passwordInput =
    document.getElementById("password") ||
    document.getElementById("passwordBaru");

  const toggleIcon = document.querySelector(".toggle-password");

  if (!passwordInput || !toggleIcon) return;

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    toggleIcon.classList.remove("fa-eye");
    toggleIcon.classList.add("fa-eye-slash");
  } else {
    passwordInput.type = "password";
    toggleIcon.classList.remove("fa-eye-slash");
    toggleIcon.classList.add("fa-eye");
  }
}
/* ==========================================
   🔎 LIVE SEARCH SUPER FINAL (AKURAT)
========================================== */
async function initLiveSearch() {
  const searchInput = document.getElementById("searchInput");
  const resultsBox = document.getElementById("searchResults");

  if (!searchInput || !resultsBox) return;

  let products = [];

  try {
    const res = await fetch(
      "https://dimsum-production-216a.up.railway.app/api/products",
    );
    products = await res.json();
  } catch (err) {
    console.error("Gagal load produk:", err);
    return;
  }

  searchInput.addEventListener("input", () => {
    const keyword = searchInput.value.toLowerCase().trim();

    if (!keyword) {
      resultsBox.style.display = "none";
      resultsBox.innerHTML = "";
      return;
    }

    // 🔥 PRIORITAS:
    // 1. Nama diawali keyword
    // 2. Nama mengandung keyword
    const startsWithResults = products.filter((item) =>
      item.nama.toLowerCase().startsWith(keyword),
    );

    const includesResults = products.filter(
      (item) =>
        item.nama.toLowerCase().includes(keyword) &&
        !item.nama.toLowerCase().startsWith(keyword),
    );

    const filtered = [...startsWithResults, ...includesResults];

    if (!filtered.length) {
      resultsBox.innerHTML = `
        <div class="search-item">
          Produk tidak ditemukan
        </div>
      `;
      resultsBox.style.display = "block";
      return;
    }

    resultsBox.innerHTML = filtered
      .map((item) => {
        const imagePath = item.image;
        return `
      <div class="search-item"
           onclick='openProductModal(${JSON.stringify(item)})'>

        <img 
          src="${imagePath}"
          alt="${item.nama}"
         onerror="this.src='gambar/menu.jpeg'"
        >

        <div class="search-item-info">
          <h4>${item.nama}</h4>
          <p>Rp ${parseInt(item.harga).toLocaleString("id-ID")}</p>
        </div>

      </div>
    `;
      })
      .join("");

    resultsBox.style.display = "block";
  });

  // Klik luar = tutup
  document.addEventListener("click", (e) => {
    if (!searchInput.contains(e.target) && !resultsBox.contains(e.target)) {
      resultsBox.style.display = "none";
    }
  });
}

// AUTO INIT
document.addEventListener("DOMContentLoaded", initLiveSearch);
let modalQty = 1;
let selectedProduct = null;

function openProductModal(product) {
  selectedProduct = product;
  modalQty = 1;

  document.getElementById("modalImage").src = product.image;
  document.getElementById("modalName").innerText = product.nama;

  document.getElementById("modalPrice").innerText =
    "Rp " + parseInt(product.harga).toLocaleString("id-ID");

  document.getElementById("modalStock").innerHTML =
    product.stok > 0
      ? `Sisa stok: ${product.stok}`
      : '<span class="stok-habis">Stok Habis</span>';

  document.getElementById("modalDescription").innerText =
    product.deskripsi || "Menu spesial Dapur Anak GEN Z";

  document.getElementById("modalQty").innerText = modalQty;
  document.getElementById("modalNote").value = "";

  const cartBtn = document.querySelector(".modal-cart-btn");

  // 🔥 CEK STOK
  if (!product.stok || product.stok <= 0) {
    cartBtn.disabled = true;
    cartBtn.innerText = "Stok Habis";
    cartBtn.classList.add("disabled");
  } else {
    cartBtn.disabled = false;
    cartBtn.innerText = "Masukkan Keranjang";
    cartBtn.classList.remove("disabled");
  }

  // 🔥 LOAD RATING PRODUK DARI DATABASE
  fetch(
    `https://dimsum-production-216a.up.railway.app/api/reviews/product/${product.id}`,
  )
    .then((res) => res.json())
    .then((data) => {
      document.getElementById("productRating").innerHTML = `
        ${"⭐".repeat(Math.round(data.avg_rating || 0))}
        <span>${data.avg_rating || 0} (${data.total_reviews || 0} review)</span>
      `;
    })
    .catch((err) => {
      console.error("Gagal load rating produk:", err);

      document.getElementById("productRating").innerHTML =
        `⭐⭐⭐⭐⭐ <span>0.0 (0 review)</span>`;
    });

  updateModalTotal();

  document.getElementById("productModal").style.display = "flex";
}

function closeProductModal() {
  document.getElementById("productModal").style.display = "none";

  // Bersihkan search
  const searchInput = document.getElementById("searchInput");
  const resultsBox = document.getElementById("searchResults");

  if (searchInput) searchInput.value = "";
  if (resultsBox) {
    resultsBox.innerHTML = "";
    resultsBox.style.display = "none";
  }
}

function changeModalQty(change) {
  modalQty += change;

  if (modalQty < 1) modalQty = 1;

  document.getElementById("modalQty").innerText = modalQty;

  updateModalTotal();
}

function updateModalTotal() {
  if (!selectedProduct) return;

  const total = selectedProduct.harga * modalQty;

  document.getElementById("modalTotal").innerText =
    "Rp " + total.toLocaleString("id-ID");
}

// ===== FIX addModalToCart AGAR CATATAN MASUK KE KERANJANG + CHECKOUT =====
function addModalToCart() {
  const isLogin = localStorage.getItem("isLogin");

  if (!isLogin) {
    showToast("Harus login dulu!", "peringatan");
    localStorage.setItem("redirectAfterLogin", window.location.href);

    closeProductModal();

    if (typeof openLogin === "function") {
      openLogin();
    } else {
      window.location.href = "login.html";
    }

    return;
  }

  if (!selectedProduct) return;

  if (!selectedProduct.stok || selectedProduct.stok <= 0) return;

  // 🔥 AMBIL CATATAN DARI MODAL
  const note = document.getElementById("modalNote").value.trim();

  const existing = keranjang.find(
    (item) => item.nama === selectedProduct.nama && item.catatan === note,
  );

  if (existing) {
    existing.qty += modalQty;
  } else {
    keranjang.push({
      id: selectedProduct.id,
      nama: selectedProduct.nama,
      harga: selectedProduct.harga,
      qty: modalQty,
      fotoUrl: selectedProduct.image,
      catatan: note || "-",
    });
  }

  const userKey = localStorage.getItem("userKey");
  localStorage.setItem("keranjang_" + userKey, JSON.stringify(keranjang));

  updateCartCount();
  renderKeranjang();

  closeProductModal();

  showToast(selectedProduct.nama + " ditambahkan!");
}

window.onclick = function (e) {
  const modal = document.getElementById("productModal");
  if (e.target === modal) {
    closeProductModal();
  }
};
const cartBtn = document.querySelector(".modal-cart-btn");

async function konfirmasiPembayaranQRIS() {
  const fileInput = document.getElementById("payment-proof");
  const statusMessage = document.getElementById("payment-status-message");
  const orderId = localStorage.getItem("lastOrderId");

  if (!orderId) {
    alert("Order tidak ditemukan.");
    return;
  }

  if (!fileInput.files.length) {
    alert("Silakan upload bukti pembayaran.");
    return;
  }

  const formData = new FormData();
  formData.append("bukti", fileInput.files[0]);

  try {
    const response = await fetch(
      `https://dimsum-production-216a.up.railway.app/api/orders/${orderId}/upload-payment`,
      {
        method: "POST",
        body: formData,
      },
    );

    const result = await response.json();

    if (result.success) {
      statusMessage.innerHTML =
        "Pembayaran berhasil dikirim. Menunggu verifikasi admin.";

      statusMessage.style.color = "orange";

      showToast(
        "Bukti pembayaran berhasil dikirim! Menunggu verifikasi admin.",
        "sukses",
      );

      localStorage.removeItem("keranjang");
    } else {
      alert(result.message);
    }
  } catch (error) {
    console.error(error);
    alert("Terjadi kesalahan saat upload.");
  }
}

async function cekStatusPesananUser() {
  const hp = localStorage.getItem("lastCustomerPhone");

  if (!hp) return;

  try {
    const res = await fetch(
      `https://dimsum-production-216a.up.railway.app/api/orders/user/${hp}`,
    );
    const data = await res.json();

    if (!data.success) return;

    // =========================
    // UPDATE STATUS RIWAYAT PESANAN USER
    // =========================
    const userKey = localStorage.getItem("userKey");

    if (userKey) {
      let orders = JSON.parse(localStorage.getItem("orders_" + userKey)) || [];

      orders.forEach((order) => {
        if (order.id == data.order.id) {
          order.status = data.order.status;
        }
      });

      localStorage.setItem("orders_" + userKey, JSON.stringify(orders));
    }

    const status = data.order.status.toLowerCase();

    // 🔥 AMBIL TOTAL DARI ORDER TERAKHIR YANG DISIMPAN
    const pembayaran = updateTotalHarga();

    const totalBayarEl = document.getElementById("total-bayar");
    if (totalBayarEl) {
      totalBayarEl.innerText = formatRupiah(pembayaran.total);
    }

    console.log("CEK STATUS USER:", status);

    const statusMessage = document.getElementById("payment-status-message");

    if (!statusMessage) return;

    if (status === "menunggu_verifikasi") {
      statusMessage.innerHTML =
        "Bukti pembayaran berhasil dikirim. Menunggu verifikasi admin.";
      statusMessage.style.color = "orange";
    }

    if (status === "diproses") {
      statusMessage.innerHTML =
        "Pembayaran berhasil diverifikasi. Silakan tunggu konfirmasi admin. Admin akan menghubungi Anda melalui live chat.";
      statusMessage.style.color = "green";

      if (!localStorage.getItem("notifDiproses")) {
        showToast(
          "Pembayaran berhasil! Admin akan menghubungi Anda via live chat.",
          "sukses",
        );

        localStorage.setItem("notifDiproses", "true");

        // 🔥 KOSONGKAN KERANJANG
        keranjang = [];

        const userKey = localStorage.getItem("userKey");
        localStorage.setItem("keranjang_" + userKey, JSON.stringify([]));

        // 🔥 RESET UI
        renderKeranjang();
        updateCartCount();

        // 🔥 RESET FORM
        const namaEl = document.getElementById("customer-name");
        const hpEl = document.getElementById("customer-phone");
        const alamatEl = document.getElementById("customer-address");
        const noteEl = document.getElementById("customer-note");

        if (namaEl) namaEl.value = "";
        if (hpEl) hpEl.value = "";
        if (alamatEl) alamatEl.value = "";
        if (noteEl) noteEl.value = "";

        // 🔥 HIDE QRIS
        const qrisBox = document.getElementById("qris-display");
        if (qrisBox) qrisBox.style.display = "none";

        // 🔥 HIDE UPLOAD SECTION
        const uploadSection = document.getElementById("upload-payment-section");
        if (uploadSection) uploadSection.style.display = "none";

        // 🔥 RESET TOTAL
        updateTotalHarga();

        // 🔥 KEMBALIKAN TOMBOL
        const checkoutBtn = document.querySelector(".checkout-btn");
        if (checkoutBtn) {
          checkoutBtn.style.display = "block";
          checkoutBtn.disabled = false;
          checkoutBtn.innerText = "Pesan via WhatsApp Sekarang";
          checkoutBtn.style.background = "";
          checkoutBtn.style.cursor = "pointer";
        }
      }
    }

    if (status === "selesai") {
      statusMessage.innerHTML = "Pesanan selesai. Terima kasih telah memesan.";
      statusMessage.style.color = "blue";
    }

    if (status === "dibatalkan") {
      statusMessage.innerHTML = "Pesanan dibatalkan oleh admin.";
      statusMessage.style.color = "red";
    }
  } catch (error) {
    console.error("Gagal cek status:", error);
  }
}

document.addEventListener("DOMContentLoaded", cekStatusPesananUser);

const currentUserKey =
  localStorage.getItem("userKey") || localStorage.getItem("email") || "guest";

const liveChatKey = "livechat_" + currentUserKey;

// =========================
// MODERN LIVE CHAT SYSTEM
// =========================
function toggleModernChat() {
  const chatBox = document.getElementById("modernChatBox");

  if (!chatBox) return;

  if (chatBox.style.display === "none" || chatBox.style.display === "") {
    chatBox.style.display = "flex";
  } else {
    chatBox.style.display = "none";
  }
}

function loadModernChat() {
  const body = document.getElementById("modernChatBody");

  if (!body) return;

  let chats = JSON.parse(localStorage.getItem(liveChatKey)) || [];

  body.innerHTML = "";

  // Jika user baru / belum ada chat
  if (chats.length === 0) {
    body.innerHTML = `
      <div class="modern-chat-message admin">
        Halo! Saya admin Dapur Anak GEN Z 😊 Ada yang bisa saya bantu hari ini?
      </div>
    `;
    return;
  }

  chats.forEach((chat) => {
    body.innerHTML += `
      <div class="modern-chat-message ${chat.sender}">
        ${chat.text}
      </div>
    `;
  });

  body.scrollTop = body.scrollHeight;
}

document.addEventListener("DOMContentLoaded", loadModernChat);

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("modernChatInput");

  if (input) {
    input.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        sendModernChat();
      }
    });
  }
});

// =========================
// LIVE CHAT KHUSUS KERANJANG
// =========================
function toggleModernChat() {
  const chatBox = document.getElementById("modernChatBox");

  if (!chatBox) return;

  if (chatBox.style.display === "none" || chatBox.style.display === "") {
    chatBox.style.display = "flex";
  } else {
    chatBox.style.display = "none";
  }
}

function sendModernChat() {
  const input = document.getElementById("modernChatInput");
  const body = document.getElementById("modernChatBody");

  if (!input || !body) return;

  const message = input.value.trim();
  if (!message) return;

  // Tampilkan pesan user
  const userMsg = document.createElement("div");
  userMsg.className = "modern-chat-message user";
  userMsg.innerText = message;
  body.appendChild(userMsg);

  // Ambil data user login
  const userKey = localStorage.getItem("userKey");
  const nama = localStorage.getItem("nama") || "Customer";

  // Kirim ke backend
  fetch("https://dimsum-production-216a.up.railway.app/api/livechat/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_key: userKey,
      nama: nama,
      sender: "user",
      message: message,
    }),
  });

  input.value = "";
  body.scrollTop = body.scrollHeight;
}

async function loadModernChat() {
  const body = document.getElementById("modernChatBody");

  if (!body) return;

  const userKey = localStorage.getItem("userKey");

  if (!userKey) return;

  try {
    const res = await fetch(
      `https://dimsum-production-216a.up.railway.app/api/livechat/${userKey}`,
    );

    const chats = await res.json();

    body.innerHTML = "";

    chats.forEach((chat) => {
      const msg = document.createElement("div");

      msg.className =
        "modern-chat-message " + (chat.sender === "admin" ? "admin" : "user");

      msg.innerText = chat.message;

      body.appendChild(msg);
    });

    body.scrollTop = body.scrollHeight;
  } catch (err) {
    console.error("Gagal load live chat:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadModernChat();

  setInterval(() => {
    loadModernChat();
  }, 3000);
});

document.addEventListener("DOMContentLoaded", () => {
  const input = document.getElementById("modernChatInput");

  if (input) {
    input.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        sendModernChat();
      }
    });
  }
});

// =========================
// AUTO STATUS ORDER KE LIVE CHAT
// =========================
function kirimStatusKeLiveChat(status) {
  const body = document.getElementById("modernChatBody");
  if (!body) return;

  let pesan = "";

  if (status === "diproses") {
    pesan =
      "Pembayaran berhasil diverifikasi 😊 Pesanan Anda sedang diproses admin.";
  }

  if (status === "selesai") {
    pesan =
      "Pesanan Anda telah selesai 🎉 Terima kasih telah memesan di Dapur Anak GEN Z.";
  }

  if (status === "dibatalkan") {
    pesan =
      "Pesanan Anda dibatalkan. Silakan hubungi admin untuk informasi lebih lanjut.";
  }

  if (!pesan) return;

  const adminMsg = document.createElement("div");
  adminMsg.className = "modern-chat-message admin";
  adminMsg.innerText = pesan;

  body.appendChild(adminMsg);

  let chats = JSON.parse(localStorage.getItem(liveChatKey)) || [];

  chats.push({
    sender: "admin",
    text: pesan,
  });

  localStorage.setItem(liveChatKey, JSON.stringify(chats));

  body.scrollTop = body.scrollHeight;
}

function quickChat(pesan) {
  const input = document.getElementById("modernChatInput");

  if (!input) return;

  input.value = pesan;

  sendModernChat();
}
