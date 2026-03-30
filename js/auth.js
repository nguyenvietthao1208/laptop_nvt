/* ══════════════════════════════════════════════════════
   js/auth.js
   Tự động chọn: Firebase Auth (nếu đã cấu hình)
                 hoặc localStorage (nếu chưa cấu hình)
   ══════════════════════════════════════════════════════ */

const ADMIN_EMAIL = 'nguyenvietthao1208@gmail.com';

/* ══ HELPER FIRESTORE ══ */
async function fsGet(path, id) {
  try {
    const { doc, getDoc } = window.FB_FUNCS;
    const snap = await getDoc(doc(window.FB_DB, path, id));
    return snap.exists() ? snap.data() : null;
  } catch(e) {
    console.warn('[fsGet] Skipped:', e.code);
    return null;
  }
}
async function fsSet(path, id, data) {
  try {
    const { doc, setDoc } = window.FB_FUNCS;
    await setDoc(doc(window.FB_DB, path, id), data, { merge: true });
  } catch(e) {
    console.warn('[fsSet] Error:', e.code, e.message);
    throw e; /* Re-throw để caller biết */
  }
}
async function fsQuery(path, field, val) {
  try {
    const { collection, query, where, getDocs } = window.FB_FUNCS;
    const q = query(collection(window.FB_DB, path), where(field, '==', val));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  } catch(e) {
    /* Bỏ qua lỗi permissions — trả về mảng rỗng */
    console.warn('[fsQuery] Skipped:', e.code);
    return [];
  }
}

/* ══ RENDER AUTH ══ */
function renderAuth() {
  const a = $('navAuthArea');
  if (!curUser) {
    a.innerHTML = '<button class="hbtn" id="navLogin"><span class="hi">&#128100;</span><span>Đăng nhập</span></button>';
  } else {
    const i = (curUser.name || 'U')[0].toUpperCase();
    const photoHtml = curUser.photoURL
      ? `<img src="${curUser.photoURL}" style="width:22px;height:22px;border-radius:50%;object-fit:cover;flex-shrink:0"/>`
      : `<span style="width:22px;height:22px;border-radius:50%;background:var(--ac);color:#fff;display:flex;align-items:center;justify-content:center;font-size:.62rem;font-weight:700;flex-shrink:0">${i}</span>`;
    const displayName = curUser.firstName || curUser.name?.split(' ')[0] || 'Bạn';
    a.innerHTML = `<button class="hbtn" id="userBtn" style="flex-direction:row;gap:.36rem">${photoHtml}<span style="font-size:.7rem">${displayName}</span></button>`;
  }
  $('adminFab').classList.toggle('hid', !(curUser && curUser.role === 'admin'));
}

/* ══════════════════════════════════════════
   FIREBASE MODE
   ══════════════════════════════════════════ */
async function initFirebase() {
  const { onAuthStateChanged } = window.FB_FUNCS;

  /* Lắng nghe trạng thái đăng nhập real-time */
  onAuthStateChanged(window.FB_AUTH, async (fbUser) => {
    if (fbUser) {
      const profile = await fsGet('users', fbUser.uid) || {};
      curUser = {
        uid:      fbUser.uid,
        email:    fbUser.email,
        username: profile.username || fbUser.email.split('@')[0],
        firstName:profile.firstName || fbUser.displayName?.split(' ')[0] || '',
        lastName: profile.lastName  || fbUser.displayName?.split(' ').slice(1).join(' ') || '',
        name:     (profile.firstName || '') + ' ' + (profile.lastName || '') || fbUser.displayName || fbUser.email,
        phone:    profile.phone   || '',
        address:  profile.address || '',
        role:     fbUser.email === ADMIN_EMAIL ? 'admin' : 'customer',
        verified: fbUser.emailVerified,
        photoURL: fbUser.photoURL || null,
      };
      curUser.name = curUser.name.trim() || fbUser.email;
      /* Lắng nghe đơn hàng realtime sau khi đăng nhập */
      setTimeout(() => {
        if (typeof startRealtimeOrders === 'function') {
          startRealtimeOrders(fbUser.uid);
        }
      }, 600);
    } else {
      curUser = null;
      /* Huỷ listener khi đăng xuất */
      if (window._ordersUnsubscribe) {
        window._ordersUnsubscribe();
        window._ordersUnsubscribe = null;
      }
    }
    renderAuth();
    renderProducts?.();
    updateAdminOrdBadge?.();
  });
}

