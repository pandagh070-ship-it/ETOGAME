const SUPABASE_URL="https://bbgydodrydbruqnugrjq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_wzyjqh9paWFBt2i733ZTvQ_SkhPVh1u";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);

let games=[],updates=[],authUser=null,isAdmin=false,authMode="login";
const $=id=>document.getElementById(id);
const grid=$("gamesGrid"),list=$("updatesList"),search=$("search"),filter=$("categoryFilter"),modal=$("gameModal"),modalContent=$("modalContent"),authModal=$("authModal"),authContent=$("authContent");
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

function toast(t){const e=$("toast");e.textContent=t;e.classList.remove("hidden");clearTimeout(window.__toast);window.__toast=setTimeout(()=>e.classList.add("hidden"),3200)}
function closeModal(){modal.classList.add("hidden");document.body.style.overflow=""}
function closeAuth(){authModal.classList.add("hidden");document.body.style.overflow=""}

async function loadAll(){
  grid.innerHTML="<div class=\"update\">جارٍ تحميل الألعاب...</div>";
  const [g,u]=await Promise.all([
    sb.from("games").select("*").eq("published",true).order("featured",{ascending:false}).order("created_at",{ascending:false}),
    sb.from("site_updates").select("*").eq("published",true).order("created_at",{ascending:false}).limit(12)
  ]);
  if(g.error){console.error(g.error);toast("تعذر تحميل الألعاب. تحقق من اتصال قاعدة البيانات.")} else games=g.data||[];
  if(!u.error) updates=u.data||[];
  buildCategories(); render(); renderUpdates(); $("gameCount").textContent=games.length;
}
function buildCategories(){
  const old=filter.value,cats=[...new Set(games.map(g=>g.category).filter(Boolean))];
  filter.innerHTML='<option value="">كل التصنيفات</option>'+cats.map(c=>'<option value="'+esc(c)+'">'+esc(c)+"</option>").join("");
  filter.value=cats.includes(old)?old:"";
}
function render(){
  const q=(search.value||"").trim().toLowerCase(),cat=filter.value;
  const items=games.filter(g=>(!cat||g.category===cat)&&(g.title+" "+(g.short_description||"")+" "+(g.category||"")).toLowerCase().includes(q));
  grid.innerHTML=items.length?items.map(g=>'<article class="game-card" data-slug="'+esc(g.slug)+'"><button class="game-cover-btn open-game" type="button"><div class="cover"><div class="cover-title">'+esc(g.title)+'</div><span class="cover-open">فتح اللعبة ↗</span></div></button><div class="game-info"><h3>'+esc(g.title)+'</h3><p>'+esc(g.short_description||"لعبة مستقلة من ETOGAME.")+'</p><div class="badges"><span class="badge">'+esc(g.category||"Game")+'</span><span class="badge">v'+esc(g.version||"1.0.0")+'</span></div><div class="game-bottom"><span class="badge">ETOGAME</span><button class="details-btn open-game" type="button">التفاصيل والتحميل</button></div></div></article>').join(""):'<div class="update">لا توجد ألعاب مطابقة.</div>';
  grid.querySelectorAll(".game-card").forEach(card=>{const g=games.find(x=>x.slug===card.dataset.slug),cover=card.querySelector(".cover");if(g?.cover_url&&cover){try{const u=new URL(g.cover_url,location.href);if(["https:","http:"].includes(u.protocol)){cover.style.backgroundImage=`linear-gradient(180deg,transparent 35%,#070a13dd),url("${u.href}")`;cover.style.backgroundSize="cover";cover.style.backgroundPosition="center"}}catch{}}});
  grid.querySelectorAll(".open-game").forEach(b=>b.addEventListener("click",()=>openGame(b.closest(".game-card").dataset.slug)));
}
function renderUpdates(){
  list.innerHTML=updates.length?updates.map(u=>'<article class="update"><time>'+esc((u.created_at||"").slice(0,10))+'</time><div><h3>'+esc(u.title)+'</h3><p>'+esc(u.body||"")+'</p></div></article>').join(""):'<div class="update">لا توجد تحديثات بعد.</div>';
}

