# Hướng dẫn tích hợp Firebase Authentication cho LaptopNVT

## Tổng quan
Sau khi tích hợp Firebase:
- Mật khẩu được hash và lưu trên server Google (không còn plain text trong localStorage)
- Hỗ trợ đăng nhập bằng Google với 1 click
- Tự động gửi email xác minh khi đăng ký
- Reset mật khẩu qua email
- Đăng nhập đồng bộ trên nhiều thiết bị
- Firebase miễn phí cho đến 10,000 user/tháng

---

## BƯỚC 1 — Tạo Firebase Project

1. Truy cập https://console.firebase.google.com
2. Click **"Add project"** → đặt tên: `LaptopNVT`
3. Tắt Google Analytics (không cần) → Click **"Create project"**
4. Đợi 30 giây → Click **"Continue"**

---

## BƯỚC 2 — Bật Authentication

1. Menu trái → **"Build"** → **"Authentication"**
2. Click **"Get started"**
3. Tab **"Sign-in method"** → bật các provider:
   - **Email/Password** → Enable → Save
   - **Google** → Enable → nhập email hỗ trợ → Save

---

## BƯỚC 3 — Tạo Firestore Database (lưu thông tin user)

1. Menu trái → **"Build"** → **"Firestore Database"**
2. Click **"Create database"**
3. Chọn **"Start in test mode"** (sẽ thiết lập rules sau)
4. Chọn region: `asia-southeast1` (Singapore, gần Việt Nam nhất)
5. Click **"Done"**

---

## BƯỚC 4 — Lấy Firebase Config

1. Bánh răng ⚙️ góc trái → **"Project settings"**
2. Kéo xuống mục **"Your apps"** → Click icon **"</>"** (Web)
3. Đặt tên app: `LaptopNVT Web` → Click **"Register app"**
4. Copy đoạn config (trông như thế này):

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "laptopnvt.firebaseapp.com",
  projectId: "laptopnvt",
  storageBucket: "laptopnvt.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

5. **Paste config này vào file `js/firebase-config.js`** (xem file đính kèm)

---

## BƯỚC 5 — Thiết lập Firestore Security Rules

1. Firestore → Tab **"Rules"** → dán rules sau:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Addresses: only owner can access
    match /addresses/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Orders: user can read own orders, only authenticated can create
    match /orders/{orderId} {
      allow read: if request.auth != null && 
                     (resource.data.userId == request.auth.uid || 
                      request.auth.token.email == 'nguyenvietthao1208@gmail.com');
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
                      request.auth.token.email == 'nguyenvietthao1208@gmail.com';
    }
    // Products: anyone can read, only admin can write
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null && 
                      request.auth.token.email == 'nguyenvietthao1208@gmail.com';
    }
  }
}
```

2. Click **"Publish"**

---

## BƯỚC 6 — Cập nhật file JS

Thay thế `js/auth.js` bằng `js/auth-firebase.js` (file đính kèm).
Thêm `js/firebase-config.js` vào thư mục js/.
Cập nhật `index.html` theo hướng dẫn trong file đính kèm.

---

## Cấu trúc dữ liệu Firestore

```
Firestore
├── users/
│   └── {uid}/          ← Document ID = Firebase UID
│       ├── firstName: "Thảo"
│       ├── lastName: "Nguyễn Việt"
│       ├── email: "..."
│       ├── phone: "0794..."
│       ├── address: "..."
│       ├── role: "customer"
│       └── joined: "2025-01-01"
│
├── addresses/
│   └── {uid}/
│       └── list: [{name, phone, street, ...}]
│
├── orders/
│   └── {orderId}/
│       ├── userId: "uid..."
│       ├── code: "NVT-123456"
│       ├── items: [...]
│       ├── total: 39990000
│       └── status: "Đang xử lý"
│
└── products/           ← Tuỳ chọn: migrate products lên đây
    └── {productId}/
        └── ...
```
