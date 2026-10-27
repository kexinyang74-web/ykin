# 银狼开场完整源码

2026 年 10 月 27 日的本地实现快照。文件已写入项目，无需重新复制；后续修改以实际文件为准。操作方法见 [使用说明](opening-intro-guide.md)。

## src/config/openingIntro.ts

完整路径：`C:\Users\Administrator\Desktop\个人网站\Firefly\src\config\openingIntro.ts`

```typescript
export interface OpeningIntroConfig {
	eyebrow: string;
	title: string;
	leftWord: string;
	rightWord: string;
	caption: string;
	images: { top: string; bottom: string; character: string };
	imageWaitMs: number;
	playMs: number;
	exitMs: number;
	enabledKey: string;
	seenKey: string;
}

/** 改文字和播放时间只需要编辑这里。时间单位：毫秒。 */
export const openingIntro: OpeningIntroConfig = {
	eyebrow: "A LITTLE CURIOSITY, EVERY DAY",
	title: "新的篇章",
	leftWord: "保持好奇",
	rightWord: "开始创造",
	caption: "欢迎来到我的小小世界",
	images: {
		top: "/intro/silver-wolf-top.jpg",
		bottom: "/intro/silver-wolf-bottom.jpg",
		character: "/intro/silver-wolf-character.png",
	},
	imageWaitMs: 3000,
	playMs: 3400,
	exitMs: 800,
	enabledKey: "personal-site.opening.enabled.v1",
	seenKey: "personal-site.opening.seen.v1",
};
```

## src/utils/opening-intro.ts

完整路径：`C:\Users\Administrator\Desktop\个人网站\Firefly\src\utils\opening-intro.ts`

```typescript
export interface OpeningVisit {
	onHome: boolean;
	enabled: boolean;
	seen: boolean;
	reducedMotion: boolean;
}

export function shouldPlayOpening(visit: OpeningVisit): boolean {
	return (
		visit.onHome && visit.enabled && !visit.seen && !visit.reducedMotion
	);
}
```

## src/utils/opening-images.ts

完整路径：`C:\Users\Administrator\Desktop\个人网站\Firefly\src\utils\opening-images.ts`

```typescript
/** Wait for decoding, failure or a deadline. Cancellation must never open a late scene. */
export async function prepareOpeningImages(
	sources: readonly string[],
	timeoutMs: number,
	signal: AbortSignal,
): Promise<string[]> {
	const results = await Promise.all(
		sources.map(
			(source) =>
				new Promise<string | null>((resolve) => {
					if (signal.aborted) {
						resolve(source);
						return;
					}
					const image = new Image();
					let settled = false;
					const finish = (loaded: boolean) => {
						if (settled) return;
						settled = true;
						clearTimeout(timer);
						signal.removeEventListener("abort", abort);
						image.onload = null;
						image.onerror = null;
						resolve(loaded ? null : source);
					};
					const abort = () => finish(false);
					const timer = setTimeout(() => finish(false), timeoutMs);
					signal.addEventListener("abort", abort, { once: true });
					image.onload = () => {
						void image.decode().then(() => finish(true), () => finish(false));
					};
					image.onerror = () => finish(false);
					image.src = source;
				}),
		),
	);
	return results.filter((source): source is string => source !== null);
}
```

## src/components/features/OpeningIntro.svelte

完整路径：`C:\Users\Administrator\Desktop\个人网站\Firefly\src\components\features\OpeningIntro.svelte`