async function openGame(slug){
  const g=games.find(x=>x.slug===slug); if(!g)return;
  const [v,c,r]=await Promise.all([
    sb.from("game_versions").select("*").eq("game_id",g.id).eq("published",true).order("created_at",{ascending:false}),
    sb.from("comments").select("id,body,created_at,user_id,profiles(username,avatar_url)").eq("game_id",g.id).order("created_at",{ascending:false}).limit(50),
    sb.from("ratings").select("rating,user_id").eq("game_id",g.id)
  ]);
  if(v.error) console.error(v.error); if(c.error) console.error(c.error); if(r.error) console.error(r.error);
  const versions=v.data||[],comments=c.data||[],ratings=r.data||[];
  const avg=ratings.length?(ratings.reduce((a,x)=>a+Number(x.rating),0)/ratings.length).toFixed(1):"0.0";
  const my=ratings.find(x=>x.user_id===authUser?.id)?.rating||0,latest=versions[0]||{};
  const android=latest.android_url,windows=latest.windows_url;
  modalContent.innerHTML='<span class="kicker">'+esc(g.category||"GAME")+'</span><h2>'+esc(g.title)+'</h2><p>'+esc(g.description||g.short_description||"")+'</p>'+
    '<div class="badges"><span class="badge">⭐ '+avg+'/5</span><span class="badge">'+ratings.length+' تقييم</span><span class="badge">v'+esc(g.version||"")+'</span></div>'+
    '<div class="rating-box"><b>تقييم اللعبة</b><div id="stars">'+[1,2,3,4,5].map(n=>'<button class="star '+(n<=my?"on":"")+'" type="button" data-rating="'+n+'">★</button>').join("")+'</div><span class="rating-summary">'+(my?"تقييمك: "+my+"/5":"اختر عدد النجوم")+'</span></div>'+
    '<h3>تحميل اللعبة</h3><div class="download-row">'+(android?'<a class="download" href="'+esc(android)+'">⬇ تحميل Android APK</a>':'<span class="download disabled">Android غير متاح</span>')+(windows?'<a class="download" href="'+esc(windows)+'">⬇ تحميل Windows EXE</a>':'<span class="download disabled">Windows غير متاح</span>')+'</div>'+
    '<p class="rating-summary">الإصدار الحالي: '+esc(latest.version||g.version||"غير محدد")+'</p><hr><h3>💬 التعليقات</h3>'+
    '<div class="comment-form">'+(authUser?'<textarea id="commentBody" maxlength="2000" placeholder="اكتب تعليقك..."></textarea><button class="primary-btn" id="sendComment" type="button">إرسال التعليق</button>':'<button class="ghost-btn" id="commentLogin" type="button">سجل الدخول لكتابة تعليق</button>')+'</div>'+
    '<div class="comments">'+(comments.length?comments.map(x=>'<div class="comment"><b>👤 '+esc(x.profiles?.username||"مستخدم")+'</b><small>'+esc((x.created_at||"").slice(0,16).replace("T"," "))+'</small><p>'+esc(x.body)+'</p>'+(x.user_id===authUser?.id?'<button class="comment-delete" data-comment="'+esc(x.id)+'" type="button">حذف</button>':"")+'</div>').join(""):'<p>لا توجد تعليقات بعد.</p>')+'</div>';
  modal.classList.remove("hidden");document.body.style.overflow="hidden";
  modalContent.querySelectorAll("[data-rating]").forEach(b=>b.onclick=()=>rateGame(g.id,Number(b.dataset.rating),g.slug));
  $("commentLogin")?.addEventListener("click",openAuth);
  $("sendComment")?.addEventListener("click",()=>addComment(g.id,g.slug));
  modalContent.querySelectorAll("[data-comment]").forEach(b=>b.onclick=()=>deleteComment(b.dataset.comment,g.slug));
}
async function rateGame(gameId,rating,slug){
  if(!authUser){toast("سجّل الدخول أولًا حتى تحفظ تقييمك.");openAuth();return}
  const {error}=await sb.from("ratings").upsert({game_id:gameId,user_id:authUser.id,rating},{onConflict:"game_id,user_id"});
  if(error)toast("تعذر حفظ التقييم: "+error.message);else{toast("تم حفظ تقييمك ⭐");await openGame(slug)}
}
async function addComment(gameId,slug){
  const body=$("commentBody")?.value.trim(); if(!body)return toast("اكتب تعليقًا أولًا.");
  if(!authUser)return openAuth();
  const {error}=await sb.from("comments").insert({game_id:gameId,user_id:authUser.id,body});
  if(error)toast("تعذر نشر التعليق: "+error.message);else{toast("تم نشر التعليق");await openGame(slug)}
}
async function deleteComment(id,slug){
  if(!authUser)return;
  const {error}=await sb.from("comments").delete().eq("id",id).eq("user_id",authUser.id);
  if(error)toast("تعذر حذف التعليق: "+error.message);else openGame(slug);
}

