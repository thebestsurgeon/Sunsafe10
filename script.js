let uv=0,temp=0,hum=0,sunMins=0,water=1200,goal=2800,running=false,iv=null,safe=12,urineScore=20,chatOpen=true,urineText='Pale Yellow - Perfect';
let recognition=null,speechEnabled=true,isListening=false,lat=null,lon=null;

function goHome(el){window.scrollTo({top:0,behavior:'smooth'});setNav(el);showTab('sun',document.getElementById('tabBtn-sun'))}
function setNav(el){document.querySelectorAll('.nav-links a').forEach(a=>a.classList.remove('active'));if(el)el.classList.add('active')}
function showTab(t,btn){
 document.querySelectorAll('.tab-pane').forEach(e=>e.classList.add('hidden'));
 let pane=document.getElementById('tab-'+t); if(pane) pane.classList.remove('hidden');
 if(btn){document.querySelectorAll('.tabs .tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active')}
 if(t==='myhealth') loadMyHealth();
 if(pane) pane.scrollIntoView({behavior:'smooth',block:'start'});
}
function getUserKey(){ return 'sunsafe_health_local'; }
function getHistoryKey(){ return 'sunsafe_history_local'; }
function saveUserData(){
 let data={water,goal,sunMins,urineScore,urineText,uv,temp,hum,safe,lat,lon,lastSaved:new Date().toISOString(),swelling:document.getElementById('swelling')?.checked||false,fatigue:document.getElementById('fatigue')?.checked||false,pain:document.getElementById('pain')?.checked||false,nausea:document.getElementById('nausea')?.checked||false};
 localStorage.setItem(getUserKey(),JSON.stringify(data));
}
function loadUserData(){
 let raw=localStorage.getItem(getUserKey()); if(!raw) return;
 try{
  let d=JSON.parse(raw); water=d.water||1200; goal=d.goal||2800; sunMins=d.sunMins||0; urineScore=d.urineScore||20; urineText=d.urineText||'Pale Yellow - Perfect';
  safe=d.safe||12; uv=d.uv||uv; temp=d.temp||temp; hum=d.hum||hum; lat=d.lat; lon=d.lon;
  document.getElementById('waterDisplay').innerText=`${water} / ${goal} ml`; document.getElementById('waterBar').style.width=(water/goal*100)+'%';
  document.getElementById('timerDisplay').innerText=`${String(Math.floor(sunMins/60)).padStart(2,'0')}:${String(sunMins%60).padStart(2,'0')}`;
  document.getElementById('timerBar').style.width=Math.min(100,sunMins/safe*100)+'%'; document.getElementById('timerRing').style.background=`conic-gradient(#3B5BFE ${Math.min(100,sunMins/safe*100)}%,#F1F5F9 ${Math.min(100,sunMins/safe*100)}%)`;
  document.getElementById('urineStatus').innerText='Status: '+urineText; document.getElementById('urineStatus').className=urineScore>60?'alert-box danger':'alert-box success';
  if(document.getElementById('swelling')){document.getElementById('swelling').checked=d.swelling;document.getElementById('fatigue').checked=d.fatigue;document.getElementById('pain').checked=d.pain;document.getElementById('nausea').checked=d.nausea;}
  if(uv>0){updateUIAfterFetch()} else {updateKidney();updateAI();}
 }catch(e){console.log(e)}
}
function saveHealthData(){
 saveUserData();
 let history=JSON.parse(localStorage.getItem(getHistoryKey())||'[]');
 let entry={date:new Date().toLocaleString(),water,sunMins,urineText,uv,temp,hum,kidneyScore:document.getElementById('kidneyScore')?.innerText||'--'};
 history.unshift(entry); if(history.length>20) history.pop();
 localStorage.setItem(getHistoryKey(),JSON.stringify(history));
 alert(`✅ Saved!\nWater: ${water}ml\nSun: ${sunMins}min\nUV: ${uv}`); loadMyHealth();
}
function loadMyHealth(){
 let health=JSON.parse(localStorage.getItem(getUserKey())||'{}'); let history=JSON.parse(localStorage.getItem(getHistoryKey())||'[]');
 document.getElementById('myWater').innerText=(health.water||water)+' ml'; document.getElementById('mySun').innerText=(health.sunMins||sunMins)+' min';
 document.getElementById('myUrine').innerText=health.urineText||urineText; document.getElementById('myKidney').innerText=health.kidneyScore||document.getElementById('kidneyScore')?.innerText||'--';
 let list=document.getElementById('historyList'); let empty=document.getElementById('historyEmpty');
 if(history.length===0){list.innerHTML='';empty.style.display='block'; return}
 empty.style.display='none';
 list.innerHTML=history.map(h=>`<div class="trigger" style="flex-direction:column;align-items:flex-start;gap:6px"><div style="display:flex;justify-content:space-between;width:100%"><b>${h.date}</b><span style="color:#64748B">${h.uv?`UV ${h.uv}`:''} ${h.temp?`${h.temp}°C`:''}</span></div><div style="font-size:11px;color:#475569">💧 ${h.water}ml • ☀️ ${h.sunMins}min • 🧪 ${h.urineText} • ${h.kidneyScore}</div></div>`).join('');
}
function clearMyHistory(){if(confirm('Clear history?')){localStorage.removeItem(getHistoryKey());loadMyHealth()}}
function exportData(){
 let data={current:JSON.parse(localStorage.getItem(getUserKey())||'{}'),history:JSON.parse(localStorage.getItem(getHistoryKey())||'[]')};
 let blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); let url=URL.createObjectURL(blob);let a=document.createElement('a');a.href=url;a.download=`sunsafe_${new Date().toISOString().slice(0,10)}.json`;a.click();
}

