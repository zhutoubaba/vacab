# 🌸 VocabBloom — 移动端初级英语学习助手 (VocabBloom Workspace Manual)

> 一个专为**英语初级学习者**（尤其是手机端用户）量身打造的高颜值、本地优先、功能完备的背单词 Web 应用。项目遵循单页应用 (SPA) 架构，采用现代化纯前端离线技术，配合本地文件系统物理级联写入，打造极致顺滑的背词体验。

---

## 🎯 项目宗旨与教学论背景 (Project Purpose)

对于英语初学阶段的学生或少儿来说，传统背单词软件往往存在以下阻碍：
- **例句晦涩冗长**：充斥着考研或学术级词汇，造成严重的挫败感。
- **英文释义过度复杂**：使用更难的词去解释一个单词，本末倒置。
- **频繁的跨应用跳转**：为了查发音跳转第三方词典，极易被社交媒体或广告分心。
- **弱网离线不可用**：在地铁、飞机或户外无网环境下无法使用。

**VocabBloom** 秉持以下四大宗旨进行底层架构与 UI 研发：
* **手机优先尺寸 (Mobile-First Layout)**：全站布局与元素强制锁定在 `480px` 以内的黄金移动端视口宽度，符合拇指热区理论，采用流畅的大卡片、圆角毛玻璃微动效和高触觉反馈的单手可控式交互。
* **本地化优先 (Offline-First / Local-First)**：以客户端本地存储为中心，摆脱昂贵的云端 API 延迟，在无网或弱网环境下实现秒级加载、数据永不丢失。
* **初学者极简过滤 (Primary Learner Friendly)**：单词例句长度强行限制在 **3 至 12 个单词以内**，自动筛选最核心、高频的单条词义，降低初学阶段认知负荷。
* **浸润式口型发音 (Immersive Contextual Pronunciation)**：首创半屏内嵌 YouGlish 播放抽屉，无需跳出页面即可调用 YouTube 真实视频中以英语为母语的演说者口型与原声音频，提供最具临场感的语境教学。

---

## 💾 数据库架构与 Dexie (IndexedDB) 底层设计

VocabBloom 搭载了高度优化的 `Dexie.js`，它是 HTML5 `IndexedDB` 事务型数据库的亚毫秒级封装器。整个数据流与存储采用结构化多表联查设计，保证在本地存储上万词汇时依然保持流畅。

### 1. 数据库多表 Schema 拓扑图

```
  ┌────────────────────────────────────────────────────────┐
  │                      VocabDatabase                     │
  └───────────────────────────┬────────────────────────────┘
                              │
     ┌────────────────────────┼────────────────────────┐
     ▼                        ▼                        ▼
┌──────────────┐         ┌──────────┐            ┌──────────┐
│   wordSets   │         │  words   │            │ viewLogs │
├──────────────┤         ├──────────┤            ├──────────┤
│ ++id         │ ◄───┐   │ ++id     │ ◄────┐     │ ++id     │
│ name         │     └───│ set_id   │      ├──── │ word_id  │
│ created_at   │         │ word     │      │     │ viewed_at│
└──────────────┘         │ phonetic │      │     └──────────┘
                         │ def_en   │      │
                         │ def_ja   │      │     ┌──────────┐
                         │ sentences│      │     │ testLogs │
                         │created_at│      │     ├──────────┤
                         └──────────┘      │     │ ++id     │
                                           └──── │ word_id  │
                                                 │is_correct│
                                                 │selected  │
                                                 │tested_at │
                                                 └──────────┘
```

### 2. 字段类型及二级索引 (Indexes) 定义

在 `src/db.ts` 中，通过 `this.version(1).stores()` 显式为关键关联字段建立二级哈希索引，确保排序与联表查询在毫秒级内完成：

```typescript
this.version(1).stores({
  wordSets: '++id, name, created_at',
  words: '++id, set_id, word, created_at',
  viewLogs: '++id, word_id, viewed_at',
  testLogs: '++id, word_id, is_correct, tested_at'
});
```

