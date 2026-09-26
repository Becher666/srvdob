"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const LICENSE_FILE = path.join(process.cwd(), "license.json");

function normalizeKey(value) {
  return String(value || "").trim().toUpperCase();
}

function loadLocal() {
  try {
    return JSON.parse(fs.readFileSync(LICENSE_FILE, "utf8"));
  } catch {
    return null;
  }
}

function saveLocal(data) {
  fs.writeFileSync(LICENSE_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

function deviceId() {
  const seed = [
    process.env.ACCOUNT_NAME || "",
    process.env.HOSTNAME || "",
    process.env.TERMUX_VERSION || "",
    process.platform,
    process.arch
  ].join("|");
  return crypto.createHash("sha256").update(seed).digest("hex").slice(0, 24);
}

async function validate() {
  const api = String(process.env.LICENSE_API_URL || "").trim();
  const key = normalizeKey(process.env.LICENSE_KEY || loadLocal()?.key);

  if (!key) return { ok: false, code: "MISSING_KEY", message: "Nenhuma licença configurada." };

  if (!api) {
    if (process.env.LICENSE_MODE === "owner") {
      return { ok: true, mode: "owner", key, plan: "OWNER", expiresAt: null };
    }
    return { ok: false, code: "NO_LICENSE_SERVER", message: "Servidor de licenças não configurado." };
  }

  try {
    const response = await fetch(api.replace(/\/$/, "") + "/v1/licenses/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        key,
        deviceId: deviceId(),
        version: require("./package.json").version
      })
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.valid) {
      return { ok: false, code: data.code || "INVALID_LICENSE", message: data.message || "Licença inválida ou expirada." };
    }

    saveLocal({
      key,
      plan: data.plan || "UNKNOWN",
      expiresAt: data.expiresAt || null,
      checkedAt: new Date().toISOString()
    });

    return {
      ok: true,
      key,
      plan: data.plan || "UNKNOWN",
      expiresAt: data.expiresAt || null,
      message: data.message || "Licença válida."
    };
  } catch {
    return { ok: false, code: "LICENSE_SERVER_UNREACHABLE", message: "Não foi possível validar a licença agora." };
  }
}

function formatExpiration(value) {
  if (!value) return "sem expiração";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "data inválida" : date.toLocaleString("pt-BR");
}

module.exports = { validate, normalizeKey, formatExpiration, deviceId };
