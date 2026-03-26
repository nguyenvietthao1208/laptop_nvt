/* ══════════════════ PRODUCTS ══════════════════ */
function getFiltered(){
  let list=S.gP();
  if(aSearch){const q=aSearch.toLowerCase();list=list.filter(p=>p.name.toLowerCase().includes(q)||p.brand.toLowerCase().includes(q)||(p.specs||[]).some(s=>s.toLowerCase().includes(q)));}
  if(aCat!=='all')list=list.filter(p=>p.cat===aCat);
  if(aBrand!=='all')list=list.filter(p=>p.brand===aBrand);
  const pC=[...document.querySelectorAll('.pcb2:checked')].map(c=>c.dataset.price);
  if(pC.length)list=list.filter(p=>{const m=p.price/1e6;return pC.some(r=>{const[a,b]=r.split('-').map(Number);return m>=a&&m<b;});});
  const cC=[...document.querySelectorAll('.ccb:checked')].map(c=>c.dataset.cpu);
  if(cC.length)list=list.filter(p=>(p.specs||[]).some(s=>cC.some(c=>s.includes(c))));
  const gC=[...document.querySelectorAll('.gcb:checked')].map(c=>c.dataset.gpu);
  if(gC.length)list=list.filter(p=>(p.specs||[]).some(s=>gC.some(c=>s.includes(c))));
  const rC=[...document.querySelectorAll('.rcb:checked')].map(c=>c.dataset.ram);
  if(rC.length)list=list.filter(p=>(p.specs||[]).some(s=>rC.some(r=>s.includes(r+'GB'))));
  const sort=$('sortSel').value;
  if(sort==='pa')list.sort((a,b)=>a.price-b.price);
  else if(sort==='pd')list.sort((a,b)=>b.price-a.price);
  else if(sort==='rt')list.sort((a,b)=>b.rating-a.rating);
  else if(sort==='nm')list.sort((a,b)=>a.name.localeCompare(b.name));
  return list;
}

function scheduleRender(){if(rafPending)return;rafPending=true;requestAnimationFrame(()=>{rafPending=false;renderProducts();});}

