import type { ProfileConfig } from "../types/profileConfig";

export const profileConfig: ProfileConfig = {
	// 头像
	// 图片路径支持三种格式：
	// 1. public 目录（以 "/" 开头，不优化）："/assets/images/avatar.webp"
	// 2. src 目录（不以 "/" 开头，自动优化但会增加构建时间，推荐）："assets/images/avatar.webp"
	// 3. 远程 URL："https://example.com/avatar.jpg"
	avatar: "/银狼头像.jpg",

	// 名字
	name: "YKIN",

	// 个人签名
	bio: "我是编程小白，正在用 AI 一点点搭建自己的网站。",

	// 链接配置
	// 已经预装的图标集：fa7-brands，fa7-regular，fa7-solid，material-symbols，simple-icons
	// 访问https://icones.js.org/ 获取图标代码，
	// 如果想使用尚未包含相应的图标集，则需要安装它
	// `pnpm add @iconify-json/<icon-set-name>`
	// showName: true 时显示图标和名称，false 时只显示图标
	links: [
		{
			name: "B站",
			icon: "fa7-brands:bilibili",
			url: "https://space.bilibili.com/1711613651",
			showName: true,
		},
		{
			name: "抖音",
			icon: "fa7-brands:tiktok",
			url: "https://www.douyin.com/user/MS4wLjABAAAAq9j9m79ewcOwIYtCwmaoGnsgIreapnaLJFlzxxjyQgoaQEItXUZtNoA_OfZrIIUJ",
			showName: true,
		},
		{
			name: "GitHub",
			icon: "fa7-brands:github",
			url: "https://github.com/kexinyang74-web",
			showName: true,
		},
		{
			name: "QQ：3307598126",
			icon: "fa7-brands:qq",
			url: "https://wpa.qq.com/msgrd?v=3&uin=3307598126&site=qq&menu=yes",
			showName: true,
		  },
	],
};
