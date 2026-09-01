const API_BASE="https://zyrex-api.brezzteam5.workers.dev";
const JAVA_IP="zyrexsmp.xyz:5066";
let currentBoard="baltop", playersCache=[], eventSource=null;

const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

async function api(path,opts={}){
  const r=await fetch(API_BASE+path,{...opts,cache:"no-store",headers:{
    Accept:"application/json",
    "Content-Type":"application/json",
    ...(opts.headers||{})
  }});
  let j={}; try{j=await r.json()}catch{}
  if(!r.ok) throw Error(`HTTP ${r.status}${j.error?` — ${j.error}`:""}`);
  if(j.success===false) throw Error(j.error||"API error");
  return j.data??j;
}

function toast(t="Done"){
  const x=$("toast"); if(!x)return;
  x.textContent=t;x.classList.add("show");
  clearTimeout(window.__toast);window.__toast=setTimeout(()=>x.classList.remove("show"),1800);
}

async function copy(text){
  try{await navigator.clipboard.writeText(text);toast(`${text} copied`)}
  catch{toast("Copy unavailable")}
}
document.querySelectorAll("[data-copy]").forEach(b=>b.onclick=()=>copy(b.dataset.copy));
$("copyJava").onclick=()=>copy(JAVA_IP);

$("menuToggle").onclick=()=>$("navLinks").classList.toggle("open");
document.querySelectorAll("#navLinks a").forEach(a=>a.onclick=()=>$("navLinks").classList.remove("open"));

$("chatFab").onclick=()=>$("chatPanel").classList.add("open");
$("chatClose").onclick=()=>$("chatPanel").classList.remove("open");

async function status(){
  try{
    const d=await api("/api/v1/status");
    const p=Number(d.online_players??d.players?.count??0),m=Number(d.max_players??500);
    const t=d.tps??d.performance?.tps??"--",ms=d.mspt??d.performance?.mspt??"--";
    $("apiState").textContent="ONLINE";$("footerApi").textContent="online";$("navStatus").textContent="ONLINE";
    $("serverStatus").textContent=d.online===false?"OFFLINE":"ONLINE";
    $("serverHint").textContent=d.online===false?"Minecraft server offline":"Realtime connection active";
    $("heroPlayers").textContent=`${p} / ${m}`;$("metricPlayers").textContent=`${p} / ${m}`;
    $("heroTps").textContent=typeof t==="number"?t.toFixed(2):t;$("metricTps").textContent=typeof t==="number"?t.toFixed(2):t;
    $("heroMspt").textContent=typeof ms==="number"?`${ms.toFixed(2)} ms`:ms;$("metricMspt").textContent=typeof ms==="number"?`${ms.toFixed(2)} ms`:ms;
    $("playerBar").style.width=Math.min(100,m?p/m*100:0)+"%";
    $("updated").textContent=new Date().toLocaleTimeString("id-ID");
    $("playerCount").textContent=`${p} online`;
  }catch(e){
    $("apiState").textContent="OFFLINE";$("footerApi").textContent="offline";$("navStatus").textContent="OFFLINE";
    $("serverStatus").textContent="OFFLINE";$("serverHint").textContent=e.message;
  }
}

async function players(){
  try{
    const d=await api("/api/v1/players");
    playersCache=Array.isArray(d.players)?d.players:Array.isArray(d)?d:[];
    renderPlayers();
  }catch{
    $("playerGrid").innerHTML='<div class="empty glass">Unable to load players.</div>';
  }
}
function playerValue(p, ...keys){
  for(const k of keys){
    if(p && p[k] !== undefined && p[k] !== null && p[k] !== "") return p[k];
  }
  return null;
}
function num(v){
  const n=Number(v);
  return Number.isFinite(n)?n:0;
}
function kd(kills,deaths){
  const k=num(kills), d=num(deaths);
  return d === 0 ? (k > 0 ? k.toFixed(2) : "0.00") : (k/d).toFixed(2);
}
function renderPlayers(){
  const q=($("playerSearch").value||"").trim().toLowerCase();
  const list=playersCache.filter(p=>
    String(playerValue(p,"name","username","player")||"Unknown").toLowerCase().includes(q)
  );
  if(!list.length){
    $("playerGrid").innerHTML='<div class="empty glass">No matching players online.</div>';
    return;
  }

  $("playerGrid").innerHTML=list.map((p,i)=>{
    const n=playerValue(p,"name","username","player")||"Unknown";
    const platform=playerValue(p,"platform")||"JAVA";
    const head=playerValue(p,"head")||`https://mc-heads.net/avatar/${encodeURIComponent(n)}/128`;
    const kills=playerValue(p,"uds_kills","pvp_kills","kills") ?? 0;
    const deaths=playerValue(p,"uds_deaths","pvp_deaths","deaths") ?? 0;
    const rank=playerValue(p,"pvp_rank")||"—";
    const ht=playerValue(p,"ht_rank")||"—";
    const lt=playerValue(p,"lt_rank")||"—";
    const elo=playerValue(p,"pvp_elo") ?? 0;
    const shards=playerValue(p,"shards") ?? 0;
    const online=p.online !== false;

    return `<button type="button" class="player-card glass" data-player="${esc(n)}" style="text-align:left;width:100%;cursor:pointer">
      <img src="${esc(head)}" alt="${esc(n)}" loading="lazy">
      <div class="player-main">
        <div class="player-name-row"><b>${esc(n)}</b><span class="platform">${esc(platform)}</span></div>
        <div class="player-online"><i></i>${online?"ONLINE":"OFFLINE"} · Ping ${esc(playerValue(p,"ping")??"--")} ms</div>
        <div class="player-stats">
          <span><b>${esc(kills)}</b><small>Kills</small></span>
          <span><b>${esc(deaths)}</b><small>Deaths</small></span>
          <span><b>${esc(kd(kills,deaths))}</b><small>K/D</small></span>
        </div>
        <div class="player-ranks">
          <span>HT <b>${esc(ht)}</b></span>
          <span>LT <b>${esc(lt)}</b></span>
          <span>ELO <b>${esc(elo)}</b></span>
          <span>Shards <b>${esc(shards)}</b></span>
        </div>
      </div>
    </button>`;
  }).join("");

  document.querySelectorAll("[data-player]").forEach(card=>{
    card.onclick=()=>openPlayerProfile(card.dataset.player);
  });
}
$("playerSearch").oninput=renderPlayers;
$("refreshPlayers").onclick=players;

