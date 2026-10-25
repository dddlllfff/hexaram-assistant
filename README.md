# 海克斯工坊 · HexARAM Assistant

一个面向 **Windows 10/11 x64** 的海克斯大乱斗开源玩法助手。手动选择英雄、记录已选海克斯、比较本轮候选，获得联动的流派、装备与加点方案。所有推荐在本地完成，无需账号、AI 服务或 API Key。

> v0.2.0-beta.1 数据扩展版：173 位英雄、244 个可命名强化、241 条原创编辑路线。国服静态资料已对齐 16.21，本机客户端文件版本核对为 16.21.829.9102；推荐仍待逐英雄实战验证，不能视为国服统计强度榜。详见 [网站调研与版本适配记录](docs/SOURCE_RESEARCH.md)。

## 玩家使用

**[下载 Windows x64 数据扩展测试版](https://github.com/dddlllfff/hexaram-assistant/releases/download/v0.2.0-beta.1/HexARAM-Assistant-0.2.0-beta.1-Windows-x64-Setup.exe)** · [版本说明与 SHA-256 校验文件](https://github.com/dddlllfff/hexaram-assistant/releases/tag/v0.2.0-beta.1)

下载 `HexARAM-Assistant-0.2.0-beta.1-Windows-x64-Setup.exe` 后运行安装向导，无需安装 Node.js。当前包没有 Windows 代码签名，系统可能展示发行者未知提示；请核对来源和随包 SHA256SUMS.txt。此版本标记为 Pre-release，欢迎通过 Issues 反馈。

1. 选择英雄；切换英雄会清空此前的本局强化、候选与装备。
2. 将游戏里的海克斯加入候选区（最多三个），查看各选项的推荐理由。
3. 点击“我选这个”，记录实际选择；本局流派、装备和加点随之更新。
4. 已经选过的强化也可逐个加入候选后确认；误选可以在已选列表移除。
5. 点击装备标记已拥有；设置等级与敌方压力，查看下一件装备和下一点技能。
6. 可以锁定流派，也可以恢复自动规划。导出按钮保存可分享的纯文本方案。

本局输入保存在当前 Windows 用户的应用本地存储中。不会上传对局信息。“开始新一局”保留英雄与偏好，清空其他输入。支持记录最多 8 个强化、6 件装备；这只是工具容量，不表示当前模式的固定选择次数。

## Windows 开发环境

安装 Node.js 24 LTS、pnpm 11.25.0 与 Git。在仓库目录执行：

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` 同时启动界面开发服务器与 Electron 窗口。首次安装会下载 Windows Electron 运行时，需要网络。开发目录路径可包含中文或空格。

```powershell
pnpm check       # 类型检查和推荐规则测试
pnpm build       # 构建离线界面
pnpm start       # 在 Windows Electron 中运行构建结果
pnpm pack:win    # 构建免安装目录 release/win-unpacked
pnpm dist:win    # 构建 Windows x64 安装包
```

浏览器调试与交互测试：

```powershell
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build
node tests/electron-smoke.mjs
```

最后一条在真实 Electron 中验证离线加载、交互与渲染隔离。手动预览也可运行 `pnpm dev:web`。浏览器预览是开发便利功能，发布目标为 Windows 桌面程序。

## 仓库结构

```text
apps/desktop/             React 界面与 Electron 主进程
packages/engine/          可独立测试的推荐引擎、输入校验、技能序列
content/champions/        英雄、流派、出装、技能与成型条件
content/augments/         海克斯机制、适配标签、前提与资料来源
content/metadata.json     知识包版本、来源与验证状态
docs/                    架构、数据贡献、发布说明
scripts/                 桌面开发启动器
tests/                   规则、端到端及 Windows Electron 测试
.github/                 自动检查、打包流程和反馈模板
```

## 推荐逻辑

候选预览与实际已选分离。先检查控制、位移、治疗等触发条件，再用英雄基础路线、已选机制、已有装备与偏好比较流派。普通暴击率不会自行解锁技能暴击。手动锁定的路线不会自动切换。评分只是内部启发式排序，界面不展示虚构胜率。

常规六件路线包含鞋子，卡西奥佩娅单独处理。按当前敌方压力给出条件替换，并检查常见互斥装备组；已有路线外装备会提示投入成本。展示下一件总价与合成组件，不计算实时金币、实际背包合成或伤害。普通技能表假设此前遵循该路线，杰斯单独处理；乌迪尔和厄斐琉斯展示特殊加点说明。

## 当前边界

- 英雄目录全量 173 位，每位至少一个编辑基线。241 条路线有基础建议与精编内容之分，没有逐条国服实战验证。
- 249 条客户端配置记录中排除 5 条系统事件技能记录，展示 244 个可命名强化；210 个机制文本来自客户端，其余使用公告和人工核对摘要。配置池不等于每位英雄当局可刷池。
- 未接入 LCU、Live Client Data、OCR、悬浮侧栏或自动更新。
- 没有读取进程内存、注入、自动选取、自动购买或自动加点。
- 英雄与装备采用原创文字占位设计，未随包分发游戏图标。
- 种子数据与实际国服版本可能存在差异；发布稳定攻略前必须逐项验证。

后续优先事项：逐英雄实测 → 完善交互与可刷条件 → 接入获得授权的模式统计 → 增加可纠正的自动获取。

目录可通过 `pnpm data:sync` 从固定 16.21 来源重建，导入时校验版本与许可，记录来源哈希。OP.GG 提供站外核对入口，不批量搬运其数据。社区组合线索来自 **[Data: arammayhem.com](https://arammayhem.com/data/)**，遵循 CC BY 4.0；其比赛补丁和地区未确认，不纳入推荐评分。

## 社区贡献与发布

参见 [CONTRIBUTING.md](CONTRIBUTING.md)、[数据规范](docs/CONTENT.md)、[架构说明](docs/ARCHITECTURE.md)、[发布说明](docs/RELEASING.md)。问题模板和 PR 模板已提供。CI 在 Windows 上进行类型/规则检查、浏览器交互测试和桌面冒烟测试。

代码采用 MIT 许可。游戏名称、商标和原始游戏资料属于各自权利人，MIT 不授予这些资产的权利。社区组合关联数据遵循 CC BY 4.0，详见 [第三方资料与许可](THIRD_PARTY_NOTICES.md)；链接到的第三方页面仍遵循其自己的条款。

HexARAM Assistant isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

本项目与腾讯无隶属关系。公开推广与任何后续游戏接口功能上线前，应确认 Riot / 目标地区运营方适用的注册、审核和第三方工具要求。
