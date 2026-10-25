# 第三方资料与数据许可

## Riot Games / 腾讯游戏资料

英雄名称、技能、装备、强化名称与机制来自腾讯官方 CDN、Riot Data Dragon，以及 CommunityDragon 对游戏客户端静态资料的提取。相关游戏知识产权属于 Riot Games 及相应权利人，不因本仓库的 MIT 代码许可证获得转授权。

项目没有打包第三方网站页面、游戏音频、皮肤图或付费素材。客户端机制文本已去除标记与动态数值变量，部分强化采用简短原创摘要；来源保存在导入清单和对应条目中。

v0.3 自动识别随包包含 244 个强化小图标模板，来自 [CommunityDragon 16.21 游戏静态资源](https://raw.communitydragon.org/16.21/plugins/rcp-be-lol-game-data/global/default/)。构建生成的 `resources/recognition/icons.json` 记录每个原始地址与 SHA-256。它们用于识别，不属于 MIT 代码授权范围；游戏资产仍属于 Riot Games 及相关权利人。

## 离线 OCR

[Tesseract.js](https://github.com/naptha/tesseract.js)、[Tesseract.js-core](https://github.com/naptha/tesseract.js-core) 与 [Tesseract 语言模型](https://github.com/naptha/tessdata) 使用 Apache-2.0 许可证。中英文模型由 `@tesseract.js-data/chi_sim`、`@tesseract.js-data/eng` 包提供；模型与运行库随安装包分发，无需调用云服务。原始包中的 LICENSE / NOTICE 随依赖保留，另在识别资源目录提供许可证副本。

## 社区组合关联数据

**[Data: arammayhem.com](https://arammayhem.com/data/)** — [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/)。

`content/catalog/combos.json` 改编自该网站公开 JSON 下载：仅保留英雄 ID、英文强化名称与原始组合 URL，移除了其他字段。界面显示中文名称是本项目用客户端目录匹配的结果。原始统计补丁与地区未确认；组合线索不计入推荐评分，不代表国服当前版本的胜率或强度。

这部分数据遵循 CC BY 4.0，而不是仓库代码的 MIT 许可证。再分发时保留署名、来源链接、许可链接与改动说明。

## 第三方攻略站

OP.GG、LoLalytics 等链接用于玩家自行核对对应模式的攻略。未批量抓取、打包或再分发其统计数据、排序与攻略文字。链接到的页面遵循各自使用条款。
