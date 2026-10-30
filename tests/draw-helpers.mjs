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
