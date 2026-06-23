// =====================
// 🌐 KONFIGURASI BACKEND
// =====================
const API_URL = "http://localhost:3001/api";

// =====================
// 📊 DASHBOARD LOGIC
// =====================
async function updateDashboardStats() {
  const totalProduk = document.getElementById("totalProduk");
  const totalPendapatan = document.getElementById("totalPendapatan");
  const totalOrder = document.getElementById("totalOrder");

  if (!totalProduk || !totalPendapatan || !totalOrder) return;

  try {
    const response = await fetch(`${API_URL}/stats`);
    const data = await response.json();

    totalProduk.innerText = data.total_produk;
    totalPendapatan.innerText =
      "Rp " + parseInt(data.total_pendapatan).toLocaleString("id-ID");
    totalOrder.innerText = data.total_order;
  } catch (error) {
    console.error("Gagal ambil dashboard stats:", error);
  }
}

function loadDashboard() {
  updateDashboardStats();
}

// =====================
// 🍜 PRODUCTS LOGIC
// =====================
async function renderProduk() {
  const container = document.getElementById("listProduk");
  if (!container) return;

  try {
    const response = await fetch(`${API_URL}/products`);
    const produk = await response.json();

    container.innerHTML = "";

    if (!produk.length) {
      container.innerHTML = "<p>Belum ada produk di database.</p>";
      return;
    }

    produk.forEach((item) => {
      let rawImgName = item.gambar || "";

      if (rawImgName.startsWith("gambar/")) {
        rawImgName = rawImgName.replace("gambar/", "");
      }

      const finalImgPath = `../gambar/${encodeURIComponent(rawImgName.trim())}`;

      container.innerHTML += `
        <div class="card">
          <div style="width:100%; height:150px; overflow:hidden; border-radius:10px;">
            <img src="${finalImgPath}" alt="${item.nama}" 
                 style="width:100%; height:100%; object-fit:cover;"
                 onerror="this.src='https://via.placeholder.com/150'">
          </div>

          <h4>${item.nama}</h4>
          <p>Rp ${parseInt(item.harga).toLocaleString("id-ID")}</p>

          <button class="btn btn-danger"
            onclick="hapusProduk(${item.id})">
            Hapus
          </button>
        </div>
      `;
    });
  } catch (error) {
    container.innerHTML =
      "<p style='color:red;'>Gagal terhubung ke server backend.</p>";

    console.error("Error renderProduk:", error);
  }
}

async function hapusProduk(id) {
  if (!confirm("Yakin ingin menghapus produk ini?")) return;

  try {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      renderProduk();
      loadDashboard();
    }
  } catch (error) {
    alert("Gagal menghapus produk ❌");
    console.error(error);
  }
}