function renderProducts(){
  const grid=$('productGrid');
  const isAdmin=curUser&&curUser.role==='admin';
  const list=getFiltered(),total=list.length,pages=Math.ceil(total/pgSz)||1;
  if(curPage>pages)curPage=1;
  const slice=list.slice((curPage-1)*pgSz,curPage*pgSz);
  $('paCnt').textContent='('+total+' sản phẩm)';
  $('paTitle').textContent=CNAME[aCat]||'Tất cả Laptop';
  grid.className='pgrid'+(vMode==='list'?' lv':'');
  if(!slice.length){grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:4rem;color:var(--dm)">&#128533; Không tìm thấy sản phẩm.</div>';$('pagi').innerHTML='';updateCounts();return;}
  const bg={gaming:'#080b16',ultrabook:'#090e1a',workstation:'#090e12',creator:'#0f0a00',student:'#090e0a',office:'#090c14'};
  const parts=[];
  for(const p of slice){
    const bdg=p.badge?`<span class="pbdg ${BLC[p.badge]||'bs2'}">${BL[p.badge]||p.badge}</span>`:'';
    const imgH=p.img?`<img src="${p.img}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none';this.nextSibling.style.display='flex'">`:'';
    const icH=`<div class="nim" style="display:${p.img?'none':'flex'}">${p.icon||'&#128187;'}</div>`;
    const wasH=p.was?`<span class="pwas">${fp(p.was)}</span>`:'';
    const dsc=p.was?`<span class="pdsc">-${Math.round((1-p.price/p.was)*100)}%</span>`:'';
    const sts='&#9733;'.repeat(Math.floor(p.rating))+'&#9734;'.repeat(5-Math.floor(p.rating));
    const sps=(p.specs||[]).map(s=>`<span class="sp">${s}</span>`).join('');
    const adm=isAdmin?`<div class="abtns2"><button class="abn abe" data-edit="${p.id}">&#9999; Sửa</button><button class="abn abd" data-delete="${p.id}">&#128465; Xoá</button></div>`:'';
    const lc=vMode==='list'?' lc':'';
    const inCmp=cmpList.includes(p.id);
    parts.push(`<div class="pc${lc}"><div class="pci" style="background:${bg[p.cat]||'#0a0d18'}" data-goto="${p.id}">${bdg}<div class="pcko"><button class="pw2" data-wish="${p.id}">&#9825;</button><button class="pcmp2${inCmp?' on':''}" data-cmp="${p.id}">&#9878;</button></div>${imgH}${icH}${adm}</div><div class="pcb"><div class="pbr">${p.brand}</div><div class="pn" data-goto="${p.id}" style="cursor:pointer">${p.name}</div><div class="pst"><span class="stars">${sts}</span><span class="rc">${p.rating} (${p.reviews})</span></div><div class="psp">${sps}</div><div class="pf"><div><span class="pnow">${fp(p.price)}${dsc}</span>${wasH}</div><button class="bac" data-add="${p.id}">+</button></div></div></div>`);
  }
  grid.innerHTML=parts.join('');
  renderPagi(pages);updateCounts();
}

function renderPagi(pages){
  const el=$('pagi');if(pages<=1){el.innerHTML='';return;}
  const parts=[`<button class="pgb" data-pg="${curPage-1}" ${curPage===1?'disabled':''}>&#8249;</button>`];
  for(let i=1;i<=pages;i++){
    if(i===1||i===pages||Math.abs(i-curPage)<=1)parts.push(`<button class="pgb${i===curPage?' on':''}" data-pg="${i}">${i}</button>`);
    else if(Math.abs(i-curPage)===2)parts.push(`<span style="color:var(--dm);line-height:28px;font-size:.72rem">&hellip;</span>`);
  }
  parts.push(`<button class="pgb" data-pg="${curPage+1}" ${curPage===pages?'disabled':''}>&#8250;</button>`);
  el.innerHTML=parts.join('');
}

async function updateCounts(){
  const all=await S.gP();
  const ec=$('cAll');if(ec)ec.textContent=all.length;
  ['Apple','ASUS','Dell','Lenovo','HP','MSI','Razer','Acer','Samsung','LG','Gigabyte','Microsoft','Alienware','Huawei'].forEach(b=>{
    const e=$('c'+b);if(e)e.textContent=all.filter(p=>p.brand===b).length;
  });
}


/* ══════════════════ CART ══════════════════ */
function addToCart(id){
  const p=S.gP().find(x=>x.id===id);if(!p)return;
  const ex=cart.find(c=>c.id===id);
  if(ex)ex.qty++;else cart.push({id:p.id,name:p.name,price:p.price,icon:p.icon||'&#128187;',qty:1});
  renderCart();toast('Đã thêm: '+p.name.substring(0,30));
}
function rmCart(id){const i=cart.findIndex(c=>c.id===id);if(i>-1)cart.splice(i,1);renderCart();}
function chgQty(id,d){const c=cart.find(x=>x.id===id);if(!c)return;c.qty+=d;if(c.qty<=0)rmCart(id);else renderCart();}
function renderCart(){
  const body=$('cdb'),foot=$('cdf'),badge=$('cartBadge');
  const cnt=cart.reduce((s,c)=>s+c.qty,0);badge.textContent=cnt;
  if(!cart.length){body.innerHTML='<div class="ce"><div class="cei">&#128722;</div><p style="font-weight:600">Giỏ hàng trống</p><small>Chọn sản phẩm để bắt đầu</small></div>';foot.style.display='none';return;}
  body.innerHTML=cart.map(c=>`<div class="crw"><div class="ctb">${c.icon}</div><div class="cti"><div class="ctn">${c.name}</div><div class="ctp">${fp(c.price)}</div><div class="ctq"><button class="qb" data-qty="${c.id}" data-delta="-1">&minus;</button><span class="qn">${c.qty}</span><button class="qb" data-qty="${c.id}" data-delta="1">+</button></div></div><button class="cdl" data-del="${c.id}">&times;</button></div>`).join('');
  $('cTotal').innerHTML=fp(cart.reduce((s,c)=>s+c.price*c.qty,0));
  foot.style.display='block';
}


/* ══════════════════ COMPARE ══════════════════ */
function toggleCmp(id){
  const idx=cmpList.indexOf(id);
  if(idx>-1)cmpList.splice(idx,1);
  else{if(cmpList.length>=3){toast('Tối đa 3 sản phẩm!','var(--rd)');return;}cmpList.push(id);}
  renderCmpBar();
  document.querySelectorAll('.pcmp2').forEach(b=>b.classList.toggle('on',cmpList.includes(parseInt(b.dataset.cmp))));
}
function renderCmpBar(){
  const bar=$('cmpbar');
  if(!cmpList.length){bar.classList.remove('show');return;}
  bar.classList.add('show');
  const all=S.gP();
  const parts=['<span class="cmpt">&#9878; So sánh:</span>'];
  cmpList.forEach(id=>{const p=all.find(x=>x.id===id);if(!p)return;parts.push(`<div class="cmpitm">${p.icon||'&#128187;'} ${p.name.substring(0,20)}...<button data-rmcmp="${id}">&times;</button></div>`);});
  $('cmpl').innerHTML=parts.join('');
  $('btnCmpGo').disabled=cmpList.length<2;
}
function doCompare(){
  const all=S.gP(),prods=cmpList.map(id=>all.find(p=>p.id===id)).filter(Boolean);
  if(prods.length<2)return;
  const bp=Math.min(...prods.map(p=>p.price)),br=Math.max(...prods.map(p=>p.rating));
  const rows=[['Thương hiệu',p=>p.brand],['Giá bán',p=>p.price===bp?`<span class="best">&#10004; ${fp(p.price)}</span>`:`<strong style="color:var(--ac)">${fp(p.price)}</strong>`],['Danh mục',p=>CNAME[p.cat]||p.cat],['CPU',p=>(p.specs||[]).find(s=>s.includes('Core')||s.includes('Ryzen')||s.includes('Apple'))||'-'],['RAM',p=>(p.specs||[]).find(s=>s.includes('GB')&&(s.includes('DDR')||s.includes('RAM')))||'-'],['GPU',p=>(p.specs||[]).find(s=>s.includes('RTX')||s.includes('GTX')||s.includes('Arc'))||'Tích hợp'],['Màn hình',p=>(p.specs||[]).find(s=>s.includes('"'))||'-'],['Đánh giá',p=>{const r='&#9733;'.repeat(Math.floor(p.rating))+'&#9734;'.repeat(5-Math.floor(p.rating));return p.rating===br?`<span class="best">${r} ${p.rating}</span>`:r+' '+p.rating;}]];
  let t=`<table class="ctbl"><thead><tr><th>Tiêu chí</th>${prods.map(p=>`<th class="phead">${p.brand}<br><span style="font-size:.68rem;font-weight:400">${p.name.substring(0,28)}</span></th>`).join('')}</tr></thead><tbody>`;
  rows.forEach(([l,fn])=>{t+=`<tr><th>${l}</th>${prods.map(p=>`<td>${fn(p)}</td>`).join('')}</tr>`;});
  t+=`<tr><th>Thêm giỏ</th>${prods.map(p=>`<td><button style="background:var(--ac);color:#fff;border:none;padding:.35rem .7rem;border-radius:5px;font-size:.68rem;font-weight:700;cursor:pointer" data-add="${p.id}">+ Giỏ</button></td>`).join('')}</tr></tbody></table>`;
  $('cmpContent').innerHTML=t;oM('mCmp');
}

/* ══════════════════ FLASH SALE CAROUSEL ══════════════════ */
(function(){
  const FLASH_IDS = [1,2,3,4,7,9,14,23]; // IDs sản phẩm hiển thị
  const DURATION  = 5000; // ms mỗi slide
  let idx = 0, timer = null, total = 0;

  /* Ảnh mặc định cho từng sản phẩm nổi bật */
  const IMGS = {
    1: 'https://medias-p1.phoenix.razer.com/sys-master-phoenix-images-container/h69/h35/9917794549790/blade-16-s11-black-2-500x500.png',
    2: 'https://medias-p1.phoenix.razer.com/sys-master-phoenix-images-container/h69/h35/9917794549790/blade-16-s11-black-2-500x500.png',
  };

  function init() {
    const track = document.getElementById('fsTrack');
    const dotsEl = document.getElementById('fsDots');
    if (!track || !dotsEl) return;

    const all   = S.gP();
    const prods = FLASH_IDS.map(id => all.find(p => p.id === id)).filter(Boolean).slice(0, 6);
    total = prods.length;
    if (!total) return;

    /* Render slides dùng đúng classes gốc .bnr */
    /* Đảm bảo container cha overflow:hidden */
    const trackWrap = track.parentElement;
    if (trackWrap) {
      trackWrap.style.overflow = 'hidden';
      trackWrap.style.width    = '100%';
    }
    track.style.cssText = 'display:flex;width:100%;transition:transform .5s cubic-bezier(.4,0,.2,1);will-change:transform;';
    track.innerHTML = prods.map((p, i) => {
      const hasDisc = p.was && p.was > p.price;
      const disc    = hasDisc ? Math.round((1 - p.price / p.was) * 100) : 0;
      const imgSrc  = p.img || IMGS[p.id] || '';
      const imgHtml = imgSrc
        ? `<img src="${imgSrc}" alt="" loading="${i===0?'eager':'lazy'}" decoding="async" onerror="this.style.display='none';this.nextSibling.style.display='flex'" style="max-width:100%;max-height:162px;object-fit:contain;filter:drop-shadow(0 18px 36px rgba(0,0,0,.65));animation:flt 4s ease-in-out infinite;transform:translateZ(0)"/><div style="font-size:4.5rem;display:none;align-items:center;justify-content:center">${p.icon||'💻'}</div>`
        : `<div style="font-size:4.5rem;display:flex;align-items:center;justify-content:center">${p.icon||'💻'}</div>`;

      /* Specs ngắn gọn */
      const specs = (p.specs||[]).slice(0,3).join(' · ');
      /* Tên rút gọn */
      const shortName = p.name.replace(p.brand,'').trim().substring(0,45);

      return `<div style="min-width:100%;max-width:100%;flex-shrink:0;width:100%">
        <div class="bnr">
          <div class="bt">
            <div class="btag">&#9889; Flash Sale Hôm Nay &nbsp;<span style="background:var(--rd);color:#fff;font-size:.55rem;font-weight:800;padding:.1rem .38rem;border-radius:3px">${i+1}/${total}</span></div>
            <h1 class="btit">${p.brand} ${shortName.substring(0,25)}<br><em>${(p.specs||[])[0]||''}</em></h1>
            <p class="bdesc">${specs}</p>
            <div class="bpr">
              <span class="bpn">${fp(p.price)}</span>
              ${hasDisc?`<span class="bpo">${fp(p.was)}</span><span class="bdc">-${disc}%</span>`:''}
            </div>
            <div class="bbtns">
              <button class="bpb" data-add="${p.id}">&#128722; Thêm vào giỏ</button>
              <button class="bgb" data-goto="${p.id}">Xem chi tiết &#8594;</button>
            </div>
          </div>
          <div class="bim">${imgHtml}</div>
        </div>
      </div>`;
    }).join('');

    /* Dots */
    dotsEl.innerHTML = prods.map((_,i) =>
      `<button data-fsdot="${i}" style="width:${i===0?'22px':'7px'};height:7px;border-radius:99px;background:${i===0?'var(--ac)':'rgba(255,255,255,.3)'};border:none;padding:0;transition:all .3s;cursor:pointer"></button>`
    ).join('');

    goSlide(0);
    startAuto();

    document.getElementById('fsArrL')?.addEventListener('click', ()=>{ goSlide(idx-1); resetAuto(); });
    document.getElementById('fsArrR')?.addEventListener('click', ()=>{ goSlide(idx+1); resetAuto(); });

    /* Arrow hover styles */
    ['fsArrL','fsArrR'].forEach(id=>{
      const el = document.getElementById(id); if(!el) return;
      el.addEventListener('mouseenter',()=>el.style.background='rgba(249,115,22,.35)');
      el.addEventListener('mouseleave',()=>el.style.background='rgba(0,0,0,.45)');
    });
  }

  function goSlide(n) {
    idx = ((n % total) + total) % total;
    const track = document.getElementById('fsTrack'); if (!track) return;
    track.style.transform = `translateX(-${idx * 100}%)`;
    /* update dots */
    document.querySelectorAll('[data-fsdot]').forEach((d,i)=>{
      d.style.width = i===idx ? '22px' : '7px';
      d.style.background = i===idx ? 'var(--ac)' : 'rgba(255,255,255,.3)';
    });
    /* progress bar */
    const bar = document.getElementById('fsProgressBar'); if(!bar) return;
    bar.style.transition = 'none'; bar.style.width = '0%';
    requestAnimationFrame(()=>{
      bar.style.transition = `width ${DURATION}ms linear`;
      bar.style.width = '100%';
    });
  }

  function startAuto() { timer = setInterval(()=>goSlide(idx+1), DURATION); }
  function resetAuto() { clearInterval(timer); startAuto(); }

  /* Dot click */
  document.addEventListener('click', e=>{
    const d = e.target.closest('[data-fsdot]');
    if (d) { goSlide(parseInt(d.dataset.fsdot)); resetAuto(); }
  });

  /* Init carousel — dùng DOMContentLoaded để chắc chắn DOM sẵn sàng
     Không dùng firebase-ready vì nó có thể fire trước khi script này load */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 50));
  } else {
    /* DOM đã sẵn sàng */
    setTimeout(init, 50);
  }
  /* Fallback: re-init khi firebase-ready (phòng trường hợp data chưa có) */
  window.addEventListener('firebase-ready', () => {
    if (!total) setTimeout(init, 100);
  });
})();
