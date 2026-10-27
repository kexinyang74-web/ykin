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
