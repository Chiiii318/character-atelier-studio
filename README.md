# Character Atelier Studio

本项目是一个纯 HTML/CSS/JavaScript 的本地优先角色卡管理原型。

## 当前功能
- 创建、编辑、删除、搜索角色卡
- 自动保存在当前浏览器的 localStorage
- 导入 JSON 角色卡和 SillyTavern 常见 PNG `chara` 元数据
- 导出单张角色卡 JSON（SillyTavern V2 结构）
- 导出单张带 `chara` 元数据的 PNG
- 导出全部角色的本地备份 JSON

## 使用
直接打开 `index.html`，或将文件上传到 GitHub 仓库根目录，让 Cloudflare Pages 自动部署。

## 注意
- 数据保存在当前浏览器，不会自动同步到其他设备；请定期导出备份。
- PNG 元数据兼容覆盖常见 `tEXt` `chara` 形式；部分特殊压缩/非标准 PNG 元数据仍可能无法导入。
- 不包含任何 API Key，也没有连接 AI 服务。
