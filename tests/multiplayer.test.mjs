// End-to-end multiplayer acceptance tests (PRD section 9).
// Every player is a separate browser context: separate storage, cookies and
// WebSocket, the same isolation as two different devices.
//
//   BASE_URL=http://127.0.0.1:8787 node tests/multiplayer.test.mjs
//   BASE_URL=https://little-together.<you>.workers.dev node tests/multiplayer.test.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";

// Use the project's Playwright if installed, otherwise a global install.
const require = createRequire(import.meta.url);
let pw;
try {
  pw = require("playwright");
} catch {
  pw = require(`${execSync("npm root -g").toString().trim()}/playwright`);
}
const { chromium, devices } = pw;
const { FISH, drawOn } = await import("./draw-helpers.mjs");
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:8787";
const SHOTS = new URL("./artifacts/", import.meta.url).pathname;
mkdirSync(SHOTS, { recursive: true });

const results = [];
const latencies = [];
let browser;

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

const laptop = () => browser.newContext({ viewport: { width: 1280, height: 800 }, baseURL: BASE });
const phone = () => browser.newContext({ ...devices["iPhone 13"], defaultBrowserType: undefined, baseURL: BASE });
const tablet = () => browser.newContext({ ...devices["iPad (gen 7)"], defaultBrowserType: undefined, baseURL: BASE });

async function createRoom(page) {
  await page.goto("/");
  await page.getByTestId("create-garden").click();
  await page.waitForURL(/\/r\/[A-Z0-9]{8}$/);
  return page.url().split("/r/")[1];
}

async function pickAndEnter(page, avatar) {
  await page.getByTestId(`avatar-${avatar}`).click();
  await page.getByTestId("join-submit").click();
  await page.getByTestId("enter-garden").click({ timeout: 10_000 });
  await page.getByTestId("garden").waitFor();
}

async function joinByLink(page, code, avatar) {
  await page.goto(`/r/${code}`);
  await pickAndEnter(page, avatar);
}

async function joinByCode(page, code, avatar) {
  await page.goto("/");
  await page.getByTestId("join-garden").click();
  await page.getByTestId("code-input").fill(code.toLowerCase());
  await pickAndEnter(page, avatar);
}

const stage = (page, i) => page.getByTestId(`plot-${i}`).getAttribute("data-stage").then(Number);

async function waitStage(page, i, s, timeout = 5000) {
  await page.waitForSelector(`[data-testid="plot-${i}"][data-stage="${s}"]`, { timeout });
}

/** Tap on one device, measure how long until another device shows the result. */
async function tapAndObserve(actor, observer, plot, expected) {
  const t0 = Date.now();
  await actor.getByTestId(`plot-${plot}`).click();
  await waitStage(observer, plot, expected);
  const ms = Date.now() - t0;
  latencies.push(ms);
  return ms;
}

/** Two raw WebSocket players race on every stage of one plot, 4 rounds x 1 plot. */
async function protocolRace(code) {
  const url = BASE.replace(/^http/, "ws") + `/api/rooms/${code}/ws`;
  const open = (pid, avatar) =>
    new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const inbox = [];
      ws.onmessage = (e) => e.data !== "pong" && inbox.push(JSON.parse(e.data));
      ws.onopen = () => {
        ws.send(JSON.stringify({ t: "hello", pid, avatar, lastSeen: 0 }));
        resolve({ ws, inbox });
      };
      ws.onerror = reject;
    });
  const a = await open("race-player-aaaa", "cat");
  const b = await open("race-player-bbbb", "duck");
  await new Promise((r) => setTimeout(r, 300));
  let accepted = 0;
  let rejected = 0;
  for (let s = 0; s < 4; s++) {
    a.inbox.length = 0;
    b.inbox.length = 0;
    a.ws.send(JSON.stringify({ t: "act", aid: `a${s}`, plotId: 0, from: s }));
    b.ws.send(JSON.stringify({ t: "act", aid: `b${s}`, plotId: 0, from: s }));
    await new Promise((r) => setTimeout(r, 400));
    const states = a.inbox.filter((m) => m.t === "state");
    accepted += states.length;
    rejected += [...a.inbox, ...b.inbox].filter((m) => m.t === "reject").length;
    const last = states.at(-1)?.state.plots[0].stage;
    if (last !== s + 1) return { ok: false, detail: `round ${s}: stage ${last}` };
  }
  a.ws.close();
  b.ws.close();
  return { ok: accepted === 4 && rejected === 4, detail: `accepted=${accepted} rejected=${rejected} over 4 rounds` };
}

