# AMPGen Agent Platform - 全栈科研 AI 平台搭建计划

## 项目概述
构建一个面向科研人员的抗菌肽 AI 生成、筛选、评分、候选库管理和结果可视化平台。

## 页面清单（9个页面）
1. **Dashboard 首页** - 统计卡片 + 工作流总览
2. **AMP Generation** - 参数输入 + 任务状态
3. **AMP Filter** - 筛选规则 + 流程图
4. **Candidate Library** - 候选肽库表格 + 搜索/筛选/排序/导出
5. **Peptide Detail** - 单条肽详情 + 理化性质 + 预测结果
6. **Task Center** - 任务中心 + 状态追踪
7. **Server Production Mode** - 服务器模式说明 + 状态卡
8. **Admin** - 管理员登录 + 数据管理
9. **Report Export** - 报告导出页面

## 技术栈
- React + TypeScript + Tailwind CSS + shadcn/ui
- React Router 路由
- SQLite 数据库存储（候选肽、任务记录、用户 Notes）
- 左侧导航栏 + 顶部标题栏 + 模式切换

## 视觉风格
- 浅色科研风格，干净、专业、科技感
- 参考 Tamarind Bio、OpenProtein.AI、DBAASP 等科研平台
- 卡片、表格、流程图、状态徽章
- 默认英文为主，关键提示可加中文

## 科学边界
- 所有预测数据标注 "Demo Data / Computational Prediction"
- 明确标注 "Not experimentally validated"
- 模型运行仅做接口预留和状态展示

## 执行阶段

### Stage 1: 技能加载 + 设计 PRD
- 加载 vibecoding-webapp-swarm 技能
- 编写 design.md 设计文档
- 搭建项目基础架构

### Stage 2: 核心开发
- 数据库层（SQLite schema + CRUD）
- 共享组件（导航栏、布局、状态徽章等）
- 逐页实现 9 个页面

### Stage 3: 构建与部署
- 构建生产版本
- 部署在线预览

## 技能加载
- Stage 1: vibecoding-webapp-swarm
- Stage 3: deploy_website
