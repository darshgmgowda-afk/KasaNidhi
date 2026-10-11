/* Swaccha Mitra — Groq-powered voice companion for the existing text-based Sakhi. */
(()=>{
  let recorder=null,stream=null,chunks=[],audio=null,audioUrl=null,busy=false,spokenText='',generation=0,pending=null,utterance=null;
  const voiceJson=async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||d.detail||`Request failed (${r.status})`);return d};
  const transcribe=async blob=>{const f=new FormData();const ext=blob.type.includes('mp4')?'m4a':blob.type.includes('ogg')?'ogg':'webm';f.append('audio',blob,`mitra.${ext}`);return fetch('/api/voice/transcribe',{method:'POST',body:f,signal:pending?.signal}).then(voiceJson)};
  const ask=async text=>fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:[{role:'user',content:text}],profileId:state.profile?._id,sessionId:`${state.sessionId}-voice`,channel:'voice'}),signal:pending?.signal}).then(voiceJson);
  const speak=async text=>{if(document.querySelector('#mitraVoice')?.value==='browser')return {browser:true};const r=await fetch('/api/voice/speak',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text}),signal:pending?.signal});if(!r.ok){const d=await r.json().catch(()=>({}));if((d.code==='groq_tts_terms_required'||/terms acceptance/i.test(d.error||''))&&window.speechSynthesis&&window.SpeechSynthesisUtterance)return {browser:true,termsRequired:true};throw new Error(d.error||d.detail||`Speech failed (${r.status})`)}return {wav:await r.blob()}};
  const browserSpeak=text=>new Promise((resolve,reject)=>{if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){reject(new Error('Device voice is unavailable in this browser. Use Chrome or Edge, or enable Groq voice.'));return}speechSynthesis.cancel();utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-US';const voices=speechSynthesis.getVoices();const voice=voices.find(v=>/^en[-_]/i.test(v.lang));if(voice)utterance.voice=voice;utterance.onend=resolve;utterance.onerror=e=>reject(new Error(e.error==='not-allowed'?'Tap Replay to hear the response.':`Browser voice: ${e.error}`));speechSynthesis.resume();speechSynthesis.speak(utterance)});
  const playAudio=async()=>{audio?.pause();audio=new Audio(audioUrl);audio.onended=()=>status('Ready for your next question.');try{await audio.play()}catch(e){if(e.name==='NotAllowedError')throw new Error('Tap Replay to hear the response.');throw e}};
  const stopStream=()=>{stream?.getTracks().forEach(t=>t.stop());stream=null};
  const status=t=>{const e=document.querySelector('#mitraStatus');if(e)e.textContent=t};
  const setText=(id,t)=>{const e=document.querySelector(id);if(e){e.textContent=t;e.hidden=!t}};
  async function process(blob){
    if(!blob?.size){status('No audio captured. Try again.');return}
    const turn=generation;pending=new AbortController();busy=true;const b=document.querySelector('#mitraMic');if(b)b.disabled=true;
    try{
      status('Transcribing with Groq Whisper…');const {text}=await transcribe(blob);if(turn!==generation)return;if(!text?.trim())throw new Error('I could not hear a clear question.');
      setText('#mitraYou',`You: ${text.trim()}`);status('Finding waste guidance…');
      const {reply}=await ask(text.trim());if(turn!==generation)return;setText('#mitraReply',`Mitra: ${reply}`);spokenText=reply;status('Speaking…');
      const result=await speak(reply);if(turn!==generation)return;if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl=null;
      if(result.browser){status(result.termsRequired?'Groq voice needs terms acceptance. Speaking with device voice instead.':'Speaking with device voice…');await browserSpeak(reply);if(turn===generation)status(result.termsRequired?'Ready. Device voice active until Groq voice is enabled.':'Ready for your next question.')}
      else{audioUrl=URL.createObjectURL(result.wav);await playAudio()}
    }catch(e){if(turn===generation&&e.name!=='AbortError'){status(e.message);if(!spokenText)setText('#mitraReply',`Mitra: ${e.message}`)}}finally{if(turn===generation){busy=false;pending=null;if(b){b.disabled=false;b.textContent='🎙 Ask Swaccha Mitra';b.classList.remove('recording')}}}
  }
  async function toggle(){
    if(recorder?.state==='recording'){recorder.stop();return}
    if(busy)return;
    try{
      if(!window.isSecureContext)throw new Error('Microphone access requires HTTPS or localhost.');
      if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder)throw new Error('Voice recording is not supported in this browser.');
      const turn=generation;const capturedStream=await navigator.mediaDevices.getUserMedia({audio:true});if(turn!==generation){capturedStream.getTracks().forEach(t=>t.stop());return}stream=capturedStream;chunks=[];spokenText='';audio?.pause();window.speechSynthesis?.cancel();
      const types=['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4'];const type=types.find(x=>MediaRecorder.isTypeSupported?.(x))||'';
      recorder=new MediaRecorder(stream,type?{mimeType:type}:undefined);recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
      recorder.onstop=()=>{const blob=new Blob(chunks,{type:recorder.mimeType||'audio/webm'});stopStream();process(blob)};
      recorder.start();status('Listening… tap Stop when you finish.');const b=document.querySelector('#mitraMic');if(b){b.textContent='■ Stop & ask';b.classList.add('recording')}
    }catch(e){stopStream();status(e.message);if(typeof toast==='function')toast(e.message)}
  }
  function open(){
    close();
    const e=document.createElement('div');e.id='mitraModal';e.className='modal-backdrop';e.innerHTML=`<div class="modal mitra-modal" role="dialog" aria-modal="true" aria-labelledby="mitraTitle"><div class="mitra-orb">🎙</div><h3 id="mitraTitle">Swaccha Mitra</h3><p class="mitra-sub">Voice assistant · same KasaNidhi waste dataset and Groq reasoning as the text-based Sakhi.</p><div class="field"><label for="mitraVoice">Voice output</label><select id="mitraVoice"><option value="browser">Device voice ? no Orpheus acceptance needed</option><option value="groq">Groq voice ? requires Orpheus terms acceptance</option></select></div><div class="notice info" id="mitraStatus">Tap the microphone and ask a waste question.</div><div class="mitra-turn" id="mitraYou" hidden></div><div class="mitra-turn answer" id="mitraReply" hidden></div><div class="modal-actions mitra-actions"><button class="btn ghost" id="mitraReplay">Replay</button><button class="btn primary" id="mitraMic">🎙 Ask Swaccha Mitra</button><button class="btn ghost" id="mitraClose">Close</button></div><p class="footer-note" style="padding:0">Voice: Groq Whisper STT → KasaNidhi/Groq assistant → Groq Orpheus TTS. Hazardous and biomedical guidance remains safety-constrained.</p></div>`;
    document.body.appendChild(e);e.onclick=x=>{if(x.target===e)close()};document.querySelector('#mitraMic').onclick=toggle;document.querySelector('#mitraReplay').onclick=async()=>{try{if(audioUrl)await playAudio();else if(spokenText){status('Speaking with browser voice…');await browserSpeak(spokenText);status('Ready for your next question.')}else status('Ask Mitra something first.')}catch(error){status(error.message)}};document.querySelector('#mitraClose').onclick=close;
  }
  function close(){generation++;pending?.abort();pending=null;busy=false;if(recorder?.state==='recording'){recorder.onstop=null;recorder.stop()}recorder=null;stopStream();audio?.pause();if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl=null;spokenText='';window.speechSynthesis?.cancel();document.querySelector('#mitraModal')?.remove()}
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.querySelector('#mitraModal'))close()});
  window.addEventListener('pagehide',close);
  const sakhiNav=typeof NAV!=='undefined'?NAV.find(x=>x[0]==='sakhi'):null;if(sakhiNav)sakhiNav[1]='Swaccha Sakhi';
  function enhance(){
    if(state.page!=='sakhi')return;
    document.querySelectorAll('.page-title p').forEach(e=>{if(e.textContent.includes('Waste guidance based'))e.textContent='Text-based waste guidance grounded in the KasaNidhi rules and your profile.'});
    const head=document.querySelector('.chat-head');if(head&&!document.querySelector('#openMitra')){const b=document.createElement('button');b.id='openMitra';b.className='btn primary sm';b.textContent='🎙 Swaccha Mitra';b.onclick=open;head.insertBefore(b,document.querySelector('#clearChat'))}
  }
  const css=document.createElement('style');css.textContent=`.mitra-modal{width:min(620px,100%);text-align:center}.mitra-orb{width:82px;height:82px;margin:0 auto;border-radius:50%;display:grid;place-items:center;font-size:34px;background:linear-gradient(145deg,var(--brand2),var(--brand));box-shadow:0 0 0 10px rgba(46,158,79,.08)}.mitra-sub{color:var(--muted)}.mitra-turn{text-align:left;padding:12px 14px;border:1px solid var(--line);border-radius:14px;background:var(--surface2)}.mitra-turn.answer{border-color:rgba(46,158,79,.35)}.mitra-actions{justify-content:center;flex-wrap:wrap}.recording{animation:mitraPulse 1s infinite}@keyframes mitraPulse{50%{transform:scale(1.04);box-shadow:0 0 0 8px rgba(214,69,69,.12)}}@media(max-width:640px){.chat-head{flex-wrap:wrap}.chat-head #openMitra{margin-left:auto}.mitra-actions .btn{flex:1}}`;document.head.appendChild(css);
  const originalRender=render;render=function(){originalRender();queueMicrotask(enhance)};
  new MutationObserver(()=>enhance()).observe(document.querySelector('#app'),{childList:true,subtree:true});
  enhance();
})();