* **`wordSets` 表**：
  * `id`：自增主键 (`number`)。
  * `name`：唯一集合名称 (`string`)，已创建索引，用于在 Sync 时快速检索种子去重。
  * `created_at`：创建时间 (`Date`)。
* **`words` 表**：
  * `id`：自增主键 (`number`)。
  * `set_id`：所属单词集外键 (`number`)，**已创建索引**。通过 `db.words.where('set_id').equals(setId)` 实现毫秒级的单词表单页拉取。
  * `word`：拼写字符串 (`string`)，已建索引，用于词典查询与单词去重。
  * `phonetic`：国际音标符号 (`string`)。
  * `definition_en`：简易英英释义 (`string`)。
  * `definition_ja`：日语释义 (`string`)。
  * `sentences`：极简例句数组 (`string[]`)。
  * `created_at`：入库时间 (`Date`)。
* **`viewLogs` 表**：
  * `word_id`：所看单词外键 (`number`)，已建索引。用于在闪卡翻看时累加 Views 计数。
* **`testLogs` 表**：
  * `word_id`：所测单词外键 (`number`)，已建索引。用于动态计算错误率大盘及 Hardest First 排序。
  * `is_correct`：答题正确性 (`boolean`)。
  * `selected_option`：用户当时选择的混淆干扰项 (`string`)。

### 3. 物理级联删除事务 (Cascade Deletes Transaction)
由于 `IndexedDB` 本身不支持关系型数据库的 `ON DELETE CASCADE` 约束，VocabBloom 在 `SetsView.tsx` 中手动实现了**底层事务性物理级联删除**。在删除某个单词集时，会在一个原子读写事务（Read-Write Transaction）中自动清理所有派生的单词数据以及海量的学习记录日志，彻底杜绝数据库碎片化：

```typescript
await db.transaction('rw', [db.wordSets, db.words, db.viewLogs, db.testLogs], async () => {
  const wordsInSet = await db.words.where('set_id').equals(setId).toArray();
  const wordIds = wordsInSet.map(w => w.id!).filter(id => id !== undefined);

  if (wordIds.length > 0) {
    // 物理清理该词集下所有的卡片翻看日志与测验日志，防止数据悬空
    await db.viewLogs.where('word_id').anyOf(wordIds).delete();
    await db.testLogs.where('word_id').anyOf(wordIds).delete();
    await db.words.where('set_id').equals(setId).delete();
  }
  // 最终安全卸载词集头部
  await db.wordSets.delete(setId);
});
```

---

## ✨ 核心业务组件与架构服务解析 (Core Components & Services)

VocabBloom 核心视图与数据服务采用了高内聚、低耦合的模块化设计，业务逻辑通过自定义 Hooks 与专门的单例服务（Services）层实现解耦，各组件状态流转清晰顺畅：

### 1. 🗂️ 单词集仪表盘与 Sync / Persist 控制流 (`SetsView.tsx`)

`SetsView` 承担了本地数据库与项目 CSV 种子文件的对接枢纽。

#### A. 永久种子数据库同步算法 (Sync Seeds)
为了在不清除 IndexedDB 的前提下无缝同步新的 CSV 种子词库，我们在 `src/db.ts` 中构建了 `syncSeedsToDatabase()` 算法：

```
                       syncSeedsToDatabase()
                                 │
                   读取 src/data/seeds/*.csv 
                                 │
                      是否存在同名 WordSet?
                                 ├── [否] ──> 创建新 WordSet
                                 └── [是] ──> 获取 setId
                                               │
                                     获取本地该 set 下所有 words
                                     建立 lowercase() 去重 Map 索引
                                               │
                                     遍历种子 CSV 的每一行词汇:
                                               │
                             单词拼写是否已在 IndexedDB Map 中存在?
                                 ├── [是] ──> 跳过, 记入 skippedWords (保护手工修改)
                                 └── [否] ──> 解析音标、例句，装填 wordsToAdd
                                               │
                                      db.words.bulkAdd()
                                               │
                                  返回 SyncReport 完成报告
```
在同步结束时，会在页面上弹出一个高度可视化的 **Sync Report Modal**。该模态框不仅直观展现了“新增”与“跳过”的数量，更通过 CSS 玻璃气泡标签云（Tag Cloud）将所有被跳过以“保护用户上手工修改”的单词列表优雅列出，给予用户最安心的透明交互。