```svelte
<script lang="ts">
	import { onMount, tick } from "svelte";
	import { openingIntro as config } from "@/config/openingIntro";
	import { shouldPlayOpening } from "@/utils/opening-intro";
	import { prepareOpeningImages } from "@/utils/opening-images";
	import { url } from "@/utils/url-utils";
	import "@/styles/opening-intro.css";

	const images = {
		top: url(config.images.top),
		bottom: url(config.images.bottom),
		character: url(config.images.character),
	};
	const imageSources = Object.values(images);

	let dialog: HTMLDialogElement;
	let phase = $state<"idle" | "preparing" | "playing" | "leaving">("idle");
	let failedImages = $state<string[]>([]);
	let preparation: AbortController | undefined;
	let enabled = $state(true);
	let available = $state(false);
	let run = $state(0);
	let seen = false;
	let motion: MediaQueryList | undefined;
	let timers: ReturnType<typeof setTimeout>[] = [];
	let restoreScroll: (() => void) | undefined;
	let previousFocus: HTMLElement | null = null;

	function readPreference(
		storage: "localStorage" | "sessionStorage",
		key: string,
	) {
		try {
			return window[storage].getItem(key);
		} catch {
			return null;
		}
	}

	function savePreference(
		storage: "localStorage" | "sessionStorage",
		key: string,
		value: string,
	) {
		try {
			window[storage].setItem(key, value);
		} catch {
			/* 本页内仍可正常使用。 */
		}
	}

	function finish() {
		preparation?.abort();
		preparation = undefined;
		for (const timer of timers) clearTimeout(timer);
		timers = [];
		phase = "idle";
		if (dialog?.open) dialog.close();
		restoreScroll?.();
		restoreScroll = undefined;
		const focusTarget = previousFocus;
		previousFocus = null;
		void tick().then(() => {
			if (phase === "idle" && focusTarget?.isConnected)
				focusTarget.focus({ preventScroll: true });
		});
	}

	async function play() {
		if (!available || phase !== "idle") return;
		previousFocus =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		const targets = [document.documentElement, document.body];
		const saved = targets.map((element) => ({
			element,
			value: element.style.getPropertyValue("overflow"),
			priority: element.style.getPropertyPriority("overflow"),
		}));
		restoreScroll = () => {
			for (const { element, value, priority } of saved) {
				if (value) element.style.setProperty("overflow", value, priority);
				else element.style.removeProperty("overflow");
			}
		};
		for (const element of targets)
			element.style.setProperty("overflow", "hidden");
		run += 1;
		phase = "preparing";
		failedImages = [];
		try {
			dialog.showModal();
		} catch {
			finish();
			return;
		}
		seen = true;
		savePreference("sessionStorage", config.seenKey, "yes");
		const controller = new AbortController();
		preparation = controller;
		const failed = await prepareOpeningImages(
			imageSources,
			config.imageWaitMs,
			controller.signal,
		).catch(() => imageSources);
		if (controller.signal.aborted || preparation !== controller) return;
		preparation = undefined;
		failedImages = failed;
		phase = "playing";
		const reduced = motion?.matches ?? false;
		timers.push(
			setTimeout(
				() => {
					if (reduced) finish();
					else phase = "leaving";
				},
				reduced ? 1400 : config.playMs,
			),
		);
		// 即使浏览器没有发送 animationend，也能解除遮罩和滚动锁定。
		timers.push(
			setTimeout(finish, reduced ? 1500 : config.playMs + config.exitMs + 150),
		);
	}

	function syncRoute() {
		const path = window.location.pathname.replace(/\/+$/, "") || "/";
		const base = import.meta.env.BASE_URL.replace(/\/+$/, "");
		available = path === (base || "/") || path === `${base}/intro-demo`;
		if (!available) {
			finish();
			return;
		}
		if (
			shouldPlayOpening({
				onHome: available,
				enabled,
				seen,
				reducedMotion: motion?.matches ?? false,
			})
		)
			play();
	}

	function toggleAutomatic(event: Event) {
		enabled = (event.currentTarget as HTMLInputElement).checked;
		savePreference("localStorage", config.enabledKey, enabled ? "yes" : "no");
	}

	onMount(() => {
		enabled = readPreference("localStorage", config.enabledKey) !== "no";
		seen = readPreference("sessionStorage", config.seenKey) === "yes";
		motion = window.matchMedia("(prefers-reduced-motion: reduce)");
		const motionChanged = () => {
			if (motion?.matches) finish();
		};
		const pageEvents = [
			"astro:page-load",
			"swup:contentReplaced",
			"swup:page:view",
		];
		for (const name of pageEvents) document.addEventListener(name, syncRoute);
		document.addEventListener("swup:visit:start", finish);
		window.addEventListener("pageshow", syncRoute);
		window.addEventListener("popstate", syncRoute);
		motion.addEventListener("change", motionChanged);
		syncRoute();
		return () => {
			finish();
			for (const name of pageEvents)
				document.removeEventListener(name, syncRoute);
			document.removeEventListener("swup:visit:start", finish);
			window.removeEventListener("pageshow", syncRoute);
			window.removeEventListener("popstate", syncRoute);
			motion?.removeEventListener("change", motionChanged);
		};
	});
</script>

<dialog
	bind:this={dialog}
	class="opening"
	data-phase={phase}
	aria-labelledby="opening-title"
	style:--exit-time={`${config.exitMs}ms`}
	oncancel={(event) => { event.preventDefault(); finish(); }}
	onclose={finish}
	onanimationend={(event) => { if (event.target === dialog && phase === "leaving") finish(); }}
>
	{#key run}
		<div class="opening-meta"><span>YKIN / PERSONAL SPACE</span><span>01 — SILVER WOLF</span></div>
		{#if phase === "preparing"}
			<div class="opening-loading" role="status"><span aria-hidden="true">✦</span><p id="opening-title">正在准备开场…</p></div>
		{:else if phase === "playing" || phase === "leaving"}
			<div class="scene" aria-hidden="true">
				<div class="intro-banner intro-banner-top">
					{#if !failedImages.includes(images.top)}<img src={images.top} alt="" width="736" height="428" />{/if}
				</div>
				<div class="intro-banner intro-banner-bottom">
					{#if !failedImages.includes(images.bottom)}<img src={images.bottom} alt="" width="1200" height="822" />{/if}
				</div>
				<div class="intro-crossbar"><span>SILVER WOLF · PLAYER ONE · YKIN · SILVER WOLF · PLAYER ONE · YKIN</span></div>
				<div class="portrait-glow"></div>
				{#if !failedImages.includes(images.character)}
					<div class="intro-character"><img src={images.character} alt="" width="736" height="1308" /></div>
				{/if}
				<div class="words"><span>{config.leftWord}</span><span>{config.rightWord}</span></div>
				<div class="intro-spark spark-one">✦</div><div class="intro-spark spark-two">+</div>
			</div>
			<div class="opening-heading"><p>{config.eyebrow}</p><h2 id="opening-title">{config.title}</h2></div>
			<p class="opening-caption">{config.caption}<span>SCROLL INTO SOMETHING NEW</span></p>
		{/if}
	{/key}
	<button class="skip" type="button" onclick={finish}>跳过开场 <span aria-hidden="true">↗</span></button>
</dialog>

{#if available}
	<aside class="opening-controls" aria-label="开场动画设置">
		<button type="button" onclick={play} disabled={phase !== "idle"}>↻ 重播开场</button>
		<label><input type="checkbox" checked={enabled} onchange={toggleAutomatic} /> 自动播放</label>
	</aside>
{/if}
```

