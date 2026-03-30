/* ══════════════════ ADMIN ══════════════════ */
async function renderAdminList(){
  const list=await getProducts(),el=$('apList');
  if(!list.length){el.innerHTML='<div style="text-align:center;padding:2rem;color:var(--dm)">Chưa có SP.</div>';return;}
  el.innerHTML=list.map(p=>`<div class="apr"><div class="apic">${p.icon||'&#128187;'}</div><div class="apif"><div class="apn">${p.name}</div><div class="apm">${p.brand} · ${p.cat} · ${fp(p.price)}</div></div><div class="apbs"><button class="apb apbe" data-edit="${p.id}">&#9999;</button><button class="apb apbd" data-delete="${p.id}">&#128465;</button></div></div>`).join('');
}
function swTab(t){
  document.querySelectorAll('.atab').forEach(b=>b.classList.toggle('on',b.dataset.atab===t));
  $('atList').style.display=t==='list'?'block':'none';
  $('atAdd').style.display=t==='add'?'block':'none';
  $('atOrders').style.display=t==='orders'?'block':'none';
  if(t==='list')renderAdminList();
  if(t==='orders'){
    /* Set date picker về hôm nay nếu chưa chọn */
    const dp=$('exportDate');
    if(dp&&!dp.value) dp.value=new Date().toISOString().slice(0,10);
    renderAdminOrders();
  }
}
function clrForm(){['apNm','apBr','apPr','apWs','apSp','apIm','apIc','editId'].forEach(id=>{const e=$(id);if(e)e.value='';});$('apRt').value='4.5';$('apRv').value='0';$('apCt').value='gaming';$('apBdg').value='';$('apErr').textContent='';$('apErr').style.display='none';$('btnCE').style.display='none';$('btnSave').innerHTML='&#128190; Lưu';resetImgPreview();const fi=$('apImFile');if(fi)fi.value='';}
function loadForm(id){
  const p=S.gP().find(x=>x.id===id);if(!p)return;
  $('editId').value=id;$('apNm').value=p.name;$('apBr').value=p.brand;$('apCt').value=p.cat;$('apBdg').value=p.badge||'';$('apPr').value=p.price;$('apWs').value=p.was||'';$('apRt').value=p.rating;$('apRv').value=p.reviews;$('apSp').value=(p.specs||[]).join(', ');$('apIm').value=p.img||'';$('apIc').value=p.icon||'';
  $('btnCE').style.display='inline-block';$('btnSave').innerHTML='&#9999; Cập nhật';swTab('add');
  if(p.img)showImgPreview(p.img);else resetImgPreview();
  const fi=$('apImFile');if(fi)fi.value='';
}
async function saveProd(){
  const eEl=$('apErr');eEl.style.display='none';
  const nm=$('apNm').value.trim(),br=$('apBr').value.trim(),pr=parseFloat($('apPr').value),ws=parseFloat($('apWs').value)||null;
  if(!nm){eEl.textContent='Nhập tên SP';eEl.style.display='block';return;}
  if(!br){eEl.textContent='Nhập thương hiệu';eEl.style.display='block';return;}
  if(!pr||pr<=0){eEl.textContent='Giá không hợp lệ';eEl.style.display='block';return;}
  const ct=$('apCt').value,bdg=$('apBdg').value||null,rt=parseFloat($('apRt').value)||4.5,rv=parseInt($('apRv').value)||0,sp=$('apSp').value.split(',').map(s=>s.trim()).filter(Boolean),im=$('apIm').value.trim(),ic=$('apIc').value.trim()||CIC[ct]||'&#128187;';
  const eid=parseInt($('editId').value)||0,list=S.gP();
  if(eid){const i=list.findIndex(p=>p.id===eid);if(i>-1)list[i]={...list[i],name:nm,brand:br,cat:ct,badge:bdg,price:pr,was:ws,rating:rt,reviews:rv,specs:sp,img:im,icon:ic};}
  else{const nid=list.length?Math.max(...list.map(p=>p.id))+1:1;list.push({id:nid,name:nm,brand:br,cat:ct,badge:bdg,price:pr,was:ws,rating:rt,reviews:rv,specs:sp,img:im,icon:ic});}
  S.sP(list);
  /* Lưu lên Firestore nếu đã cấu hình */
  if (window.FB_CONFIGURED) {
    saveProductToFirestore(eid ? list[list.findIndex(p=>p.id===eid)] : list[list.length-1])
      .then(ok => {
        if (ok) toast('Đã lưu và đồng bộ Firestore! ☁️');
        else    toast('Lưu local OK, nhưng Firestore thất bại', 'var(--yw)');
      });
  } else {
    toast('Lưu thành công!');
  }
  clrForm();swTab('list');renderProducts();
}
function delProd(id){
  if(!confirm('Xác nhận xoá?'))return;
  S.sP(S.gP().filter(p=>p.id!==id));
  renderAdminList();renderProducts();
  if(window.FB_CONFIGURED){
    deleteProductFromFirestore(id)
      .then(ok=>toast(ok?'Đã xoá và đồng bộ Firestore! ☁️':'Xoá local OK, Firestore thất bại','var(--rd)'));
  } else {
    toast('Đã xoá','var(--rd)');
  }
}