async function doLoginFirebase() {
  const u = $('lUser').value.trim(), p = $('lPass').value;
  cE(['lUE','lPE','lGE']); let ok = true;
  if (!u) { sE('lUE','Nhập email hoặc tên đăng nhập'); ok = false; }
  if (!p) { sE('lPE','Nhập mật khẩu'); ok = false; }
  if (!ok) return;

  const btn = $('btnLogin');
  btn.textContent = 'Đang đăng nhập...'; btn.disabled = true;

  try {
    const { signInWithEmailAndPassword } = window.FB_FUNCS;
    let email = u;

    /* Nếu không phải email → tìm email theo username trong Firestore */
    if (!u.includes('@')) {
      const results = await fsQuery('users', 'username', u);
      if (!results.length) { sE('lGE','Tài khoản không tồn tại'); return; }
      email = results[0].email;
    }

    const cred = await signInWithEmailAndPassword(window.FB_AUTH, email, p);

    /* Kiểm tra xác minh email — bỏ qua cho admin và email trùng ADMIN_EMAIL */
    const isAdmin = cred.user.email === ADMIN_EMAIL;
    if (!cred.user.emailVerified && !isAdmin) {
      const { signOut } = window.FB_FUNCS;
      await signOut(window.FB_AUTH);
      const ge = $('lGE');
      ge.innerHTML = '📧 Email chưa được xác minh. <a id="resendVerify" style="color:var(--ac);cursor:pointer;font-weight:600">Gửi lại email xác minh</a>';
      ge.classList.add('on');
      $('resendVerify')?.addEventListener('click', async () => {
        const { signInWithEmailAndPassword: siwep, sendEmailVerification } = window.FB_FUNCS;
        const c2 = await siwep(window.FB_AUTH, email, p);
        await sendEmailVerification(c2.user);
        const { signOut: so } = window.FB_FUNCS;
        await so(window.FB_AUTH);
        toast('📧 Đã gửi lại email xác minh!');
      });
      return;
    }

    cM('mLogin');
    toast('Xin chào! 👋');
    if ($('mCheckout').classList.contains('show')) setTimeout(() => openCheckout(), 300);

  } catch (err) {
    console.error('[Login Error]', err.code, err.message);
    const msgs = {
      'auth/user-not-found':     'Tài khoản không tồn tại',
      'auth/wrong-password':     'Mật khẩu không đúng',
      'auth/invalid-credential': 'Email hoặc mật khẩu không đúng',
      'auth/too-many-requests':  '⏳ Quá nhiều lần thử. Đợi vài phút rồi thử lại',
      'auth/user-disabled':      'Tài khoản đã bị khoá',
      'auth/email-not-verified': 'Email chưa xác minh',
      'auth/network-request-failed': 'Lỗi mạng. Kiểm tra kết nối internet',
    };
    /* Hiện lỗi chi tiết để debug */
    sE('lGE', (msgs[err.code] || err.message) + ' (' + err.code + ')');
  } finally {
    btn.textContent = 'Đăng nhập'; btn.disabled = false;
  }
}

async function doLoginGoogleFirebase() {
  try {
    const { GoogleAuthProvider, signInWithPopup } = window.FB_FUNCS;
    const provider = new GoogleAuthProvider();
    const result   = await signInWithPopup(window.FB_AUTH, provider);
    const user     = result.user;

    /* Lưu profile lần đầu */
    const existing = await fsGet('users', user.uid);
    if (!existing) {
      const parts = (user.displayName || '').split(' ');
      await fsSet('users', user.uid, {
        firstName: parts.slice(0, -1).join(' ') || parts[0] || '',
        lastName:  parts.slice(-1)[0] || '',
        email:     user.email,
        username:  user.email.split('@')[0],
        phone:     '',
        role:      user.email === ADMIN_EMAIL ? 'admin' : 'customer',
        joined:    new Date().toISOString().slice(0,10),
      });
    }
    cM('mLogin');
    toast('Đăng nhập Google thành công! 🎉');
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') {
      toast('Đăng nhập Google thất bại', 'var(--rd)');
    }
  }
}

