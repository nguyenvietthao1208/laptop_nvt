/* ══════════════════ CHECKOUT ══════════════════ */
async function openCheckout(){
  if(!cart.length)return;
  selPm='cod';
  document.querySelectorAll('.pm').forEach(p=>p.classList.toggle('selected',p.dataset.pm==='cod'));
  $('bankInfo').style.display='none';
  /* Đồng bộ địa chỉ từ Firestore */
  if(curUser&&typeof fsGetAddresses==='function'){
    const uid=curUser.uid||curUser.username;
    const addrs=await fsGetAddresses(uid);
    if(addrs!==null){S.sAddr(addrs);}
  }
  if(!curUser){
    ckStep=0;
    document.querySelectorAll('.ck-panel').forEach(p=>p.classList.remove('active'));$('ckP0').classList.add('active');
    document.querySelectorAll('.ck-step').forEach(s=>{s.classList.remove('active','done');});$('ckStep1').classList.add('active');
    $('ckFooter').style.display='none';
  } else {
    ckStep=1;updateCkSteps();showCkPanel(1);
    renderAddrList();
    $('ckFooter').style.display='flex';$('btnCkBack').style.display='none';
    $('btnCkNext').innerHTML='Tiếp theo &rarr;';
    $('btnCkNext').disabled=S.gAddr().length===0;
  }
  $('cdr').classList.remove('show');$('bdrop').classList.remove('show');
  oM('mCheckout');
}
function showCkPanel(n){document.querySelectorAll('.ck-panel').forEach(p=>p.classList.remove('active'));$('ckP'+n).classList.add('active');}
function updateCkSteps(){
  for(let i=1;i<=4;i++){const el=$('ckStep'+i);el.classList.remove('active','done');if(i<ckStep)el.classList.add('done');else if(i===ckStep)el.classList.add('active');}
}
function renderAddrList(){
  const addrs=S.gAddr(),el=$('addrList');
  if(!addrs.length){el.innerHTML='<div style="text-align:center;padding:1.2rem;color:var(--dm);font-size:.78rem">&#128205; Chưa có địa chỉ. Hãy thêm địa chỉ giao hàng!</div>';$('btnCkNext').disabled=true;return;}
  if(selAddrIdx>=addrs.length)selAddrIdx=0;
  el.innerHTML=addrs.map((a,i)=>`<div class="addr-card${i===selAddrIdx?' selected':''}" data-seladdr="${i}"><div class="addr-name">${a.name}${a.isDefault?'<span class="addr-tag">Mặc định</span>':''}</div><div class="addr-detail">&#128222; ${a.phone}<br>&#128205; ${[a.street,a.ward,a.dist,a.city].filter(Boolean).join(', ')}</div><div class="addr-actions"><button class="addr-btn" data-editaddr="${i}">&#9999; Sửa</button><button class="addr-btn del" data-deladdr="${i}">&#128465; Xoá</button>${!a.isDefault?`<button class="addr-btn" data-defaddr="${i}">&#11088; Mặc định</button>`:''}</div></div>`).join('');
  $('btnCkNext').disabled=false;
}
function openAddrForm(idx){
  const form=$('addrForm');$('afEditIdx').value=idx;
  if(idx>=0){
    const a=S.gAddr()[idx];
    $('afTitle').innerHTML='&#9999; Chỉnh sửa địa chỉ';
    $('afName').value=a.name||'';$('afPhone').value=a.phone||'';$('afStreet').value=a.street||'';$('afWard').value=a.ward||'';$('afDist').value=a.dist||'';$('afCity').value=a.city||'';$('afDefault').checked=!!a.isDefault;
  } else {
    $('afTitle').innerHTML='&#128205; Thêm địa chỉ mới';
    ['afName','afPhone','afStreet','afWard','afDist'].forEach(id=>$(id).value='');
    const u=getFullUser();if(u){$('afName').value=(u.firstName||'')+' '+(u.lastName||'');$('afPhone').value=u.phone||'';}
    $('afCity').value='Hải Phòng';$('afDefault').checked=S.gAddr().length===0;
  }
  cE(['afNameE','afPhoneE','afStreetE','afCityE']);
  form.classList.add('open');
}
function saveAddrForm(){
  const name=$('afName').value.trim(),phone=$('afPhone').value.trim(),street=$('afStreet').value.trim(),ward=$('afWard').value.trim(),dist=$('afDist').value.trim(),city=$('afCity').value.trim();
  cE(['afNameE','afPhoneE','afStreetE','afCityE']);let ok=true;
  if(!name){sE('afNameE','Nhập họ tên');ok=false;}
  if(!phone||!/^(0|\+84)\d{8,10}$/.test(phone)){sE('afPhoneE','SĐT không hợp lệ');ok=false;}
  if(!street){sE('afStreetE','Nhập địa chỉ');ok=false;}
  if(!city){sE('afCityE','Nhập tỉnh/thành phố');ok=false;}
  if(!ok)return;
  const isDefault=$('afDefault').checked,idx=parseInt($('afEditIdx').value);
  let addrs=S.gAddr();
  if(isDefault)addrs=addrs.map(a=>({...a,isDefault:false}));
  const entry={name,phone,street,ward,dist,city,isDefault};
  if(idx>=0){addrs[idx]=entry;if(isDefault)selAddrIdx=idx;}
  else{addrs.push(entry);if(isDefault)selAddrIdx=addrs.length-1;}
  syncAddresses(addrs);$('addrForm').classList.remove('open');renderAddrList();toast('Đã lưu địa chỉ! &#127881;');
}
function addrStr(a){if(!a)return'–';return[a.street,a.ward,a.dist,a.city].filter(Boolean).join(', ');}

function ckNext(){
  if(ckStep===1){
    const addrs=S.gAddr();if(!addrs.length){toast('Vui lòng thêm địa chỉ!','var(--rd)');return;}
    ckStep=2;updateCkSteps();showCkPanel(2);
    /* fill order review */
    const a=addrs[selAddrIdx]||addrs[0];
    $('ckOrderItems').innerHTML=cart.map(c=>`<div class="oi"><div class="oi-icon">${c.icon||'&#128187;'}</div><div class="oi-info"><div class="oi-name">${c.name}</div><div class="oi-meta">SL: ${c.qty}</div></div><div class="oi-price"><div class="oi-unit">${fp(c.price)} × ${c.qty}</div><div class="oi-total">${fp(c.price*c.qty)}</div></div></div>`).join('');
    const total=cart.reduce((s,c)=>s+c.price*c.qty,0);
    $('ckSubtotal').innerHTML=fp(total);$('ckTotal2').innerHTML=fp(total);
    $('ckAddrDetail').textContent=a.name+' \u2022 '+a.phone+'\n'+addrStr(a);
    $('btnCkBack').style.display='inline-block';$('btnCkNext').innerHTML='Chọn thanh toán &rarr;';
  } else if(ckStep===2){
    ckStep=3;updateCkSteps();showCkPanel(3);$('btnCkNext').innerHTML='Xác nhận &rarr;';
  } else if(ckStep===3){
    ckStep=4;updateCkSteps();showCkPanel(4);
    const addrs=S.gAddr(),a=addrs[selAddrIdx]||addrs[0];
    const total=cart.reduce((s,c)=>s+c.price*c.qty,0),qty=cart.reduce((s,c)=>s+c.qty,0);
    if(a){$('ckConfirmName').textContent=a.name+' \u2022 '+a.phone;$('ckConfirmAddr').textContent=addrStr(a);}
    $('ckConfirmPay').textContent=PM_LABELS[selPm]||selPm;
    $('ckConfirmQty').textContent=qty+' sản phẩm';
    $('ckConfirmTotal').innerHTML=fp(total);
    /* populate product list */
    $('ckConfirmItems').innerHTML=cart.map(c=>`<div class="oi"><div class="oi-icon">${c.icon||'&#128187;'}</div><div class="oi-info"><div class="oi-name">${c.name}</div><div class="oi-meta">Số lượng: ${c.qty}</div></div><div class="oi-price"><div class="oi-unit">${fp(c.price)} × ${c.qty}</div><div class="oi-total">${fp(c.price*c.qty)}</div></div></div>`).join('');
    $('btnCkNext').innerHTML='✅ Đặt hàng ngay';
  } else if(ckStep===4){
    /* place order */
    const addrs=S.gAddr(),a=addrs[selAddrIdx]||addrs[0];
    const total=cart.reduce((s,c)=>s+c.price*c.qty,0);
    const code='NVT-'+Date.now().toString().slice(-6);
    const uid=curUser.uid||curUser.username;
    const order={code,user:uid,userName:curUser.name||'',items:cart.map(c=>({...c})),address:a,payment:selPm,total,date:new Date().toISOString(),status:'Đang xử lý'};
    /* Lưu localStorage (fallback) */
    const orders=S.gOrders();orders.push(order);S.sOrders(orders);
    /* Lưu Firestore (đồng bộ mọi thiết bị) */
    if(typeof fsSaveOrder==='function') fsSaveOrder(order);
    cart.length=0;renderCart();
    $('csOrderCode').textContent=code;if(selPm==='bank')$('bankNote').textContent=code;
    document.querySelectorAll('.ck-panel').forEach(p=>p.classList.remove('active'));$('ckP5').classList.add('active');
    $('ckFooter').style.display='none';
    document.querySelectorAll('.ck-step').forEach(s=>{s.classList.remove('active');s.classList.add('done');});
    toast('Đặt hàng thành công! &#127881;');
  }
}
function ckBack(){
  if(ckStep<=1)return;ckStep--;updateCkSteps();showCkPanel(ckStep);
  if(ckStep===1){renderAddrList();$('btnCkBack').style.display='none';$('btnCkNext').innerHTML='Tiếp theo &rarr;';}
  else if(ckStep===2)$('btnCkNext').innerHTML='Chọn thanh toán &rarr;';
  else if(ckStep===3)$('btnCkNext').innerHTML='Xác nhận &rarr;';
}