// =====================
// 🧾 ORDERS LOGIC
// =====================
let allOrders = [];
async function renderOrders() {
  const container = document.getElementById("listOrder");
  if (!container) return;

  try {
    const response = await fetch(`${API_URL}/orders`);
    allOrders = await response.json();
    const orders = allOrders;

    container.innerHTML = "";

    if (!orders.length) {
      container.innerHTML = `
        <tr>
          <td colspan="8" class="empty-order">
            Belum ada order masuk.
          </td>
        </tr>
      `;
      return;
    }

    for (const order of orders) {
      let itemsText = "-";

      try {
        const itemRes = await fetch(`${API_URL}/orders/${order.id}/items`);
        const items = await itemRes.json();

        if (items.length > 0) {
          itemsText = items
            .map((item) => `${item.nama_produk} x${item.jumlah || item.qty}`)
            .join(", ");
        }
      } catch (err) {
        console.error("Gagal ambil item:", err);
      }

      let statusClass = "pending";

      switch ((order.status || "").toLowerCase()) {
        case "diproses":
          statusClass = "diproses";
          break;
        case "selesai":
          statusClass = "selesai";
          break;
        case "dibatalkan":
          statusClass = "dibatalkan";
          break;
      }

      container.innerHTML += `
        <tr>
         <td>#${order.id}</td>

        <td>
        <span class="customer-name">${order.nama}</span>
        <span class="customer-phone">${order.telepon}</span>
        </td>

          <td>${itemsText}</td>

          <td>
            Rp ${parseInt(order.total).toLocaleString("id-ID")}
          </td>

          <td>${order.metode_pembayaran}</td>

<td>
  ${
    order.bukti_bayar
      ? `<a href="http://localhost:3001/upload/${order.bukti_bayar}"
            target="_blank"
            class="btn-bukti">
            Lihat Bukti
         </a>`
      : "-"
  }
</td>

          <td>
            <span class="status-${statusClass}">
              ${order.status || "Pending"}
            </span>
          </td>

          <td>
            ${new Date(order.created_at).toLocaleDateString("id-ID")}
          </td>

          <td>
           <div class="order-actions">
          <button class="process-btn"
        onclick="cetakStruk(${order.id})">
      Struk
    </button>

    <button class="complete-btn"
      onclick="openCustomerChat('${order.user_key}')">
      Chat
    </button>

    <button class="process-btn"
      onclick="updateStatus(${order.id}, 'Diproses')">
      Proses
    </button>

    <button class="complete-btn"
      onclick="updateStatus(${order.id}, 'Selesai')">
      Selesai
    </button>

    <button class="cancel-btn"
      onclick="updateStatus(${order.id}, 'Dibatalkan')">
      Batalkan
    </button>
  </div>
</td>
        </tr>
      `;
    }
  } catch (error) {
    console.error("Gagal memuat order:", error);

    container.innerHTML = `
      <tr>
        <td colspan="8" class="empty-order" style="color:red;">
          Gagal memuat data order.
        </td>
      </tr>
    `;
  }
}

setupOrderFilters();
// =====================
// 🔎 SEARCH + FILTER ORDER
// =====================
function setupOrderFilters() {
  const searchInput = document.getElementById("searchOrder");
  const filterSelect = document.getElementById("filterStatus");

  function filterOrders() {
    const searchValue =
      document.getElementById("searchOrder")?.value.toLowerCase().trim() || "";

    const statusValue =
      document.getElementById("filterStatus")?.value.toLowerCase() || "";

    const rows = document.querySelectorAll("#listOrder tr");

    rows.forEach((row) => {
      const orderId =
        row
          .querySelector("td:nth-child(1) strong")
          ?.innerText.toLowerCase()
          .trim() || "";

      const customerName =
        row
          .querySelector("td:nth-child(2) strong")
          ?.innerText.toLowerCase()
          .trim() || "";

      const statusCell =
        row.querySelector(".status-badge")?.innerText.toLowerCase().trim() ||
        "";

      const matchSearch =
        orderId.includes(searchValue) || customerName.includes(searchValue);

      const matchStatus = !statusValue || statusCell.includes(statusValue);

      row.style.display = matchSearch && matchStatus ? "" : "none";
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", filterOrders);
  }

  if (filterSelect) {
    filterSelect.addEventListener("change", filterOrders);
  }
}

// =====================
// 🔄 UPDATE STATUS ORDER
// =====================
async function updateStatus(orderId, statusBaru) {
  try {
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: statusBaru,
      }),
    });

    const result = await response.json();

    if (result.success || result.message) {
      alert("Status berhasil diupdate!");
      renderOrders();
      loadDashboard();
    } else {
      alert("Gagal update status");
    }
  } catch (error) {
    console.error("Error update status:", error);
    alert("Server error");
  }
}

// =====================
// 🧾 CETAK STRUK
// =====================
function cetakStruk(orderId) {
  window.open(`${API_URL}/orders/${orderId}/receipt`, "_blank");
}

// =====================
// 🚀 INITIALIZATION
// =====================
document.addEventListener("DOMContentLoaded", () => {
  updateDashboardStats();

  if (document.getElementById("listProduk")) {
    renderProduk();
  }
});

