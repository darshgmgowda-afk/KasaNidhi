import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import Groq from "groq-sdk";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDB, dbUp } from "./db.js";
import { Profile, Scan, Correction, Pickup, Chat, CATS } from "./models.js";
import { CATEGORIES, getGuidance, getCollectors, buildContext, SAFETY_PROMPT } from "./guidance.js";

dotenv.config({ path: fileURLToPath(new URL("./.env", import.meta.url)) });

const app = express();
const PORT = process.env.PORT || 3000;
const SCAN_URL = process.env.SCAN_SERVICE_URL || "http://127.0.0.1:8000";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
app.use(express.json({ limit: "300kb" }));
app.use(express.static(path.join(path.dirname(fileURLToPath(import.meta.url)), "public"), { maxAge: "1h", setHeaders: (res, f) => { if (/\.(png|jpe?g|webp)$/i.test(f)) res.setHeader("Cache-Control", "public, max-age=604800"); else if (/\.(html|js|css)$/i.test(f)) res.setHeader("Cache-Control", "no-cache"); } }));

const validId = (id) => mongoose.isValidObjectId(id);
const wrap = (fn) => (req, res) => fn(req, res).catch((err) => { console.error(err); res.status(err.status || 500).json({ error: err.status ? err.message : "Server error" }); });
const bad = (msg, status = 400) => Object.assign(new Error(msg), { status });

const memory = { profiles: [], scans: [], corrections: [], pickups: [], chats: [] };
const now = () => new Date().toISOString();
const memId = (prefix) => `${prefix}_${randomUUID().slice(0, 12)}`;
const findMemoryProfile = (id) => memory.profiles.find((p) => p._id === id);

