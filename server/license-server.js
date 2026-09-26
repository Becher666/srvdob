"use strict";

const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 8080);
const ADMIN_TOKEN = String(process.env.RB_ADMIN_TOKEN || "");
const DB_FILE = path.resolve(process.env.RB_LICENSE_DB || "./server/licenses.json");

function ensureDb() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ licenses: [] }, null, 2), { mode: 0o600 });
}

function readDb() {
  ensureDb();
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { return { licenses: [] }; }
}

function writeDb(db) {
  const tmp = DB_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, DB_FILE);
}

function send(res, status, body) {
  res.writeHead(status, {"content-type":"application/json; charset=utf-8","cache-control":"no-store"});
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
      if (data.length > 1024 * 1024) { req.destroy(); reject(new Error("too_large")); }
    });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error("invalid_json")); }
    });
    req.on("error", reject);
  });
}

function keyHash(key) {
  return crypto.createHash("sha256").update(String(key).trim().toUpperCase()).digest("hex");
}

function generateKey() {
  const part = () => crypto.randomBytes(4).toString("hex").toUpperCase();
  return "RB-" + part() + "-" + part() + "-" + part();
}

function adminOk(req) {
  if (!ADMIN_TOKEN) return false;
  const supplied = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(supplied);
  const b = Buffer.from(ADMIN_TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function durationToMs(plan) {
  const value = String(plan || "").toLowerCase();
  if (value === "7" || value === "7d" || value === "weekly") return 7 * 86400000;
  if (value === "30" || value === "30d" || value === "monthly") return 30 * 86400000;
  if (value === "365" || value === "365d" || value === "yearly") return 365 * 86400000;
  if (value === "lifetime" || value === "vitalicio") return null;
  return undefined;
}

async function route(req, res) {
  const url = new URL(req.url, "http://localhost");
  const db = readDb();

  if (req.method === "GET" && url.pathname === "/health")
    return send(res, 200, {ok:true, service:"royal-bunker-license-server"});

  if (req.method === "POST" && url.pathname === "/v1/licenses/validate") {
    let body;
    try { body = await readJson(req); } catch { return send(res,400,{valid:false,code:"INVALID_JSON"}); }

    const key = String(body.key || "").trim().toUpperCase();
    const row = db.licenses.find(x => x.hash === keyHash(key));
    if (!row) return send(res,404,{valid:false,code:"INVALID_LICENSE",message:"Licença não encontrada."});
    if (row.revoked) return send(res,403,{valid:false,code:"REVOKED",message:"Licença revogada."});
    if (row.expiresAt && Date.now() >= Date.parse(row.expiresAt))
      return send(res,403,{valid:false,code:"EXPIRED",message:"Licença expirada."});

    const deviceId = String(body.deviceId || "").trim();
    if (!deviceId) return send(res,400,{valid:false,code:"MISSING_DEVICE"});

    if (!row.deviceId) {
      row.deviceId = deviceId;
      row.boundAt = new Date().toISOString();
    } else if (row.deviceId !== deviceId) {
      return send(res,403,{valid:false,code:"DEVICE_MISMATCH",message:"Esta licença já está vinculada a outro dispositivo."});
    }

    row.lastSeenAt = new Date().toISOString();
    row.lastVersion = String(body.version || "");
    writeDb(db);

    return send(res,200,{
      valid:true,
      plan:row.plan,
      expiresAt:row.expiresAt,
      message:row.expiresAt ? "Licença válida." : "Licença vitalícia válida."
    });
  }

  if (!adminOk(req)) return send(res,401,{ok:false,error:"UNAUTHORIZED"});

  let body;
  if (req.method === "POST") {
    try { body = await readJson(req); } catch { return send(res,400,{ok:false,error:"INVALID_JSON"}); }
  }

  if (req.method === "POST" && url.pathname === "/v1/admin/licenses/generate") {
    const duration = durationToMs(body.plan);
    if (duration === undefined) return send(res,400,{ok:false,error:"INVALID_PLAN",allowed:["7","30","365","lifetime"]});

    const key = generateKey();
    const now = new Date();
    const expiresAt = duration === null ? null : new Date(now.getTime()+duration).toISOString();

    db.licenses.push({
      hash:keyHash(key),
      plan:duration === null ? "LIFETIME" : String(body.plan),
      expiresAt,
      createdAt:now.toISOString(),
      deviceId:null,
      revoked:false,
      note:String(body.note || "").slice(0,200)
    });
    writeDb(db);
    return send(res,201,{ok:true,key,plan:duration === null ? "LIFETIME" : String(body.plan),expiresAt});
  }

  if (req.method === "POST" && url.pathname === "/v1/admin/licenses/revoke") {
    const row = db.licenses.find(x => x.hash === keyHash(body.key));
    if (!row) return send(res,404,{ok:false,error:"NOT_FOUND"});
    row.revoked = true;
    row.revokedAt = new Date().toISOString();
    writeDb(db);
    return send(res,200,{ok:true});
  }

  if (req.method === "POST" && url.pathname === "/v1/admin/licenses/reset-device") {
    const row = db.licenses.find(x => x.hash === keyHash(body.key));
    if (!row) return send(res,404,{ok:false,error:"NOT_FOUND"});
    row.deviceId = null;
    row.boundAt = null;
    writeDb(db);
    return send(res,200,{ok:true});
  }

  if (req.method === "POST" && url.pathname === "/v1/admin/licenses/renew") {
    const duration = durationToMs(body.plan);
    if (duration === undefined || duration === null) return send(res,400,{ok:false,error:"INVALID_RENEWAL_PLAN"});
    const row = db.licenses.find(x => x.hash === keyHash(body.key));
    if (!row) return send(res,404,{ok:false,error:"NOT_FOUND"});
    const base = row.expiresAt && Date.parse(row.expiresAt) > Date.now() ? Date.parse(row.expiresAt) : Date.now();
    row.expiresAt = new Date(base+duration).toISOString();
    row.plan = String(body.plan);
    row.revoked = false;
    row.renewedAt = new Date().toISOString();
    writeDb(db);
    return send(res,200,{ok:true,expiresAt:row.expiresAt});
  }

  if (req.method === "GET" && url.pathname === "/v1/admin/licenses") {
    return send(res,200,{ok:true,licenses:db.licenses.map(x=>({plan:x.plan,expiresAt:x.expiresAt,revoked:!!x.revoked,bound:!!x.deviceId}))});
  }

  return send(res,404,{ok:false,error:"NOT_FOUND"});
}

ensureDb();
http.createServer((req,res)=>route(req,res).catch(()=>send(res,500,{ok:false,error:"INTERNAL_ERROR"})))
  .listen(PORT,"0.0.0.0",()=>console.log("Royal Bunker License Server — port "+PORT));
