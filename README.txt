Character Atelier Studio 修复版

保留原始玻璃拟态界面及所有导航页面，并新增完整角色卡编辑器：角色描述、性格、场景、开场白、备用开场白、示例对话、系统提示词、作者备注、内嵌世界书常用字段、扩展/正则原始 JSON、完整 JSON 编辑。支持本地浏览器保存、导入角色卡 JSON、导出 JSON/备份。

部署：将 index.html 上传到 GitHub 仓库根目录并覆盖原 index.html，然后在 Cloudflare Pages 等待重新部署。请先备份旧文件。数据保存在浏览器 localStorage；清除浏览器站点数据会删除本地数据。不同正则扩展没有统一格式，因此以 extensions 原始 JSON 保留未知字段；此版本尚未实现 PNG 图片元数据导入/导出，也不承诺覆盖所有第三方扩展。
