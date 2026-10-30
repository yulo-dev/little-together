// Shapes used by tests to draw a recognizable fish in canvas space (0..1000).
const ellipse = (cx, cy, rx, ry, n = 28) =>
  Array.from({ length: n + 1 }, (_, i) => [
    cx + Math.cos((i / n) * 2 * Math.PI) * rx,
    cy + Math.sin((i / n) * 2 * Math.PI) * ry,
  ]);
export const FISH = [
  ellipse(570, 500, 260, 165), // body
  [
    [310, 500],
    [150, 380],
    [170, 500],
    [150, 620],
    [310, 500],
  ], // tail
  [
    [470, 360],
    [520, 270],
    [580, 240],
    [640, 300],
    [660, 360],
  ], // fin
  [
    [530, 410],
    [550, 470],
    [545, 530],
    [525, 590],
  ], // stripe
];

/** Drag a pointer along canvas-space points on the page's drawing canvas. */
export async function drawOn(page, pts) {
  const box = await page.getByTestId("canvas").boundingBox();
  const at = ([x, y]) => [box.x + (x / 1000) * box.width, box.y + (y / 1000) * box.height];
  await page.mouse.move(...at(pts[0]));
  await page.mouse.down();
  for (const p of pts.slice(1)) await page.mouse.move(...at(p), { steps: 3 });
  await page.mouse.up();
}

export const BUNNY = [
  ellipse(450, 625, 225, 190), // body
  ellipse(640, 380, 135, 135), // head
  [
    [590, 255],
    [570, 160],
    [585, 85],
    [615, 80],
    [640, 140],
    [630, 250],
    [670, 250],
    [690, 150],
    [730, 95],
    [760, 100],
    [750, 170],
    [700, 260],
  ], // ears
  ellipse(215, 640, 50, 50, 14), // tail
];

export const BUTTERFLY = [
  [
    [500, 300],
    [500, 500],
    [500, 720],
  ], // body
  [
    [490, 470],
    [400, 320],
    [260, 270],
    [190, 380],
    [230, 500],
    [350, 530],
    [490, 500],
    [380, 580],
    [280, 680],
    [330, 750],
    [430, 700],
    [490, 560],
  ], // left wing
  [
    [510, 470],
    [600, 320],
    [740, 270],
    [810, 380],
    [770, 500],
    [650, 530],
    [510, 500],
    [620, 580],
    [720, 680],
    [670, 750],
    [570, 700],
    [510, 560],
  ], // right wing
  [
    [495, 300],
    [460, 230],
    [420, 185],
    [500, 300],
    [540, 230],
    [580, 185],
  ], // antennae
];
