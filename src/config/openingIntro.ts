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
