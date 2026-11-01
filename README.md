# 即时可知 · 听障患者入院关怀

面向聋人、听障和重听患者的入院 / 住院指引。患者可以自己看，护士也可以在入院引导时把屏幕转给患者，用文字和图示一起完成办理。全程不依赖声音，不需要登录。

在线地址：https://liyuanyuangmail.github.io/accessible-hospital-care/

李媛媛的个人简历已从首页移出，保留在 [resume.html](resume.html)。

## 现在能用的页面

| 页面 | 路径 | 内容 |
| --- | --- | --- |
| 首页 | `index.html` | 用途说明，以及「开始入院指引 / 沟通求助 / 住院须知」 |
| 入院指引 | `guide.html` | 挂号 → 分诊 → 检查 → 办理住院 → 病区须知。有进度、上一步、我看懂了、下一步 |
| 沟通求助 | `phrases.html` | 可出示给医护人员的常用语句 |
| 住院须知 | `care.html` | 关爱护理要点：用药、呼叫护士、用餐、探视 |
| 手语指引 | `ai-sign/` | **即将推出**。挂载点 `#ai-sign-language`，当前不接入 AI |
| 简历 | `resume.html` | 原首页上的个人简历 |

## 手语模块（尚未实现）

下一阶段计划在 `/ai-sign/` 的 `#ai-sign-language` 接入 AI 手语讲解。入院每一步预留了 `data-ai-sign-slot`：

`register`（挂号）、`triage`（分诊）、`exam`（检查）、`admit`（办理住院）、`ward`（病区须知）。

钩子：

- 引导页：`window.AccessibleHospitalCare.admissionGuide`
- 手语页：`window.AccessibleHospitalCare.aiSignLanguage`（`status: "coming-soon"`，`mount()` 只返回挂载点）

本原型不加载模型，也不打开摄像头。

## 无障碍

- 中文界面，句子短，关键操作都有文字
- 字号可切换：标准 / 大 / 特大
- 对比度按正文可读来配色，按钮适合手指点按
- 可以只用键盘（Tab / Enter）走完入院步骤
- 不自动播放声音，也不只用颜色表示「已看懂」

## 部署

`main` 分支由 `.github/workflows/pages.yml` 把仓库根目录发布到 GitHub Pages（`path: '.'`）。站点是静态 HTML / CSS / JS，不需要构建。仓库里的 `.nojekyll` 用来避免 Pages 把站点当成 Jekyll 项目处理。

各医院的窗口名称和时间表不同。页面里的时间是常见安排，使用时以本病区公示为准。本站不能代替医生诊断和医院的正式通知。