// ---------------- Magic Drawing ----------------
const strokes = (page) => page.getByTestId("canvas").getAttribute("data-strokes").then(Number);
const myTurn = (page) =>
  page
    .getByTestId("canvas")
    .getAttribute("data-my-turn")
    .then((v) => v === "true");
const waitStrokes = (page, n, timeout = 5000) =>
  page.waitForSelector(`[data-testid="canvas"][data-strokes="${n}"]`, { timeout });

async function drawingRace(code) {
  const url = BASE.replace(/^http/, "ws") + `/api/rooms/${code}/ws`;
  const open = (pid, avatar) =>
    new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      const inbox = [];
      ws.onmessage = (e) => e.data !== "pong" && inbox.push(JSON.parse(e.data));
      ws.onopen = () => ws.send(JSON.stringify({ t: "hello", pid, avatar, lastSeen: 0 }));
      const iv = setInterval(() => {
        const w = inbox.find((m) => m.t === "welcome");
        if (w) {
          clearInterval(iv);
          resolve({ ws, inbox, drawing: w.drawing });
        }
      }, 20);
      ws.onerror = reject;
    });
  const a = await open("draw-race-aaaa", "cat");
  const b = await open("draw-race-bbbb", "fox");
  await new Promise((r) => setTimeout(r, 300));
  const d = a.drawing;
  const pts = [100, 100, 200, 200, 300, 150];
  a.ws.send(JSON.stringify({ t: "stroke", aid: "ra", drawingId: d.id, step: 0, color: 1, pts }));
  b.ws.send(JSON.stringify({ t: "stroke", aid: "rb", drawingId: d.id, step: 0, color: 2, pts }));
  await new Promise((r) => setTimeout(r, 500));
  const accepted = a.inbox.filter((m) => m.t === "draw").length;
  const rejected = [...a.inbox, ...b.inbox].filter((m) => m.t === "drawReject").length;
  const last = a.inbox.filter((m) => m.t === "draw").at(-1)?.drawing;
  // Bad payloads are refused too.
  b.ws.send(JSON.stringify({ t: "stroke", aid: "bad", drawingId: d.id, step: 1, color: 99, pts }));
  b.ws.send(JSON.stringify({ t: "stroke", aid: "bad2", drawingId: d.id, step: 1, color: 0, pts: [1, 2, 3] }));
  await new Promise((r) => setTimeout(r, 400));
  const badRejected = b.inbox.filter((m) => m.t === "drawReject" && m.reason === "bad_stroke").length;
  a.ws.close();
  b.ws.close();
  return {
    ok: accepted === 1 && rejected === 1 && last?.strokes.length === 1 && badRejected === 2,
    detail: `accepted=${accepted} rejected=${rejected} strokes=${last?.strokes.length} invalidRejected=${badRejected}`,
  };
}

