# Silver Wolf Opening Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan in the current checkout. The user has approved the design and implementation; local preview precedes publication.

**Goal:** Replace the geometric opening with the three supplied Silver Wolf images and a purple layered entrance.

**Architecture:** Keep the existing Svelte dialog, route handling and playback preferences. Add a bounded, cancellable image preparation helper; configure asset paths and render independent background, portrait and text layers only after preparation settles.

**Tech Stack:** Astro 7, Svelte 5, TypeScript, CSS animations; no additional runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-10-27-silver-wolf-opening-design.md` (approved in chat).

## Global Constraints

- Preserve skip, Esc, replay, automatic preference, session memory and reduced motion.
- Keep local `/` and production `/ykin/` support.
- Keep the source images intact; copy to descriptive paths under `public/intro/`.
- Play for 3400 ms after image preparation; exit over 800 ms. Preparation is capped at 3000 ms.
- Do not publish before the user reviews the local visual result.

## Review Focus

- Missing or delayed images must not trap the visitor behind the overlay.
- Skipping while images load must cancel pending activation and release scrolling.
- Replaying and changing routes must not leave old timers or steal focus.
- Mobile text and the skip button must fit without covering the portrait's face.
- Production asset URLs must include `/ykin/` exactly once.

## Task 1: Layered image opening

**Files:** `public/intro/*`, `src/config/openingIntro.ts`, `src/styles/opening-intro.css`, `src/utils/opening-images.ts`, `src/components/features/OpeningIntro.svelte`, `src/pages/intro-demo.astro`, `docs/opening-intro-guide.md`, `docs/opening-intro-source.md`.

**Interfaces:** `prepareOpeningImages(sources: readonly string[], timeoutMs: number, signal: AbortSignal): Promise<string[]>` returns failed or timed-out URLs. The component maps configured paths through the existing `url()` utility and ignores results from cancelled preparations.

- [x] Add browser assertions for the three image layers, asset decoding, controls, loading failure and cancel-during-load; observe failure on the existing geometric opening.
- [x] Copy the supplied files, add asset configuration and implement bounded preparation with abort cleanup.
- [x] Replace geometry with independently animated top/bottom banners, transparent portrait and staggered text. Match the approved purple palette and mobile composition.
- [x] Run the new browser scenarios plus the existing route/control checks on local and production paths; inspect desktop and mobile screenshots.
- [x] Run `pnpm check`, `pnpm type-check`, existing unit tests and `GITHUB_PAGES=true pnpm build`.
- [x] Update the beginner guide and source snapshot, then obtain a focused code review and resolve material findings.
- [x] Deliver a working local preview for the user's visual review; do not push.

## Validation result

2026-10-27: Astro check (247 files, zero errors/warnings), TypeScript, 2 playback unit tests and complete GitHub Pages build passed. Root and /ykin/ browser checks passed: desktop/mobile images, layout, skip, replay, normal exit, preference off without asset downloads, failure, cancel while loading and deadline. Route/control regression passed. Fresh review found idle eager image fetching; render guard fixed and verified.

Dev-only deadline test was interrupted by Vite program reload while docs changed; isolated timeline confirmed ~3 s image deadline and automatic exit. With edits stopped, the full suite passed. Local preview is ready; visual acceptance and publishing remain with the user.