/* ══════════════════ ADMIN ORDERS ══════════════════ */
const ALL_STATUSES=['Đang xử lý','Đang giao','Đã giao','Đã huỷ'];
const STATUS_CLS={'Đang xử lý':'processing','Đang giao':'shipping','Đã giao':'done','Đã huỷ':'cancelled'};
const STATUS_ICON={'Đang xử lý':'⏳','Đang giao':'🚚','Đã giao':'✅','Đã huỷ':'❌'};
const PM_LABEL_SHORT={cod:'COD',bank:'Chuyển khoản',momo:'MoMo',vnpay:'VNPay',installment:'Trả góp'};

let aoSearchVal='',aoFilterVal='all';

async function renderAdminOrders(){
  /* Load đơn hàng từ Firestore nếu có */
  if(typeof fsGetOrders==='function'){
    const fsOrders=await fsGetOrders('admin');
    if(fsOrders!==null){
      S.sOrders(fsOrders);
    }
  }
  updateAdminOrdBadge();
  const all=S.gOrders().reverse();
  const filt=all.filter(o=>{
    const matchStatus=aoFilterVal==='all'||o.status===aoFilterVal;
    const q=aoSearchVal.toLowerCase();
    const matchQ=!q||o.code.toLowerCase().includes(q)||o.user.toLowerCase().includes(q)||(o.address&&o.address.name&&o.address.name.toLowerCase().includes(q))||(o.address&&o.address.phone&&o.address.phone.includes(q));
    return matchStatus&&matchQ;
  });

  /* Stats */
  const stats=[
    {label:'Tổng đơn',val:all.length,col:'var(--ac)'},
    {label:'Đang xử lý',val:all.filter(o=>o.status==='Đang xử lý').length,col:'var(--yw)'},
    {label:'Đang giao',val:all.filter(o=>o.status==='Đang giao').length,col:'#60a5fa'},
    {label:'Đã giao',val:all.filter(o=>o.status==='Đã giao').length,col:'var(--gn)'},
  ];
  $('aoStats').innerHTML=stats.map(s=>`<div class="ao-stat"><div class="ao-stat-n" style="color:${s.col}">${s.val}</div><div class="ao-stat-l">${s.label}</div></div>`).join('');

  const list=$('aoList'),empty=$('aoEmpty');
  if(!filt.length){list.style.display='none';empty.style.display='block';return;}
  list.style.display='flex';empty.style.display='none';

  list.innerHTML=filt.map(o=>{
    const st=o.status||'Đang xử lý';
    const cls=STATUS_CLS[st]||'processing';
    const ico=STATUS_ICON[st]||'⏳';
    const d=new Date(o.date);
    const ds=d.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'})+' '+d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
    const a=o.address||{};
    const addrLine=[a.street,a.ward,a.dist,a.city].filter(Boolean).join(', ');
    const items=o.items||[];
    const preview=items.slice(0,2).map(i=>i.name.substring(0,25)+(i.name.length>25?'...':'')).join(', ')+(items.length>2?` +${items.length-2} SP`:'');
    const pmShort=PM_LABEL_SHORT[o.payment]||o.payment||'–';
    const canGo=st==='Đang xử lý',canShip=st==='Đang xử lý',canDone=st==='Đang giao',canCancel=st==='Đang xử lý'||st==='Đang giao';
    const noteHtml=o.note?`<div class="ao-note-txt">📝 ${o.note}</div>`:'';
    return `<div class="ao-card ${cls}" id="aoc_${o.code}">
      <div class="ao-head">
        <div>
          <div class="ao-code" data-vieworder="${o.code}">🧾 ${o.code}</div>
          <div class="ao-meta">${ds} &bull; <b>${o.user}</b></div>
        </div>
        <span class="ao-badge ${STATUS_CLS[st]||'st-processing'}" style="font-size:.64rem;font-weight:700;padding:.18rem .52rem;border-radius:20px">${ico} ${st}</span>
      </div>
      <div class="ao-body">
        <div class="ao-customer">
          <div class="ao-cname">👤 ${a.name||o.user}</div>
          <div class="ao-cphone">📞 ${a.phone||'–'}</div>
          <div class="ao-addr">📍 ${addrLine||'Chưa có địa chỉ'}</div>
          <div class="ao-items-preview">📦 ${preview||'–'}</div>
        </div>
        <div class="ao-right">
          <div class="ao-total">${fp(o.total)}</div>
          <div class="ao-pay">${PM_LABEL_SHORT[o.payment]||o.payment||'–'}</div>
        </div>
      </div>
      ${noteHtml}
      <div class="ao-actions">
        <span class="ao-lbl">Chuyển sang:</span>
        <select class="ao-sel" id="aoSel_${o.code}">
          ${ALL_STATUSES.map(s=>`<option value="${s}"${s===st?' selected':''}>${STATUS_ICON[s]} ${s}</option>`).join('')}
        </select>
        <button class="ao-upd" data-updorder="${o.code}">&#10003; Cập nhật</button>
        <button class="ao-note-btn" data-notetoggle="${o.code}">&#128221; Ghi chú</button>
        <button class="ao-note-btn" data-vieworder="${o.code}" style="border-color:rgba(59,130,246,.4);color:#60a5fa">&#128269; Chi tiết</button>
      </div>
      <div class="ao-note-wrap" id="aoNote_${o.code}">
        <textarea class="ao-note-inp" id="aoNoteInp_${o.code}" placeholder="Nhập ghi chú nội bộ (mã vận đơn, lý do, v.v...)">${o.note||''}</textarea>
        <button class="ao-note-save" data-savenote="${o.code}">&#128190; Lưu ghi chú</button>
      </div>
    </div>`;
  }).join('');
}