#### B. CSV 导出与拖拽导入 (Import / Export)
- **快捷导出 📥**：调用 `csvService.ts`。当用户在 Sets 列表主页点击下载图标时，主页发起异步 Promise，读取 IndexedDB 中该 `set_id` 的所有单词流，使用 `escapeCsv` 转义双引号并添加 UTF-8 BOM，自动触发本地文件下载，完美适配 Excel。
- **拖拽导入 📤**：在详情页底部提供高颜值拖拽区，支持行内字符流 CSV 逐字解析引擎，能完美识别带双引号和逗号包裹的例句字段，防止解析错位。导入后会自动扫描空缺项并在 1.5 秒后唤醒在线补全服务。

---

### 2. 🎴 3D 智能闪卡背单词 (`LearnView.tsx`)

`LearnView` 实现了单词分类记忆、音频朗读以及 YouGlish 原声发音视频嵌入。

#### A. 单词排序规则底层逻辑
利用 `arrayUtils.ts` 中的 `sortVocabulary()` 实现多模态自适应词汇流：
- **随机 (`Random`)**：利用经典的 **Fisher-Yates (Knuth) 洗牌算法** 对词汇流进行原位洗牌。
- **字母顺 (`Alphabetical`)**：使用 `localeCompare()` 对单词字母进行排序。
- **错误率降序 (`Hardest First`)**：读取 `testLogs`，用 `(errors / tests) * 100` 计算错题率，对于从未参与测试的生词，**强行赋予 100% 的最高优先级错误率**。从而实现“生词优先、难词优先、错词反复背诵”的智能自适应循环。

#### B. 慢速美式英语原声朗读 (Text-to-Speech)
全站发音朗读委托给 `speechService.ts`。基于 **Web Speech Synthesis API**，针对初学者进行了发音优化：
- **慢速朗读锁 (`rate = 0.85`)**：将倍速硬性调低至 `0.85`，使音素更加饱满清晰，方便少儿及初学者模仿。
- **美式英语锁 (`lang = 'en-US'`)**：检测并锁定系统声码库中的美式英语发音人，保证标准的发音语系。
- **防止音轨重叠冲突 (Auto-Cancel)**：在播放新发音前自动调用 `window.speechSynthesis.cancel()` 强行打断未完成的旧音轨。

#### C. YouGlish 底栏半屏抽屉 (Bottom Sheet) 的挂载与生命周期管理
为了让用户在应用内无跳出听取真实 YouTube 上地道的原声音频，我们首创了 YouGlish Bottom Sheet 抽屉：
* **动态 SDK 加载**：在用户首次将闪卡翻至背面时，程序会向网页中追加 `<script src="https://youglish.com/public/js/5/widget.js">`，在 `window` 上监听 `onYouglishAPIReady`。
* **DOM 复用与播放控制**：抽屉拉起时，利用 ID 为 `yg-widget` 的占位符动态调用 `YG.Widget` 初始化播放器。每当用户滑动闪卡或关闭抽屉，程序会显式释放 widget 实例并调用 `window.speechSynthesis.cancel()`，防止内存泄漏和背景视频音轨溢出。

---

### 3. 📝 智能双模态测验引擎 (`TestView.tsx` & `useQuiz.ts`)

为了给初级英语学习者提供从“辨析（多选）”到“拼写（产出）”的完整学习闭环，测验模块基于 React 状态流解耦架构设计，统一使用自定义 Hook `useQuiz.ts` 驱动。

#### A. 多选辨析模式与三级干扰项抓取算法
4选1 日文释义选择题核心在于“干扰项（Distractors）”的生成质量。为了杜绝低关联性的无意义选项，系统构建了**三级兜底抓取算法**：

