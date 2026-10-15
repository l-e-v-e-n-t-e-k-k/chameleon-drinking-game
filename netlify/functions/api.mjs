import { randomInt } from 'node:crypto';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

export function services() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const databaseURL = process.env.FIREBASE_DATABASE_URL;
    if (!raw || !databaseURL) throw new Error('Missing Firebase server configuration');
    initializeApp({ credential: cert(JSON.parse(raw)), databaseURL });
  }
  return { db: getDatabase(), auth: getAuth() };
}

const EVENT_IDS = ['category_lock','down_drink','give_drinks','trait_check','drinking_buddy','benched','rule_maker'];
const WORDS = {
  hu: [
    ['Tengerpart','Uszoda'],['Repülőtér','Vasútállomás'],['Pizza','Hamburger'],['Kávé','Tea'],['Kutya','Farkas'],
    ['Macska','Tigris'],['Mozi','Színház'],['Orvos','Ápoló'],['Erdő','Park'],['Folyó','Tó'],
    ['Hegymászás','Túrázás'],['Eső','Hó'],['Születésnap','Esküvő'],['Taxi','Busz'],['Telefon','Tablet'],
    ['Laptop','Számítógép'],['Bicikli','Roller'],['Pékség','Cukrászda'],['Étterem','Büfé'],['Sör','Bor'],
    ['Fagylalt','Jégkrém'],['Diszkó','Bár'],['Koncert','Fesztivál'],['Bank','Posta'],['Híd','Alagút'],
    ['Hold','Nap'],['Óceán','Tenger'],['Vonat','Villamos'],['Pénztárca','Táska'],['Szupermarket','Piac'],
    ['Csokoládé','Bonbon'],['Palacsinta','Gofri'],['Autó','Motor'],['Tengerész','Kalóz'],['Kastély','Palota'],
    ['Sivatag','Strand'],['Sportcipő','Bakancs'],['Víziló','Elefánt'],['Oroszlán','Párduc'],['Gitár','Ukulele'],
    ['Zongora','Szintetizátor'],['Toll','Ceruza'],['Könyvtár','Könyvesbolt'],['Iskola','Egyetem'],['Foci','Kézilabda'],
    ['Kosárlabda','Röplabda'],['Sakk','Dáma'],['Torta','Pite'],['Hotel','Apartman'],['Repülő','Helikopter'],
    ['Nyár','Tavasz'],['Karácsony','Szilveszter'],['Kórház','Rendelő'],['Kamera','Távcső'],['Kert','Udvar'],
    ['Tűzoltó','Rendőr'],['Kalap','Sapka'],['Fürdőkád','Zuhany'],['Parfüm','Dezodor'],['Medence','Jakuzzi']
  ],
  en: [
    ['Beach','Pool'],['Airport','Train station'],['Pizza','Burger'],['Coffee','Tea'],['Dog','Wolf'],
    ['Cat','Tiger'],['Cinema','Theatre'],['Doctor','Nurse'],['Forest','Park'],['River','Lake'],
    ['Hiking','Climbing'],['Rain','Snow'],['Birthday','Wedding'],['Taxi','Bus'],['Phone','Tablet'],
    ['Laptop','Desktop'],['Bicycle','Scooter'],['Bakery','Patisserie'],['Restaurant','Diner'],['Beer','Wine'],
    ['Ice cream','Sorbet'],['Nightclub','Bar'],['Concert','Festival'],['Bank','Post office'],['Bridge','Tunnel'],
    ['Moon','Sun'],['Ocean','Sea'],['Train','Tram'],['Wallet','Handbag'],['Supermarket','Market'],
    ['Chocolate','Candy'],['Pancake','Waffle'],['Car','Motorcycle'],['Sailor','Pirate'],['Castle','Palace'],
    ['Desert','Beach'],['Sneakers','Boots'],['Hippo','Elephant'],['Lion','Panther'],['Guitar','Ukulele'],
    ['Piano','Keyboard'],['Pen','Pencil'],['Library','Bookstore'],['School','University'],['Soccer','Handball'],
    ['Basketball','Volleyball'],['Chess','Checkers'],['Cake','Pie'],['Hotel','Apartment'],['Plane','Helicopter'],
    ['Summer','Spring'],['Christmas','New Year'],['Hospital','Clinic'],['Camera','Binoculars'],['Garden','Yard'],
    ['Firefighter','Police officer'],['Hat','Cap'],['Bathtub','Shower'],['Perfume','Deodorant'],['Pool','Hot tub']
  ]
};
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const allowedOriginHeaders = { 'Content-Type':'application/json', 'Cache-Control':'no-store' };
const ok = (value, status=200) => new Response(JSON.stringify(value), {status,headers:allowedOriginHeaders});
const bad = (message, status=400) => ok({error:message}, status);
const choose = list => list[randomInt(list.length)];
const roomCode = () => Array.from({length:6},()=>LETTERS[randomInt(LETTERS.length)]).join('');
const err = (message,status=400) => Object.assign(new Error(message),{status});
const assert = (condition,message,status=400) => { if(!condition) throw err(message,status); };
const cleanName = raw => { const name=String(raw??'').trim().replace(/\s+/g,' '); assert(name.length>=1 && name.length<=24,'A név 1–24 karakter lehet.'); return name; };
const codeOf = raw => { const code=String(raw??'').trim().toUpperCase(); assert(/^[A-HJ-NP-Z2-9]{6}$/.test(code),'Érvénytelen szobakód.'); return code; };
const settingsDefault = () => ({ rounds:5,language:'hu',eventsEnabled:true,eventChance:30,ruleRecord:true,enabledEvents:Object.fromEntries(EVENT_IDS.map(id=>[id,true])),customEvents:[] });
function checkSettings(raw) {
  assert(raw && typeof raw==='object','Hiányzó beállítások.');
  const rounds=Number(raw.rounds), eventChance=Number(raw.eventChance);
  assert(Number.isInteger(rounds)&&rounds>=1&&rounds<=20,'1 és 20 közötti körszám szükséges.');
  assert(['hu','en'].includes(raw.language),'Hibás nyelv.');
  assert(Number.isInteger(eventChance)&&eventChance>=0&&eventChance<=100,'Hibás event valószínűség.');
  assert(typeof raw.eventsEnabled==='boolean' && typeof raw.ruleRecord==='boolean','Hibás kapcsoló.');
  const enabledEvents=Object.fromEntries(EVENT_IDS.map(id=>[id,raw.enabledEvents?.[id]===true]));
  const provided=Array.isArray(raw.customEvents)?raw.customEvents:[];
  assert(provided.length<=20,'Legfeljebb 20 saját esemény lehet.');
  const customEvents=provided.map((item,i)=>{
    const title=String(item.title??'').trim(), description=String(item.description??'').trim();
    assert(title.length>0&&title.length<=48,'Az esemény neve legfeljebb 48 karakter.');
    assert(description.length>0&&description.length<=240,'Az esemény leírása legfeljebb 240 karakter.');
    assert(['round','game'].includes(item.duration),'Hibás esemény-időtartam.');
    return {id:`custom_${i}`,title,description,duration:item.duration,enabled:item.enabled!==false};
  });
  return {rounds,language:raw.language,eventsEnabled:raw.eventsEnabled,eventChance,ruleRecord:raw.ruleRecord,enabledEvents,customEvents};
}
function playerIds(room){return Object.keys(room.public.players||{});}
function activeIds(room){return playerIds(room).filter(id=>id!==room.public.benched);}
function loggedIn(room,uid){assert(room?.members?.[uid]===true,'Nem vagy ennek a szobának a tagja.',403);}
function isHost(room,uid){assert(room.public.hostUid===uid,'Csak a host teheti meg.',403);}
function allConnected(room){return playerIds(room).every(uid=>room.presence?.[uid]===true);}
function wordPair(room){
  const used=room.public.usedWords||[];
  const all=WORDS[room.public.settings.language];
  let candidates=all.map((pair,i)=>({pair,i})).filter(x=>!used.includes(x.i));
  if(!candidates.length){room.public.usedWords=[]; candidates=all.map((pair,i)=>({pair,i}));}
  const chosen=choose(candidates);
  room.public.usedWords.push(chosen.i);
  return randomInt(2)?chosen.pair:[chosen.pair[1],chosen.pair[0]];
}
function pickEvent(room,n){
  const s=room.public.settings;
  if(!s.eventsEnabled||randomInt(100)>=s.eventChance) return null;
  const items=EVENT_IDS.filter(id=>s.enabledEvents[id] && !(id==='benched'&&n<4)).map(id=>({id,type:'base'}));
  for(const c of s.customEvents.filter(c=>c.enabled)) items.push({...c,type:'custom'});
  if(!items.length) return null;
  const chosen=choose(items);
  if(chosen.id==='category_lock') chosen.category=choose(s.language==='hu'?['főnevek','melléknevek','igék']:['nouns','adjectives','verbs']);
  return chosen;
}
function nextHand(room){
  const ids=playerIds(room), [a,b]=wordPair(room);
  const same=randomInt(2)===0;
  const word2=same?a:b;
  room.private=Object.fromEntries(ids.map((uid,i)=>[uid,{role:'DUEL',word:i===0?a:word2,guess:null}]));
  room.public.guessSubmitted={};
  room.public.handId=(room.public.handId||0)+1;
  room.public.duelNotice=null;
}
function newRound(room){
  const p=room.public, ids=playerIds(room);
  assert(ids.length>=2&&ids.length<=8,'2–8 játékos szükséges.');
  p.round=(p.round||0)+1;
  p.roundId=(p.roundId||0)+1;
  p.status='ACTIVE'; p.votes={}; p.result=null; p.resultEndsAt=null; p.benched=null; p.duelNotice=null;
  p.mode=ids.length===2?'duel':'impostor'; p.handId=0; p.guessSubmitted={};
  p.event=pickEvent(room,ids.length);
  if(p.mode==='impostor'){
    const options=ids.filter(uid=>uid!==p.previousImpostor);
    const impostor=choose(options.length?options:ids);
    p.previousImpostor=impostor;
    if(p.event?.id==='benched') p.benched=choose(ids.filter(uid=>uid!==impostor));
    p.starter=choose(activeIds(room));
    const [innocent,odd]=wordPair(room);
    room.private=Object.fromEntries(ids.map(uid=>[uid,{role:uid===impostor?'IMPOSTOR':'INNOCENT',word:uid===impostor?odd:innocent}]));
  } else {
    p.starter=ids[(p.round-1)%2];
    nextHand(room);
  }
  if(p.event?.id==='rule_maker'&&!p.settings.ruleRecord){
    p.activeRules=p.activeRules||[];
    p.activeRules.push({id:`rule_${p.round}`,by:p.starter,text:'Szóban meghatározott szabály (Rule Maker)',type:'rule'});
  }
  if(p.event?.type==='custom'&&p.event.duration==='game'){
    p.activeRules=p.activeRules||[];
    p.activeRules.push({id:`custom_${p.round}`,by:null,text:`${p.event.title}: ${p.event.description}`,type:'custom'});
  }
}
function closeRound(room,loserUid,winnerSide){
  const p=room.public;
  const words=Object.fromEntries(Object.entries(room.private||{}).map(([uid,r])=>[uid,r.word]));
  const roles=Object.fromEntries(Object.entries(room.private||{}).map(([uid,r])=>[uid,r.role]));
  p.result={round:p.round,loserUid,winnerSide,words,roles,penalty:p.event?.id==='down_drink'?'down_drink':'normal',sips:p.round,at:Date.now()};
  p.lastResult=p.result;
  p.status='RESULT'; p.resultEndsAt=Date.now()+3000;
}
function pauseIfNeeded(room){
  const p=room.public;
  if(!['ACTIVE','RESULT','PAUSED'].includes(p.status)) return;
  if(!allConnected(room)) {
    if(p.status!=='PAUSED') {p.pausedFrom=p.status;p.pausedAt=Date.now();p.status='PAUSED';}
  } else if(p.status==='PAUSED') {
    p.status=p.pausedFrom||'ACTIVE';
    if(p.status==='RESULT'&&p.resultEndsAt) p.resultEndsAt+=Date.now()-(p.pausedAt||Date.now());
    p.pausedFrom=null;p.pausedAt=null;
  }
}
async function changeRoom(db, code, uid, fn){
  const ref=db.ref(`rooms/${code}`);
  // Read first: RTDB transactions may initially invoke their callback with null
  // before the server's existing value has populated the local cache.
  const initial=(await ref.get()).val();
  assert(initial,'Nem található a szoba.',404);
  let firstCall=true;
  let error=null;
  const tx=await ref.transaction(room=>{
    // A Firebase első híváskor null helyi cache-t adhat.
    // A tranzakció ekkor a korábban lekért értékből állít elő javaslatot;
    // a szerver hash-ellenőrzése konfliktusnál újrafuttatja friss adatokkal.
    if (room===null && firstCall) room=structuredClone(initial);
    firstCall=false;
    error=null;
    try {
      loggedIn(room,uid);
      fn(room);
      room.meta.updatedAt=Date.now();
      return room;
    } catch(e){error=e;return undefined;}
  },undefined,false);
  if(!tx.committed) throw error||err('A módosítás nem sikerült; próbáld újra.',409);
  return tx.snapshot.val();
}
export default async function handler(request){
  try {
    const {db,auth}=services();
    if(request.method==='GET'){
      const url=new URL(request.url);
      if(url.searchParams.get('action')!=='config') return bad('Ismeretlen végpont.',404);
      const projectId=JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON).project_id;
      assert(process.env.FIREBASE_WEB_API_KEY,'Hiányzó FIREBASE_WEB_API_KEY szerverbeállítás.',500);
      return ok({apiKey:process.env.FIREBASE_WEB_API_KEY,projectId,authDomain:`${projectId}.firebaseapp.com`,databaseURL:process.env.FIREBASE_DATABASE_URL});
    }
    if(request.method!=='POST') return bad('Nem támogatott HTTP metódus.',405);
    const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
    if(!token) return bad('Hiányzó bejelentkezés.',401);
    let decoded;
    try { decoded=await auth.verifyIdToken(token); } catch{ return bad('Érvénytelen vagy lejárt munkamenet.',401); }
    const uid=decoded.uid;
    const body=await request.json();
    const action=body.action;
    if(action==='create'){
      const name=cleanName(body.name);
      let created=null;
      for(let i=0;i<8;i++){
        const code=roomCode(), now=Date.now();
        const room={meta:{createdAt:now,updatedAt:now},members:{[uid]:true},presence:{[uid]:false},private:{},public:{players:{[uid]:{name}},hostUid:uid,status:'LOBBY',round:0,roundId:0,settings:settingsDefault(),activeRules:[],buddies:{},votes:{},usedWords:[]}};
        const tx=await db.ref(`rooms/${code}`).transaction(v=>v===null?room:undefined,undefined,false);
        if(tx.committed){created=code;break;}
      }
      assert(created,'Nem sikerült szobát létrehozni.',503);
      return ok({code:created});
    }
    const code=codeOf(body.code);
    if(action==='join'){
      const name=cleanName(body.name);
      const ref=db.ref(`rooms/${code}`);
      // Prime the transaction cache and distinguish a missing room from
      // an initial locally unknown value.
      const initial=(await ref.get()).val();
      assert(initial,'Nem található a szoba.',404);
      let firstCall=true;
      let error=null;
      const tx=await ref.transaction(room=>{
        if (room===null && firstCall) room=structuredClone(initial);
        firstCall=false;
        error=null;
        try{
          assert(room,'Nem található a szoba.',404);
          assert(room.public.status==='LOBBY','A játék már elindult.');
          const ids=playerIds(room);
          assert(room.members[uid]||ids.length<8,'A szoba megtelt.');
          assert(!ids.some(id=>id!==uid&&room.public.players[id].name.toLocaleLowerCase()===name.toLocaleLowerCase()),'Ez a név már foglalt.');
          room.members[uid]=true; room.public.players[uid]={name}; room.presence=room.presence||{};
          if(typeof room.presence[uid]!=='boolean')room.presence[uid]=false;
          room.meta.updatedAt=Date.now();return room;
        }catch(e){error=e;return undefined;}
      },undefined,false);
      if(!tx.committed)throw error||err('Csatlakozás sikertelen.',409);
      return ok({code});
    }
    if(action==='resume'){
      const snap=await db.ref(`rooms/${code}/members/${uid}`).get();
      assert(snap.val()===true,'Már nem vagy a szobában.',403);
      return ok({code});
    }
    if(action==='settings'){
      const settings=checkSettings(body.settings);
      await changeRoom(db,code,uid,room=>{isHost(room,uid);assert(room.public.status==='LOBBY','A játék már elindult.');room.public.settings=settings;});
      return ok({ok:true});
    }
    if(action==='start'){
      await changeRoom(db,code,uid,room=>{
        isHost(room,uid);assert(room.public.status==='LOBBY','A játék már elindult.');
        assert(playerIds(room).length>=2,'Legalább 2 játékos kell.');
        assert(allConnected(room),'Minden játékosnak online kell lennie az induláshoz.');
        newRound(room);
      });return ok({ok:true});
    }
    if(action==='vote'){
      await changeRoom(db,code,uid,room=>{
        const p=room.public;
        pauseIfNeeded(room);
        assert(p.status==='ACTIVE'&&p.mode==='impostor','A szavazás jelenleg nem aktív.');
        assert(body.roundId===p.roundId,'Korábbi körből érkezett szavazat.',409);
        assert(uid!==p.benched,'Ebben a körben néző vagy.');
        const target=body.target;
        assert(target===null||(typeof target==='string'&&activeIds(room).includes(target)&&uid!==target),'Érvénytelen célpont.');
        p.votes=p.votes||{};
        if(target===null) delete p.votes[uid];else p.votes[uid]=target;
        if(target!==null){
          const count=Object.values(p.votes).filter(v=>v===target).length;
          if(count>=Math.floor(activeIds(room).length/2)+1){
            closeRound(room,target,room.private[target].role==='IMPOSTOR'?'innocents':'impostor');
          }
        }
      });return ok({ok:true});
    }
    if(action==='guess'){
      await changeRoom(db,code,uid,room=>{
        const p=room.public;
        pauseIfNeeded(room);
        assert(p.status==='ACTIVE'&&p.mode==='duel','Nem aktív a kétfős forduló.');
        assert(body.roundId===p.roundId && body.handId===p.handId,'Ez egy korábbi feladvány.',409);
        assert(['same','different'].includes(body.guess),'Hibás választás.');
        assert(!p.guessSubmitted?.[uid],'Már választottál.');
        room.private[uid].guess=body.guess;
        p.guessSubmitted=p.guessSubmitted||{};p.guessSubmitted[uid]=true;
        const ids=playerIds(room);
        if(ids.every(id=>p.guessSubmitted[id])){
          const same=room.private[ids[0]].word===room.private[ids[1]].word;
          const correct=ids.map(id=>room.private[id].guess===(same?'same':'different'));
          if(correct[0]!==correct[1])closeRound(room,ids[correct[0]?1:0],'duel');
          else{
            const notice={words:ids.map(id=>room.private[id].word), outcome:'draw'};
            nextHand(room);
            p.duelNotice=notice;
          }
        }
      });return ok({ok:true});
    }
    if(action==='rule'){
      await changeRoom(db,code,uid,room=>{
        const p=room.public, text=String(body.text??'').trim();
        assert(p.settings.ruleRecord&&p.event?.id==='rule_maker'&&p.starter===uid,'Most nem adhatsz hozzá szabályt.');
        assert(p.status==='ACTIVE'&&body.roundId===p.roundId,'A kör már nem aktív.');
        assert(text.length>0&&text.length<=180,'A szabály 1–180 karakteres lehet.');
        p.activeRules=p.activeRules||[];
        assert(!p.activeRules.some(r=>r.id===`rule_${p.round}`),'Erre a körre már van szabály.');
        p.activeRules.push({id:`rule_${p.round}`,by:uid,text,type:'rule'});
      });return ok({ok:true});
    }
    if(action==='buddy'){
      await changeRoom(db,code,uid,room=>{
        const p=room.public, target=body.target;
        assert(p.status==='ACTIVE'&&p.event?.id==='drinking_buddy'&&p.starter===uid,'Nem választhatsz most ivópartnert.');
        assert(body.roundId===p.roundId,'Korábbi kör.');
        assert(playerIds(room).includes(target)&&uid!==target,'Hibás játékos.');
        p.buddies=p.buddies||{};p.buddies[uid]=target;
      });return ok({ok:true});
    }
    if(action==='sync'){
      await changeRoom(db,code,uid,room=>{pauseIfNeeded(room);});return ok({ok:true});
    }
    if(action==='advance'){
      await changeRoom(db,code,uid,room=>{
        pauseIfNeeded(room);
        const p=room.public;
        assert(p.status==='RESULT'&&Date.now()>=p.resultEndsAt,'A következő kör még nem indítható.',409);
        if(p.round>=p.settings.rounds){p.status='FINISHED';p.result=null;}
        else newRound(room);
      });return ok({ok:true});
    }
    if(action==='kick'||action==='leave'){
      const target=action==='leave'?uid:String(body.target||'');
      let removeRoom=false;
      await changeRoom(db,code,uid,room=>{
        if(action==='kick')isHost(room,uid);
        assert(room.members[target]===true,'A játékos nem tag.');
        delete room.members[target];delete room.presence?.[target];delete room.private?.[target];delete room.public.players[target];
        const remaining=playerIds(room);
        if(!remaining.length){removeRoom=true;room.public.status='FINISHED';return;}
        if(room.public.hostUid===target)room.public.hostUid=remaining.find(id=>room.presence?.[id])||remaining[0];
        if(['ACTIVE','PAUSED','RESULT'].includes(room.public.status)){
          if(remaining.length>=2){room.public.round=Math.max(0,room.public.round-1);newRound(room);}
          else{room.public.status='LOBBY';room.public.round=0;room.private={};}
        }
      });
      if(removeRoom)await db.ref(`rooms/${code}`).remove();
      return ok({ok:true});
    }
    if(action==='restart'){
      await changeRoom(db,code,uid,room=>{
        isHost(room,uid);assert(room.public.status==='FINISHED','Még tart a játék.');
        assert(allConnected(room),'Minden játékosnak online kell lennie.');
        room.public.round=0;room.public.previousImpostor=null;room.public.usedWords=[];
        room.public.activeRules=[];room.public.buddies={};room.public.lastResult=null;
        newRound(room);
      });return ok({ok:true});
    }
    if(action==='claimHost'){
      await changeRoom(db,code,uid,room=>{
        const p=room.public;
        assert(p.hostUid!==uid,'Már te vagy a host.');
        assert(room.presence?.[p.hostUid]!==true,'A host online.');
        assert(p.status==='PAUSED'&&Date.now()-(p.pausedAt||Date.now())>=10000,'Várj 10 másodpercet a host átvételéhez.');
        p.hostUid=uid;
      });return ok({ok:true});
    }
    return bad('Ismeretlen művelet.',404);
  }catch(e){
    console.error('LAST CALL API:', e.message);
    return bad(e.status?e.message:'Szerverhiba. Ellenőrizd a Firebase beállításokat.',e.status||500);
  }
}
