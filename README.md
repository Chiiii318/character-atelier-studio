# Character Atelier Studio

本项目是一个纯 HTML/CSS/JavaScript 的本地优先角色创作工作台（无构建步骤，无后端）。

## 当前功能
- **角色卡**：创建、编辑、删除、搜索、文件夹分类；导入 JSON、SillyTavern 常见 PNG `chara` 元数据、Mufy XML；导出单张角色卡 JSON（SillyTavern V2 结构）或带 `chara` 元数据的 PNG
- **世界书**：条目管理、关键词触发沙盒测试、智能解析提取；支持导入 JSON（含预设格式）
- **生活切片**：地图、战绩与通告等生活化模拟页面
- **人物关系**、**AI 创作室**、**API 与设置**：目前以界面原型为主
- **完整备份 / 恢复**：一份 JSON 同时包含全部角色卡与世界书

## 使用
直接打开 `index.html`，或将文件上传到 GitHub 仓库根目录，让 Cloudflare Pages 自动部署。

## 数据存储
- 角色卡与世界书保存在当前浏览器的 IndexedDB（库名 `TavernLiteVault`）
- 数据不会自动同步到其他设备；请定期使用「导出备份」。

## 注意
- PNG 元数据兼容覆盖常见 `tEXt` / `iTXt` / `zTXt` 的 `chara`、`ccv3` 形式；部分特殊或非标准 PNG 元数据仍可能无法导入。
- 角色卡的「沉浸式阅读 / 正则美化」会在沙箱 iframe 中运行卡片自带的 HTML/脚本：沙箱不含 `allow-same-origin`，并带有 CSP，脚本无法访问本应用的数据，也不能发起网络请求。依赖 localStorage 或联网的卡片美化可能因此不能完全还原。
- 导入 Mufy XML 时会尝试从 XML 指定的地址拉取头像。
- 不包含任何 API Key，也没有连接 AI 服务。