// --- FIXED LOCATION CODE ---
async function requestLocation(){
 let locEl=document.getElementById('location');
 // Check if HTTPS
 if(window.location.protocol==='file:'){
   alert('⚠️ You opened file as file:// — GPS is blocked by browser. You must host on HTTPS (Netlify, Vercel, GitHub Pages) or use Live Server in VS Code. Using Port Harcourt demo data for now.');
   locEl.innerText='📍 Demo: Port Harcourt (file:// blocked)';
   await fetchLiveWeather(4.8156,7.0498); // Port Harcourt
   return;
 }
 locEl.innerText='📍 Requesting GPS permission...';
 if(!navigator.geolocation){
   alert('Geolocation not supported. Using Port Harcourt demo.');
   await fetchLiveWeather(4.8156,7.0498);
   return;
 }
 navigator.geolocation.getCurrentPosition(async pos=>{
   lat=pos.coords.latitude; lon=pos.coords.longitude;
   locEl.innerText=`📍 ${lat.toFixed(3)}, ${lon.toFixed(3)} • Live`;
   document.getElementById('uvLocationInfo').innerText=`Lat ${lat.toFixed(2)}, Lon ${lon.toFixed(2)} • Live API`;
   document.getElementById('statLocation').innerText=`${lat.toFixed(2)}, ${lon.toFixed(2)}`;
   await fetchLiveWeather(lat,lon);
 }, async err=>{
   console.log('Geo error:',err);
   let msg=err.code===1?'Permission denied':err.code===2?'Position unavailable':err.code===3?'Timeout':'Unknown error';
   alert(`GPS ${msg}. Using Port Harcourt demo. On mobile, enable Location in browser settings.`);
   locEl.innerText=`📍 Demo: Port Harcourt (GPS ${msg})`;
   await fetchLiveWeather(4.8156,7.0498); // fallback
 }, {enableHighAccuracy:true, timeout:10000, maximumAge:0});
}