async function openPlayerProfile(name){
  const modal=$("playerModal");
  const body=$("playerModalBody");
  if(!modal||!body)return;
  modal.classList.add("open");
  body.innerHTML='<div class="profile-loading">Loading player profile…</div>';

  try{
    const raw=await api(`/api/v1/player?name=${encodeURIComponent(name)}`);
    const p=raw?.player && typeof raw.player==="object" ? raw.player : raw;
    const n=playerValue(p,"name","username","player")||name;
    const head=playerValue(p,"head")||`https://mc-heads.net/avatar/${encodeURIComponent(n)}/192`;
    const skin=playerValue(p,"skin");
    const kills=playerValue(p,"uds_kills","pvp_kills","kills") ?? 0;
    const deaths=playerValue(p,"uds_deaths","pvp_deaths","deaths") ?? 0;
    const rank=playerValue(p,"pvp_rank")||"—";
    const ht=playerValue(p,"ht_rank")||"—";
    const lt=playerValue(p,"lt_rank")||"—";
    const elo=playerValue(p,"pvp_elo") ?? 0;
    const ping=playerValue(p,"ping");
    const online=p.online === true || p.online === "true";
    const lastSeen=playerValue(p,"last_seen","lastSeen","last-online","lastOnline","last_login","lastLogin");

    body.innerHTML=`
      <div class="profile-hero">
        <img src="${esc(head)}" alt="${esc(n)}">
        <div>
          <span class="profile-status ${online?"online":"offline"}">${online?"ONLINE":"OFFLINE"}</span>
          <h2>${esc(n)}</h2>
          <p>Minecraft Player · ${esc(playerValue(p,"platform")||"JAVA")}</p>
        </div>
      </div>
      <div class="profile-grid">
        <div class="profile-stat"><b>${esc(kills)}</b><span>Kills</span></div>
        <div class="profile-stat"><b>${esc(deaths)}</b><span>Deaths</span></div>
        <div class="profile-stat"><b>${esc(kd(kills,deaths))}</b><span>K/D</span></div>
        <div class="profile-stat"><b>${esc(elo)}</b><span>PvP ELO</span></div>
      </div>
      <div class="profile-details">
        <div><span>HT Rank</span><b>${esc(ht)}</b></div>
        <div><span>LT Rank</span><b>${esc(lt)}</b></div>
        <div><span>PvP Rank</span><b>${esc(rank)}</b></div>
        <div><span>Ping</span><b>${esc(ping??"—")}${ping!==null?" ms":""}</b></div>
        <div><span>Last Seen</span><b>${esc(formatLastSeen(lastSeen,online))}</b></div>
        ${skin?`<div><span>Skin</span><a href="${esc(skin)}" target="_blank" rel="noopener">View skin ↗</a></div>`:""}
      </div>
      <div class="privacy-note">🔒 World and coordinates are hidden for player privacy.</div>`;
  }catch(e){
    body.innerHTML=`<div class="empty">Unable to load ${esc(name)}.<br><small>${esc(e.message)}</small></div>`;
  }
}
function formatLastSeen(v,online){
  if(online)return "Now";
  if(v===null||v===undefined||v==="")return "Unknown";
  const n=Number(v);
  if(Number.isFinite(n) && n>0){
    try{return new Date(n).toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"});}catch{}
  }
  return String(v);
}
$("playerModalClose")?.addEventListener("click",()=>$("playerModal").classList.remove("open"));
$("playerModal")?.addEventListener("click",e=>{if(e.target.id==="playerModal")$("playerModal").classList.remove("open")});

$("playerSearch").oninput=renderPlayers;
$("refreshPlayers").onclick=players;

function normalizeRows(raw){
  if(Array.isArray(raw))return raw;
  if(!raw||typeof raw!=="object")return [];
  for(const k of ["entries","leaderboard","players","data","rows","results"]){
    if(Array.isArray(raw[k]))return raw[k];
  }
  const arrays=Object.values(raw).filter(Array.isArray);
  return arrays.length?arrays[0]:[];
}

async function leaderboard(){
  $("leaderRows").innerHTML='<tr><td colspan="3">Loading…</td></tr>';
  try{
    // Requesting without `type` lets ZyrexWebAPI return all available boards.
    const raw=await api("/api/v1/leaderboards?limit=10");
    let rows=normalizeRows(raw);
    if(raw&&typeof raw==="object"&&!Array.isArray(raw)){
      const wanted={baltop:["baltop","money","balance","economy"],shards:["shards","top-shards"],pvp:["pvp","elo"]}[currentBoard]||[];
      for(const k of wanted){if(Array.isArray(raw[k])){rows=raw[k];break}}
    }
    if(!rows.length){
      $("leaderRows").innerHTML='<tr><td colspan="3">No data available yet.</td></tr>';
      $("boardNote").textContent="The API returned no entries for this leaderboard.";
      return;
    }
    $("boardNote").textContent="";
    $("leaderRows").innerHTML=rows.slice(0,10).map((r,i)=>{
      const n=r.name??r.username??r.player??r.playerName??"Unknown";
      const v=r.value??r.balance??r.money??r.shards??r.elo??r.score??0;
      return `<tr><td class="rank">${i+1}</td><td><b>${esc(n)}</b></td><td>${esc(v)}</td></tr>`;
    }).join("");
  }catch(e){
    $("leaderRows").innerHTML=`<tr><td colspan="3" class="error-cell">Leaderboard unavailable — ${esc(e.message)}</td></tr>`;
    $("boardNote").textContent="If this remains HTTP 400, the API's LeaderboardManager needs the supported board names fixed server-side.";
  }
}
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");currentBoard=b.dataset.board;leaderboard();
});
$("refreshBoards").onclick=leaderboard;