async function sendAdminReply(customMessage = null) {
  if (!selectedCustomer) {
    alert("Pilih customer dulu.");
    return;
  }

  const input = document.getElementById("adminReplyInput");
  const message = customMessage || input.value.trim();

  if (!message) return;

  try {
    const response = await fetch("http://localhost:3001/api/livechat/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_key: selectedCustomer,
        nama: "Admin",
        sender: "admin",
        message: message,
      }),
    });

    const result = await response.json();

    if (result.success) {
      loadCustomerChat(selectedCustomer);

      if (!customMessage) {
        input.value = "";
      }
    } else {
      alert("Gagal mengirim balasan.");
    }
  } catch (err) {
    console.error("Gagal kirim admin reply:", err);
  }
}

async function loadChatCustomers() {
  const res = await fetch("http://localhost:3001/api/livechat/customers");
  const customers = await res.json();

  const list = document.getElementById("chatUserList");

  if (!list) return;

  list.innerHTML = "";

  customers.forEach((cust) => {
    const isActive = selectedCustomer === cust.user_key ? "active" : "";

    list.innerHTML += `
  <div class="chat-user-item ${isActive}" 
       onclick="loadCustomerChat('${cust.user_key}')">
    
    <div class="customer-info">
      <strong>${cust.nama}</strong>
      <small>
        ${
          cust.last_time
            ? new Date(cust.last_time).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : ""
        }
      </small>
    </div>

    ${cust.unread > 0 ? `<span class="unread-badge">${cust.unread}</span>` : ""}

  </div>
`;
  });
}

async function loadCustomerChat(userKey) {
  selectedCustomer = userKey;

  await fetch(`http://localhost:3001/api/livechat/read/${userKey}`, {
    method: "PUT",
  });

  document.querySelectorAll(".chat-user-item").forEach((item) => {
    item.classList.remove("active");
  });

  const selectedItem = document.querySelector(
    `[onclick="loadCustomerChat('${userKey}')"]`,
  );

  if (selectedItem) {
    selectedItem.classList.add("active");
  }

  try {
    const res = await fetch(`http://localhost:3001/api/livechat/${userKey}`);

    const chats = await res.json();

    const body = document.getElementById("chatBody");
    const title = document.getElementById("chatCustomerName");

    if (!body) return;

    title.innerText = "Chat Customer";
    body.innerHTML = "";

    chats.forEach((chat) => {
      body.innerHTML += `
        <div class="chat-message ${chat.sender}">
          ${chat.message}
        </div>
      `;
    });

    body.scrollTop = body.scrollHeight;
  } catch (err) {
    console.error("Gagal load chat:", err);
  }
}

let selectedCustomer = null;

function quickReply(message) {
  sendAdminReply(message);
}

document.addEventListener("DOMContentLoaded", () => {
  loadChatCustomers();

  const params = new URLSearchParams(window.location.search);
  const targetUser = params.get("user");

  if (targetUser) {
    setTimeout(() => {
      loadCustomerChat(targetUser);
    }, 500);
  }

  setInterval(async () => {
    await loadChatCustomers();
  }, 3000);
});

function openCustomerChat(userKey) {
  window.location.href = `livechat.html?user=${encodeURIComponent(userKey)}`;
}

async function loadAdminReviews() {
  const table = document.getElementById("reviewTable");
  if (!table) return;

  try {
    const res = await fetch(`${API_URL}/admin/reviews`);
    allAdminReviews = await res.json();

    renderAdminReviews(allAdminReviews);
    updateReviewStats(allAdminReviews);
  } catch (err) {
    console.error("Gagal load review admin:", err);
  }
}

async function deleteReview(id) {
  if (!confirm("Hapus review ini?")) return;

  await fetch(`${API_URL}/admin/reviews/${id}`, {
    method: "DELETE",
  });

  loadAdminReviews();
}

async function highlightReview(id) {
  await fetch(`${API_URL}/admin/reviews/highlight/${id}`, {
    method: "PUT",
  });

  loadAdminReviews();
}

