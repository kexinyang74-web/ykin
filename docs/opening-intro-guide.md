# 原创开场动画使用说明

这个版本由 Astro 接入页面、Svelte 管理交互、TypeScript 管理配置和播放条件。视觉使用你提供的三张银狼图片，配合新写的 CSS 分层动画；没有复制 rainzt 的程序代码或素材。

## 亲手打开

在 **Cursor → 终端 → 新建终端** 中选择 PowerShell，将下面两行一起复制执行：

```powershell
Set-Location -LiteralPath 'C:\Users\Administrator\Desktop\个人网站\Firefly'
pnpm dev --host 127.0.0.1 --port 4321
```

然后在 **Chrome 或 Edge 浏览器的地址栏** 输入：

- 专门试玩：[http://127.0.0.1:4321/intro-demo/](http://127.0.0.1:4321/intro-demo/)
- 已接入的首页：[http://127.0.0.1:4321/](http://127.0.0.1:4321/)

本次交付时开发服务器已启动，可以直接点链接。如果你之后重启电脑，用上面的命令重新启动。如果终端提示使用了其他端口，以终端显示的地址为准，在它后面加 `/intro-demo/`。

不要双击 `.astro` 或 `.svelte` 文件来预览；它们需要开发服务器转换成浏览器页面。

## 试玩方法

1. 首次进入会看到动画。刷新同一标签页时不会重复自动播放。
2. 点击左下角 **重播开场**，可以反复观看。
3. 动画中点击右下角 **跳过开场**，或按键盘 **Esc**，立即回到页面。
4. 取消左下角 **自动播放**，浏览器会记住选择；手动重播仍然有效。
5. 系统启用“减少动态效果”时，不自动播放；手动重播展示约 1.4 秒的静态画面。
6. 缩窄浏览器窗口，可以查看手机布局。

首页与试玩页共用播放记录。因此先看过试玩页再去首页时，直接显示首页是正常的。再次勾选“自动播放”不会清除本次会话记录，想立即看时用“重播开场”。

## 文件放在哪里 内容是什么

项目根目录是 `C:\Users\Administrator\Desktop\个人网站\Firefly`。下面的路径均相对于它。每个新增源码文件的完整内容见 [opening-intro-source.md](opening-intro-source.md)，也可以点击文件本身查看。

| 文件 | 内容 | 你什么时候需要改 |
|---|---|---|
| [src/config/openingIntro.ts](../src/config/openingIntro.ts) | 标题、左右文字、图片路径、加载等待上限、播放时长、浏览器存储键 | 换文字或调整节奏 |
| [src/utils/opening-intro.ts](../src/utils/opening-intro.ts) | 根据页面、开关、是否看过及减少动态效果偏好，判断是否自动播放 | 改自动播放条件 |
| [src/components/features/OpeningIntro.svelte](../src/components/features/OpeningIntro.svelte) | 全屏对话框、图片与文字分层、跳过和重播、滚动与焦点恢复、路由监听 | 改画面、动作、交互 |
| [src/styles/opening-intro.css](../src/styles/opening-intro.css) | 紫色配色、图片裁切、手机布局与入场关键帧 | 改视觉和动作 |
| [src/utils/opening-images.ts](../src/utils/opening-images.ts) | 图片预加载、解码、3 秒超时与取消 | 改加载处理 |
| `public/intro/` | 上幅 silver-wolf-top.jpg、下幅 silver-wolf-bottom.jpg、人物 silver-wolf-character.png | 换图片（人物需透明 PNG） |
| [src/pages/intro-demo.astro](../src/pages/intro-demo.astro) | 独立试玩页面、操作提示和首页入口 | 改试玩页介绍 |
| [src/layouts/MainGridLayout.astro](../src/layouts/MainGridLayout.astro) | 在原布局中新增组件导入和 `<OpeningIntro client:load />` 两行 | 决定是否接入实际网站 |
| [src/utils/opening-intro.test.ts](../src/utils/opening-intro.test.ts) | 两组播放条件测试 | 改播放条件时检查是否破坏规则 |
| [docs/opening-intro-plan.md](opening-intro-plan.md) | 这次实现的范围与执行记录 | 回顾工作范围 |
| [docs/opening-intro-source.md](opening-intro-source.md) | 本次交付的完整新增源码，以及布局修改片段 | 集中阅读代码 |
| `docs/opening-intro-guide.md` | 本说明 | 查看运行和修改方法 |

组件挂在 Swup 页面替换区域外，切换文章时保留同一个组件。它只在首页和试玩页显示控制按钮；离开这些页面会结束播放并恢复滚动。

## 最容易自己改的地方

在 **Cursor 编辑器窗口** 打开 `src/config/openingIntro.ts`：

```typescript
title: "新的篇章",
leftWord: "保持好奇",
rightWord: "开始创造",
caption: "欢迎来到我的小小世界",
playMs: 3400,
exitMs: 800,
```

把双引号里的文字换成自己的。`3400` 是主体停留约 3.4 秒，`800` 是退出约 0.8 秒。建议先保留时长，只换文字。保存文件后回到浏览器，点击“重播开场”。

画面颜色和动作在 `src/styles/opening-intro.css`：`.intro-banner-top` 是上幅，`.intro-banner-bottom` 是下幅，`.intro-character` 是中间人物，`.words` 是大字。手机布局在文件末尾的 `@media (max-width: 700px)` 中。

在 **Cursor 左侧文件列表** 打开 `public/intro`，可以看到三张已复制的图片，原素材保持完整。以后换图可以保持这三个文件名，也可以修改 `src/config/openingIntro.ts` 的 `images`。图片加载和解码最多等待 3 秒；失败的图片层隐藏，文字和跳过按钮仍能使用。

不想让它出现在现有首页时，只删除 `MainGridLayout.astro` 中新增的导入和组件调用两行，独立试玩页仍然可用。

## 检查与预览说明

`pnpm check`（247 个文件、0 错误/警告）、`pnpm type-check`、2 项播放条件单测，以及带 `/ykin/` 前缀的完整 `pnpm build` 均已通过。

本版已检查电脑、390px 和 320px 手机布局，首次播放、自动结束、重播、跳过、Esc、偏好保存和路由切换，以及图片失败、加载超时和加载中跳过。自动化记录在项目旁的 `rainzt-analysis/silver-wolf-preview/`。

动画在 Svelte 完成客户端加载后开始，慢设备可能短暂看到首页底层；禁用 JavaScript 时页面直接可读。图片加载后播放约 3.4 秒，再用约 0.8 秒退出。本版没有角色选择功能。

当前版本只供本地预览，等你确认视觉效果后再发布到线上。

如果打不开，请把 **Cursor 终端的完整报错** 和 **浏览器现象** 发给我，例如白屏、停在动画、按钮无反应；我再针对实际问题修改。