function updateUIAfterFetch(){
  document.getElementById('uvVal').innerText=uv.toFixed(1);document.getElementById('uvValTop').innerText=uv.toFixed(1);
  document.getElementById('uvBar').style.width=Math.min(100,uv/11*100)+'%';
  document.getElementById('tempVal').innerText=Math.round(temp)+'°';document.getElementById('tempValTop').innerText=Math.round(temp)+'°';
  document.getElementById('humVal').innerText=Math.round(hum)+'%';document.getElementById('humValTop').innerText=Math.round(hum)+'%';
  if(uv<=2) safe=60; else if(uv<=3) safe=30; else if(uv<=5) safe=20; else if(uv<=7) safe=12; else if(uv<=9) safe=8; else safe=5;
  document.getElementById('safeTimeBadge').innerText=`Safe: ${safe} min (UV ${uv.toFixed(1)})`;
  document.getElementById('statSafe').innerText=`☀️ ${safe} min`;
  document.getElementById('statSafeSub').innerText=`Safe at UV ${uv.toFixed(1)}`;
  let label=uv<=2?'Low':uv<=5?'Moderate':uv<=7?'High':uv<=10?'Very High':'Extreme';
  document.getElementById('uvLabelTop').innerText=label; document.getElementById('uvBadge').innerText=label; document.getElementById('uvBadge').className=uv>5?'badge danger':'badge neutral';
  let aiBox=document.getElementById('aiUvPred');
  if(uv>=8){aiBox.className='alert-box danger'; aiBox.innerHTML=`🔴 Danger: Live UV ${uv.toFixed(1)} — burns in ${safe} mins.`}
  else if(uv>=5){aiBox.className='alert-box warning'; aiBox.innerHTML=`⚠️ UV ${uv.toFixed(1)} — limit to ${safe} mins.`}
  else{aiBox.className='alert-box success'; aiBox.innerHTML=`✅ Good: UV ${uv.toFixed(1)} — safe for ${safe} mins.`}
  updateKidney();updateAI();testAir();saveUserData();
}

async function fetchLiveWeather(latitude,longitude){
 try{
  document.getElementById('uvLocationInfo').innerText=`Fetching live weather for ${latitude.toFixed(2)}, ${longitude.toFixed(2)}...`;
  let url=`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,uv_index&timezone=auto`;
  let res=await fetch(url); 
  if(!res.ok) throw new Error('API failed '+res.status);
  let data=await res.json(); let cur=data.current;
  if(!cur){throw new Error('No current data')}
  uv=cur.uv_index ?? 6; temp=cur.temperature_2m ?? 33; hum=cur.relative_humidity_2m ?? 50;
  updateUIAfterFetch();
  document.getElementById('uvLocationInfo').innerText=`Lat ${latitude.toFixed(2)}, Lon ${longitude.toFixed(2)} • Updated ${new Date().toLocaleTimeString()}`;
 }catch(e){
  console.error(e);
  document.getElementById('uvLocationInfo').innerText=`Live API failed (${e.message}) — using demo`;
  uv=7.5; temp=33; hum=60; // demo fallback
  updateUIAfterFetch();
  alert('Live weather API failed (maybe offline). Using demo values UV 7.5, 33°C. Check internet.');
 }
}

