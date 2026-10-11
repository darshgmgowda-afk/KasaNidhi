// Real provider verification. Requires an actual key in server/.env and a running app.
// Calls the configured Groq services and may consume API quota.
import { readFileSync } from 'node:fs';
const config = Object.fromEntries(readFileSync(new URL('../server/.env', import.meta.url), 'utf8')
  .split(/\r?\n/).filter(line => line && !line.startsWith('#') && line.includes('='))
  .map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1).trim()]; }));
if (!config.GROQ_API_KEY) throw new Error('Paste GROQ_API_KEY into server/.env and restart first.');
const base = `http://127.0.0.1:${config.PORT || 3000}`;
async function post(route, body) {
  const r = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(90000) });
  if (!r.ok) throw new Error(`${route}: ${await r.text()}`);
  return r;
}
const chat = await (await post('/api/chat', { messages: [{ role: 'user', content: 'How do I recycle a plastic bottle?' }], channel: 'voice' })).json();
if (chat.mode !== 'groq' || !chat.reply) throw new Error('Chat fell back; real Groq completion did not succeed. Check server output.');
console.log('PASS: configured Groq chat provider returns a response');
const wav = await (await post('/api/voice/speak', { text: 'How do I recycle a plastic bottle?' })).arrayBuffer();
if (wav.byteLength < 44 || Buffer.from(wav).toString('ascii', 0, 4) !== 'RIFF') throw new Error('Expected genuine WAV speech output.');
console.log('PASS: configured Groq Orpheus TTS returns WAV');
const form = new FormData(); form.append('audio', new Blob([wav], { type: 'audio/wav' }), 'verification.wav');
const r = await fetch(base + '/api/voice/transcribe', { method: 'POST', body: form, signal: AbortSignal.timeout(90000) });
if (!r.ok) throw new Error(`Transcription: ${await r.text()}`);
const transcript = await r.json();
if (!transcript.text?.trim()) throw new Error('No transcription returned.');
const answer = await (await post('/api/chat', { messages: [{ role: 'user', content: transcript.text }], channel: 'voice' })).json();
if (answer.mode !== 'groq' || !answer.reply) throw new Error('Voice chat did not use the real provider.');
await post('/api/voice/speak', { text: answer.reply });
console.log('PASS: actual TTS audio -> Whisper STT -> Groq assistant -> TTS round trip');
console.log('Physical microphone and speaker playback still require a browser check.');
