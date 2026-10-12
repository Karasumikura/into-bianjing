# 入画汴京

清明上河图数字长卷互动讲解 App。以张择端版公共领域图像为基础，完成移动端与桌面端的交互展览。

**在线体验：[入画汴京 App](https://karasumikura.github.io/qingming-scroll-app/)**

源码：https://github.com/Karasumikura/qingming-scroll-app

## 本地启动

需要 Node.js 20.19+ 或 22.12+。在此目录运行：

```sh
npm install
npm run dev
```

打开 http://localhost:5173 。当前开发环境已经安装依赖。Windows 可双击 `启动App.cmd`。

手机体验：手机和电脑连接同一 Wi-Fi，打开开发服务器给出的 Network 地址。手机访问受电脑防火墙和网络设置影响。

## 完成的功能

- 展馆首页：高清原画、宋韵配色、金色 Canvas 微粒与指针涟漪、画卷背景缓动、GSAP 入场。
- 长卷漫游：16 段本地高清画卷、拖拽与惯性、双指缩放、鼠标滚轮、键盘方向键、缩略地图定位、五章节镜头转场、全屏。
- 热点讲解：15 个区域观察故事、分类筛选、中文语音朗读、收藏、可分享的故事深链接。
- 主题探索：人物、建筑、商业、交通四条路线、故事搜索、路线进度。
- 汴京寻宝：故事发现记录、四枚成就印章、五题知识问答与最高成绩。
- 自动导览：2 分 30 秒章节巡游、中文讲解、暂停/继续、前后章节、实时进度。
- 我的藏阁：收藏列表、定位到原画、本机持久保存。
- 设置：晨雾/日光/暮色艺术化氛围、环境和弦音、减少动效模式、系统 reduced-motion 支持。
- PWA：生产版本支持添加到手机桌面，服务工作线程成功缓存后可离线浏览。

## 生产构建与检查

```sh
npm run build
npm run preview
npx playwright install chromium
npm test
```

`dist/` 是可部署的静态前端。默认构建预览地址为 http://localhost:4173 。GitHub Pages 使用下面的构建命令，预览时访问 http://localhost:4173/qingming-scroll-app/ 。在支持 PWA 的手机浏览器中，可以通过“安装应用”或“添加到主屏幕”安装；localhost 可用于本机验证。离线功能需要首次在线访问并等待资源缓存完成。

```sh
npm run build -- --base=/qingming-scroll-app/
npm run preview
```

GitHub Pages 从 `gh-pages` 分支根目录发布。该分支包含本命令生成的静态文件，源码保存在 `main` 分支。修改代码后需要重新构建并更新发布分支。

测试覆盖主页资源与运行时错误、热点/缩放/收藏持久化、搜索、问答印章、导览控制、设置、320/390/430px 手机布局和拖拽。

## 技术与资源

Vue 3、Vue Router、Pinia、GSAP、Canvas 2D、Web Audio、Web Speech、Vite。图像资源位于 `public/art/`，日常运行不依赖外部图片或字体请求。中文字体使用设备字体。

图像来源：[Wikimedia Commons — Alongtheriver QingMing.jpg](https://commons.wikimedia.org/wiki/File:Alongtheriver_QingMing.jpg)。公共领域，作者张择端，作品藏于故宫博物院。图像下载后切片和压缩为 WebP。

讲解为基于区域的观察说明；具体人物身份不作确定推断。光影模式为艺术化叠加，原画图像未重绘。语音由设备浏览器提供，是否具备中文声音取决于系统；文字讲解始终可读。分享复制通常需要 localhost 或 HTTPS。

资源再生成：原始图像保存在本机 `assets-source/scroll.jpg`，运行 `node scripts/prepare-art.mjs`。该目录不参与部署。

## 文件位置

- `src/App.vue`：页面与交互逻辑。
- `src/data.js`：章节、热点、路线与问答内容。
- `src/store.js`：探索、收藏、设置与成绩。
- `src/components/InkAtmosphere.vue`：Canvas 氛围层。
- `src/style.css`：桌面、手机与动效样式。
- `public/sw.js`：生产版离线缓存。

## 课堂演示路线

首页进入长卷 → 拖动与缩放 → 点击虹桥热点 → 听讲解与收藏 → 主题探索搜索 → 寻宝问答解锁印章 → 自动导览 → 切换暮色 → 藏阁验证收藏。

交付形态是可安装的移动 Web App（PWA），不是原生 Android APK / iOS 安装包。探索记录与成绩保存在当前浏览器，不使用服务器账号。