async function drawingTests() {
  const ctxL = await laptop();
  const ctxP = await phone();
  const L = await ctxL.newPage();
  const P = await ctxP.newPage();
  const code = await createRoom(L);
  await pickAndEnter(L, "bunny");
  await joinByLink(P, code, "bear");
  await L.getByTestId("open-drawing").click();
  await P.getByTestId("open-drawing").click();
  await Promise.all([L.getByTestId("canvas").waitFor(), P.getByTestId("canvas").waitFor()]);
  await L.waitForSelector('[data-testid="canvas"][data-my-turn="true"]');

  await drawOn(L, FISH[0]);
  const t0 = Date.now(); // after pointer-up, so the drag itself isn't counted
  await waitStrokes(P, 1);
  const strokeMs = Date.now() - t0;
  check("M1 stroke drawn on laptop appears on phone within 2 s", strokeMs < 2000, `${strokeMs} ms after pointer-up`);
  await L.waitForTimeout(300);
  check("M2 turn passes to the other player", !(await myTurn(L)) && (await myTurn(P)));

  await drawOn(L, FISH[1]); // not laptop's turn: must be ignored
  await L.waitForTimeout(700);
  check("M3 drawing out of turn is blocked", (await strokes(L)) === 1 && (await strokes(P)) === 1);

  await drawOn(P, FISH[1]);
  await waitStrokes(L, 2);
  await drawOn(L, FISH[2]);
  await waitStrokes(P, 3);
  const showL = L.getByTestId("creation-show")
    .waitFor({ timeout: 6000 })
    .then(
      () => true,
      () => false,
    );
  const showP = P.getByTestId("creation-show")
    .waitFor({ timeout: 6000 })
    .then(
      () => true,
      () => false,
    );
  await drawOn(P, FISH[3]);
  const [sl, sp] = await Promise.all([showL, showP]);
  check("M4 finished fish comes to life on both devices", sl && sp);
  await Promise.all([waitStrokes(L, 0), waitStrokes(P, 0)]);
  check("M5 both canvases reset for the next drawing", true);
  await L.getByTestId("creation-show")
    .click()
    .catch(() => {});
  await P.getByTestId("creation-show")
    .click()
    .catch(() => {});

  // The finished fish moves into the garden pond.
  await P.getByTestId("back-to-garden").click();
  await P.getByTestId("pond").waitFor();
  const pondP = await P.getByTestId("pond-fish").count();
  await P.getByTestId("pond-fish").first().click({ force: true }); // it swims, so it is never "stable"
  const jumped = await P.locator(".fish-jump").count();
  check(
    "M12 the finished fish swims in the garden pond and jumps when tapped",
    pondP === 1 && jumped === 1,
    `pond=${pondP}`,
  );
  await P.getByTestId("open-drawing").click();
  await P.getByTestId("canvas").waitFor();

  // Turn holder leaves: the remaining player must never be stuck waiting.
  await drawOn(L, FISH[0]);
  await waitStrokes(P, 1);
  await P.waitForTimeout(300);
  const blockedBefore = !(await myTurn(L));
  await P.close();
  await L.waitForSelector('[data-testid="canvas"][data-my-turn="true"]', { timeout: 5000 });
  check("M6 if the next player leaves, the turn opens up", blockedBefore);

  // Solo: one player can finish alone (asynchronous play).
  for (const i of [1, 2, 3]) {
    if (i === 3) {
      const done = L.getByTestId("creation-show")
        .waitFor({ timeout: 6000 })
        .then(
          () => true,
          () => false,
        );
      await drawOn(L, FISH[i]);
      check("M7 a single player can finish a drawing alone", await done);
    } else {
      await drawOn(L, FISH[i]);
      await waitStrokes(L, i + 1);
    }
  }
  await L.getByTestId("creation-show")
    .click()
    .catch(() => {});

  const race = await drawingRace(
    await (await fetch(`${BASE}/api/rooms`, { method: "POST" })).json().then((j) => j.code),
  );
  check("M8 concurrent strokes for one step: exactly one lands; invalid strokes refused", race.ok, race.detail);

  await ctxL.close();
  await ctxP.close();

  // Everyone gone: a brand-new device sees the saved creations.
  const ctxN = await tablet();
  const N = await ctxN.newPage();
  await joinByLink(N, code, "duck");
  await N.getByTestId("open-drawing").click();
  await N.getByTestId("open-gallery").click();
  await N.getByTestId("gallery-item")
    .first()
    .waitFor({ timeout: 5000 })
    .catch(() => {});
  const items = await N.getByTestId("gallery-item").count();
  check("M9 creations persist and returning players can view them", items === 2, `gallery=${items}`);
  await N.screenshot({ path: `${SHOTS}08-gallery-tablet.png` });
  await N.getByTestId("gallery-item").first().click();
  check(
    "M10 tapping a saved creation plays it again",
    await N.getByTestId("creation-show")
      .waitFor({ timeout: 3000 })
      .then(
        () => true,
        () => false,
      ),
  );
  await N.getByTestId("creation-show")
    .click()
    .catch(() => {});

  // Garden still works in the same room after drawing.
  await N.getByTestId("back-to-garden").click();
  const pondN = await N.getByTestId("pond-fish").count();
  check("M13 a new device sees the family's fish in the pond", pondN === 2, `pond=${pondN}`);
  await N.getByTestId("plot-0").click();
  check(
    "M11 garden still works after Magic Drawing",
    await waitStage(N, 0, 1).then(
      () => true,
      () => false,
    ),
  );
  await ctxN.close();
}