## src/styles/opening-intro.css

完整路径：`C:\Users\Administrator\Desktop\个人网站\Firefly\src\styles\opening-intro.css`

```css
dialog.opening {
  --intro-ink: #291445;
  --intro-violet: #9973ef;
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100dvh;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  color: var(--intro-ink);
  background: #e5d9fb;
  font-family: "Microsoft YaHei", sans-serif;
}
.opening::backdrop { background: transparent; }
.opening[data-phase="leaving"] { animation: opening-curtain-away var(--exit-time) cubic-bezier(.76,0,.24,1) both; }
.opening .scene { position: absolute; inset: 0; overflow: hidden; }
.opening .intro-banner {
  position: absolute;
  left: 0;
  width: 100%;
  height: 42%;
  overflow: hidden;
  background: linear-gradient(120deg,#4b326e,#9981c9 60%,#b3a4dc);
}
.opening .intro-banner::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg,#29144544,transparent 44%,#29144514);
  box-shadow: inset 0 0 0 1px #f8efff45;
}
.opening .intro-banner img { width: 100%; height: 100%; object-fit: cover; }
.opening .intro-banner-top { top: 7%; animation: opening-banner-left 1s .08s cubic-bezier(.16,1,.3,1) both; }
.opening .intro-banner-top img { object-position: 50% 40%; }
.opening .intro-banner-bottom { bottom: 7%; animation: opening-banner-right 1.05s .22s cubic-bezier(.16,1,.3,1) both; }
.opening .intro-banner-bottom img { object-position: 50% 39%; }
.opening .intro-crossbar {
  position: absolute;
  z-index: 1;
  top: 48%;
  width: 110%;
  left: -5%;
  height: 4%;
  min-height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #f7f0ff;
  background: #6945a5;
  transform: rotate(-2deg);
  border-block: 1px solid #ebd9ff;
}
.opening .intro-crossbar span { white-space: nowrap; font: 10px/1.5 monospace; letter-spacing: .42em; }
.opening .portrait-glow {
  position: absolute;
  z-index: 1;
  width: 70vmin;
  height: 90%;
  left: 50%;
  top: 5%;
  transform: translateX(-50%);
  background: radial-gradient(ellipse,#ceb2ff80,transparent 68%);
}
.opening .intro-character {
  position: absolute;
  z-index: 2;
  left: 50%;
  bottom: 1%;
  height: 96%;
  aspect-ratio: 736 / 1308;
  transform: translateX(-50%);
  animation: opening-character-enter 1.15s .32s cubic-bezier(.16,1,.3,1) both;
  pointer-events: none;
}
.opening .intro-character img {
  display: block;
  height: 100%;
  width: 100%;
  object-fit: contain;
  filter: drop-shadow(2px 0 0 #f4eaff) drop-shadow(-2px 0 0 #f4eaff) drop-shadow(0 2px 0 #f4eaff) drop-shadow(0 12px 20px #27103966);
}
.opening .words {
  position: absolute;
  z-index: 3;
  left: 5%;
  right: 5%;
  top: 48%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  pointer-events: none;
}
.opening .words span {
  display: block;
  color: #fffaff;
  font-size: clamp(30px,5.6vw,90px);
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: -.055em;
  white-space: nowrap;
  -webkit-text-stroke: 5px #321e52;
  paint-order: stroke fill;
  text-shadow: 5px 6px 0 #9d72dd, 0 8px 24px #27143955;
  transform: rotate(-6deg);
  animation: opening-word-left .85s .72s cubic-bezier(.18,.9,.28,1.15) both;
}
.opening .words span:last-child { transform: rotate(5deg); animation-name: opening-word-right; animation-delay: .9s; }
.opening .opening-meta {
  position: absolute;
  z-index: 4;
  inset: 0 4% auto;
  height: 7%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font: 10px/1.5 monospace;
  letter-spacing: .14em;
}
.opening .opening-heading {
  position: absolute;
  z-index: 4;
  top: 10%;
  left: 5%;
  color: #fff;
  text-shadow: 0 2px 12px #211033aa;
  animation: opening-label-in .8s .5s both;
}
.opening .opening-heading p { margin: 0; font: 10px/1.8 monospace; letter-spacing: .1em; }
.opening .opening-heading h2 { margin: 5px 0; font-size: clamp(22px,2.5vw,36px); font-weight: 700; letter-spacing: .12em; }
.opening .opening-caption {
  position: absolute;
  z-index: 4;
  bottom: 10%;
  left: 5%;
  margin: 0;
  color: #fff;
  text-shadow: 0 2px 10px #211033;
  font-size: 13px;
  letter-spacing: .1em;
  animation: opening-label-in .85s 1.05s both;
}
.opening .opening-caption span { display: block; margin-top: 8px; font: 9px/1.5 monospace; letter-spacing: .12em; }
.opening .intro-spark { position: absolute; z-index: 3; color: #f4dfff; font-size: 44px; text-shadow: 0 0 18px #ae72ff; animation: opening-label-in 1s .65s both; }
.opening .spark-one { left: 35%; top: 17%; }
.opening .spark-two { right: 29%; bottom: 18%; font: 60px monospace; }
.opening .opening-loading { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.opening .opening-loading span { font-size: 60px; color: #8b5fd2; animation: opening-pulse 1s ease-in-out infinite alternate; }
.opening .opening-loading p { font-size: 13px; letter-spacing: .12em; }
.opening .skip {
  position: absolute;
  z-index: 5;
  right: 4%;
  bottom: max(14px,env(safe-area-inset-bottom));
  border: 1px solid #6d4c9a55;
  border-radius: 999px;
  padding: 9px 17px;
  background: #fbf7ff;
  color: var(--intro-ink);
  cursor: pointer;
  font-size: 12px;
}
.opening .skip span { margin-left: 16px; }
.opening .skip:focus-visible, .opening-controls button:focus-visible { outline: 3px solid #8656c6; outline-offset: 4px; }
.opening-controls {
  position: fixed;
  z-index: 45;
  bottom: max(14px,env(safe-area-inset-bottom));
  left: 14px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  max-width: calc(100vw - 28px);
  border: 1px solid #6d4c9a33;
  border-radius: 999px;
  padding: 9px 14px;
  box-shadow: 0 4px 24px #321e5215;
  background: #fbf7ff;
  color: #49266f;
  font: 12px/1.6 sans-serif;
}
.opening-controls button { border: 0; background: transparent; color: inherit; cursor: pointer; }
.opening-controls button:disabled { opacity: .55; cursor: default; }
.opening-controls label { display: flex; align-items: center; gap: 5px; cursor: pointer; }
.opening-controls input { accent-color: #8957ce; width: 14px; height: 14px; }
@keyframes opening-banner-left { from { transform: translateX(-104%) scale(1.04); } to { transform: translateX(0) scale(1); } }
@keyframes opening-banner-right { from { transform: translateX(104%) scale(1.04); } to { transform: translateX(0) scale(1); } }
@keyframes opening-character-enter { from { opacity: 0; transform: translate(-50%,8%) scale(.88); } to { opacity: 1; transform: translate(-50%,0) scale(1); } }
@keyframes opening-word-left { from { opacity: 0; transform: translateX(-50px) rotate(-12deg) scale(.85); } to { opacity: 1; transform: translateX(0) rotate(-6deg) scale(1); } }
@keyframes opening-word-right { from { opacity: 0; transform: translateX(50px) rotate(12deg) scale(.85); } to { opacity: 1; transform: translateX(0) rotate(5deg) scale(1); } }
@keyframes opening-label-in { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
@keyframes opening-pulse { from { opacity: .4; } to { opacity: 1; } }
@keyframes opening-curtain-away { to { transform: translateY(-101%); } }
@media (max-width: 700px) {
  .opening .intro-banner-top img { object-position: 35% 45%; }
  .opening .intro-banner-bottom img { object-position: 68% 33%; }
  .opening .intro-character { bottom: 15%; height: 74%; max-width: 98%; }
  .opening .words { top: 71%; left: 5%; right: 5%; gap: 12px; justify-content: center; }
  .opening .words span { font-size: clamp(24px,7.7vw,48px); -webkit-text-stroke-width: 3px; text-shadow: 3px 4px 0 #9d72dd,0 5px 15px #27143955; }
  .opening .opening-meta { font-size: 8px; letter-spacing: .03em; }
  .opening .opening-heading { top: 9%; }
  .opening .opening-heading p { font-size: 8px; }
  .opening .opening-heading h2 { font-size: 22px; }
  .opening .opening-caption { bottom: 10%; font-size: 11px; }
  .opening .opening-caption span { font-size: 8px; margin-top: 6px; }
  .opening .spark-one { left: 12%; top: 35%; font-size: 30px; }
  .opening .spark-two { right: 8%; bottom: 33%; font-size: 35px; }
  .opening .skip { font-size: 11px; padding: 7px 13px; bottom: max(8px,env(safe-area-inset-bottom)); }
}
@media (prefers-reduced-motion: reduce) {
  .opening, .opening * { animation: none !important; }
}
```

