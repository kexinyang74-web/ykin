<script lang="ts">
	import { onMount, tick } from "svelte";
	import { openingIntro as config } from "@/config/openingIntro";
	import { shouldPlayOpening } from "@/utils/opening-intro";

	let dialog: HTMLDialogElement;
	let phase = $state<"idle" | "playing" | "leaving">("idle");
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

	function play() {
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
		phase = "playing";
		try {
			dialog.showModal();
		} catch {
			finish();
			return;
		}
		seen = true;
		savePreference("sessionStorage", config.seenKey, "yes");
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
		<div class="scene" aria-hidden="true">
			<div class="landscape sky"><span class="sun"></span><span class="sky-line"></span></div>
			<div class="landscape earth"><span class="hill far"></span><span class="hill near"></span></div>
			<div class="medallion"><span class="orbit"></span><span class="spark">✦</span><span class="seal">启程</span></div>
			<div class="words"><span>{config.leftWord}</span><span>{config.rightWord}</span></div>
		</div>
		<div class="opening-meta"><span>PERSONAL SPACE</span><span>NO. 01 / WELCOME</span></div>
		<div class="opening-heading"><p>{config.eyebrow}</p><h2 id="opening-title">{config.title}</h2></div>
		<p class="opening-caption">{config.caption}<span>SCROLL INTO SOMETHING NEW</span></p>
	{/key}
	<button class="skip" type="button" onclick={finish}>跳过开场 <span aria-hidden="true">↗</span></button>
</dialog>

{#if available}
	<aside class="opening-controls" aria-label="开场动画设置">
		<button type="button" onclick={play} disabled={phase !== "idle"}>↻ 重播开场</button>
		<label><input type="checkbox" checked={enabled} onchange={toggleAutomatic} /> 自动播放</label>
	</aside>
{/if}

<style>
	.opening {
		position: fixed;
		inset: 0;
		margin: 0;
		padding: 0;
		width: 100%;
		height: 100dvh;
		max-width: none;
		max-height: none;
		border: 0;
		overflow: hidden;
		background: #f4efe4;
		color: #182f3b;
		font-family: "Microsoft YaHei", sans-serif;
	}
	.opening::backdrop {
		background: transparent;
	}
	.opening[data-phase="leaving"] {
		animation: curtain-away var(--exit-time) cubic-bezier(0.76, 0, 0.24, 1) both;
	}
	.scene {
		position: absolute;
		inset: 0;
		overflow: hidden;
	}
	.landscape {
		position: absolute;
		left: 0;
		width: 100%;
		height: 40%;
		overflow: hidden;
	}
	.sky {
		top: 10%;
		background: linear-gradient(120deg, #204659, #83b8c2 68%, #d5e6da);
		animation: sky-arrive 1.35s 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	.sun {
		position: absolute;
		right: 16%;
		top: 14%;
		width: min(17vw, 180px);
		aspect-ratio: 1;
		border-radius: 50%;
		background: #f9e6b0;
		box-shadow: 0 0 80px #f9e6b033;
	}
	.sky-line {
		position: absolute;
		width: 130%;
		height: 90%;
		left: -10%;
		bottom: -65%;
		border-radius: 50%;
		background: #416c79;
		transform: rotate(-8deg);
	}
	.earth {
		bottom: 10%;
		background: #da936f;
		animation: earth-arrive 1.35s 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
	}
	.hill {
		position: absolute;
		border-radius: 50% 50% 0 0;
		width: 120%;
		height: 150%;
	}
	.far {
		left: -35%;
		top: 24%;
		background: #ab634f;
		transform: rotate(9deg);
	}
	.near {
		right: -50%;
		top: 40%;
		background: #713f39;
		transform: rotate(-14deg);
	}
	.medallion {
		position: absolute;
		z-index: 2;
		left: 50%;
		top: 50%;
		width: clamp(150px, 24vw, 310px);
		aspect-ratio: 1;
		border-radius: 50%;
		display: grid;
		place-content: center;
		justify-items: center;
		background: #f4efe4;
		border: 1px solid #182f3b;
		box-shadow: 0 18px 50px #182f3b24;
		animation: emblem-arrive 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) both;
	}
	.orbit {
		position: absolute;
		inset: 12px;
		border: 1px dashed #182f3b70;
		border-radius: 50%;
	}
	.spark {
		font-size: clamp(48px, 8vw, 100px);
		line-height: 1;
		color: #bd6f44;
	}
	.seal {
		font-family: serif;
		font-size: clamp(22px, 3vw, 36px);
		letter-spacing: 0.35em;
		padding-left: 0.35em;
		margin-top: 12px;
	}
	.words {
		position: absolute;
		z-index: 3;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 6%;
		pointer-events: none;
	}
	.words span {
		color: #fff9ec;
		font-weight: 800;
		font-size: clamp(32px, 5.5vw, 80px);
		letter-spacing: -0.04em;
		text-shadow: 0 3px 20px #182f3b45;
		animation: word-arrive 1s 0.9s both;
	}
	.words span:last-child {
		animation-delay: 1.1s;
	}
	.opening-meta {
		position: absolute;
		inset: 0 4% auto;
		height: 10%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		font: 10px/1.5 monospace;
		letter-spacing: 0.16em;
	}
	.opening-heading {
		position: absolute;
		z-index: 3;
		top: 15%;
		left: 6%;
		color: #fff9ec;
		animation: word-arrive 1s 0.3s both;
	}
	.opening-heading p {
		font: 10px/1.8 monospace;
		letter-spacing: 0.12em;
	}
	.opening-heading h2 {
		margin: 8px 0;
		font-size: clamp(25px, 3vw, 42px);
		font-weight: 400;
		letter-spacing: 0.12em;
	}
	.opening-caption {
		position: absolute;
		bottom: 13%;
		left: 6%;
		color: #fff9ec;
		font-size: 13px;
		letter-spacing: 0.15em;
		animation: word-arrive 1s 1.1s both;
	}
	.opening-caption span {
		display: block;
		margin-top: 10px;
		font: 9px/1.5 monospace;
		letter-spacing: 0.1em;
	}
	.skip {
		position: absolute;
		right: 4%;
		bottom: 3%;
		border: 1px solid #182f3b50;
		border-radius: 999px;
		padding: 10px 18px;
		background: #f4efe4;
		color: #182f3b;
		cursor: pointer;
		font-size: 12px;
	}
	.skip span {
		margin-left: 16px;
	}
	.skip:focus-visible,
	.opening-controls button:focus-visible {
		outline: 3px solid #c46d3b;
		outline-offset: 4px;
	}
	.opening-controls {
		position: fixed;
		z-index: 45;
		bottom: max(14px, env(safe-area-inset-bottom));
		left: 14px;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
		max-width: calc(100vw - 28px);
		border: 1px solid #203e4d25;
		border-radius: 999px;
		padding: 9px 14px;
		box-shadow: 0 4px 24px #182f3b12;
		background: #fffdf6;
		color: #203e4d;
		font: 12px/1.6 sans-serif;
	}
	.opening-controls button {
		border: 0;
		background: transparent;
		color: inherit;
		cursor: pointer;
	}
	.opening-controls label {
		display: flex;
		align-items: center;
		gap: 5px;
		cursor: pointer;
	}
	.opening-controls input {
		accent-color: #336678;
		width: 14px;
		height: 14px;
	}
	@keyframes sky-arrive {
		from {
			transform: translateX(-100%);
		}
		to {
			transform: translateX(0);
		}
	}
	@keyframes earth-arrive {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}
	@keyframes emblem-arrive {
		from {
			opacity: 0;
			transform: translate(-50%, -35%) scale(0.7) rotate(-12deg);
		}
		to {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1) rotate(0);
		}
	}
	@keyframes word-arrive {
		from {
			opacity: 0;
			transform: translateY(24px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	@keyframes curtain-away {
		to {
			transform: translateY(-100%);
		}
	}
	@media (max-width: 600px) {
		.words {
			align-items: flex-start;
			justify-content: center;
			gap: 12px;
			padding: 0;
			top: 69%;
		}
		.words span {
			font-size: clamp(22px, 7vw, 38px);
		}
		.opening-heading {
			top: 14%;
		}
		.opening-heading p {
			max-width: 190px;
			font-size: 9px;
		}
		.opening-caption {
			bottom: 13%;
			font-size: 11px;
		}
		.opening-meta {
			font-size: 8px;
			letter-spacing: 0.04em;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.opening,
		.sky,
		.earth,
		.medallion,
		.words span,
		.opening-heading,
		.opening-caption {
			animation: none !important;
		}
		.medallion {
			transform: translate(-50%, -50%);
		}
	}
</style>
