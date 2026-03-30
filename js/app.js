/* ══════════════════ EVENTS ══════════════════ */
document.addEventListener('click',function(e){
  const t=e.target.closest('[data-add],[data-wish],[data-cmp],[data-qty],[data-del],[data-close],[data-cat],[data-brand],[data-edit],[data-delete],[data-atab],[data-pg],[data-rmcmp],[data-ptab],[data-seladdr],[data-editaddr],[data-deladdr],[data-defaddr],[data-pm],[data-cancelorder],[data-updorder],[data-notetoggle],[data-savenote],[data-vieworder],[data-upddetail],[data-goto],[data-fsdot]')||e.target;

  /* product detail navigation */
  if(t.dataset.goto&&!e.target.closest('.abtns2')&&!e.target.closest('.pcko')&&!e.target.closest('.bac')){
    gotoProduct(parseInt(t.dataset.goto));return;
  }

  if(t.dataset.add){addToCart(parseInt(t.dataset.add));return;}
  if(t.dataset.wish){t.classList.toggle('on');t.innerHTML=t.classList.contains('on')?'&#9829;':'&#9825;';return;}
  if(t.dataset.cmp){toggleCmp(parseInt(t.dataset.cmp));return;}
  if(t.dataset.rmcmp){const i=cmpList.indexOf(parseInt(t.dataset.rmcmp));if(i>-1)cmpList.splice(i,1);renderCmpBar();document.querySelectorAll('.pcmp2').forEach(b=>b.classList.toggle('on',cmpList.includes(parseInt(b.dataset.cmp))));return;}
  if(t.dataset.qty){chgQty(parseInt(t.dataset.qty),parseInt(t.dataset.delta));return;}
  if(t.dataset.del){rmCart(parseInt(t.dataset.del));return;}
  if(t.dataset.close){cM(t.dataset.close);return;}
  if(e.target===e.target.closest('.mbg,.ck-modal,.cmp-modal')&&!e.target.closest('.md,.ck-box,.cmp-box')){e.target.classList.remove('show');return;}
  if(t.dataset.atab){swTab(t.dataset.atab);return;}
  if(t.dataset.ptab){swPTab(t.dataset.ptab);return;}
  if(t.dataset.edit){loadForm(parseInt(t.dataset.edit));oM('mAdmin');return;}
  if(t.dataset.delete){delProd(parseInt(t.dataset.delete));return;}
  if(t.dataset.pg){const pg=parseInt(t.dataset.pg);if(pg>0){curPage=pg;renderProducts();window.scrollTo({top:280,behavior:'smooth'});}return;}
  if(t.dataset.cat!==undefined){aCat=t.dataset.cat;curPage=1;document.querySelectorAll('[data-cat]').forEach(b=>b.classList.toggle('on',b.dataset.cat===aCat));document.querySelectorAll('.ni').forEach(b=>b.classList.toggle('on',b.dataset.cat===aCat));scheduleRender();return;}
  if(t.dataset.brand!==undefined){aBrand=t.dataset.brand;curPage=1;document.querySelectorAll('[data-brand]').forEach(b=>b.classList.toggle('on',b.dataset.brand===aBrand));scheduleRender();return;}
  /* address select */
  if(t.dataset.seladdr!==undefined&&!e.target.closest('.addr-actions')){selAddrIdx=parseInt(t.dataset.seladdr);renderAddrList();return;}
  if(t.dataset.editaddr!==undefined){openAddrForm(parseInt(t.dataset.editaddr));return;}
  if(t.dataset.deladdr!==undefined){if(!confirm('Xoá địa chỉ này?'))return;const addrs=S.gAddr();addrs.splice(parseInt(t.dataset.deladdr),1);syncAddresses(addrs);if(selAddrIdx>=addrs.length)selAddrIdx=Math.max(0,addrs.length-1);renderAddrList();return;}
  if(t.dataset.defaddr!==undefined){const addrs=S.gAddr().map((a,i)=>({...a,isDefault:i===parseInt(t.dataset.defaddr)}));syncAddresses(addrs);selAddrIdx=parseInt(t.dataset.defaddr);renderAddrList();return;}
  if(t.dataset.pm){document.querySelectorAll('.pm').forEach(p=>p.classList.remove('selected'));t.classList.add('selected');selPm=t.dataset.pm;$('bankInfo').style.display=selPm==='bank'?'block':'none';return;}
  if(t.dataset.cancelorder){cancelOrder(t.dataset.cancelorder);return;}
  if(t.dataset.updorder){updateOrderStatus(t.dataset.updorder);return;}
  if(t.dataset.notetoggle){toggleNoteWrap(t.dataset.notetoggle);return;}
  if(t.dataset.savenote){saveOrderNote(t.dataset.savenote);return;}
  if(t.dataset.vieworder){viewOrderDetail(t.dataset.vieworder);return;}
  if(t.dataset.upddetail){
    const code=t.dataset.upddetail;
    const sel=$('detailSel_'+code);if(!sel)return;
    const newStatus=sel.value;
    const orders=S.gOrders().map(o=>o.code===code?{...o,status:newStatus}:o);
    S.sOrders(orders);
    if(typeof fsUpdateOrder==='function') fsUpdateOrder(code,{status:newStatus});
    cM('mOrdDetail');renderAdminOrders();
    toast(`Đơn ${code}: ${STATUS_ICON[newStatus]} ${newStatus}`);return;
  }

  switch(t.id){
    case 'btnLogo':location.hash='';showList();break;
    case 'btnOtpVerify':verifyOtp();break;
    case 'btnResendOtp':resendOtp();break;
    case 'btnOtpClose':clearInterval(_otpTimer);cM('mOtp');break;
    case 'btnCart':$('cdr').classList.add('show');$('bdrop').classList.add('show');break;
    case 'bdrop':case 'btnCC':$('cdr').classList.remove('show');$('bdrop').classList.remove('show');break;
    case 'navLogin':oM('mLogin');break;
    case 'userBtn':openProfile();break;
    case 'toReg':cM('mLogin');oM('mReg');break;
    case 'toLgn':cM('mReg');oM('mLogin');break;
    case 'btnLogin':doLogin();break;
    case 'btnLoginGoogle':if(typeof doLoginGoogle==='function')doLoginGoogle();break;
    case 'btnForgotPwd':if(typeof doForgotPassword==='function')doForgotPassword();break;
    case 'btnReg':doReg();break;
    case 'btnSave':saveProd();break;
    case 'btnCE':clrForm();break;
    case 'adminFab':swTab('list');clrForm();oM('mAdmin');updateAdminOrdBadge();break;
    case 'btnAoRefresh':renderAdminOrders();break;
    case 'btnExportOrders':exportOrdersPDF();break;
    case 'btnExportExcel':exportOrdersExcel();break;
    case 'btnSaveProfile':doSaveProfile();break;
    case 'btnSavePwd':doSavePwd();break;
    case 'btnLogout':doLogout();break;
    case 'btnDeleteAccount':doDeleteAccount();break;
    case 'btnBAdd':addToCart(1);break;
    case 'btnBDetail':gotoProduct(1);break;
    case 'btnSearch':doSearch();break;
    case 'btnGV':vMode='grid';$('btnGV').classList.add('on');$('btnLV').classList.remove('on');renderProducts();break;
    case 'btnLV':vMode='list';$('btnLV').classList.add('on');$('btnGV').classList.remove('on');renderProducts();break;
    case 'btnCmpGo':doCompare();break;
    case 'btnCmpClear':cmpList.length=0;renderCmpBar();document.querySelectorAll('.pcmp2').forEach(b=>b.classList.remove('on'));break;
    case 'btnCmpClose':cM('mCmp');break;
    case 'btnCheckout':openCheckout();break;
    case 'btnCkClose':cM('mCheckout');break;
    case 'btnCkBack':ckBack();break;
    case 'btnCkNext':ckNext();break;
    case 'btnCkLogin':cM('mCheckout');oM('mLogin');break;
    case 'btnCkReg':cM('mCheckout');oM('mReg');break;
    case 'btnAddAddr':if(!$('addrForm').classList.contains('open'))openAddrForm(-1);else $('addrForm').classList.remove('open');break;
    case 'btnSaveAddr':saveAddrForm();break;
    case 'btnCancelAddr':$('addrForm').classList.remove('open');break;
    case 'btnCkDone':cM('mCheckout');break;
    case 'btnEfSave':saveDetailEdit();break;
    case 'btnEfCancel':$('pdEditForm').classList.remove('open');break;
    case 'btnClr':
      aCat='all';aBrand='all';aSearch='';$('si').value='';
      document.querySelectorAll('.pcb2,.ccb,.gcb,.rcb').forEach(c=>c.checked=false);
      document.querySelectorAll('[data-cat]').forEach(b=>b.classList.toggle('on',b.dataset.cat==='all'));
      document.querySelectorAll('.ni').forEach(b=>b.classList.toggle('on',b.dataset.cat==='all'));
      document.querySelectorAll('[data-brand]').forEach(b=>b.classList.toggle('on',b.dataset.brand==='all'));
      curPage=1;renderProducts();toast('Đã xoá bộ lọc');break;
  }
},true);