async function achievements(){
  try{
    const d=await api("/api/v1/achievements");
    const rows=Array.isArray(d)?d:(d.achievements||d.recent||[]);
    if(!rows.length){$("achievementGrid").innerHTML='<div class="empty glass">No recent achievements yet.</div>';return}
    $("achievementGrid").innerHTML=rows.slice(0,9).map(a=>`<article class="achievement-card glass">
      <div class="achievement-icon">🏆</div><div><b>${esc(a.title??a.name??"Achievement")}</b>
      <small>${esc(a.player??a.username??"Player")} · ${esc(a.description??"Milestone unlocked")}</small>
      <em>${esc(a.time??a.timestamp??"recent")}</em></div></article>`).join("");
  }catch{$("achievementGrid").innerHTML='<div class="empty glass">Achievements unavailable.</div>'}
}
$("refreshAchievements").onclick=achievements;

function addActivity(kind,m){
  const box=$("activityList");if(box.querySelector(".empty"))box.innerHTML="";
  const n=m.name??m.player??m.username??"Player";
  const icon=kind==="join"?"↗":"↙",label=kind==="join"?"JOINED":"LEFT";
  box.insertAdjacentHTML("afterbegin",`<div class="activity-row ${kind}"><span class="activity-icon">${icon}</span><div><b>${esc(n)}</b><small>${label} the server</small></div><time>${new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}</time></div>`);
  while(box.children.length>20)box.lastElementChild.remove();
}

function addChat(m){
  const box=$("chatMessages");if(box.querySelector(".empty"))box.innerHTML="";
  const n=m.name??m.player??m.username??"Player",text=m.message??m.text??"";
  box.insertAdjacentHTML("beforeend",`<div class="chat-msg"><b>${esc(n)}</b><small>${esc(m.platform??"")}</small><div>${esc(text)}</div></div>`);
  box.scrollTop=box.scrollHeight;
}

function connectEvents(){
  try{
    eventSource=new EventSource(API_BASE+"/api/v1/events");
    $("activityState").textContent="LIVE";
    eventSource.onmessage=e=>{
      try{
        const x=JSON.parse(e.data),type=x.type??x.event??x.name,data=x.data??x;
        if(type==="achievement")achievements();
        else if(["join","player_join","playerJoin"].includes(type))addActivity("join",data);
        else if(["leave","quit","player_leave","playerQuit"].includes(type))addActivity("leave",data);
      }catch{}
    };
    eventSource.onerror=()=>{
      $("activityState").textContent="RECONNECTING";
      eventSource?.close();setTimeout(connectEvents,7000);
    };
  }catch{$("activityState").textContent="UNAVAILABLE"}
}

async function refresh(){await Promise.allSettled([status(),players(),leaderboard(),achievements()])}
refresh();setInterval(refresh,5000);connectEvents();
