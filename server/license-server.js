"use strict";

const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT || 8787);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const DATA_FILE = path.join(process.cwd(), "licenses.json");

if (!ADMIN_TOKEN) {
  console.error("Configure ADMIN_TOKEN antes de iniciar o servidor.");
  process.exit(1);
}

function load() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); }
  catch { return { licenses: {} }; }
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

function keyHash(key) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function newKey() {
  const part = () => crypto.randomBytes(3).toString("hex").toUpperCase();
  return `RB-${part()}-${part()}-${part()}`;
}

function durationDays(plan) {
  if (plan === "WEEK") return 7;
  if (plan === "MONTH") return 30;
  if (plan === "YEAR") return 365;
  return null;
}

function send(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(data)
  });
  res.end(data);
}

function body(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 100000) req.destroy();
    });
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error("JSON inválido")); }
    });
    req.on("error", reject);
  });
}

const data = load();

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/v1/licenses/validate") {
      const input = await body(req);
      const key = String(input.key || "").trim().toUpperCase();
      const item = data.licenses[keyHash(key)];

      if (!item) return send(res, 200, { valid: false, code: "INVALID_LICENSE", message: "Licença não encontrada." });
      if (item.revoked) return send(res, 200, { valid: false, code: "REVOKED", message: "Licença revogada." });

      const now = Date.now();
      if (item.expiresAt && now >= new Date(item.expiresAt).getTime()) {
        return send(res, 200, { valid: false, code: "EXPIRED", message: "Licença expirada." });
      }

      const device = String(input.deviceId || "").trim();
      if (!item.deviceId && device) {
        item.deviceId = device;
        item.updatedAt = new Date().toISOString();
        save(data);
      } else if (item.deviceId && item.deviceId !== device) {
        return send(res, 200, { valid: false, code: "DEVICE_LIMIT", message: "Licença vinculada a outro dispositivo." });
      }

      return send(res, 200, {
        valid: true,
        plan: item.plan,
        expiresAt: item.expiresAt,
        message: "Licença válida."
      });
    }

    if (req.method === "POST" && req.url === "/admin/licenses/generate") {
      if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return send(res, 401, { error: "Não autorizado." });

      const input = await body(req);
      const plan = String(input.plan || "").toUpperCase();
      const days = durationDays(plan);
      if (!days) return send(res, 400, { error: "Plano inválido. Use WEEK, MONTH ou YEAR." });

      const key = newKey();
      const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
      data.licenses[keyHash(key)] = {
        plan,
        expiresAt,
        revoked: false,
        deviceId: null,
        createdAt: new Date().toISOString()
      };
      save(data);

      return send(res, 201, { key, plan, expiresAt });
    }

    if (req.method === "POST" && req.url === "/admin/licenses/revoke") {
      if (req.headers.authorization !== `Bearer ${ADMIN_TOKEN}`) return send(res, 401, { error: "Não autorizado." });

      const input = await body(req);
      const hash = keyHash(String(input.key || "").trim().toUpperCase());
      if (!data.licenses[hash]) return send(res, 404, { error: "Licença não encontrada." });

      data.licenses[hash].revoked = true;
      data.licenses[hash].updatedAt = new Date().toISOString();
      save(data);
      return send(res, 200, { ok: true });
    }

    return send(res, 404, { error: "Rota não encontrada." });
  } catch (error) {
    return send(res, 500, { error: "Erro interno." });
  }
});

server.listen(PORT, () => {
  console.log(`Royal Bunker License Server ouvindo na porta ${PORT}`);
});