function updateAdminOrdBadge(){
  const cnt=S.gOrders().filter(o=>o.status==='Đang xử lý').length;
  const b=$('adminOrdBadge');if(!b)return;
  if(cnt>0){b.textContent=cnt;b.style.display='inline';}
  else b.style.display='none';
}

function updateOrderStatus(code){
  const sel=$('aoSel_'+code);if(!sel)return;
  const newStatus=sel.value;
  const orders=S.gOrders().map(o=>o.code===code?{...o,status:newStatus}:o);
  S.sOrders(orders);
  if(typeof fsUpdateOrder==='function') fsUpdateOrder(code,{status:newStatus});
  renderAdminOrders();
  toast(`Đơn ${code}: ${STATUS_ICON[newStatus]} ${newStatus}`);
}

function saveOrderNote(code){
  const inp=$('aoNoteInp_'+code);if(!inp)return;
  const note=inp.value.trim();
  const orders=S.gOrders().map(o=>o.code===code?{...o,note}:o);
  S.sOrders(orders);
  if(typeof fsUpdateOrder==='function') fsUpdateOrder(code,{note});
  renderAdminOrders();
  toast('Đã lưu ghi chú!');
}

function toggleNoteWrap(code){
  const wrap=$('aoNote_'+code);if(!wrap)return;
  wrap.classList.toggle('open');
  if(wrap.classList.contains('open'))$('aoNoteInp_'+code).focus();
}

