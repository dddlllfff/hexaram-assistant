# GitHub 与 Windows 发布

公开仓库：https://github.com/dddlllfff/hexaram-assistant 。源码、贡献模板与 Windows 工作流均已上传。

## 克隆与贡献

克隆仓库后，按 README 安装依赖并开发。其他贡献者可以先 Fork，再提交 Pull Request：

```powershell
git clone https://github.com/dddlllfff/hexaram-assistant.git
cd hexaram-assistant
pnpm install --frozen-lockfile
pnpm dev
```

维护者通过 Git 推送时，需配置自己的 GitHub 身份验证。Chrome 的登录状态不会自动成为 Git 命令的凭据。不要上传 node_modules、release、个人配置或凭据。

## 自动检查

`.github/workflows/ci.yml` 在 Windows 上运行安装、规则校验、界面构建、浏览器流程和 Electron 冒烟测试；截图和失败记录保留为工作流附件。

## 构建安装包

手动触发 `Windows package` 工作流，或推送 `v0.1.0` 这样的版本标签。工作流生成 Windows x64 NSIS 安装包与校验值，作为工作流附件供维护者下载；不会自动发布 GitHub Release。

本地使用 `pnpm dist:win`。输出在 `release/`。打包依赖 Electron 与 NSIS 下载；安装包未签名，正式面向更多玩家分发时应配置 Windows 代码签名并验证干净 Windows 用户环境下的安装/卸载流程。

发布前核对知识库适配状态，确认补丁号、来源许可、目标地区第三方工具要求和必要的产品登记；更新 CHANGELOG。当前代码没有账号体系、自动更新、遥测或游戏接入。
