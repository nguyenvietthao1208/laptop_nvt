/* ══════════════════ STORAGE (localStorage fallback) ══════════════════ */
const S={
  gP(){try{const d=localStorage.getItem('nvt_p');return d?JSON.parse(d):JSON.parse(JSON.stringify(DP));}catch{return JSON.parse(JSON.stringify(DP));}},
  sP(l){try{localStorage.setItem('nvt_p',JSON.stringify(l));}catch{}},
  gU(){try{const d=localStorage.getItem('nvt_u');return d?JSON.parse(d):[];}catch{return[];}},
  sU(l){try{localStorage.setItem('nvt_u',JSON.stringify(l));}catch{}},
  gS(){try{const d=sessionStorage.getItem('nvt_s');return d?JSON.parse(d):null;}catch{return null;}},
  sS(u){try{sessionStorage.setItem('nvt_s',JSON.stringify(u));}catch{}},
  cS(){try{sessionStorage.removeItem('nvt_s');}catch{}},
  /* Địa chỉ — localStorage fallback (Firestore dùng hàm riêng bên dưới) */
  gAddr(){if(!curUser)return[];try{const d=localStorage.getItem('nvt_a_'+(curUser.uid||curUser.username));return d?JSON.parse(d):[];}catch{return[];}},
  sAddr(l){if(!curUser)return;try{localStorage.setItem('nvt_a_'+(curUser.uid||curUser.username),JSON.stringify(l));}catch{}},
  /* Đơn hàng — localStorage fallback (Firestore dùng hàm riêng bên dưới) */
  gOrders(){try{const d=localStorage.getItem('nvt_orders');return d?JSON.parse(d):[];}catch{return[];}},
  sOrders(l){try{localStorage.setItem('nvt_orders',JSON.stringify(l));}catch{}}
};

/* ══════════════════ STATE ══════════════════ */
let aCat='all',aBrand='all',aSearch='';
let curPage=1,pgSz=15,vMode='grid';
const cart=[];const cmpList=[];
let curUser=null;
let rafPending=false;
let ckStep=0,selAddrIdx=0,selPm='cod';

/* ══════════════════ UTILS ══════════════════ */
const $=id=>document.getElementById(id);
const fp=n=>Number(n).toLocaleString('vi-VN')+' &#8363;';
function sE(id,m){const e=$(id);if(e){e.textContent=m;e.classList.add('on');}}
function cE(ids){ids.forEach(id=>{const e=$(id);if(e){e.textContent='';e.classList.remove('on');}});}
function oM(id){$(id).classList.add('show');}
function cM(id){$(id).classList.remove('show');}
let _tc;
function toast(msg,col='var(--ac)'){
  const t=$('toast');if(_tc)clearTimeout(_tc);
  t.innerHTML='&#10003; '+msg;t.style.borderLeftColor=col;
  t.classList.add('show');_tc=setTimeout(()=>t.classList.remove('show'),2600);
}

/* ══════════════════ FIRESTORE HELPERS ══════════════════ */
function fbReady(){return window.FB_CONFIGURED&&window.FB_DB&&window.FB_FUNCS;}

/* ── SẢN PHẨM ── */
async function saveProductToFirestore(p){
  if(!fbReady())return false;
  try{
    const{doc,setDoc}=window.FB_FUNCS;
    const data={...p};
    Object.keys(data).forEach(k=>{if(data[k]===undefined)delete data[k];});
    await setDoc(doc(window.FB_DB,'products',String(p.id)),data,{merge:true});
    return true;
  }catch(e){console.warn('[FS] saveProduct:',e.message);return false;}
}
async function deleteProductFromFirestore(id){
  if(!fbReady())return false;
  try{
    const{doc,deleteDoc}=window.FB_FUNCS;
    await deleteDoc(doc(window.FB_DB,'products',String(id)));
    return true;
  }catch(e){console.warn('[FS] deleteProduct:',e.message);return false;}
}