function viewOrderDetail(code){
  const o=S.gOrders().find(x=>x.code===code);if(!o)return;
  const a=o.address||{};
  const addrLine=[a.street,a.ward,a.dist,a.city].filter(Boolean).join(', ');
  const d=new Date(o.date);
  const ds=d.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  const st=o.status||'Đang xử lý';
  const ico=STATUS_ICON[st]||'⏳';

  $('ordDetailBody').innerHTML=`
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem">
      <div>
        <div style="font-size:.88rem;font-weight:800;color:var(--ac);letter-spacing:.05em">${o.code}</div>
        <div style="font-size:.65rem;color:var(--dm);margin-top:.1rem">${ds}</div>
      </div>
      <span class="ao-badge ${STATUS_CLS[st]||'processing'}" style="font-size:.66rem;font-weight:700;padding:.2rem .6rem;border-radius:20px">${ico} ${st}</span>
    </div>

    <div class="od-section">
      <div class="od-sec-title">👤 Khách hàng</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem;font-size:.76rem">
        <div style="background:var(--cd);border-radius:7px;padding:.5rem .7rem"><div style="font-size:.62rem;color:var(--dm)">Tài khoản</div><div style="font-weight:600;margin-top:.1rem">${o.user}</div></div>
        <div style="background:var(--cd);border-radius:7px;padding:.5rem .7rem"><div style="font-size:.62rem;color:var(--dm)">Người nhận</div><div style="font-weight:600;margin-top:.1rem">${a.name||'–'}</div></div>
        <div style="background:var(--cd);border-radius:7px;padding:.5rem .7rem"><div style="font-size:.62rem;color:var(--dm)">Điện thoại</div><div style="font-weight:600;margin-top:.1rem">${a.phone||'–'}</div></div>
        <div style="background:var(--cd);border-radius:7px;padding:.5rem .7rem"><div style="font-size:.62rem;color:var(--dm)">Thanh toán</div><div style="font-weight:600;margin-top:.1rem">${PM_LABEL_SHORT[o.payment]||o.payment||'–'}</div></div>
      </div>
      <div style="background:var(--cd);border-radius:7px;padding:.5rem .7rem;margin-top:.4rem;font-size:.75rem"><div style="font-size:.62rem;color:var(--dm);margin-bottom:.1rem">Địa chỉ giao hàng</div><div>📍 ${addrLine||'Chưa có'}</div></div>
    </div>

    <div class="od-section">
      <div class="od-sec-title">📦 Sản phẩm (${(o.items||[]).length} SP)</div>
      ${(o.items||[]).map(it=>`<div class="od-item"><div class="od-item-ico">${it.icon||'💻'}</div><div class="od-item-info"><div class="od-item-nm">${it.name}</div><div class="od-item-qty">Số lượng: ${it.qty}</div></div><div class="od-item-pr">${fp(it.price*it.qty)}</div></div>`).join('')}
    </div>

    <div class="od-section">
      <div class="od-sec-title">💰 Thanh toán</div>
      <div style="background:var(--cd);border-radius:var(--r);padding:.75rem .9rem">
        <div style="display:flex;justify-content:space-between;font-size:.76rem;padding:.25rem 0;color:var(--mt)"><span>Tạm tính</span><span>${fp(o.total)}</span></div>
        <div style="display:flex;justify-content:space-between;font-size:.76rem;padding:.25rem 0;color:var(--mt)"><span>Phí ship</span><span style="color:var(--gn)">Miễn phí</span></div>
        <div style="display:flex;justify-content:space-between;font-size:.9rem;font-weight:800;padding:.5rem 0 .1rem;border-top:1px solid var(--bd);margin-top:.3rem;color:var(--ac)"><span>Tổng cộng</span><span>${fp(o.total)}</span></div>
      </div>
    </div>

    ${o.note?`<div class="od-section"><div class="od-sec-title">📝 Ghi chú nội bộ</div><div style="background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.25);border-radius:var(--r);padding:.65rem .85rem;font-size:.76rem;color:#93c5fd;font-style:italic">${o.note}</div></div>`:''}

    <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;margin-top:.5rem">
      <span style="font-size:.7rem;color:var(--mt);flex-shrink:0">Cập nhật trạng thái:</span>
      <select class="ao-sel" id="detailSel_${o.code}" style="flex:1">
        ${ALL_STATUSES.map(s=>`<option value="${s}"${s===st?' selected':''}>${STATUS_ICON[s]} ${s}</option>`).join('')}
      </select>
      <button class="ao-upd" data-upddetail="${o.code}">&#10003; Lưu</button>
    </div>
  `;
  oM('mOrdDetail');
}
/* ══════════════════ IMAGE UPLOAD (Admin) ══════════════════ */
/* handleImgFile — gọi từ onchange trong HTML */
function handleImgFile(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast('Ảnh quá lớn! Tối đa 5MB', 'var(--rd)'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    const b64 = e.target.result;
    const urlInp = $('apIm');
    if (urlInp) urlInp.value = b64;
    showImgPreview(b64);
  };
  reader.readAsDataURL(file);
}