## src/pages/intro-demo.astro

完整路径：`C:\Users\Administrator\Desktop\个人网站\Firefly\src\pages\intro-demo.astro`

```astro
---
import OpeningIntro from "@/components/features/OpeningIntro.svelte";
import { url } from "@/utils/url-utils";
---

<!doctype html>
<html lang="zh-CN">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<meta name="robots" content="noindex" />
		<title>开场动画试玩</title>
	</head>
	<body>
		<OpeningIntro client:load />
		<main>
			<p class="eyebrow">A SMALL BEGINNING</p>
			<h1>故事，从这里开始。</h1>
			<p class="lead">这是你的银狼开场试玩页。上下图片交错进入，透明立绘和大字随后出现；幕布升起后，内容留在这里。</p>
			<div class="instructions">
				<span>01 / 重播</span><p>点击左下角“重播开场”，再看一次。</p>
				<span>02 / 跳过</span><p>动画中点击“跳过开场”，或按键盘 Esc。</p>
				<span>03 / 自己选择</span><p>取消“自动播放”，以后由你决定何时观看。刷新不会清除本次会话的播放记录。</p>
			</div>
			<a href={url("/")} data-no-swup>进入我的首页 ↗</a>
		</main>
	</body>
</html>

<style>
	:global(*) { box-sizing: border-box; }
	:global(body) { margin: 0; background: #f4efe4; color: #203e4d; font-family: "Microsoft YaHei", sans-serif; }
	main { max-width: 960px; margin: auto; padding: clamp(70px,12vh,140px) 7vw 130px; }
	.eyebrow { font: 11px/1.8 monospace; letter-spacing: .22em; color: #916247; }
	h1 { font-size: clamp(36px,6vw,70px); font-weight: 500; letter-spacing: -.05em; margin: 25px 0; }
	.lead { max-width: 550px; font-size: 16px; line-height: 2; color: #526873; }
	.instructions { margin: 48px 0; border-top: 1px solid #203e4d25; }
	.instructions span { display: block; font-size: 12px; letter-spacing: .1em; margin-top: 23px; color: #916247; }
	.instructions p { line-height: 1.9; font-size: 14px; }
	a { display: inline-block; padding: 13px 21px; border: 1px solid #203e4d; border-radius: 999px; color: inherit; text-decoration: none; }
</style>
```