function renderAuth(){
  authContent.innerHTML='<span class="kicker">ACCOUNT</span><h2>'+ (authMode==="login"?"تسجيل الدخول":"إنشاء حساب")+'</h2><p>'+(authMode==="login"?"ادخل لحفظ تقييماتك وكتابة التعليقات. يمكنك تصفح وتحميل الألعاب بدون حساب.":"أنشئ حساب ETOGAME.")+
  '</p><form id="authForm"><input id="authEmail" type="email" autocomplete="email" placeholder="البريد الإلكتروني" required><input id="authPassword" type="password" autocomplete="'+(authMode==="login"?"current-password":"new-password")+'" placeholder="كلمة المرور" minlength="6" required>'+(authMode==="signup"?'<input id="authUsername" type="text" maxlength="30" placeholder="اسم المستخدم" required>':"")+
  '<button class="primary-btn" type="submit">'+(authMode==="login"?"دخول":"إنشاء الحساب")+'</button></form><button class="ghost-btn" id="authSwitch" type="button">'+(authMode==="login"?"إنشاء حساب جديد":"لدي حساب بالفعل")+'</button><p id="authStatus" class="auth-status"></p>';
  $("authSwitch").onclick=()=>{authMode=authMode==="login"?"signup":"login";renderAuth()};
  $("authForm").onsubmit=handleAuth;
}
function openAuth(){authMode="login";renderAuth();authModal.classList.remove("hidden");document.body.style.overflow="hidden"}
function openAccount(){if(!authUser)return openAuth();const name=authUser.user_metadata?.username||authUser.email?.split("@")[0]||"مستخدم";authContent.innerHTML='<span class="kicker">ACCOUNT</span><h2>حسابك</h2><p>مسجل الدخول باسم <b>'+esc(name)+'</b>.</p><button class="primary-btn" id="accountLogout" type="button">تسجيل الخروج</button><button class="ghost-btn" id="accountClose" type="button">إغلاق</button>';authModal.classList.remove("hidden");document.body.style.overflow="hidden";$("accountLogout").onclick=async()=>{await sb.auth.signOut();closeAuth();toast("تم تسجيل الخروج");await refreshUser()};$("accountClose").onclick=closeAuth}
async function handleAuth(e){
  e.preventDefault(); const status=$("authStatus"),form=e.currentTarget,submit=form.querySelector("button[type=submit]"); status.textContent="جارٍ الاتصال...";submit.disabled=true;submit.textContent="جارٍ الاتصال...";
  const email=$("authEmail").value.trim(),password=$("authPassword").value;
  let res=authMode==="login"?await sb.auth.signInWithPassword({email,password}):await sb.auth.signUp({email,password,options:{data:{username:$("authUsername").value.trim()}}});
  if(res.error){status.textContent=authError(res.error);submit.disabled=false;submit.textContent=authMode==="login"?"دخول":"إنشاء الحساب";return}
  if(res.data.session){submit.disabled=false;closeAuth();toast("تم تسجيل الدخول ✅");await refreshUser();return}
  submit.disabled=false;if(authMode==="signup")status.textContent="تم إنشاء الحساب. إذا طلب تأكيد البريد، افتح رسالة التأكيد ثم سجّل الدخول.";
}
function authError(e){
  const m=e?.message||"خطأ غير معروف";
  if(/invalid login credentials/i.test(m))return "البريد أو كلمة المرور غير صحيحة.";
  if(/email not confirmed/i.test(m))return "أكد بريدك الإلكتروني أولًا من رسالة Supabase.";
  if(/user already registered/i.test(m))return "هذا البريد مسجل مسبقًا. استخدم تسجيل الدخول.";
  if(/password/i.test(m)&&/6/i.test(m))return "كلمة المرور يجب أن تكون 6 أحرف أو أكثر.";
  return "تعذر تسجيل الدخول: "+m;
}
async function refreshUser(){
  const {data,error}=await sb.auth.getSession(); if(error)console.error(error);
  authUser=data.session?.user||null; isAdmin=false;
  if(authUser){
    try{const a=await sb.rpc("claim_first_admin");if(!a.error&&a.data)isAdmin=true;const b=await sb.rpc("is_admin");if(!b.error&&b.data)isAdmin=true}catch(e){console.error(e)}
  }
  const b=$("loginBtn"); if(b)b.textContent=authUser?"👤 "+(authUser.user_metadata?.username||authUser.email.split("@")[0]):"تسجيل الدخول";
  if(isAdmin)addAdminButton();else $("adminBtn")?.remove();
}
function addAdminButton(){
  if($("adminBtn"))return;
  const b=document.createElement("button");b.id="adminBtn";b.className="login-btn";b.textContent="⚙ Admin";b.onclick=openAdmin;$("header-actions")?.appendChild(b)||document.querySelector(".header-actions").appendChild(b);
}
async function openAdmin(){
  if(!isAdmin)return toast("لا تملك صلاحية الإدارة.");
  const {data:gs}=await sb.from("games").select("*").order("created_at",{ascending:false});
  modalContent.innerHTML='<span class="kicker">ADMIN</span><h2>لوحة الإدارة</h2><div class="admin-grid"><h3>إضافة لعبة</h3><input id="aTitle" placeholder="اسم اللعبة"><input id="aSlug" placeholder="slug"><input id="aShort" placeholder="وصف قصير"><textarea id="aDesc" placeholder="الوصف الكامل"></textarea><input id="aCat" placeholder="التصنيف"><input id="aVer" value="1.0.0" placeholder="الإصدار"><input id="aCover" placeholder="رابط الغلاف"><button class="primary-btn" id="addGameBtn">إضافة اللعبة</button><h3>إضافة إصدار وروابط التحميل</h3><select id="aGame">'+(gs||[]).map(g=>'<option value="'+g.id+'">'+esc(g.title)+'</option>').join("")+'</select><input id="vVer" placeholder="الإصدار"><input id="vChange" placeholder="التغييرات"><input id="vAndroid" placeholder="رابط Android APK"><input id="vWindows" placeholder="رابط Windows EXE"><button class="primary-btn" id="addVersionBtn">حفظ الإصدار</button><h3>تحديث الموقع</h3><input id="uTitle" placeholder="عنوان التحديث"><textarea id="uBody" placeholder="نص التحديث"></textarea><input id="uVer" placeholder="رقم الإصدار"><button class="primary-btn" id="addUpdateBtn">نشر التحديث</button></div>';
  modal.classList.remove("hidden");document.body.style.overflow="hidden";
  $("addGameBtn").onclick=adminAddGame;$("addVersionBtn").onclick=adminAddVersion;$("addUpdateBtn").onclick=adminAddUpdate;
}
async function adminAddGame(){
  const {error}=await sb.from("games").insert({title:$("aTitle").value.trim(),slug:$("aSlug").value.trim(),short_description:$("aShort").value.trim(),description:$("aDesc").value.trim(),category:$("aCat").value.trim()||"Game",version:$("aVer").value.trim()||"1.0.0",cover_url:$("aCover").value.trim()||null,published:true,featured:false});
  toast(error?error.message:"تمت إضافة اللعبة.");if(!error)await loadAll();
}
async function adminAddVersion(){
  const {error}=await sb.from("game_versions").insert({game_id:$("aGame").value,version:$("vVer").value.trim(),changelog:$("vChange").value.trim(),android_url:$("vAndroid").value.trim()||null,windows_url:$("vWindows").value.trim()||null,published:true});
  toast(error?error.message:"تم حفظ روابط التحميل.");if(!error)await loadAll();
}
async function adminAddUpdate(){
  const {error}=await sb.from("site_updates").insert({title:$("uTitle").value.trim(),body:$("uBody").value.trim(),version:$("uVer").value.trim(),published:true});
  toast(error?error.message:"تم نشر التحديث.");if(!error)await loadAll();
}

document.querySelectorAll("[data-close]").forEach(x=>x.onclick=closeModal);
document.querySelectorAll("[data-auth-close]").forEach(x=>x.onclick=closeAuth);
$("loginBtn").onclick=()=>authUser?openAccount():openAuth();
$("heroLogin").onclick=()=>authUser?openAccount():openAuth();
search.oninput=render;filter.onchange=render;
const savedTheme=localStorage.getItem("etogame-theme");if(savedTheme==="light")document.body.classList.add("light");
$("themeBtn").onclick=()=>{document.body.classList.toggle("light");localStorage.setItem("etogame-theme",document.body.classList.contains("light")?"light":"dark")};
sb.auth.onAuthStateChange(()=>setTimeout(refreshUser,0));
refreshUser();loadAll();
