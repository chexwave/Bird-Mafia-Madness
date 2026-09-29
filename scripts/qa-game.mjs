import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.waitForTimeout(500);

await page.getByRole("button", { name: "Play" }).click();
await page.waitForTimeout(800);
await page.screenshot({ path: "/workspace/screenshots/character.png" });

await page.getByRole("button", { name: /Goblin/i }).click();
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/levels.png" });

await page.getByRole("button", { name: /Drop In/i }).click();
await page.waitForTimeout(2000);
await page.screenshot({ path: "/workspace/screenshots/playing.png" });

// Move left then right for controls self-test
await page.keyboard.down("KeyA");
await page.waitForTimeout(500);
const afterA = await page.evaluate(() => {
  const t = window.__controlsTest;
  return t ? { x: t.getX(), facing: t.getFacing(), speed: t.getSpeed() } : null;
});
await page.keyboard.up("KeyA");

await page.keyboard.down("KeyD");
await page.waitForTimeout(500);
const afterD = await page.evaluate(() => {
  const t = window.__controlsTest;
  return t ? { x: t.getX(), facing: t.getFacing(), speed: t.getSpeed() } : null;
});

// jump and fire
for (let i = 0; i < 30; i++) {
  await page.keyboard.down("KeyD");
  if (i % 7 === 0) {
    await page.keyboard.press("Space");
  }
  if (i % 5 === 0) {
    await page.keyboard.press("KeyJ");
  }
  await page.waitForTimeout(60);
}
await page.keyboard.up("KeyD");
await page.waitForTimeout(300);
await page.screenshot({ path: "/workspace/screenshots/playing-moved.png" });

// pause
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/paused.png" });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
await page.screenshot({ path: "/workspace/screenshots/mobile.png" });

const controlsOk =
  afterA &&
  afterD &&
  afterA.facing < 0 &&
  afterD.facing > 0 &&
  afterD.x > afterA.x;

console.log(JSON.stringify({ errors, afterA, afterD, controlsOk }, null, 2));
await browser.close();
process.exit(errors.length || !controlsOk ? 1 : 0);