function initImageUpload() {
  /* URL input → live preview */
  const urlInput = $('apIm');
  if (urlInput) {
    urlInput.addEventListener('input', function() {
      if (this.value.startsWith('http') || this.value.startsWith('data:')) {
        showImgPreview(this.value);
      } else if (!this.value) {
        resetImgPreview();
      }
    });
  }
}

function showImgPreview(src) {
  const preview = $('imgPreview'); if (!preview) return;
  preview.classList.add('has-img');
  preview.innerHTML = `<img src="${src}" onerror="this.parentNode.innerHTML='<span class=img-preview-icon>⚠️</span><span class=img-preview-txt>Ảnh không hợp lệ</span>';this.parentNode.classList.remove('has-img')"/>`;
}

function resetImgPreview() {
  const preview = $('imgPreview'); if (!preview) return;
  preview.classList.remove('has-img');
  preview.innerHTML = `<span class="img-preview-icon">📷</span><span class="img-preview-txt">Bấm để chọn ảnh từ thiết bị<br><small>hoặc nhập URL bên dưới</small></span>`;
}

// Gọi khi mở tab thêm SP

/* ── Khởi tạo image upload khi DOM sẵn sàng ── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initImageUpload);
} else {
  initImageUpload();
}

/* ══════════════════ XUẤT HÓA ĐƠN ══════════════════ */

function getExportDate() {
  const d = $('exportDate');
  if (!d || !d.value) {
    /* Mặc định hôm nay */
    return new Date().toISOString().slice(0,10);
  }
  return d.value;
}

function getOrdersByDate(dateStr) {
  const all = S.gOrders();
  return all.filter(o => {
    if (!o.date) return false;
    return o.date.slice(0,10) === dateStr;
  }).sort((a,b) => new Date(a.date) - new Date(b.date));
}

function formatDateVN(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit', year:'numeric'});
}