```
                            [开始生成 4选1 选项]
                                     │
                             获取当前正确单词:
                            activeWord.definition_ja
                                     │
                    【第一级：本单词集提取 (Same Set Words)】
                    从当前 set_id 下的其他 words 中随机抽取 
                     排除正确答案, 建立去重 Unique 数组
                                     │
                             是否抓取满 3 个干扰项?
                                 ├── [是] ──> [第四步: 合并打乱 options]
                                 └── [否] ──> 进入第二级
                                               │
                    【第二级：外单词集提取 (Other Sets Words)】
                    拉取本地数据库中其他所有 set_id 下的 words
                     排除正确答案与已选干扰项, 随机补齐
                                               │
                             是否抓取满 3 个干扰项?
                                 ├── [是] ──> [第四步: 合并打乱 options]
                                 └── [否] ──> 进入第三级
                                               │
                    【第三级：硬编码词库兜底 (Fallback distractor bank)】
                    从内置的 20 余个极简初学者单词库 (FALLBACK_DISTRACTORS)
                     中排除当前正确词义, 强行补齐至 3 个干扰项
                                               │
                                               ▼
                    【第四步：合并与乱序 (Assemble & Shuffle)】
                    干扰项与正确选项合并, 再次采用 Fisher-Yates 
                    洗牌算法打乱 4 个选项的排布顺序 (避免正确答案位置固定)
```

- **高灵敏物理震动反馈**：用户选择干扰项时（即答错），触发网页标准的 `navigator.vibrate(100)` API 进行手机端 `100` 毫秒微震动反馈，强化纠错体感。

#### B. 听音拼写模式 (Spelling Test Mode) 与移动端软键盘防遮挡优化
拼写测试专为手机端用户设计，解决了常规移动端 Web 应用在唤起软键盘时“视口被压缩、关键元素（题目、输入框、按钮）发生遮挡或折叠”的行业痛点。

* **极致移动空间优化 (Keyboard-Active Tracking)**：
  在主入口 `App.tsx` 中注册全局 `focusin`/`focusout` 监听器，动态侦测输入框聚焦。当用户聚焦拼写框时，`<body>` 节点被注入 `.keyboard-active` 类名，**自动隐藏悬浮底部导航栏 (`bottom-nav`)**。由此释放出额外 `60px` 的纵向黄金操作空间，完美规避软键盘遮挡。
* **高颜值字母槽网格 (Interactive Slots Grid)**：
  根据目标单词长度，程序化生成一组高对比度玻璃卡片字母槽。每个槽位实时感知用户的输入：
  - **活动槽位脉冲 (`spelling-cursor`)**：光标所在槽位带有脉冲发光边框，引导用户单手盲打。
  - **半透明字框填充**：未聚焦时提示“Tap boxes to type spelling”，轻触卡片即可一键唤出软键盘。
* **无物理缩放透明交互层 (Overlay Input)**：
  将真实的 `<input>` 元素设置 `opacity: 0` 且 `z-index: 10` 绝对定位，完全覆盖于字母槽之上。既能触发原生软键盘，又确保视口不会因为输入框的物理对齐而发生错杂抖动或自动放大。
* **即时字符数触发检测 (Auto-Submit)**：
  在 `handleSpellingChange` 中实时规范化过滤英文字符，当有效字符长度与目标单词完全吻合时，**零延迟自动触发提交比对**，省去手机端点按“确认提交”按钮的繁琐步骤。

---

### 4. 📊 数据大盘与大树成长勋章 (`DashboardView.tsx`)

学习统计视图实现了背词大盘的统计与排序。委托给独立的 `statsService.ts` 做批量缓存计算。
* **O(1) 并行单批次聚合**：通过单次批量加载 `viewLogs` 与 `testLogs` 并建立内存 Hash Maps 计算相关字段，将原本 O(N) 的数据库查询降低到 O(1) 的纯内存闪算，表格字段支持快速双向 Reactive 排序。
* **掌握度勋章评定公式**：
  * **🌱 新人幼苗 (`Seedling / New`)**：测试次数为 0，或者虽然参加过测试但历史错误率超过 50%。
  * **🌿 成长新芽 (`Sprout / Growing`)**：参与过测试，错误率控制在 20% 到 50% 之间。
  * **🌳 参天大树 (`Tree / Mastered`)**：**通过测试次数必须大于或等于 3 次，且历史累计错误率必须严格小于 20%**。这套严格的限制公式确保只有被反复考查并确实牢记的词汇才被评定为“大树（完全掌握）”，避免用户盲目自满。