async function doRegFirebase() {
  const ln = $('rLn').value.trim(), fn = $('rFn').value.trim();
  const un = $('rUn').value.trim(), em = $('rEm').value.trim();
  const ph = $('rPh').value.trim(), pw = $('rPw').value, pw2 = $('rPw2').value;

  cE(['rLE','rFE','rUE','rEE','rPhE','rPwE','rPw2E']); let ok = true;
  if (!ln)                { sE('rLE',  'Nhập họ'); ok = false; }
  if (!fn)                { sE('rFE',  'Nhập tên'); ok = false; }
  if (un.length < 3)      { sE('rUE',  'Tối thiểu 3 ký tự'); ok = false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { sE('rEE','Email không hợp lệ'); ok = false; }
  if (ph && !/^(0|\+84)\d{8,10}$/.test(ph))   { sE('rPhE','SĐT không hợp lệ'); ok = false; }
  if (pw.length < 6)      { sE('rPwE', 'Tối thiểu 6 ký tự'); ok = false; }
  if (pw !== pw2)         { sE('rPw2E','Mật khẩu không khớp'); ok = false; }
  if (!ok) return;

  /* Kiểm tra username trùng */
  const unCheck = await fsQuery('users', 'username', un);
  if (unCheck.length) { sE('rUE','Tên đăng nhập đã tồn tại'); return; }

  const btn = $('btnReg');
  btn.textContent = 'Đang tạo tài khoản...'; btn.disabled = true;

  try {
    const { createUserWithEmailAndPassword, sendEmailVerification } = window.FB_FUNCS;
    const cred = await createUserWithEmailAndPassword(window.FB_AUTH, em, pw);

    /* Gửi email xác minh TRƯỚC (user vẫn đang đăng nhập) */
    await sendEmailVerification(cred.user);

    /* Lưu thông tin vào Firestore TRONG KHI còn đăng nhập (request.auth hợp lệ) */
    await fsSet('users', cred.user.uid, {
      firstName: fn, lastName: ln, username: un,
      email: em, phone: ph || '',
      role: 'customer',
      joined: new Date().toISOString().slice(0,10),
    });

    /* Đăng xuất sau khi đã lưu xong */
    const { signOut } = window.FB_FUNCS;
    await signOut(window.FB_AUTH);

    cM('mReg');
    /* Mở modal thông báo xác nhận email — polling tự động đăng nhập khi xác nhận */
    setTimeout(() => {
      if (typeof openVerifyNotice === 'function') {
        openVerifyNotice(em, pw);
      } else {
        toast('📧 Kiểm tra email (kể cả thư rác) để xác nhận tài khoản!');
        oM('mLogin');
      }
    }, 300);

  } catch (err) {
    const msgs = {
      'auth/email-already-in-use': 'Email này đã được đăng ký',
      'auth/weak-password':        'Mật khẩu quá yếu',
      'auth/invalid-email':        'Email không hợp lệ',
    };
    sE('rEE', msgs[err.code] || err.message);
  } finally {
    btn.textContent = 'Tạo tài khoản'; btn.disabled = false;
  }
}

async function doLogoutFirebase() {
  const { signOut } = window.FB_FUNCS;
  await signOut(window.FB_AUTH);
  cM('mProfile'); toast('Đã đăng xuất');
}

async function doForgotPasswordFirebase() {
  const email = $('lUser').value.trim();
  if (!email || !email.includes('@')) { sE('lUE','Nhập email để reset mật khẩu'); return; }
  try {
    const { sendPasswordResetEmail } = window.FB_FUNCS;
    await sendPasswordResetEmail(window.FB_AUTH, email);
    toast('📧 Đã gửi link reset mật khẩu về ' + email);
  } catch (err) {
    sE('lGE', err.code === 'auth/user-not-found' ? 'Email chưa đăng ký' : err.message);
  }
}

async function doSaveProfileFirebase() {
  const ln = $('eLn').value.trim(), fn = $('eFn').value.trim();
  const ph = $('ePh').value.trim(), ad = $('eAd').value.trim();
  cE(['eLnE','eFnE','ePhE','eGE']); let ok = true;
  if (!ln) { sE('eLnE','Nhập họ'); ok = false; }
  if (!fn) { sE('eFnE','Nhập tên'); ok = false; }
  if (ph && !/^(0|\+84)\d{8,10}$/.test(ph)) { sE('ePhE','SĐT không hợp lệ'); ok = false; }
  if (!ok) return;

  const btn = $('btnSaveProfile');
  btn.textContent = 'Đang lưu...'; btn.disabled = true;
  try {
    await fsSet('users', window.FB_AUTH.currentUser.uid, { firstName:fn, lastName:ln, phone:ph, address:ad });
    curUser = { ...curUser, firstName:fn, lastName:ln, name:fn+' '+ln, phone:ph, address:ad };
    renderAuth(); renderProfileInfo();
    toast('Đã lưu thông tin! 🎉'); swPTab('info');
  } catch (err) { sE('eGE','Lưu thất bại: ' + err.message); }
  finally { btn.textContent = '💾 Lưu thay đổi'; btn.disabled = false; }
}

async function doSavePwdFirebase() {
  const old = $('pOld').value, nw = $('pNew').value, cf = $('pCf').value;
  cE(['pOldE','pNewE','pCfE','pGE']); let ok = true;
  if (!old) { sE('pOldE','Nhập mật khẩu hiện tại'); ok = false; }
  if (nw.length < 6) { sE('pNewE','Tối thiểu 6 ký tự'); ok = false; }
  if (nw !== cf)     { sE('pCfE','Mật khẩu không khớp'); ok = false; }
  if (!ok) return;
  try {
    const { reauthenticateWithCredential, EmailAuthProvider, updatePassword } = window.FB_FUNCS;
    const credential = EmailAuthProvider.credential(window.FB_AUTH.currentUser.email, old);
    await reauthenticateWithCredential(window.FB_AUTH.currentUser, credential);
    await updatePassword(window.FB_AUTH.currentUser, nw);
    ['pOld','pNew','pCf'].forEach(id => $(id).value = '');
    $('pwdBar').className = 'pwd-strength str-0'; $('pwdLbl').textContent = '';
    toast('Đổi mật khẩu thành công! 🔒');
  } catch (err) {
    const msgs = {
      'auth/wrong-password':        'Mật khẩu hiện tại không đúng',
      'auth/requires-recent-login': 'Phiên hết hạn. Đăng xuất và đăng nhập lại',
    };
    sE('pGE', msgs[err.code] || err.message);
  }
}

async function doDeleteAccountFirebase() {
  if (!confirm('XOÁ tài khoản vĩnh viễn? Không thể hoàn tác!')) return;
  try {
    const { deleteUser, doc, deleteDoc } = window.FB_FUNCS;
    const uid = window.FB_AUTH.currentUser.uid;
    await deleteDoc(doc(window.FB_DB, 'users', uid));
    await deleteDoc(doc(window.FB_DB, 'addresses', uid));
    await deleteUser(window.FB_AUTH.currentUser);
    cM('mProfile'); toast('Tài khoản đã bị xoá', 'var(--rd)');
  } catch (err) {
    if (err.code === 'auth/requires-recent-login')
      toast('Đăng xuất và đăng nhập lại rồi thử lại', 'var(--rd)');
    else toast('Xoá thất bại: ' + err.message, 'var(--rd)');
  }
}

/* ══════════════════════════════════════════
   LOCALSTORAGE MODE (chưa cấu hình Firebase)
   ══════════════════════════════════════════ */
function doLoginLocal() {
  const u = $('lUser').value.trim(), p = $('lPass').value;
  cE(['lUE','lPE','lGE']); let ok = true;
  if (!u) { sE('lUE','Vui lòng nhập tên đăng nhập'); ok = false; }
  if (!p) { sE('lPE','Vui lòng nhập mật khẩu'); ok = false; }
  if (!ok) return;
  if (u === ADMIN.username && p === ADMIN.password) {
    curUser = { username:'admin', role:'admin', name:'Admin' };
    S.sS(curUser); cM('mLogin'); renderAuth(); renderProducts();
    toast('Chào Admin! 🎉'); return;
  }
  const found = S.gU().find(x => (x.username === u || x.email === u) && x.password === p);
  if (found) {
    curUser = { username:found.username, role:'customer', name:found.firstName+' '+found.lastName };
    S.sS(curUser); cM('mLogin'); renderAuth();
    toast('Xin chào ' + curUser.name + '! 👋');
    if ($('mCheckout').classList.contains('show')) setTimeout(() => openCheckout(), 300);
  } else sE('lGE','Tên đăng nhập hoặc mật khẩu không đúng');
}

function doRegLocal() {
  const ln=$('rLn').value.trim(),fn=$('rFn').value.trim(),un=$('rUn').value.trim();
  const em=$('rEm').value.trim(),ph=$('rPh').value.trim(),pw=$('rPw').value,pw2=$('rPw2').value;
  cE(['rLE','rFE','rUE','rEE','rPhE','rPwE','rPw2E']); let ok=true;
  if(!ln){sE('rLE','Nhập họ');ok=false;}
  if(!fn){sE('rFE','Nhập tên');ok=false;}
  if(un.length<3){sE('rUE','Tối thiểu 3 ký tự');ok=false;}
  else if(un==='admin'){sE('rUE','Tên đã dùng');ok=false;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){sE('rEE','Email không hợp lệ');ok=false;}
  if(ph&&!/^(0|\+84)\d{8,10}$/.test(ph)){sE('rPhE','SĐT không hợp lệ');ok=false;}
  if(pw.length<6){sE('rPwE','Tối thiểu 6 ký tự');ok=false;}
  if(pw!==pw2){sE('rPw2E','Mật khẩu không khớp');ok=false;}
  if(!ok)return;
  const users=S.gU();
  if(users.find(x=>x.username===un)){sE('rUE','Tên đã tồn tại');return;}
  if(users.find(x=>x.email===em)){sE('rEE','Email đã đăng ký');return;}
  users.push({username:un,password:pw,firstName:fn,lastName:ln,email:em,phone:ph||'',role:'customer',joined:new Date().toISOString().slice(0,10)});
  S.sU(users); cM('mReg'); toast('Đăng ký thành công! 🎉'); setTimeout(()=>oM('mLogin'),500);
}

function doLogoutLocal() {
  S.cS(); curUser=null; cM('mProfile'); renderAuth(); renderProducts(); toast('Đã đăng xuất');
}

/* ══════════════════════════════════════════
   ROUTER: tự chọn Firebase hoặc localStorage
   ══════════════════════════════════════════ */
async function doLogin()         { window.FB_CONFIGURED ? await doLoginFirebase()      : doLoginLocal(); }
async function doReg()           { window.FB_CONFIGURED ? await doRegFirebase()        : doRegLocal(); }
async function doLogout()        { window.FB_CONFIGURED ? await doLogoutFirebase()     : doLogoutLocal(); }
async function doLoginGoogle()   { if(window.FB_CONFIGURED) await doLoginGoogleFirebase(); else toast('Cần cấu hình Firebase để dùng tính năng này','var(--rd)'); }
async function doForgotPassword(){ if(window.FB_CONFIGURED) await doForgotPasswordFirebase(); else toast('Cần cấu hình Firebase','var(--rd)'); }
async function doSaveProfile()   { window.FB_CONFIGURED ? await doSaveProfileFirebase() : doSaveProfileLocal(); }
async function doSavePwd()       { window.FB_CONFIGURED ? await doSavePwdFirebase()    : doSavePwdLocal(); }
async function doDeleteAccount() { window.FB_CONFIGURED ? await doDeleteAccountFirebase() : doDeleteAccountLocal(); }

/* ══════════════════════════════════════════
   PROFILE (dùng chung cho cả 2 mode)
   ══════════════════════════════════════════ */
function getFullUser() {
  if (!curUser) return null;
  if (curUser.role === 'admin') return { username:'admin', firstName:'Admin', lastName:'', email:ADMIN_EMAIL, phone:'0794105811', address:'Hải Phòng', role:'admin' };
  if (window.FB_CONFIGURED) return curUser;
  return S.gU().find(u => u.username === curUser.username) || null;
}

function openProfile() {
  if (!curUser || curUser.isGuest) { oM('mLogin'); return; }
  swPTab('info'); renderProfileInfo();
  const uid = curUser.uid||curUser.username;
  const cnt = S.gOrders().filter(o=>o.user===uid).length;
  const tab = $('tabOrders');
  if (tab) tab.innerHTML = '&#128203; Đơn hàng' + (cnt > 0 ? ` <span style="background:var(--ac);color:#fff;border-radius:10px;font-size:.55rem;font-weight:700;padding:.06rem .38rem;margin-left:.2rem">${cnt}</span>` : '');
  oM('mProfile');
}

function swPTab(t) {
  document.querySelectorAll('.ptab').forEach(b => b.classList.toggle('on', b.dataset.ptab === t));
  ['ptInfo','ptOrders','ptEdit','ptPwd'].forEach(id => $(id).style.display = 'none');
  if (t==='info')   $('ptInfo').style.display='block';
  else if(t==='orders') { $('ptOrders').style.display='block'; renderOrders(); }
  else if(t==='edit')   { $('ptEdit').style.display='block'; fillEditForm(); }
  else                  $('ptPwd').style.display='block';
}

function renderProfileInfo() {
  const u = getFullUser(); if (!u) return;
  const full = (u.firstName||'') + ' ' + (u.lastName||'');
  $('profileAvatar').textContent = (u.firstName||u.username||'U')[0].toUpperCase();
  $('profileName').textContent   = full.trim() || u.username || u.email;
  $('profileRole').innerHTML     = u.role==='admin' ? '&#9881; Quản trị viên' : '&#128100; Khách hàng';
  $('piFullName').textContent    = full.trim() || '–';
  $('piUsername').textContent    = u.username  || '–';
  $('piEmail').innerHTML         = (u.email||'–') + (window.FB_CONFIGURED && !curUser?.verified && u.role!=='admin'
    ? ' <span style="background:var(--rd);color:#fff;font-size:.58rem;padding:.08rem .35rem;border-radius:3px;font-weight:700">Chưa xác minh</span>' : '');
  $('piPhone').textContent       = u.phone   || '–';
  $('piAddress').textContent     = u.address || 'Chưa cập nhật';
  const oCnt = window.FB_CONFIGURED ? 0 : S.gOrders().filter(o=>o.user===curUser.username).length;
  $('piOrderCnt').innerHTML = oCnt + ' đơn &rsaquo;';
  const go = $('goToOrders'); if (go) go.onclick = () => swPTab('orders');
}

function fillEditForm() {
  const u = getFullUser(); if (!u) return;
  $('eLn').value = u.lastName  || '';
  $('eFn').value = u.firstName || '';
  $('eEm').value = u.email     || '';
  $('ePh').value = u.phone     || '';
  $('eAd').value = u.address   || '';
  cE(['eLnE','eFnE','eEmE','ePhE','eGE']);
  /* Ẩn ô email khi dùng Firebase (không cho đổi email) */
  const emFg = $('eEm')?.closest('.fg');
  if (emFg) emFg.style.display = window.FB_CONFIGURED ? 'none' : 'block';
}

/* localStorage profile fallbacks */
function doSaveProfileLocal() {
  const ln=$('eLn').value.trim(),fn=$('eFn').value.trim(),em=$('eEm').value.trim(),ph=$('ePh').value.trim(),ad=$('eAd').value.trim();
  cE(['eLnE','eFnE','eEmE','ePhE','eGE']); let ok=true;
  if(!ln){sE('eLnE','Nhập họ');ok=false;}
  if(!fn){sE('eFnE','Nhập tên');ok=false;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)){sE('eEmE','Email không hợp lệ');ok=false;}
  if(ph&&!/^(0|\+84)\d{8,10}$/.test(ph)){sE('ePhE','SĐT không hợp lệ');ok=false;}
  if(!ok)return;
  if(curUser.role==='admin'){toast('Đã cập nhật! 🎉');cM('mProfile');return;}
  const users=S.gU(),idx=users.findIndex(u=>u.username===curUser.username);
  if(idx<0){sE('eGE','Không tìm thấy tài khoản');return;}
  const dup=users.find((u,i)=>i!==idx&&u.email===em);
  if(dup){sE('eEmE','Email đã dùng');return;}
  users[idx]={...users[idx],firstName:fn,lastName:ln,email:em,phone:ph,address:ad};
  S.sU(users);curUser={...curUser,name:fn+' '+ln};S.sS(curUser);
  renderAuth();renderProfileInfo();toast('Đã lưu! 🎉');swPTab('info');
}
function doSavePwdLocal() {
  const old=$('pOld').value,nw=$('pNew').value,cf=$('pCf').value;
  cE(['pOldE','pNewE','pCfE','pGE']); let ok=true;
  if(!old){sE('pOldE','Nhập mật khẩu hiện tại');ok=false;}
  if(nw.length<6){sE('pNewE','Tối thiểu 6 ký tự');ok=false;}
  if(nw!==cf){sE('pCfE','Không khớp');ok=false;}
  if(!ok)return;
  if(curUser.role==='admin'){if(old!=='admin123'){sE('pOldE','Sai mật khẩu');return;}toast('Đổi mật khẩu thành công! 🔒');['pOld','pNew','pCf'].forEach(id=>$(id).value='');$('pwdBar').className='pwd-strength str-0';$('pwdLbl').textContent='';return;}
  const users=S.gU(),idx=users.findIndex(u=>u.username===curUser.username);
  if(idx<0){sE('pGE','Không tìm thấy tài khoản');return;}
  if(users[idx].password!==old){sE('pOldE','Sai mật khẩu hiện tại');return;}
  if(old===nw){sE('pNewE','Phải khác mật khẩu cũ');return;}
  users[idx].password=nw;S.sU(users);['pOld','pNew','pCf'].forEach(id=>$(id).value='');$('pwdBar').className='pwd-strength str-0';$('pwdLbl').textContent='';toast('Đổi mật khẩu thành công! 🔒');
}
function doDeleteAccountLocal() {
  if(curUser.role==='admin'){toast('Không thể xoá Admin!','var(--rd)');return;}
  if(!confirm('XOÁ tài khoản vĩnh viễn?'))return;
  S.sU(S.gU().filter(u=>u.username!==curUser.username));doLogoutLocal();toast('Đã xoá','var(--rd)');
}

