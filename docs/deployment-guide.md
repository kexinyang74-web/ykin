# YKIN 网站发布说明

## 地址

- 网站：https://kexinyang74-web.github.io/ykin/
- 公开仓库：https://github.com/kexinyang74-web/ykin
- 发布记录：https://github.com/kexinyang74-web/ykin/actions
- 原来的作品集主站保持不变。

## 本地预览

在 Cursor 的终端窗口，进入 Firefly 项目后运行：

```powershell
pnpm dev
```

浏览器打开 http://localhost:4321/ 。本地保存文件后可以预览；不会自动更新线上网站。

## 更新线上网站

确认本地效果后，在项目终端运行：

```powershell
git status
git diff
pnpm check
pnpm type-check
```

确认改动就是这次要发布的内容，然后提交并上传：

```powershell
git add -A
git commit -m "chore: update personal website"
git push
```

上传 main 分支后，GitHub Actions 自动检查、打包和发布。只有 Actions 成功且实际网站更新，才算上线完成。若命令出现错误，将原文发来排查。

## 发布配置

- `src/config/siteConfig.ts`：网站域名是 `https://kexinyang74-web.github.io`。
- `astro.config.mjs`：设置 `GITHUB_PAGES=true` 时使用 `/ykin/` 路径，本地开发仍使用 `/`。
- `.github/workflows/deploy.yml`：Node.js 24、pnpm 11.22.0，执行检查与完整构建，然后发布 `dist`。
- `示例文章备份`：保留在本机，已排除上传。
- 打赏入口保留，模板收款方式关闭；评论系统尚未配置。

## 在本机检查正式版本

```powershell
$env:GITHUB_PAGES = "true"
pnpm build
pnpm preview --port 4322
```

浏览器打开 http://localhost:4322/ykin/ 。关闭预览后，重新开一个终端运行日常开发命令，避免沿用发布专用环境变量。

代码基于 Firefly / Fuwari，保留原项目许可证和来源说明。