---

## 🔌 双服务器本地 CSV 持久化 Middleware 架构

为了在纯前端的 Web SPA 中打通“网页修改、反向写回本地 seeds 源文件”的最后一公里，VocabBloom 在 `vite.config.ts` 中注册了自定义的 **Save CSV Middleware**。

### 1. 软件开发与预览阶段的架构流程

```
  ┌──────────────────────────┐                  ┌──────────────────────────┐
  │  SetsView.tsx (Browser)  │                  │  vite.config.ts (Node)   │
  └────────────┬─────────────┘                  └────────────┬─────────────┘
               │                                             │
       一键点击 "Save to Seed 💾"                            │
       编译当前词集为 CSV 字符串                             │
               │                                             │
       POST to `/api/save-seed` ────────────────────────────>│
                                                            │ 解析 JSON Body:
                                                            │ { setName, csvContent }
                                                            │
                                                            │ path.basename(setName)
                                                            │ 进行文件名去沙箱穿透过滤
                                                            │
                                                            │ fs.writeFileSync
                                                            │ 回写并覆写对应种子文件
                                                            │
                                <─── res.end({ success: true }) 
               │
     Pop-up 成功状态气泡
```

### 2. 双重配置以保障 100% 运行 parity
普通的 Vite 插件中间件如果只写在 `configureServer` 中，一旦执行 `npm run build` 生成打包文件并在 production preview 服务器中运行，写入功能将失效。
为了让 `npm run dev`（Vite 调试）与 `run-server.bat`（Vite 生产预览）在本地运行时拥有**完全相同的回写能力**，我们在 `vite.config.ts` 中针对两个服务均进行了中间件钩子挂载：

```typescript
const saveCsvMiddleware = {
  name: 'save-csv-middleware',
  // A. 开发模式服务器中间件 (configureServer)
  configureServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      handleSaveSeedRequest(req, res, next);
    });
  },
  // B. 生产打包预览模式服务器中间件 (configurePreviewServer)
  configurePreviewServer(server: any) {
    server.middlewares.use((req: any, res: any, next: any) => {
      handleSaveSeedRequest(req, res, next);
    });
  }
};
```

* **文件名注入攻击防御**：在解析客户端回传的 `setName` 时，Node.js 后端会使用 `path.basename(setName) + '.csv'` 进行过滤，确保无论setName中带有任何 `../` 相对路径，都只能在 `src/data/seeds/` 目录下创建或覆写文件，彻底堵死任意目录遍历读写的安全漏洞。

---

## 🌐 外部与本地 API 调用网络流 (API Call Architecture)

为了实现词汇的智能在线检索、多语种翻译和本地词库反向物理写回，VocabBloom 包含以下三大核心 API 调用接口：