/* ── ĐƠN HÀNG ── */
async function fsGetOrders(uid){
  /* Lấy đơn hàng của 1 user (hoặc tất cả nếu là admin) */
  if(!fbReady())return null;
  try{
    const{collection,query,where,orderBy,getDocs}=window.FB_FUNCS;
    let q;
    if(uid==='admin'){
      q=query(collection(window.FB_DB,'orders'),orderBy('date','desc'));
    } else {
      q=query(collection(window.FB_DB,'orders'),where('user','==',uid),orderBy('date','desc'));
    }
    const snap=await getDocs(q);
    return snap.docs.map(d=>({...d.data()}));
  }catch(e){console.warn('[FS] getOrders:',e.message);return null;}
}
async function fsSaveOrder(order){
  if(!fbReady())return false;
  try{
    const{doc,setDoc}=window.FB_FUNCS;
    await setDoc(doc(window.FB_DB,'orders',order.code),order);
    return true;
  }catch(e){console.warn('[FS] saveOrder:',e.message);return false;}
}
async function fsUpdateOrder(code,updates){
  if(!fbReady())return false;
  try{
    const{doc,updateDoc}=window.FB_FUNCS;
    await updateDoc(doc(window.FB_DB,'orders',code),updates);
    return true;
  }catch(e){console.warn('[FS] updateOrder:',e.message);return false;}
}

/* ── ĐỊA CHỈ ── */
async function fsGetAddresses(uid){
  if(!fbReady()||!uid)return null;
  try{
    const{doc,getDoc}=window.FB_FUNCS;
    const snap=await getDoc(doc(window.FB_DB,'addresses',uid));
    return snap.exists()?snap.data().list||[]:[];
  }catch(e){console.warn('[FS] getAddresses:',e.message);return null;}
}
async function fsSaveAddresses(uid,list){
  if(!fbReady()||!uid)return false;
  try{
    const{doc,setDoc}=window.FB_FUNCS;
    await setDoc(doc(window.FB_DB,'addresses',uid),{list,updatedAt:new Date().toISOString()});
    return true;
  }catch(e){console.warn('[FS] saveAddresses:',e.message);return false;}
}

/* ── GETPRODUCTS alias ── */
function getProducts(){return S.gP();}

/* ── REALTIME LISTENERS ── */
function startRealtimeProducts(){
  if(!fbReady())return;
  const{collection,onSnapshot}=window.FB_FUNCS;
  if(!onSnapshot)return;
  try{
    onSnapshot(
      collection(window.FB_DB,'products'),
      snap=>{
        if(snap.empty){console.log('[Realtime] products empty');return;}
        const list=snap.docs.map(d=>({...d.data()})).sort((a,b)=>(a.id||0)-(b.id||0));
        S.sP(list);
        if(typeof scheduleRender==='function')scheduleRender();
        console.log('[Realtime] ✅ Products:',list.length);
      },
      err=>console.warn('[Realtime] products error:',err.message)
    );
    console.log('[Realtime] 👂 Listening products...');
  }catch(e){console.warn('[Realtime] products failed:',e.message);}
}

/* ── REALTIME ORDERS — cập nhật trạng thái đơn hàng tức thì ── */
function startRealtimeOrders(uid) {
  if (!fbReady()) return;
  const { collection, query, where, onSnapshot } = window.FB_FUNCS;
  if (!onSnapshot) return;

  try {
    const isAdmin = (curUser && curUser.role === 'admin');
    let q;

    if (isAdmin) {
      /* Admin: lắng nghe tất cả đơn hàng */
      q = collection(window.FB_DB, 'orders');
    } else if (uid) {
      /* Khách: chỉ lắng nghe đơn hàng của mình */
      q = query(collection(window.FB_DB, 'orders'), where('user', '==', uid));
    } else {
      return;
    }

    /* Huỷ listener cũ nếu có */
    if (window._ordersUnsubscribe) {
      window._ordersUnsubscribe();
      window._ordersUnsubscribe = null;
    }

    window._ordersUnsubscribe = onSnapshot(q,
      snap => {
        const orders = snap.docs.map(d => ({ ...d.data() }));
        /* Ghi vào localStorage để S.gOrders() trả về data mới */
        S.sOrders(orders);
        /* Cập nhật badge admin */
        if (typeof updateAdminOrdBadge === 'function') updateAdminOrdBadge();
        /* Nếu đang mở tab đơn hàng trong profile → re-render */
        const ordTab = document.getElementById('ptOrders');
        if (ordTab && ordTab.style.display !== 'none') {
          if (typeof renderOrders === 'function') renderOrders();
        }
        /* Nếu admin đang mở tab đơn hàng → re-render */
        const aoList = document.getElementById('aoList');
        if (aoList && aoList.closest('#atOrders') &&
            aoList.closest('#atOrders').style.display !== 'none') {
          if (typeof renderAdminOrders === 'function') renderAdminOrders();
        }
        console.log('[Realtime] ✅ Orders updated:', orders.length);
      },
      err => console.warn('[Realtime] orders error:', err.message)
    );

    console.log('[Realtime] 👂 Listening orders for:', isAdmin ? 'admin' : uid);
  } catch(e) {
    console.warn('[Realtime] orders failed:', e.message);
  }
}
