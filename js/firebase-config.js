/* ══════════════════════════════════════════════
   js/firebase-config.js — Cấu hình Firebase
   ══════════════════════════════════════════════ */

/* Config Firebase của bạn */
window._fbConfig = {
  apiKey:            "AIzaSyBQAnQRuFnwwQ7gckibXzFvoBNsxDbT1nE",
  authDomain:        "laptopnvt-test1.firebaseapp.com",
  projectId:         "laptopnvt-test1",
  storageBucket:     "laptopnvt-test1.firebasestorage.app",
  messagingSenderId: "379908864005",
  appId:             "1:379908864005:web:35f41db6fd2d3bd7f7846c"
};

/* Flags — sẽ được set true sau khi module Firebase khởi tạo xong */
window.FB_CONFIGURED = true;
window.FB_AUTH       = null;
window.FB_DB         = null;
window.FB_FUNCS      = null;
window._fbReady      = false;