/* ── XUẤT PDF ── */
function exportOrdersPDF() {
  const dateStr  = getExportDate();
  const orders   = getOrdersByDate(dateStr);
  const dateVN   = formatDateVN(dateStr);

  if (!orders.length) {
    toast(`Không có đơn hàng nào ngày ${dateVN}`, 'var(--yw)');
    return;
  }

  const totalRevenue = orders.filter(o=>o.status!=='Đã huỷ').reduce((s,o)=>s+o.total,0);
  const PM_NAMES = {cod:'COD – Nhận hàng trả tiền', bank:'Chuyển khoản ngân hàng', momo:'Ví MoMo', vnpay:'VNPay', installment:'Trả góp 0%'};

  const rows = orders.map((o,i) => {
    const a = o.address || {};
    const addr = [a.street,a.ward,a.dist,a.city].filter(Boolean).join(', ') || '–';
    const items = (o.items||[]).map(it=>`${it.name} ×${it.qty}`).join('<br>');
    const time  = new Date(o.date).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'});
    const stCls = {
      'Đang xử lý': 'color:#f59e0b',
      'Đang giao':  'color:#60a5fa',
      'Đã giao':    'color:#22c55e',
      'Đã huỷ':     'color:#ef4444',
    }[o.status] || '';
    return `<tr>
      <td style="text-align:center">${i+1}</td>
      <td><b style="color:#f97316">${o.code}</b><br><small>${time}</small></td>
      <td>${a.name||o.user||'–'}<br><small>${a.phone||'–'}</small></td>
      <td style="font-size:.78em">${addr}</td>
      <td style="font-size:.78em">${items}</td>
      <td style="text-align:center">${PM_NAMES[o.payment]||o.payment||'–'}</td>
      <td style="text-align:right;font-weight:700;color:#f97316">${Number(o.total).toLocaleString('vi-VN')}₫</td>
      <td style="text-align:center;${stCls};font-weight:600">${o.status||'–'}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="vi">
<head>
<meta charset="UTF-8"/>
<title>Hóa đơn ngày ${dateVN}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#111;padding:24px;font-size:13px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #f97316}
  .logo{font-size:22px;font-weight:800;color:#f97316}.logo span{color:#111}
  .shop-info{font-size:11px;color:#555;line-height:1.6;margin-top:4px}
  .report-title{text-align:right}
  .report-title h2{font-size:18px;font-weight:800;color:#111}
  .report-title p{font-size:11px;color:#666;margin-top:3px}
  table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px}
  th{background:#f97316;color:#fff;padding:8px 6px;text-align:left;font-weight:700;font-size:11px}
  td{padding:7px 6px;border-bottom:1px solid #eee;vertical-align:top}
  tr:nth-child(even){background:#fafafa}
  tr:hover{background:#fff8f3}
  .summary{background:#fff8f3;border:2px solid #f97316;border-radius:8px;padding:14px 18px;margin-top:8px}
  .summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
  .s-item{text-align:center}
  .s-num{font-size:20px;font-weight:800;color:#f97316}
  .s-lbl{font-size:10px;color:#666;margin-top:2px}
  .footer{margin-top:20px;padding-top:12px;border-top:1px solid #ddd;font-size:10px;color:#999;display:flex;justify-content:space-between}
  @media print{body{padding:12px}.header{margin-bottom:14px}}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">Laptop<span>NVT</span></div>
    <div class="shop-info">
      📍 Hải Phòng &nbsp;|&nbsp; 📞 0794 105 811 &nbsp;|&nbsp; 🕐 8:00–21:00<br>
      ✉️ nguyenvietthao1208@gmail.com
    </div>
  </div>
  <div class="report-title">
    <h2>BÁO CÁO ĐƠN HÀNG</h2>
    <p>Ngày: <b>${dateVN}</b></p>
    <p>Xuất lúc: ${new Date().toLocaleString('vi-VN')}</p>
  </div>
</div>

<table>
  <thead><tr>
    <th style="width:30px">#</th>
    <th style="width:110px">Mã đơn</th>
    <th style="width:120px">Khách hàng</th>
    <th>Địa chỉ</th>
    <th>Sản phẩm</th>
    <th style="width:120px">Thanh toán</th>
    <th style="width:110px;text-align:right">Tổng tiền</th>
    <th style="width:90px;text-align:center">Trạng thái</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>

<div class="summary">
  <div class="summary-grid">
    <div class="s-item"><div class="s-num">${orders.length}</div><div class="s-lbl">Tổng đơn</div></div>
    <div class="s-item"><div class="s-num" style="color:#22c55e">${orders.filter(o=>o.status==='Đã giao').length}</div><div class="s-lbl">Đã giao</div></div>
    <div class="s-item"><div class="s-num" style="color:#ef4444">${orders.filter(o=>o.status==='Đã huỷ').length}</div><div class="s-lbl">Đã huỷ</div></div>
    <div class="s-item"><div class="s-num">${Number(totalRevenue).toLocaleString('vi-VN')}₫</div><div class="s-lbl">Doanh thu</div></div>
  </div>
</div>

<div class="footer">
  <span>LaptopNVT – Laptop chính hãng Hải Phòng</span>
  <span>Trang 1/1 – Báo cáo tự động</span>
</div>

<script>window.onload=()=>window.print();<\/script>
</body></html>`;

  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
  toast(`📄 Xuất ${orders.length} đơn ngày ${dateVN}`);
}

/* ── XUẤT EXCEL (CSV) ── */
function exportOrdersExcel() {
  const dateStr = getExportDate();
  const orders  = getOrdersByDate(dateStr);
  const dateVN  = formatDateVN(dateStr);

  if (!orders.length) {
    toast(`Không có đơn hàng nào ngày ${dateVN}`, 'var(--yw)');
    return;
  }

  const PM_NAMES = {cod:'COD', bank:'Chuyển khoản', momo:'MoMo', vnpay:'VNPay', installment:'Trả góp 0%'};

  /* BOM UTF-8 để Excel đọc đúng tiếng Việt */
  let csv = '\uFEFF';
  csv += `BÁO CÁO ĐƠN HÀNG NGÀY ${dateVN}\n`;
  csv += `Xuất lúc: ${new Date().toLocaleString('vi-VN')}\n\n`;
  csv += 'STT,Mã đơn,Thời gian,Khách hàng,Điện thoại,Địa chỉ,Sản phẩm,Số lượng,Thanh toán,Tổng tiền,Trạng thái\n';

  orders.forEach((o,i) => {
    const a    = o.address || {};
    const addr = [a.street,a.ward,a.dist,a.city].filter(Boolean).join(' ') || '–';
    const time = new Date(o.date).toLocaleString('vi-VN');
    const items = (o.items||[]).map(it=>it.name).join(' | ');
    const qty   = (o.items||[]).reduce((s,it)=>s+it.qty, 0);
    const row   = [
      i+1,
      o.code,
      time,
      `"${a.name||o.user||''}"`,
      a.phone||'',
      `"${addr}"`,
      `"${items}"`,
      qty,
      PM_NAMES[o.payment]||o.payment||'',
      o.total,
      o.status||''
    ];
    csv += row.join(',') + '\n';
  });

  /* Tổng kết */
  const revenue = orders.filter(o=>o.status!=='Đã huỷ').reduce((s,o)=>s+o.total,0);
  csv += `\nTổng đơn:,${orders.length}\n`;
  csv += `Đã giao:,${orders.filter(o=>o.status==='Đã giao').length}\n`;
  csv += `Đã huỷ:,${orders.filter(o=>o.status==='Đã huỷ').length}\n`;
  csv += `Doanh thu:,"${Number(revenue).toLocaleString('vi-VN')}₫"\n`;

  const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `HoaDon_${dateStr}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`📊 Xuất Excel ${orders.length} đơn ngày ${dateVN}`);
}
