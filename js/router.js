/* ══════════════════ ROUTER (hash-based SPA) ══════════════════ */
let detailQty=1;
let curDetailId=null;

function router(){
  const hash=location.hash; // e.g. #product/4
  if(hash.startsWith('#product/')){
    const id=parseInt(hash.split('/')[1]);
    if(!isNaN(id))showDetail(id);
    else showList();
  } else {
    showList();
  }
}

function showList(){
  $('viewList').style.display='block';
  $('viewDetail').style.display='none';
  curDetailId=null;
  document.title='LaptopNVT – Laptop Chính Hãng Hải Phòng';
}

function showDetail(id){
  const _allP=S.gP();const p=_allP.find(x=>x.id===id);
  if(!p){showList();return;}
  curDetailId=id;detailQty=1;
  $('viewList').style.display='none';
  $('viewDetail').style.display='block';
  $('pdEditForm').classList.remove('open');
  window.scrollTo({top:0,behavior:'smooth'});
  renderDetailPage(p);
  document.title=p.name+' – LaptopNVT';
}

function gotoProduct(id){
  location.hash='#product/'+id;
}

function renderDetailPage(p){
  const isAdmin=curUser&&curUser.role==='admin';
  /* admin bar */
  $('pdAdminBar').style.display=isAdmin?'flex':'none';

  /* breadcrumb */
  $('pdBreadcrumb').innerHTML=`
    <a href="#" id="bcHome">&#127968; Trang chủ</a>
    <span class="bc-sep">&#8250;</span>
    <a href="#" data-cat="${p.cat}" id="bcCat">${CNAME[p.cat]||p.cat}</a>
    <span class="bc-sep">&#8250;</span>
    <span class="bc-cur">${p.name}</span>`;

  /* price calc */
  const hasDiscount=p.was&&p.was>p.price;
  const discPct=hasDiscount?Math.round((1-p.price/p.was)*100):0;
  const savings=hasDiscount?(p.was-p.price):0;

  /* stars */
  const starsHtml='&#9733;'.repeat(Math.floor(p.rating))+'&#9734;'.repeat(5-Math.floor(p.rating));

  /* specs rows — parse từ array */
  const specLabels=['CPU','RAM','Lưu trữ','GPU','Màn hình','Cân nặng','Pin','Kết nối','OS'];
  const specRows=(p.specs||[]).map((s,i)=>{
    const label=specLabels[i]||('Thông số '+(i+1));
    return `<div class="pd-spec-row"><span class="pd-spec-k">${label}</span><span class="pd-spec-v">${s}</span></div>`;
  }).join('');

  /* related: same category, excluding current */
  const _rAll=S.gP();const related=_rAll.filter(x=>x.cat===p.cat&&x.id!==p.id).slice(0,4);
  const bgMap={gaming:'#080b16',ultrabook:'#090e1a',workstation:'#090e12',creator:'#0f0a00',student:'#090e0a',office:'#090c14'};
  const relatedHtml=related.map(r=>{
    const rSts='&#9733;'.repeat(Math.floor(r.rating))+'&#9734;'.repeat(5-Math.floor(r.rating));
    const rWas=r.was?`<span class="pwas">${fp(r.was)}</span>`:'';
    const rDsc=r.was?`<span class="pdsc">-${Math.round((1-r.price/r.was)*100)}%</span>`:'';
    const rImg=r.img?`<img src="${r.img}" alt="" loading="lazy" onerror="this.style.display='none';this.nextSibling.style.display='flex'">`:'';
    return `<div class="pc" style="cursor:pointer" data-goto="${r.id}">
      <div class="pci" style="background:${bgMap[r.cat]||'#0a0d18'}" data-goto="${r.id}">
        ${r.badge?`<span class="pbdg ${BLC[r.badge]||'bs2'}">${BL[r.badge]||r.badge}</span>`:''}
        ${rImg}<div class="nim" style="display:${r.img?'none':'flex'}">${r.icon||'&#128187;'}</div>
      </div>
      <div class="pcb">
        <div class="pbr">${r.brand}</div>
        <div class="pn" data-goto="${r.id}">${r.name}</div>
        <div class="pst"><span class="stars">${rSts}</span><span class="rc">${r.rating}</span></div>
        <div class="pf"><div><span class="pnow">${fp(r.price)}${rDsc}</span>${rWas}</div><button class="bac" data-add="${r.id}">+</button></div>
      </div>
    </div>`;
  }).join('');

  $('pdContent').innerHTML=`
    <div class="pd-grid">
      <!-- LEFT: Gallery -->
      <div class="pd-gallery">
        <div class="pd-main-img" id="pdMainImg">
          ${p.badge?`<span class="pd-badge-big ${BLC[p.badge]||'bs2'}">${BL[p.badge]||p.badge}</span>`:''}
          ${p.img?`<img src="${p.img}" alt="${p.name}" id="pdMainImgEl" onerror="this.style.display='none';document.getElementById('pdMainIco').style.display='flex'">`:'' }
          <div class="nim2" id="pdMainIco" style="display:${p.img?'none':'flex'}">${p.icon||'&#128187;'}</div>
        </div>
        <div class="pd-thumbs">
          ${p.img?`<div class="pd-thumb on" data-thumb="${p.img}"><img src="${p.img}" onerror="this.parentNode.innerHTML='<span class=pd-thumb-ico>${p.icon||'&#128187;'}</span>'"/></div>`:`<div class="pd-thumb on"><span class="pd-thumb-ico">${p.icon||'&#128187;'}</span></div>`}
          <div class="pd-thumb" data-thumb="icon"><span class="pd-thumb-ico">${p.icon||'&#128187;'}</span></div>
        </div>
      </div>

      <!-- RIGHT: Info -->
      <div class="pd-info">
        <div class="pd-brand-badge">&#127981; ${p.brand} &bull; ${CNAME[p.cat]||p.cat}</div>
        <h1 class="pd-name">${p.name}</h1>
        <div class="pd-rating-row">
          <span class="pd-stars">${starsHtml}</span>
          <span class="pd-rnum">${p.rating}/5</span>
          <span class="pd-rcnt">(${p.reviews} đánh giá)</span>
        </div>
        <div class="pd-price-box">
          <div class="pd-price-now">${fp(p.price)}</div>
          ${hasDiscount?`<div class="pd-price-row"><span class="pd-price-was">${fp(p.was)}</span><span class="pd-discount">-${discPct}%</span><span class="pd-savings">Tiết kiệm ${fp(savings)}</span></div>`:''}
        </div>
        <div class="pd-tags">
          <div class="pd-tag"><span>&#9989;</span> Chính hãng 100%</div>
          <div class="pd-tag"><span>&#128666;</span> Miễn phí vận chuyển</div>
          <div class="pd-tag"><span>&#128260;</span> Đổi trả 7 ngày</div>
          <div class="pd-tag"><span>&#128179;</span> Trả góp 0% lãi suất</div>
          <div class="pd-tag"><span>&#128222;</span> Tư vấn: 0794 105 811</div>
        </div>
        <div class="pd-qty-row">
          <span class="pd-qty-lbl">Số lượng:</span>
          <div class="pd-qty-ctrl">
            <button class="pd-qb" id="btnQtyMinus">&#8722;</button>
            <span class="pd-qn" id="pdQtyNum">1</span>
            <button class="pd-qb" id="btnQtyPlus">+</button>
          </div>
        </div>
        <div class="pd-cta">
          <button class="pd-btn-add" id="btnPdAdd">&#128722; Thêm vào giỏ</button>
          <button class="pd-btn-buy" id="btnPdBuy">&#9889; Mua ngay</button>
          <button class="pd-btn-wish" id="btnPdWish" title="Yêu thích">&#9825;</button>
        </div>
        ${p.desc?`<div style="margin-top:1.1rem;font-size:.8rem;color:var(--mt);line-height:1.75;background:var(--cd);border-radius:var(--r);padding:.85rem 1rem">${p.desc}</div>`:''}
      </div>
    </div>

    <!-- Specs table -->
    ${specRows?`<div class="pd-specs">
      <div class="pd-sec-title">&#128203; Thông số kỹ thuật</div>
      ${specRows}
    </div>`:''}

    <!-- Related products -->
    ${related.length?`<div class="pd-related">
      <div class="pd-sec-title" style="font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:var(--dm);margin-bottom:.75rem">&#127981; Sản phẩm liên quan</div>
      <div class="pd-related-grid">${relatedHtml}</div>
    </div>`:''}
  `;

  /* bind qty buttons */
  $('btnQtyMinus').onclick=()=>{if(detailQty>1){detailQty--;$('pdQtyNum').textContent=detailQty;}};
  $('btnQtyPlus').onclick=()=>{detailQty++;$('pdQtyNum').textContent=detailQty;};
  $('btnPdAdd').onclick=()=>{for(let i=0;i<detailQty;i++)addToCart(p.id);};
  $('btnPdBuy').onclick=()=>{for(let i=0;i<detailQty;i++)addToCart(p.id);openCheckout();};
  $('btnPdWish').onclick=function(){this.classList.toggle('on');this.innerHTML=this.classList.contains('on')?'&#9829;':'&#9825;';};

  /* breadcrumb clicks */
  const bcHome=$('bcHome');if(bcHome)bcHome.onclick=e=>{e.preventDefault();location.hash='';};
  const bcCat=$('bcCat');if(bcCat)bcCat.onclick=e=>{e.preventDefault();aCat=p.cat;location.hash='';};

  /* thumb clicks */
  document.querySelectorAll('.pd-thumb').forEach(th=>{
    th.onclick=()=>{
      document.querySelectorAll('.pd-thumb').forEach(x=>x.classList.remove('on'));
      th.classList.add('on');
      const src=th.dataset.thumb;
      const mImg=$('pdMainImgEl'),mIco=$('pdMainIco');
      if(src&&src!=='icon'&&mImg){mImg.style.display='';mIco.style.display='none';}
      else if(mImg){mImg.style.display='none';mIco.style.display='flex';}
    };
  });

  /* admin actions */
  $('btnPdEdit').onclick=()=>{openDetailEditForm(p.id);};
  $('btnPdDelete').onclick=()=>{
    if(!confirm('Xoá sản phẩm "'+p.name+'"?'))return;
    S.sP(S.gP().filter(x=>x.id!==p.id));
    if(window.FB_CONFIGURED) deleteProductFromFirestore(p.id);
    location.hash='';toast('Đã xoá sản phẩm','var(--rd)');
  };
}