async function run() {
  browser = await chromium.launch();

  // ---------------- Test A: multiplayer across devices ----------------
  const ctxL = await laptop();
  const ctxP = await phone();
  const L = await ctxL.newPage();
  const P = await ctxP.newPage();

  const code = await createRoom(L);
  await L.screenshot({ path: `${SHOTS}01-join-avatar-laptop.png` });
  await L.getByTestId("avatar-bunny").click();
  await L.getByTestId("join-submit").click();
  await L.getByTestId("enter-garden").waitFor();
  await L.getByText(/[A-Z0-9]{4}-[A-Z0-9]{4}/)
    .first()
    .waitFor();
  await L.screenshot({ path: `${SHOTS}02-lobby-laptop.png` });
  await L.getByTestId("enter-garden").click();
  await L.getByTestId("garden").waitFor();

  await joinByCode(P, code, "bear");
  await L.waitForSelector('[data-testid="online"] li:nth-child(2)');
  const onlineL = await L.locator('[data-testid="online"] li').count();
  const onlineP = await P.locator('[data-testid="online"] li').count();
  check("A1 both devices see two players online", onlineL === 2 && onlineP === 2, `laptop=${onlineL} phone=${onlineP}`);

  let ms = await tapAndObserve(P, L, 0, 1);
  check("A2 phone plants seed, laptop updates without refresh", true, `${ms} ms`);
  ms = await tapAndObserve(L, P, 0, 2);
  check("A3 laptop waters, phone updates", true, `${ms} ms`);
  ms = await tapAndObserve(P, L, 0, 3);
  check("A4 phone gives sunshine, laptop updates", true, `${ms} ms`);
  const sharedFx = L.locator(".twin")
    .first()
    .waitFor({ timeout: 4000 })
    .then(
      () => true,
      () => false,
    );
  ms = await tapAndObserve(L, P, 0, 4);
  check("A5 laptop makes it bloom, phone updates", true, `${ms} ms`);
  check("A6 cooperative bloom shows shared celebration", await sharedFx);

  const heartSeen = P.locator(".float-heart")
    .first()
    .waitFor({ timeout: 4000 })
    .then(
      () => true,
      () => false,
    );
  await L.getByTestId("heart-button").click();
  check("A7 heart sent from laptop floats on phone", await heartSeen);
  await P.waitForTimeout(600);
  await P.screenshot({ path: `${SHOTS}03-garden-phone.png` });

  const code2Fresh = await (await fetch(`${BASE}/api/rooms`, { method: "POST" })).json().then((j) => j.code);

  // ---------------- Test G: room isolation ----------------
  const ctxG = await laptop();
  const G = await ctxG.newPage();
  const code2 = await createRoom(G);
  await pickAndEnter(G, "duck");
  await G.getByTestId("plot-0").click();
  await waitStage(G, 0, 1);
  await G.getByTestId("plot-5").click();
  await waitStage(G, 5, 1);
  await L.waitForTimeout(1000);
  const lPlot5 = await stage(L, 5);
  const gPlot0 = await stage(G, 0);
  check(
    "G1 actions in another room do not leak",
    code2 !== code && lPlot5 === 0 && gPlot0 === 1,
    `room1 plot5=${lPlot5}, room2 plot0=${gPlot0}`,
  );
  await ctxG.close();

  // ---------------- Test D: state consistency ----------------
  // UI level: both devices tap the same plot together; they must agree afterwards.
  let agree = true;
  for (let s = 0; s < 4; s++) {
    await Promise.all([L.getByTestId("plot-2").click(), P.getByTestId("plot-2").click()]);
    await L.waitForTimeout(500);
    if ((await stage(L, 2)) !== (await stage(P, 2))) agree = false;
  }
  check(
    "D1 simultaneous taps from two devices leave both screens identical",
    agree,
    `final=${await stage(L, 2)}/${await stage(P, 2)}`,
  );

  // Protocol level: two sockets send the same transition in the same instant.
  const race = await protocolRace(code2Fresh);
  check("D3 truly concurrent identical actions: exactly one wins per stage", race.ok, race.detail);

  // Rapid toddler-style hammering on one device: stage must never exceed 4 or skip.
  for (let i = 0; i < 12; i++) await P.getByTestId("plot-4").click({ delay: 0 });
  await waitStage(L, 4, 4, 15_000).catch(() => {});
  const v4 = [await stage(L, 4), await stage(P, 4)];
  check(
    "D2 rapid repeated taps end in a valid, shared state",
    v4[0] === 4 && v4[1] === 4,
    `laptop=${v4[0]} phone=${v4[1]}`,
  );

  // ---------------- Test E: connection recovery ----------------
  await ctxP.setOffline(true);
  await P.getByTestId("status").waitFor({ timeout: 5000 });
  check("E1 offline device shows reconnecting state", true);
  await L.getByTestId("plot-3").click();
  await waitStage(L, 3, 1);
  await L.getByTestId("plot-3").click();
  await waitStage(L, 3, 2);
  await P.getByTestId("plot-1").click(); // tapping while offline must not queue a ghost action
  await ctxP.setOffline(false);
  const tRecover = Date.now();
  await waitStage(P, 3, 2, 15_000);
  const p1 = await stage(P, 1);
  const l1 = await stage(L, 1);
  check("E2 reconnected device receives missed changes", true, `${Date.now() - tRecover} ms after reconnect`);
  check("E3 taps while offline are not replayed", p1 === 0 && l1 === 0, `plot1 phone=${p1} laptop=${l1}`);

  // Refresh recovery
  await P.reload();
  await P.getByTestId("garden").waitFor();
  check("E4 page refresh restores garden for the same player", (await stage(P, 0)) === 4 && (await stage(P, 3)) === 2);

  // ---------------- Test C: asynchronous play + welcome back ----------------
  // Laptop leaves (keeps its device storage), phone keeps playing alone.
  await L.close();
  await ctxP.close();
  const ctxLater = await tablet();
  const T = await ctxLater.newPage();
  await joinByLink(T, code, "panda");
  check("C1 late joiner sees earlier progress", (await stage(T, 0)) === 4 && (await stage(T, 3)) === 2);
  await T.getByTestId("plot-3").click();
  await waitStage(T, 3, 3);
  await T.getByTestId("plot-1").click();
  await waitStage(T, 1, 1);
  await T.screenshot({ path: `${SHOTS}04-garden-tablet.png` });
  await ctxLater.close();

  // ---------------- Test B: persistence (everyone gone) ----------------
  const L2 = await ctxL.newPage(); // the laptop comes back the next morning
  await L2.goto(`/r/${code}`);
  await L2.getByTestId("garden").waitFor();
  const wb = await L2.getByTestId("welcome-back")
    .waitFor({ timeout: 5000 })
    .then(
      () => true,
      () => false,
    );
  await L2.screenshot({ path: `${SHOTS}05-welcome-back-laptop.png` });
  check("C2 returning player sees welcome-back celebration", wb);
  if (wb) await L2.getByTestId("welcome-back-done").click();
  const s = await Promise.all([0, 1, 2, 3, 4].map((i) => stage(L2, i)));
  check("B1 garden persists after all players disconnect", s.join() === "4,1,4,3,4", `stages=${s.join()}`);
  check(
    "C3 laptop can continue phone/tablet progress",
    await tapAndObserve(L2, L2, 3, 4).then(
      () => true,
      () => false,
    ),
  );
  const total = await L2.getByTestId("bloomed-total").textContent();
  check("B2 total flower count persists", /4/.test(total ?? ""), total ?? "");
  await L2.screenshot({ path: `${SHOTS}06-garden-laptop.png` });
  await ctxL.close();

  // ---------------- Fresh device, no storage ----------------
  const ctxFresh = await phone();
  const F = await ctxFresh.newPage();
  await joinByLink(F, code, "fox");
  const sf = await Promise.all([0, 1, 2, 3, 4, 5].map((i) => stage(F, i)));
  check("B3 brand-new device sees identical persisted state", sf.join() === "4,1,4,4,4,0", `stages=${sf.join()}`);
  const visitor = await F.locator("[data-testid=garden]").evaluate(() => document.body.innerHTML.includes("wander-a"));
  check("P1 butterfly visits after three flowers", visitor);
  await ctxFresh.close();

  // ---------------- Invalid input ----------------
  const ctxBad = await phone();
  const B = await ctxBad.newPage();
  await B.goto("/r/ZZZZ2222");
  const missing = await B.getByTestId("join-error")
    .waitFor({ timeout: 5000 })
    .then(
      () => true,
      () => false,
    );
  check("X1 unknown garden code shows a friendly error", missing);
  await B.screenshot({ path: `${SHOTS}07-missing-room-phone.png` });
  await B.goto("/");
  await B.screenshot({ path: `${SHOTS}00-welcome-phone.png`, fullPage: true });
  await ctxBad.close();

  // ---------------- Touch target sizes on phone ----------------
  const ctxT = await phone();
  const TT = await ctxT.newPage();
  await joinByLink(TT, code, "cat");
  const boxes = await Promise.all(["plot-0", "plot-5", "heart-button"].map((id) => TT.getByTestId(id).boundingBox()));
  const minSide = Math.min(...boxes.map((b) => Math.min(b.width, b.height)));
  check("U1 primary touch targets are at least 64px on a phone", minSide >= 64, `smallest=${Math.round(minSide)}px`);
  await ctxT.close();

  await drawingTests();

  await browser.close();

  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length / 2)];
  const max = sorted[sorted.length - 1];
  console.log(
    `\nSync latency (tap on one device -> visible on another), n=${sorted.length}: median ${p50} ms, max ${max} ms`,
  );
  check("A8 sync latency under 2 s", max < 2000, `max ${max} ms`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

run().catch(async (e) => {
  console.error(e);
  await browser?.close();
  process.exit(1);
});