/* ══════════════════════════════════════════
   ORDERS + CANCEL (dùng chung)
   ══════════════════════════════════════════ */
const STATUS_LABEL = {'Đang xử lý':'st-processing','Đang giao':'st-shipping','Đã giao':'st-done','Đã huỷ':'st-cancelled'};
const PM_ICONS     = {cod:'💵',bank:'🏦',momo:'💜',vnpay:'💳',installment:'📋'};

async function renderOrders() {
  const wrap = $('ordListWrap');
  if (!curUser) { wrap.innerHTML=''; return; }
  /* Load từ Firestore nếu có */
  if(typeof fsGetOrders==='function'){
    const uid=curUser.uid||curUser.username;
    const fsOrders=await fsGetOrders(uid);
    if(fsOrders!==null) S.sOrders(fsOrders);
  }
  const all = S.gOrders().filter(o=>o.user===(curUser.uid||curUser.username)).reverse();
  if (!all.length) {
    wrap.innerHTML=`<div class="ord-empty"><div class="ord-empty-icon">📦</div><div class="ord-empty-txt">Chưa có đơn hàng nào</div><div class="ord-empty-sub">Hãy chọn sản phẩm yêu thích và đặt hàng!</div></div>`;
    return;
  }
  wrap.innerHTML=`<div style="font-size:.72rem;color:var(--mt);margin-bottom:.65rem">Tổng <b style="color:var(--ac)">${all.length}</b> đơn hàng</div>
  <div class="ord-list">${all.map(o=>{
    const st=o.status||'Đang xử lý',stCls=STATUS_LABEL[st]||'st-processing';
    const d=new Date(o.date);
    const ds=d.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'})+' '+d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
    const items=o.items||[],show=items.slice(0,3),more=items.length-3;
    const adr=o.address?[o.address.street,o.address.ward,o.address.dist,o.address.city].filter(Boolean).join(', '):'–';
    const pmIcon=PM_ICONS[o.payment]||'💳';
    const pmLabel={cod:'COD',bank:'Chuyển khoản',momo:'MoMo',vnpay:'VNPay',installment:'Trả góp'}[o.payment]||o.payment;
    return `<div class="ord-card"><div class="ord-head"><div><div class="ord-code">🧾 ${o.code}</div><div class="ord-date">${ds}</div></div><div style="display:flex;align-items:center;gap:.5rem">${st==='Đang xử lý'?`<button class="ord-cancel" data-cancelorder="${o.code}">Huỷ</button>`:''}<span class="ord-status ${stCls}">${st}</span></div></div><div class="ord-items">${show.map(it=>`<div class="ord-item"><div class="ord-item-icon">${it.icon||'💻'}</div><div class="ord-item-name">${it.name}</div><div class="ord-item-qty">×${it.qty}</div><div class="ord-item-price">${fp(it.price*it.qty)}</div></div>`).join('')}${more>0?`<div class="ord-more">+${more} SP khác</div>`:''}</div><div class="ord-addr">📍 ${adr}</div><div class="ord-foot"><div class="ord-pay">${pmIcon} ${pmLabel}</div><div style="text-align:right"><div class="ord-total-label">Tổng</div><div class="ord-total-val">${fp(o.total)}</div></div></div></div>`;
  }).join('')}</div>`;
}