function toggleSun(){
 running=!running;document.getElementById('sunBtn').innerText=running?'Stop Monitoring':'Start Monitoring';
 if(running){
  iv=setInterval(()=>{
   sunMins++;let m=Math.floor(sunMins/60),s=sunMins%60;
   document.getElementById('timerDisplay').innerText=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
   let pct=Math.min(100,sunMins/safe*100); document.getElementById('timerBar').style.width=pct+'%';
   document.getElementById('timerRing').style.background=`conic-gradient(${pct>80?'#DC2626':'#3B5BFE'} ${pct}%,#F1F5F9 ${pct}%)`;
   document.getElementById('timerInfo').innerText=`Safe: ${safe} min • ${Math.max(0,safe-sunMins)} min left • UV ${uv}`;
   updateKidney();updateAI(); if(sunMins>=safe){alert(`Exceeded safe ${safe} mins for UV ${uv}!`);toggleSun()}
  },1000);
 }else clearInterval(iv);
}
function resetTimer(){clearInterval(iv);running=false;sunMins=0;document.getElementById('timerDisplay').innerText='00:00';document.getElementById('timerBar').style.width='0%';document.getElementById('timerRing').style.background='conic-gradient(#3B5BFE 0%,#F1F5F9 0%)';saveUserData()}
function addWater(ml){water=Math.min(goal,water+ml);document.getElementById('waterDisplay').innerText=`${water} / ${goal} ml`;document.getElementById('waterBar').style.width=(water/goal*100)+'%';updateKidney();updateAI();saveUserData()}
function setUrine(text,score){urineScore=score;urineText=text;document.querySelectorAll('.urine').forEach(b=>b.classList.remove('active'));event.target.classList.add('active');let el=document.getElementById('urineStatus');el.innerText='Status: '+text;el.className=score>60?'alert-box danger':'alert-box success';updateKidney();updateAI();saveUserData()}
function updateKidney(){
 let heat=temp>34?25:0,dehyd=goal-water>1200?35:0,sun=sunMins>15?25:0; let total=urineScore+heat+dehyd+sun;let score=Math.max(0,100-total);
 let label=score>80?'Good':score>50?'Moderate':score>30?'High Risk':'DANGER';
 let el=document.getElementById('kidneyScore'); if(el) el.innerText=`${score}/100 - ${label}`; let cir=document.getElementById('kidneyCircle'); if(cir) cir.innerText=score;
 let alerts=document.getElementById('kidneyAlerts'); if(!alerts) return; let html='';
 if(water<1200) html+=`<div class="alert-box danger">Danger: Low water - need 2.8L for ${temp}°C.</div>`;
 else if(water<2000) html+=`<div class="alert-box warning">Warning: Water low for ${temp}°C.</div>`;
 else html+=`<div class="alert-box success">Good: Hydration adequate.</div>`;
 if(temp>35 && water<1800) html+=`<div class="alert-box danger">Danger: ${temp}°C — losing water fast</div>`;
 if(sunMins>safe) html+=`<div class="alert-box danger">Danger: Exceeded safe sun ${safe} mins for UV ${uv}</div>`;
 alerts.innerHTML=html;
}
function updateAI(){
  let waterDeficit=goal-water;let riskScore=(urineScore*0.4)+(waterDeficit/50)+(temp-30)*2+sunMins*1.5;
  let aiBox=document.getElementById('aiPrediction'); if(!aiBox) return; let kidneyPred=document.getElementById('kidneyPred');let waterAi=document.getElementById('waterAi');
  if(riskScore>100){aiBox.className='alert-box danger';aiBox.innerHTML=`Danger: Kidney stress in 45 mins.`;if(kidneyPred)kidneyPred.innerText=`AI: Danger`}
  else if(riskScore>65){aiBox.className='alert-box warning';aiBox.innerHTML=`Warning: Moderate strain at ${temp}°C, UV ${uv}.`;if(kidneyPred)kidneyPred.innerText=`AI: Safe 1h`}
  else{aiBox.className='alert-box success';aiBox.innerHTML=`Good: Kidneys safe for 3h.`;if(kidneyPred)kidneyPred.innerText=`AI: Safe 3h`}
  if(waterAi){let need=Math.max(0,goal-water);if(need>1000){waterAi.className='alert-box danger mt-3';waterAi.innerText=`Danger: Need ${need}ml more.`;}else if(need>500){waterAi.className='alert-box warning mt-3';waterAi.innerText=`Warning: Need ${need}ml more.`;}else{waterAi.className='alert-box success mt-3';waterAi.innerText=`Good: Only ${need}ml left.`;}}
}
function checkKidney(){ let waterDeficit=goal-water;let riskScore=(urineScore*0.4)+(waterDeficit/50)+(temp-30)*2+sunMins*1.5; let msg=`SUNSAFE AI\nLat ${lat?.toFixed(3)||'N/A'}, Lon ${lon?.toFixed(3)||'N/A'}\nUV ${uv}, Temp ${temp}°C\nRisk: ${riskScore.toFixed(1)}/150\n`; if(riskScore>80)msg+="DANGER";else msg+="MODERATE"; alert(msg);speakAI(msg); }
function testAir(){
 let base=uv*8 + (temp-20)*2; let aqi=Math.floor(50+base+Math.random()*30);
 document.getElementById('aqiVal').innerText=aqi;document.getElementById('pm25').innerText=Math.floor(aqi/2.5)+' µg';document.getElementById('pm10').innerText=Math.floor(aqi/1.2)+' µg';document.getElementById('o3').innerText=Math.floor(20+uv*5+Math.random()*10)+' µg';
 let label=aqi<50?'Good':aqi<100?'Moderate':aqi<150?'Unhealthy':'Very Unhealthy'; document.getElementById('aqiLabel').innerText=label;let badge=document.getElementById('aqiBadge');badge.className=aqi>100?'badge danger':'badge neutral';badge.innerText=label;
 let triggers=document.getElementById('asthmaTriggers');triggers.innerHTML=`<div class='trigger'><span>Heat ${temp}°C</span><b style='color:#DC2626'>High</b></div><div class='trigger'><span>UV ${uv} + Dust</span><b style='color:#DC2626'>${aqi>100?'Very High':'High'}</b></div><div class='trigger'><span>AI Risk</span><b>${aqi>100?'84% Attack':'32% Low'}</b></div>`;
 let alertBox=document.getElementById('asthmaAlert');let forecast=document.getElementById('asthmaAiForecast');
 if(aqi>90||hum<40){alertBox.classList.remove('hidden');alertBox.className='alert-box danger';alertBox.innerHTML=`Danger: AQI ${aqi} — ${label}.`;if(forecast)forecast.innerText=`AI: 84% risk`;}
 else{alertBox.classList.remove('hidden');alertBox.className='alert-box success';alertBox.innerHTML=`Good: AQI ${aqi} moderate.`;if(forecast)forecast.innerText=`AI: Low risk`;}
}
function toggleChat(){let body=document.getElementById('chatBody');let tog=document.getElementById('chatToggle');chatOpen=!chatOpen;body.style.display=chatOpen?'flex':'none';tog.innerText=chatOpen?'▲':'▼';}
function askAI(){
  let qEl=document.getElementById('userQ');let q=qEl.value.trim();let box=document.getElementById('chatBox');if(!q)return;
  box.innerHTML+=`<div class="msg user"><b>You:</b> ${q}</div>`;qEl.value='';
  let lower=q.toLowerCase();let answer="";
  if(lower.includes('urine')){answer=urineScore>60?`Danger: Dark urine at ${temp}°C. Drink 500ml now.`:`Good: Light yellow — optimal.`;}
  else if(lower.includes('sun')||lower.includes('uv')){answer=`Live UV is ${uv} (${safe} min safe). Sun ${sunMins} mins.`;}
  else{answer=`SunSafe AI: UV ${uv}, Temp ${temp}°C, Sun ${sunMins}/${safe} min, Water ${water}ml.`;}
  box.innerHTML+=`<div class="msg ai">${answer}</div>`;box.scrollTop=box.scrollHeight;setTimeout(()=>speakAI(answer),300);
}
function initVoice(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){document.getElementById('micBtn').innerText='❌';return;}
  recognition=new SR();recognition.continuous=false;recognition.interimResults=false;recognition.lang='en-US';
  recognition.onstart=()=>{isListening=true;document.getElementById('voiceStatus').style.display='block';document.getElementById('voiceStatus').innerText='🎙️ Listening in English...';document.getElementById('micBtn').innerText='🔴';};
  recognition.onend=()=>{isListening=false;document.getElementById('voiceStatus').style.display='none';document.getElementById('micBtn').innerText='🎤';};
  recognition.onresult=(e)=>{let t=e.results[0][0].transcript;document.getElementById('userQ').value=t;setTimeout(()=>askAI(),500);};
  recognition.onerror=()=>{isListening=false;document.getElementById('micBtn').innerText='🎤';};
}
function startVoice(){if(!recognition)initVoice();if(!recognition){alert('Voice not supported. Use Chrome.');return;}if(isListening)recognition.stop();else{try{recognition.start();}catch(e){}}}
function speakAI(text){
  if(!speechEnabled)return;let clean=text.replace(/<[^>]*>/g,'').substring(0,300);
  if('speechSynthesis' in window){window.speechSynthesis.cancel();let utter=new SpeechSynthesisUtterance(clean);utter.lang='en-US';utter.rate=1;let voices=window.speechSynthesis.getVoices();let enVoice=voices.find(v=>v.lang==='en-US' && v.name.includes('Google')) || voices.find(v=>v.lang==='en-US') || voices[0];if(enVoice) utter.voice=enVoice;window.speechSynthesis.speak(utter);}
}
function toggleSpeech(){speechEnabled=!speechEnabled;let b=document.getElementById('speakBtn');b.innerText=speechEnabled?'🔊':'🔇';b.style.background=speechEnabled?'#16A34A':'#6B7280';if(!speechEnabled)window.speechSynthesis.cancel();}
window.addEventListener('load',()=>{initVoice();loadUserData(); setTimeout(()=>requestLocation(),800); if(window.speechSynthesis) window.speechSynthesis.getVoices();});