## src/utils/opening-intro.test.ts

完整路径：`C:\Users\Administrator\Desktop\个人网站\Firefly\src\utils\opening-intro.test.ts`

```typescript
import assert from "node:assert/strict";
import test from "node:test";
import { shouldPlayOpening } from "./opening-intro";

const firstVisit = {
	onHome: true,
	enabled: true,
	seen: false,
	reducedMotion: false,
};

test("first visit plays, while a repeat visit or another route does not", () => {
	assert.equal(shouldPlayOpening(firstVisit), true);
	assert.equal(shouldPlayOpening({ ...firstVisit, seen: true }), false);
	assert.equal(shouldPlayOpening({ ...firstVisit, onHome: false }), false);
});

test("automatic playback respects the visitor's switch and motion preference", () => {
	assert.equal(shouldPlayOpening({ ...firstVisit, enabled: false }), false);
	assert.equal(shouldPlayOpening({ ...firstVisit, reducedMotion: true }), false);
});
```

## 图片与接入位置

三张用户素材在 `public/intro/`，分别为 `silver-wolf-top.jpg`、`silver-wolf-bottom.jpg`、`silver-wolf-character.png`。

首页通过 `src/layouts/MainGridLayout.astro` 导入组件，在 Swup 替换区域外调用 `<OpeningIntro client:load />`。