function openDetailEditForm(id){
  const _allP=S.gP();const p=_allP.find(x=>x.id===id);if(!p)return;
  const f=$('pdEditForm');
  $('efNm').value=p.name;$('efBr').value=p.brand;$('efCt').value=p.cat;$('efBdg').value=p.badge||'';
  $('efPr').value=p.price;$('efWs').value=p.was||'';$('efRt').value=p.rating;$('efRv').value=p.reviews;
  $('efSp').value=(p.specs||[]).join(', ');$('efIm').value=p.img||'';$('efIc').value=p.icon||'';
  $('efDesc').value=p.desc||'';$('efErr').textContent='';$('efErr').style.display='none';
  f.classList.add('open');
  f.scrollIntoView({behavior:'smooth',block:'start'});
}

async function saveDetailEdit(){
  const id=curDetailId;if(!id)return;
  const eEl=$('efErr');eEl.style.display='none';
  const nm=$('efNm').value.trim(),br=$('efBr').value.trim(),pr=parseFloat($('efPr').value),ws=parseFloat($('efWs').value)||null;
  if(!nm){eEl.textContent='Nhập tên sản phẩm';eEl.style.display='block';return;}
  if(!br){eEl.textContent='Nhập thương hiệu';eEl.style.display='block';return;}
  if(!pr||pr<=0){eEl.textContent='Giá bán không hợp lệ';eEl.style.display='block';return;}
  const ct=$('efCt').value,bdg=$('efBdg').value||null,rt=parseFloat($('efRt').value)||4.5,rv=parseInt($('efRv').value)||0;
  const sp=$('efSp').value.split(',').map(s=>s.trim()).filter(Boolean);
  const im=$('efIm').value.trim(),ic=$('efIc').value.trim()||CIC[ct]||'&#128187;';
  const desc=$('efDesc').value.trim();
  const list=S.gP();const i=list.findIndex(p=>p.id===id);
  if(i<0)return;
  list[i]={...list[i],name:nm,brand:br,cat:ct,badge:bdg,price:pr,was:ws,rating:rt,reviews:rv,specs:sp,img:im,icon:ic,desc};
  S.sP(list);
  if(window.FB_CONFIGURED){
    await saveProductToFirestore(list[i]);
  }
  $('pdEditForm').classList.remove('open');
  renderDetailPage(list[i]);
  toast('Đã cập nhật sản phẩm! &#127881;');
}