### 1. DictionaryAPI 英文释义与音标检索 (DictionaryAPI)
* **调用函数**：`fetchDictionaryData(word)` (定义在 [syncService.ts](file:///z:/node/vacab/src/syncService.ts))
* **目标 URL**：`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
* **协议与请求**：`GET`
* **业务功能**：查询指定单词的国际音标、英文释义和原生例句。
* **教学过滤规则**：抓取到的例句会通过行内正则与分词检测，强行过滤出长度在 **3 至 12 个单词以内** 的极简例句，确保初学者学习体感。

### 2. MyMemory 机器翻译 API (MyMemory Translation)
* **调用函数**：`fetchJapaneseTranslation(text)` (定义 in [syncService.ts](file:///z:/node/vacab/src/syncService.ts))
* **目标 URL**：`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ja`
* **协议与请求**：`GET`
* **业务功能**：将查询的英文单词或例句一键级联翻译为日本语，并自动运行 `cleanText()` 引擎清除第三方服务中可能裹挟的 HTML 碎片。

### 3. 本地种子库物理回写 API (Local Seed Persistence)
* **调用函数**：`handleSaveToSeed()` (定义 in [SetsView.tsx](file:///z:/node/vacab/src/components/SetsView.tsx))
* **目标 URL**：`/api/save-seed`
* **协议与请求**：`POST` (JSON 负载，包含 `setName` 与 `csvContent`)
* **业务功能**：网页端对词库的修改（新增单词、修正音标释义）一键反向物理写回 `src/data/seeds/[setName].csv` 源文件。
* **安全穿透防护**：接收端配合 Vite 中间件，执行 `path.basename()` 去沙箱防注入过滤，拒绝任意目录遍历漏洞。

---

## 🎨 极简 HSL 色彩与 Glassmorphism 样式系统

全站的页面布局、卡片视效、亮/暗切换全部由纯手写的原生 [index.css](file:///z:/node/vacab/src/index.css) 样式系统所控制，未引入任何重型 CSS 框架。

### 1. 核心亮暗色 HSL 变量定义表

样式底层高度依赖 HTML 根节点属性驱动，利用 HSL 色彩比例变量，只需动态替换色相（Hue）、饱和度（Saturation）和亮度（Lightness）即可在两套色温之间极速平滑过渡：

| CSS 变量名 | 亮色模式 (Bright Theme / 奶茶蜜桃) | 暗色模式 (Dark Theme / 极客薄荷) |
| :--- | :--- | :--- |
| `--bg-app` | `hsl(28, 40%, 97%)` (暖米白色) | `hsl(222, 25%, 10%)` (深石板灰) |
| `--bg-card` | `hsla(30, 30%, 100%, 0.7)` (透明纯白) | `hsla(222, 20%, 18%, 0.65)` (半透深灰) |
| `--color-primary` | `hsl(14, 85%, 63%)` (活力蜜桃色) | `hsl(158, 64%, 52%)` (科技薄荷绿) |
| `--color-secondary` | `hsl(280, 55%, 65%)` (浪漫香芋紫) | `hsl(250, 80%, 75%)` (神秘太空紫) |
| `--text-primary` | `hsl(20, 20%, 20%)` (深炭黑) | `hsl(210, 20%, 95%)` (浅白) |
| `--border-glass` | `rgba(255, 255, 255, 0.45)` | `rgba(255, 255, 255, 0.08)` |

### 2. Glassmorphism 毛玻璃卡片配方
为了创造极致 premium 的拟物玻璃质感，全站的 `.glass` 类采用了如下的组合 CSS 属性定义：
```css
.glass {
  background: var(--bg-card);
  border: 1px solid var(--border-glass);
  /* 使用硬件加速的视口背景模糊滤镜 */
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  border-radius: 20px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);
}
```

---

## 🚀 本地开发与服务器部署

### 1. 安装项目所有开发依赖
请确保在开始之前，您的计算机上已经安装了 Node.js (推荐 v18+)。
```bash
# 1. 强力清除 TypeScript 的 stale 缓存编译痕迹 (在更换或重构文件后推荐运行)
npx tsc -b --clean

# 2. 安装本地运行所需的全部 node_modules 依赖包
npm install
```

### 2. 调试与本地打包预览 (Parity Parity)
VocabBloom 支持两种极其流畅的本地启动方式：

- **开发调试服务器 (Hot Reloading)**：
  ```bash
  npm run dev
  ```
  在本地启动 Vite HMR 服务器，默认运行在 `http://localhost:4173/`。在此模式下，任何在浏览器中对词库的修改点击 "Save to Seed 💾" 均会即时物理写回 `src/data/seeds/` 目录。
  
- **生产打包预览服务器 (Recommended for testing Bat Server)**：
  为了测试代码的生产包执行性能和部署能力，可以直接运行我们为您封装的单击构建及运行批处理脚本：
  ```powershell
  # 在根目录下双击运行 run-server.bat，或者在命令行输入：
  ./run-server.bat
  ```
  该批处理会依次执行：
  1. 检索并强行 taskkill 终止当前正在占用 `4173` 端口的所有残留进程。
  2. 调用 TypeScript 编译器检查全站代码并启动 `vite build` 触发 Rolldown 高阶Tree-Shaking编译。
  3. 执行 `npm run preview` 启动生产打包环境。同样完美激活了 API csv 后端覆写机制，支持 4173 端口下的 seeds 数据回写！

---

## 📁 核心目录结构与全栈源码架构 (Directory Layout)

```
vacab/
├── src/
│   ├── components/
│   │   ├── SetsView.tsx       # 单词集管理面板。集成 Sync Seeds 种子合并/去重及 completion highlights 报告单、Save to Seed 本地回写、dashboard CSV 快速导出
│   │   ├── LearnView.tsx      # 3D卡片翻卡。慢速发音 (1x Web Speech TTS)、YouGlish 嵌套播放生命周期控制及底栏抽屉
│   │   ├── TestView.tsx       # 智能测验面板。集成「四选一选择题」与「听音拼写」双模态挑战，搭载字母槽动态渲染、软键盘空间自动规避与手势对齐优化
│   │   └── DashboardView.tsx  # 看板统计。Views/Quizzes 实时双向字段排序，自适应 Seedling/Sprout/Tree 大树成长等级徽章公式
│   ├── hooks/
│   │   └── useQuiz.ts         # 核心测验状态机 Hook。统一驱动测验加载、分词、自动拼写校验、三级干扰项批量拉取、IndexedDB 测验历史落盘
│   ├── services/
│   │   ├── statsService.ts    # 学习统计计算服务。采用 O(1) 单批次并行聚合查询 join 减少数据库 I/O，产出 Views/Quizzes/ErrorRate/DaysActive
│   │   ├── speechService.ts   # Web Speech API 朗读驱动服务。实现慢速朗读锁（0.85倍速）、音域硬锁定与并发冲突自动取消
│   │   └── csvService.ts      # RFC-4180 标准 CSV 编解码与纯前端文件 Blob 下载（自动带入 UTF-8 BOM 解决 Excel 乱码）
│   ├── utils/
│   │   └── arrayUtils.ts      # 纯函数数组工具集。包含 Fisher-Yates 经典随机洗牌与字母序/错误率排序策略
│   ├── data/
│   │   └── seeds/             # 预置种子库 CSV 文件夹 (Essential Travel Words, Lv5, Primary Basics 101 等)
│   ├── csvUtils.ts            # 通用 CSV RFC-4180 编解码解析核心，完美防空行与多句逗号偏离
│   ├── syncService.ts         # 在线智能补全元数据服务。DictionaryAPI 英英释义/初级短句过滤，MyMemory 级联翻译链
│   ├── db.ts                  # Dexie.js (IndexedDB) 数据库结构定义与 Seeder 数据源，集成 syncSeedsToDatabase 合并业务逻辑
│   ├── App.tsx                # React SPA 主中枢。挂载 Dexie 初始化 Seeder、亮暗 HSL 主题滑动记忆持久化、 TabType 单向状态分流调度
│   ├── index.css              # 纯手写 HSL 全局样式表。Light & Dark 双视觉色彩体系、Glassmorphism 高阶滤镜、卡片 3D hover 缩放动画
│   └── main.tsx               # 全站主入口文件
├── public/
│   └── favicon.svg            # 蜜桃蜜橘图标 Logo
├── vite.config.ts             # Vite 配置。集成 saveCsvMiddleware 双端点注册 (configureServer / configurePreviewServer)、 SMB/Z: 盘构建保护
├── run-server.bat             # 生产级一键编译部署批处理脚本。防端口占用查杀、Vite 打包、生产 Preview 挂载
├── package.json               # 本地全栈开发依赖定义包
└── tsconfig.app.json          # TypeScript 前端编译配置文件
```