function cleanItems(items, environment) {
  return (Array.isArray(items) ? items : []).map((i) => ({
    object: String(i.object || "Item").slice(0, 80),
    category: CATS.includes(i.category) ? i.category : "General",
    confidence: Math.min(1, Math.max(0, Number(i.confidence) || 0)),
    action: getGuidance(CATS.includes(i.category) ? i.category : "General", environment).action,
    bbox: Array.isArray(i.bbox) ? i.bbox.slice(0, 4).map(Number) : undefined,
    uncertain: Boolean(i.uncertain),
    alternatives: Array.isArray(i.alternatives) ? i.alternatives.slice(0, 2) : undefined
  }));
}
async function getProfileAny(id) { if (dbUp() && validId(id)) return Profile.findById(id).lean(); return findMemoryProfile(id); }
async function getLatestScanAny(profileId) { if (dbUp() && validId(profileId)) return Scan.findOne({ profileId }).sort({ createdAt: -1 }).lean(); return memory.scans.filter((s) => s.profileId === profileId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null; }

app.get("/api/health", async (req, res) => {
  let scanner = false;
  try { const r = await fetch(`${SCAN_URL}/health`, { signal: AbortSignal.timeout(1200) }); scanner = r.ok; } catch {}
  res.json({ ok: true, db: dbUp(), storage: dbUp() ? "mongodb" : "memory-fallback", scanner, chat: process.env.GROQ_API_KEY ? "groq" : "offline-guidance-fallback", voice: process.env.GROQ_API_KEY ? "groq-stt-tts" : "offline", categories: CATEGORIES });
});
app.get("/api/guidance/:category", (req, res) => { if (!CATEGORIES.includes(req.params.category)) return res.status(404).json({ error: "Unknown category" }); res.json(getGuidance(req.params.category, req.query.environment)); });
app.get("/api/collectors", (req, res) => res.json(getCollectors(req.query.category, req.query.area)));

app.post("/api/profiles", wrap(async (req, res) => {
  const { name, kind, environment, area } = req.body || {};
  if (!["Individual", "Organization"].includes(kind) || !environment) throw bad("kind and environment are required");
  if (dbUp()) return res.status(201).json(await Profile.create({ name, kind, environment, area }));
  const p = { _id: memId("profile"), name: String(name || "Demo User").slice(0, 80), kind, environment, area: area || "", createdAt: now(), prototypeStorage: true };
  memory.profiles.push(p); res.status(201).json(p);
}));
app.get("/api/profiles/:id", wrap(async (req, res) => { const p = await getProfileAny(req.params.id); if (!p) throw bad("Profile not found", 404); res.json(p); }));

app.post("/api/scan", upload.single("image"), wrap(async (req, res) => {
  if (!req.file) throw bad("Send an image in form field 'image'");
  let environment = req.query.environment;
  if (!environment && req.query.profileId) environment = (await getProfileAny(req.query.profileId))?.environment;
  const form = new FormData();
  form.append("image", new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname || "scan.jpg");
  const endpoint = req.query.mode === "ai" ? "scan-ai" : "scan";
  let r;
  try { r = await fetch(`${SCAN_URL}/${endpoint}`, { method: "POST", body: form, signal: AbortSignal.timeout(90000) }); }
  catch { throw bad("Drishti scanner is not reachable. Start the scan-service and try again.", 503); }
  if (!r.ok) { const detail = await r.json().catch(() => ({})); throw bad(detail.detail || "Scanner failed to process the image", r.status === 501 ? 501 : 502); }
  const data = await r.json(); data.items = cleanItems(data.items, environment); res.json(data);
}));

app.post("/api/scans", wrap(async (req, res) => {
  const { profileId, mode, items } = req.body || {};
  if (!profileId || !Array.isArray(items) || !items.length) throw bad("profileId and items[] are required");
  const profile = await getProfileAny(profileId); if (!profile) throw bad("Profile not found", 404);
  const clean = cleanItems(items, profile.environment);
  if (dbUp() && validId(profileId)) return res.status(201).json(await Scan.create({ profileId, environment: profile.environment, mode, items: clean }));
  const scan = { _id: memId("scan"), profileId, environment: profile.environment, mode, items: clean, createdAt: now() }; memory.scans.push(scan); res.status(201).json(scan);
}));
app.get("/api/scans", wrap(async (req, res) => {
  const { profileId } = req.query;
  if (dbUp()) { const filter = validId(profileId) ? { profileId } : {}; return res.json(await Scan.find(filter).sort({ createdAt: -1 }).limit(200)); }
  const rows = profileId ? memory.scans.filter((s) => s.profileId === profileId) : memory.scans; res.json([...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 200));
}));

app.post("/api/corrections", wrap(async (req, res) => {
  const { profileId, predicted, corrected, confidence, object } = req.body || {};
  if (!profileId || !CATS.includes(predicted) || !CATS.includes(corrected)) throw bad("Invalid correction");
  if (dbUp() && validId(profileId)) return res.status(201).json(await Correction.create({ profileId, predicted, corrected, confidence }));
  const c = { _id: memId("correction"), profileId, object, predicted, corrected, confidence: Number(confidence) || 0, createdAt: now() }; memory.corrections.push(c); res.status(201).json(c);
}));

app.post("/api/pickups", wrap(async (req, res) => {
  const { profileId, collector, category } = req.body || {};
  if (!profileId || !CATS.includes(category) || !collector) throw bad("profileId, collector, category required");
  if (dbUp() && validId(profileId)) return res.status(201).json(await Pickup.create({ profileId, collector, category }));
  const p = { _id: memId("pickup"), profileId, collector, category, status: "Created (prototype)", createdAt: now() }; memory.pickups.push(p); res.status(201).json(p);
}));
app.get("/api/pickups", wrap(async (req, res) => {
  if (!req.query.profileId) throw bad("profileId required");
  if (dbUp() && validId(req.query.profileId)) return res.json(await Pickup.find({ profileId: req.query.profileId }).sort({ createdAt: -1 }));
  res.json(memory.pickups.filter((p) => p.profileId === req.query.profileId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}));

app.get("/api/impact", wrap(async (req, res) => {
  const { profileId } = req.query;
  if (dbUp()) {
    const match = validId(profileId) ? { profileId: new mongoose.Types.ObjectId(profileId) } : {};
    const group = (id) => [{ $match: match }, { $unwind: "$items" }, { $group: { _id: id, items: { $sum: 1 } } }, { $sort: { _id: 1 } }];
    const [byCategory, daily] = await Promise.all([Scan.aggregate(group("$items.category")), Scan.aggregate(group({ $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }))]);
    return res.json({ totalItems: byCategory.reduce((s, r) => s + r.items, 0), byCategory: byCategory.map((r) => ({ category: r._id, items: r.items })), daily: daily.map((r) => ({ date: r._id, items: r.items })) });
  }
  const rows = profileId ? memory.scans.filter((s) => s.profileId === profileId) : memory.scans;
  const cat = new Map(), day = new Map();
  for (const s of rows) { const d = s.createdAt.slice(0, 10); for (const i of s.items) { cat.set(i.category, (cat.get(i.category) || 0) + 1); day.set(d, (day.get(d) || 0) + 1); } }
  res.json({ totalItems: [...cat.values()].reduce((a, b) => a + b, 0), byCategory: [...cat].map(([category, items]) => ({ category, items })), daily: [...day].sort().map(([date, items]) => ({ date, items })) });
}));

function offlineSakhi(text, environment = "") {
  const q = text.toLowerCase();
  const hit = (cat) => { const g = getGuidance(cat, environment); return `${cat}: ${g.guidance} Recommended action: ${g.action}.${g.profile_note ? ` ${g.profile_note}` : ""}`; };
  if (/batter(?:y|ies)|cell|bulb|chemical|paint|solvent/.test(q)) return hit("Hazardous");
  if (/phone|mobile|charger|cable|laptop|electronic|e-waste|ewaste/.test(q)) return hit("E-Waste");
  if (/syringe|needle|medical|biomedical|bandage|sharps/.test(q)) return hit("Biomedical");
  if (/banana|peel|food|vegetable|fruit|compost|organic/.test(q)) return hit("Organic");
  if (/plastic|bottle|paper|cardboard|glass|metal|can|recycl/.test(q)) return hit("Recyclable");
  return "I can help with waste segregation, composting, recycling, e-waste, hazardous waste and safe disposal. Tell me the item you want to dispose of, or ask about your latest Drishti scan.";
}

app.post("/api/chat", wrap(async (req, res) => {
  const messages = (Array.isArray(req.body?.messages) ? req.body.messages : []).filter((m) => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string").slice(-12).map((m) => ({ role: m.role, content: m.content.slice(0, 3000) }));
  if (!messages.length) throw bad("Please send a message.");
  const { profileId, sessionId } = req.body;
  const profile = profileId ? await getProfileAny(profileId) : null;
  const scan = profileId ? await getLatestScanAny(profileId) : null;
  const context = buildContext(profile, scan);
  const latestText = messages[messages.length - 1].content;
  const voiceChannel = req.body?.channel === "voice";
  const channelPrompt = voiceChannel ? "\nYou are speaking as Swaccha Mitra, the voice assistant. Answer naturally in English and keep the answer under 180 characters so it can be spoken clearly." : "\nYou are responding as Swaccha Sakhi, the text assistant.";
  let reply = "", mode = "offline-guidance";
  if (process.env.GROQ_API_KEY) {
    try {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      const completion = await groq.chat.completions.create({ model: process.env.GROQ_MODEL || "openai/gpt-oss-20b", messages: [{ role: "system", content: SAFETY_PROMPT + channelPrompt + "\n\n" + context }, ...messages], temperature: 0.35, max_completion_tokens: 1200 });
      reply = completion.choices?.[0]?.message?.content?.trim() || ""; mode = "groq";
    } catch (e) { console.error("Groq error; using safe offline fallback:", e.status, e.message); }
  }
  if (!reply) reply = offlineSakhi(latestText, profile?.environment);
  if (dbUp() && validId(profileId) && typeof sessionId === "string") {
    const last = messages[messages.length - 1];
    await Chat.updateOne({ profileId, sessionId: sessionId.slice(0, 64) }, { $push: { messages: { $each: [{ role: last.role, content: last.content }, { role: "assistant", content: reply }] } } }, { upsert: true }).catch((e) => console.error("Chat save failed:", e.message));
  }
  res.json({ reply, mode });
}));

// Swaccha Mitra voice layer: Groq Whisper STT -> the same /api/chat knowledge/rules -> Groq Orpheus TTS.
app.post("/api/voice/transcribe", upload.single("audio"), wrap(async (req, res) => {
  if (!process.env.GROQ_API_KEY) throw bad("Groq voice is not configured.", 503);
  if (!req.file) throw bad("Send audio in form field 'audio'.");
  const form = new FormData();
  form.append("file", new Blob([req.file.buffer], { type: req.file.mimetype || "audio/webm" }), req.file.originalname || "mitra.webm");
  form.append("model", process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo");
  form.append("response_format", "json");
  form.append("language", "en");
  const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body: form, signal: AbortSignal.timeout(60000) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw bad(data.error?.message || "Voice transcription failed.", 502);
  res.json({ text: String(data.text || "").trim(), mode: "groq-whisper" });
}));

app.post("/api/voice/speak", wrap(async (req, res) => {
  if (!process.env.GROQ_API_KEY) throw bad("Groq voice is not configured.", 503);
  const raw = String(req.body?.text || "").replace(/\s+/g, " ").trim();
  if (!raw) throw bad("Text is required.");
  const input = raw.length <= 190 ? raw : raw.slice(0, 187).replace(/\s+\S*$/, "") + "...";
  const r = await fetch("https://api.groq.com/openai/v1/audio/speech", { method: "POST", headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: process.env.GROQ_TTS_MODEL || "canopylabs/orpheus-v1-english", voice: process.env.GROQ_TTS_VOICE || "hannah", input, response_format: "wav" }), signal: AbortSignal.timeout(60000) });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    if (/requires terms acceptance/i.test(data.error?.message || "")) return res.status(409).json({ error: "Groq voice requires Orpheus terms acceptance. Browser voice can speak this response meanwhile.", code: "groq_tts_terms_required", browserFallback: true, termsUrl: "https://console.groq.com/playground?model=canopylabs%2Forpheus-v1-english" });
    throw bad(data.error?.message || "Voice synthesis failed.", 502);
  }
  const audio = Buffer.from(await r.arrayBuffer());
  res.set("Content-Type", "audio/wav"); res.set("Cache-Control", "no-store"); res.send(audio);
}));

app.get("*", (req, res, next) => req.path.startsWith("/api/") ? next() : res.sendFile(fileURLToPath(new URL("./public/index.html", import.meta.url))));
await connectDB();
app.listen(PORT, () => console.log(`KasaNidhi API + web running at http://localhost:${PORT}  (health: /api/health)`));
