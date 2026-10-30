import { useSyncExternalStore } from "react";
import type { Avatar, EventKind, Phase } from "../shared/protocol";
import type { Part, TemplateId } from "../shared/drawing";
import { load, save } from "./lib/storage";

export type Lang = "zh" | "en";

const zh = {
  tagline: "距離再遠，也能一起玩、一起長大。",
  intro:
    "給住在不同城市、不同時區的家人。每個人用自己的手機或平板進入同一座小花園，一起種花、澆水、看花開。視訊時一起玩，不在線上時，也能幫對方的花園長大。",
  create: "建立花園",
  join: "加入花園",
  creating: "建立中…",
  roomCode: "花園代碼",
  codePlaceholder: "例如 ABCD-EFGH",
  pickAnimal: "選一隻小動物",
  enter: "進入花園",
  joining: "連線中…",
  back: "返回",
  invalidCode: "代碼是 8 個英文字母或數字，請再檢查一次。",
  roomMissing: "找不到這座花園。請確認代碼，或建立一座新的。",
  networkError: "連不上網路，請檢查連線後再試一次。",
  rateLimited: "操作太頻繁了，請稍等一分鐘再試。",
  lobbyTitle: "花園準備好了",
  lobbyHint: "把連結傳給家人，他們打開就能加入。不用等大家到齊，現在就可以開始。",
  copyLink: "複製邀請連結",
  copied: "已複製",
  share: "分享",
  here: "在花園裡",
  onlyYou: "目前只有你，家人加入時會出現在這裡。",
  invite: "邀請家人",
  close: "關閉",
  reconnecting: "重新連線中…",
  offline: "沒有網路，花園會在連上後更新",
  gone: "這座花園已不存在",
  goHome: "回首頁",
  sendHeart: "送一顆愛心",
  soundOn: "開啟聲音",
  soundOff: "關閉聲音",
  language: "English",
  welcomeBack: "有人幫你的花園長大了！",
  welcomeBackSummary: (n: number) => `你不在的時候，家人做了 ${n} 件事。`,
  goGarden: "去花園看看",
  allBloomed: "六朵花都開了！",
  newSeason: "種新的一季",
  seasonHint: "已經種出的花會留在花園紀錄裡",
  flowersGrown: (n: number) => `一起種出了 ${n} 朵花`,
  plotLabel: (i: number, action: string) => `第 ${i + 1} 塊花圃：${action}`,
  actions: { plant: "種下種子", water: "澆水", sun: "曬太陽", bloom: "讓花開", dance: "跟花跳舞" },
  eventVerb: {
    plant: "種下了種子",
    water: "澆了水",
    sun: "給了陽光",
    bloom: "讓花開了",
    season: "開始了新的一季",
    fish: "畫完了一幅畫",
  } as Record<EventKind, string>,
  draw: "魔法畫畫",
  backToGarden: "回花園",
  ourCreations: "我們的作品",
  yourTurn: "換你畫！",
  waitingFor: (name: string) => `等${name}畫…`,
  drawStep: {
    body: "畫身體",
    tail: "畫尾巴",
    fin: "畫背鰭",
    pattern: "畫花紋",
    head: "畫頭",
    ears: "畫耳朵",
    wingL: "畫左邊翅膀",
    wingR: "畫右邊翅膀",
    antennae: "畫觸角",
  } as Record<Part, string>,
  templates: { fish: "魚", bunny: "兔子", butterfly: "蝴蝶" } as Record<TemplateId, string>,
  crayon: (i: number) => `顏色 ${i + 1}`,
  noCreations: "還沒有作品。一起畫第一條魚吧！",
  drawAgain: "再畫一條",
  canvasLabel: "畫布：用手指或滑鼠畫一筆",
  phases: { dawn: "清晨", day: "白天", dusk: "傍晚", night: "晚上" } as Record<Phase, string>,
  animals: { bunny: "小兔", bear: "小熊", cat: "小貓", fox: "小狐狸", duck: "小鴨", panda: "熊貓" } as Record<
    Avatar,
    string
  >,
  privacy: "不需要註冊。我們不收集姓名、照片或位置。",
};