/* password strength + admin order search */
document.addEventListener('input',e=>{
  if(e.target.id==='pNew'){
    const v=e.target.value,b=$('pwdBar'),l=$('pwdLbl');
    let s=0;if(v.length>=6)s++;if(v.length>=10)s++;if(/[A-Z]/.test(v)&&/[0-9]/.test(v))s++;
    b.className='pwd-strength str-'+s;
    const labels=['','Yếu','Trung bình','Mạnh'];const colors=['','var(--rd)','var(--yw)','var(--gn)'];
    l.textContent=labels[s]||'';l.style.color=colors[s]||'';
  }
  if(e.target.id==='aoSearch'){aoSearchVal=e.target.value.trim();renderAdminOrders();}
});

let _st;
$('si').addEventListener('input',()=>{clearTimeout(_st);_st=setTimeout(doSearch,220);});
$('si').addEventListener('keydown',e=>{if(e.key==='Enter')doSearch();});
function doSearch(){aSearch=$('si').value.trim();curPage=1;scheduleRender();}
$('sortSel').addEventListener('change',()=>{curPage=1;scheduleRender();});
document.querySelectorAll('.pcb2,.ccb,.gcb,.rcb').forEach(cb=>cb.addEventListener('change',()=>{curPage=1;scheduleRender();}));
document.addEventListener('change',e=>{
  if(e.target.id==='aoFilter'){aoFilterVal=e.target.value;renderAdminOrders();}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'){if($('mLogin').classList.contains('show'))doLogin();if($('mReg').classList.contains('show'))doReg();}
  if(e.key==='Escape'){['mLogin','mReg','mAdmin','mCmp','mProfile','mCheckout','mOrdDetail','mOtp'].forEach(id=>cM(id));}
});



/* ── Sync địa chỉ lên Firestore sau mỗi thay đổi ── */
function syncAddresses(addrs) {
  S.sAddr(addrs);
  if (curUser && typeof fsSaveAddresses === 'function') {
    const uid = curUser.uid || curUser.username;
    fsSaveAddresses(uid, addrs);
  }
}
/* ══════════════════ INIT ══════════════════ */
window.addEventListener('hashchange', router);
renderCart();
renderProducts();

/* auth.js xử lý renderAuth() qua bootAuth()
   app.js chỉ cần router() và realtime products */
function onFirebaseReady() {
  if(typeof router==='function') router();
  setTimeout(()=>{ if(typeof startRealtimeProducts==='function') startRealtimeProducts(); }, 400);
}
window.addEventListener('firebase-ready', onFirebaseReady);
if (window._fbReady) onFirebaseReady();