async function unhighlightReview(id) {
  await fetch(`${API_URL}/admin/reviews/unhighlight/${id}`, {
    method: "PUT",
  });

  loadAdminReviews();
}

async function markSpam(id) {
  await fetch(`${API_URL}/admin/reviews/spam/${id}`, {
    method: "PUT",
  });

  loadAdminReviews();
}

function updateReviewStats(reviews) {
  document.getElementById("totalReview").innerText = reviews.length;

  const highlightCount = reviews.filter(
    (r) => Number(r.highlight) === 1,
  ).length;

  const spamCount = reviews.filter((r) => Number(r.spam) === 1).length;

  const avg =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length
        ).toFixed(1)
      : "0.0";

  document.getElementById("highlightReview").innerText = highlightCount;
  document.getElementById("spamReview").innerText = spamCount;
  document.getElementById("avgReview").innerText = avg;
}

let allAdminReviews = [];

function filterReviewsAdmin() {
  const keyword = document.getElementById("reviewSearch").value.toLowerCase();

  const filter = document.getElementById("reviewFilter").value;

  let filtered = allAdminReviews.filter((review) => {
    const matchKeyword =
      review.nama.toLowerCase().includes(keyword) ||
      review.review.toLowerCase().includes(keyword);

    let matchFilter = true;

    if (filter === "highlight") {
      matchFilter = Number(review.highlight) === 1;
    } else if (filter === "spam") {
      matchFilter = Number(review.spam) === 1;
    } else if (filter !== "all") {
      matchFilter = Number(review.rating) === Number(filter);
    }

    return matchKeyword && matchFilter;
  });

  renderAdminReviews(filtered);
}

function renderAdminReviews(reviews) {
  const table = document.getElementById("reviewTable");
  if (!table) return;

  table.innerHTML = "";

  reviews.forEach((review) => {
    table.innerHTML += `
      <tr>
        <td>${review.nama}</td>
        <td><span class="rating-badge">${review.rating}⭐</span></td>
        <td>${review.review}</td>
        <td>${new Date(review.created_at).toLocaleDateString("id-ID")}</td>

<td>
  ${
    review.spam == 1
      ? '<span class="status-spam">Spam</span>'
      : review.highlight == 1
        ? '<span class="status-highlight">Highlight</span>'
        : '<span class="status-normal">Normal</span>'
  }
</td>

<td>
  <div class="review-actions">
            <button class="highlight-btn"
  onclick="${review.highlight == 1 ? `unhighlightReview(${review.id})` : `highlightReview(${review.id})`}">
  ${review.highlight == 1 ? "❌ Unhighlight" : "⭐ Highlight"}
</button>

            <button class="spam-btn" onclick="markSpam(${review.id})">
              🚫 Spam
            </button>

            <button class="delete-btn" onclick="deleteReview(${review.id})">
              🗑 Hapus
            </button>
          </div>
        </td>
      </tr>
    `;
  });
}

async function loadDashboardReviewStats() {
  try {
    const res = await fetch(`${API_URL}/admin/reviews`);
    const reviews = await res.json();

    document.getElementById("dashboardTotalReview").innerText = reviews.length;

    document.getElementById("dashboardHighlightReview").innerText =
      reviews.filter((r) => Number(r.highlight) === 1).length;

    document.getElementById("dashboardSpamReview").innerText = reviews.filter(
      (r) => Number(r.spam) === 1,
    ).length;

    const avg =
      reviews.length > 0
        ? (
            reviews.reduce((sum, r) => sum + Number(r.rating), 0) /
            reviews.length
          ).toFixed(1)
        : "0.0";

    document.getElementById("dashboardAvgReview").innerText = avg;
  } catch (err) {
    console.error("Gagal load dashboard review stats:", err);
  }
}

function exportReviewPDF() {
  window.open(`${API_URL}/admin/reviews/export/pdf`, "_blank");
}

function exportReviewExcel() {
  window.open(`${API_URL}/admin/reviews/export/excel`, "_blank");
}
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");

  if (sidebar) {
    sidebar.classList.toggle("show");
  }
}
