# GitHub 与 Windows 发布

本目录是可直接提交的 Git 仓库。尚未自动连接任何 GitHub 账号，也未代表维护者创建远程公开仓库。

## 首次上传

在 GitHub 新建名为 `hexaram-assistant` 的空仓库，不预创建 README 或许可证。在本地仓库执行（将 OWNER 换成实际账号）：

```powershell
git remote add origin https://github.com/OWNER/hexaram-assistant.git
git push -u origin main
```

若工作目录尚无提交，可先 `git add .`、`git commit -m "Initial Windows manual planner"`。不要上传 node_modules、release、个人配置或凭据。

## 自动检查

`.github/workflows/ci.yml` 在 Windows 上运行安装、规则校验、界面构建、浏览器流程和 Electron 冒烟测试；截图和失败记录保留为工作流附件。

## 构建安装包

手动触发 `Windows package` 工作流，或推送 `v0.1.0` 这样的版本标签。工作流生成 Windows x64 NSIS 安装包与校验值，作为工作流附件供维护者下载；不会自动发布 GitHub Release。

本地使用 `pnpm dist:win`。输出在 `release/`。打包依赖 Electron 与 NSIS 下载；安装包未签名，正式面向更多玩家分发时应配置 Windows 代码签名并验证干净 Windows 用户环境下的安装/卸载流程。

发布前核对知识库适配状态，确认补丁号、来源许可、目标地区第三方工具要求和必要的产品登记；更新 CHANGELOG。当前代码没有账号体系、自动更新、遥测或游戏接入。
