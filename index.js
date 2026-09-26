#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const util = require("util");
const Steam = require("steam-user");
const TOTP = require("steam-totp");

require("dotenv").config();

const envFile = path.join(process.cwd(), ".env");
const colors = { r:"\x1b[0m", b:"\x1b[1m", c:"\x1b[36m", g:"\x1b[32m", y:"\x1b[33m", red:"\x1b[31m" };
const ask = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = util.promisify(ask.question).bind(ask);

const account = process.env.ACCOUNT_NAME;
if (!account) {
  console.error(colors.red + "Configure ACCOUNT_NAME no arquivo .env." + colors.r);
  process.exit(1);
}

const catalog = {
  "730":"Counter-Strike 2", "3678970":"Task Bar Hero", "578080":"PUBG: BATTLEGROUNDS",
  "252490":"Rust", "570":"Dota 2", "440":"Team Fortress 2", "304930":"Unturned",
  "550":"Left 4 Dead 2", "4000":"Garry's Mod", "105600":"Terraria",
  "413150":"Stardew Valley", "346110":"ARK: Survival Evolved", "227300":"Euro Truck Simulator 2",
  "3240220":"Grand Theft Auto V", "460930":"Tom Clancy's Ghost Recon Wildlands"
};

const games = (process.env.GAMES || "").split(",").map(x => x.trim()).filter(Boolean);
const user = new Steam({
  machineIdType: Steam.EMachineIDType.PersistentRandom,
  dataDirectory: "SteamData",
  renewRefreshTokens: true
});

let connected = false;
let blocked = false;
let active = false;
let status = "Aguardando conexão...";
let lastLogin = 0;
let lastRefresh = 0;
let retryAfter = 0;
let password = "";

function nameOf(id) { return catalog[id] || id; }
function clear() { process.stdout.write("\x1b[2J\x1b[H"); }

function render() {
  clear();
  console.log(colors.c + colors.b + "╔══════════════════════════════════════╗");
  console.log("║          ROYAL BUNKER               ║");
  console.log("║          STEAM FARMER               ║");
  console.log("╚══════════════════════════════════════╝" + colors.r);
  console.log("");
  console.log("  Steam: " + (connected ? colors.g + "● conectado" : colors.red + "● desconectado") + colors.r);
  console.log("  Conta: " + account);
  console.log("  Jogos: " + games.length);
  console.log("  Farming: " + (active ? colors.g + "ATIVO" : colors.y + "PAUSADO") + colors.r);
  console.log("  Status: " + status);
  console.log("");
  games.forEach((id, i) => console.log("  " + (i + 1) + ". " + nameOf(id) + " (" + id + ")"));
  console.log("");
  console.log("  [1] Atualizar farming");
  console.log("  [2] Status");
  console.log("  [3] Sair");
  console.log("");
}

function refresh(force) {
  if (!connected) return;
  if (blocked) {
    active = false;
    status = "Pausado: outra sessão do Steam está ativa.";
    render();
    return;
  }
  if (!games.length) {
    active = false;
    status = "Nenhum jogo configurado.";
    render();
    return;
  }
  if (!force && Date.now() - lastRefresh < 60000) return;
  user.gamesPlayed(games.map(x => /^\d+$/.test(x) ? Number(x) : x));
  active = true;
  status = "Farming ativo.";
  lastRefresh = Date.now();
  render();
}

function login() {
  if (connected || !password || Date.now() < retryAfter || Date.now() - lastLogin < 60000) return;
  status = "Conectando ao Steam...";
  render();
  user.logOn({
    accountName: account,
    password,
    machineName: "Royal Bunker",
    clientOS: Steam.EOSType.Windows10,
    autoRelogin: true
  });
  lastLogin = Date.now();
}

user.on("steamGuard", async (domain, callback) => {
  const code = await question("Código Steam Guard" + (domain ? " (" + domain + ")" : "") + ": ");
  callback(code.trim());
});

user.on("loggedOn", () => {
  connected = true;
  status = "Login realizado.";
  refresh(true);
});

user.on("playingState", isBlocked => {
  blocked = isBlocked;
  refresh(true);
});

user.on("error", err => {
  connected = false;
  active = false;
  if (err.eresult === Steam.EResult.LoggedInElsewhere) {
    status = "Outra sessão assumiu a conta. Tentando novamente...";
  } else if (err.eresult === Steam.EResult.RateLimitExceeded) {
    retryAfter = Date.now() + 31 * 60 * 1000;
    status = "Limite do Steam atingido. Aguardando...";
  } else {
    status = "Erro do Steam: " + err.message;
  }
  render();
});

async function start() {
  password = await question("Senha da conta Steam: ");
  login();
  while (true) {
    render();
    const choice = (await question("  > ")).trim();
    if (choice === "1") refresh(true);
    else if (choice === "2") {
      console.log("\nConta: " + account);
      console.log("Steam: " + (connected ? "conectado" : "desconectado"));
      console.log("Farming: " + (active ? "ativo" : "pausado"));
      await question("\nEnter para voltar...");
    } else if (choice === "3") {
      ask.close();
      process.exit(0);
    }
  }
}

process.on("SIGINT", () => { ask.close(); console.log("\nRoyal Bunker encerrado."); process.exit(0); });
start();
setInterval(login, 10 * 60 * 1000);
setInterval(() => refresh(false), 5 * 60 * 1000);
