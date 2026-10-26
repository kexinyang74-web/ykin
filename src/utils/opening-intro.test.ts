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