function cancelOrder(code) {
  if (!confirm('Xác nhận huỷ đơn ' + code + '?')) return;
  const orders = S.gOrders().map(o=>o.code===code&&o.status==='Đang xử lý'?{...o,status:'Đã huỷ'}:o);
  S.sOrders(orders);
  if(typeof fsUpdateOrder==='function') fsUpdateOrder(code,{status:'Đã huỷ'});
  renderOrders(); toast('Đã huỷ đơn ' + code, 'var(--rd)');
}

/* ══════════════════════════════════════════
   KHỞI ĐỘNG
   ══════════════════════════════════════════ */
function initLocalAuth() {
  curUser = S.gS();
  renderAuth();
  if(typeof updateAdminOrdBadge==='function') updateAdminOrdBadge();
}

/* Hàm chính — tự chọn Firebase hoặc localStorage */
function bootAuth() {
  if (window.FB_CONFIGURED && window.FB_AUTH && window.FB_FUNCS) {
    /* Firebase đã sẵn sàng → dùng Firebase */
    initFirebase();
  } else if (!window.FB_CONFIGURED) {
    /* Không có Firebase → localStorage */
    initLocalAuth();
  } else {
    /* Firebase config có nhưng module chưa load xong → đợi */
    setTimeout(bootAuth, 80);
  }
}

/* Chạy khi firebase-ready event fire */
window.addEventListener('firebase-ready', bootAuth);

/* Chạy ngay nếu firebase-ready đã fire trước khi script này load */
if (window._fbReady) bootAuth();
