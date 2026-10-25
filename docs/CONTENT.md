# 内容与实测规范

当前静态资料对齐国服 16.21，但 `verifiedGamePatch` 仍为 null，表示尚未逐英雄实战验证。网站调研、来源许可与适配边界见 `SOURCE_RESEARCH.md`。不要仅凭网页更新日期把数据改成已实测。

## 英雄

官方目录由 `scripts/sync-catalog.mjs` 生成到 `content/catalog/champions.json`。在 `content/champions/profiles.ts` 为每位英雄维护基础方向、独立技能优先级、可选替代方向与打法，`archetypes.ts` 提供结构模板，`catalog.ts` 保存英雄专属装备与特殊机制。每位至少一条有效基础方向；只在确有机制条件时增加备选，不为凑数量编造流派。`base` 是人工设定的保底倾向，不是统计强度。

## 强化

强化原始目录由固定版本的 KIWI 配置池生成。编辑规则在 `content/augments/catalog.ts`，公告摘要在 `patch-overrides.ts`。`requires` 是 any-of；`grants` 仅包含实际新增机制，不能把收益标签当作前提能力；`allySupportOnly` 区分对友军的保护与自身回复。`excludes` 和 `conflictsWithTags` 表示已选强化之间的冲突。系统事件技能记录保存在原始目录但不作为普通候选导出。

不确定的数值不应写入；暂译与最终游戏内名称可能不同。原始知识仅摘要机制，避免整段复制第三方攻略。

## 资料依据

- Riot Developer Portal：基础数据与接口规范。
- Riot Support 的 ARAM: Mayhem Game Mode：模式介绍。
- League of Legends Wiki / ARAM: Mayhem/Augments：强化机制参考；英文名保留供核对。
- Data Dragon 16.21.1 / zh_CN / item.json：开发时核对装备中文名与静态地图可用标记，不据此声称当前国服海克斯模式实测可用。

## 验证记录模板

```text
英雄 / 强化 / 装备：
服务器与地区：
游戏补丁号：
实测日期：
前置条件与输入：
操作过程：
预期表现：
实际表现：
证据（去除个人信息）：
结论与仍不确定的地方：
```

提交后执行 `pnpm check`，并复查基础路线、关键强化成型、移除强化和路线锁定四种状态。