const en: typeof zh = {
  tagline: "Play together, grow together, no matter the distance.",
  intro:
    "For families living in different cities and time zones. Everyone joins the same little garden from their own phone or tablet to plant, water, and watch flowers bloom. Play live during a video call, or help the garden grow while the others are asleep.",
  create: "Create a garden",
  join: "Join a garden",
  creating: "Creating…",
  roomCode: "Garden code",
  codePlaceholder: "e.g. ABCD-EFGH",
  pickAnimal: "Pick an animal",
  enter: "Enter the garden",
  joining: "Connecting…",
  back: "Back",
  invalidCode: "Codes are 8 letters or numbers. Check the code and try again.",
  roomMissing: "No garden has this code. Check it, or create a new garden.",
  networkError: "Can't reach the network. Check your connection and try again.",
  rateLimited: "Too many tries. Wait a minute and try again.",
  lobbyTitle: "Your garden is ready",
  lobbyHint: "Send the link to family and they can join right away. No need to wait for everyone.",
  copyLink: "Copy invite link",
  copied: "Copied",
  share: "Share",
  here: "In the garden",
  onlyYou: "It's just you for now. Family members appear here when they join.",
  invite: "Invite family",
  close: "Close",
  reconnecting: "Reconnecting…",
  offline: "You're offline. The garden updates when you reconnect.",
  gone: "This garden no longer exists",
  goHome: "Go home",
  sendHeart: "Send a heart",
  soundOn: "Turn sound on",
  soundOff: "Turn sound off",
  language: "中文",
  welcomeBack: "Someone helped your garden grow!",
  welcomeBackSummary: (n: number) => `While you were away, family did ${n} ${n === 1 ? "thing" : "things"}.`,
  goGarden: "See the garden",
  allBloomed: "All six flowers bloomed!",
  newSeason: "Plant a new season",
  seasonHint: "Flowers you've grown stay in the garden's count",
  flowersGrown: (n: number) => `${n} ${n === 1 ? "flower" : "flowers"} grown together`,
  plotLabel: (i: number, action: string) => `Plot ${i + 1}: ${action}`,
  actions: { plant: "plant a seed", water: "water", sun: "give sunshine", bloom: "make it bloom", dance: "dance" },
  eventVerb: {
    plant: "planted a seed",
    water: "watered",
    sun: "gave sunshine",
    bloom: "made a flower bloom",
    season: "started a new season",
    fish: "finished a drawing",
  },
  draw: "Magic drawing",
  backToGarden: "Back to the garden",
  ourCreations: "Our creations",
  yourTurn: "Your turn!",
  waitingFor: (name: string) => `Waiting for ${name}…`,
  drawStep: {
    body: "Draw the body",
    tail: "Draw the tail",
    fin: "Draw the fin",
    pattern: "Draw some stripes",
    head: "Draw the head",
    ears: "Draw the ears",
    wingL: "Draw a wing",
    wingR: "Draw the other wing",
    antennae: "Draw the antennae",
  },
  templates: { fish: "Fish", bunny: "Bunny", butterfly: "Butterfly" },
  crayon: (i: number) => `Color ${i + 1}`,
  noCreations: "No creations yet. Draw your first fish together!",
  drawAgain: "Draw another",
  canvasLabel: "Canvas: draw one line with your finger or mouse",
  phases: { dawn: "early morning", day: "daytime", dusk: "evening", night: "night" },
  animals: { bunny: "Bunny", bear: "Bear", cat: "Cat", fox: "Fox", duck: "Duck", panda: "Panda" },
  privacy: "No sign-up. We never collect names, photos, or locations.",
};

const dict = { zh, en };
// The interface is English-only for now. The Traditional Chinese strings are
// kept so the switch can come back later; a saved "zh" choice is ignored.
let current = "en" as Lang;
void load;
document.documentElement.lang = "en";
const listeners = new Set<() => void>();

export function setLang(l: Lang) {
  current = l;
  save("lt:lang", l);
  document.documentElement.lang = l === "zh" ? "zh-Hant" : "en";
  listeners.forEach((f) => f());
}

export function useT() {
  const lang = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
  return { t: dict[lang], lang };
}
