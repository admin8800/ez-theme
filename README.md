# EZ THEME

# V2Board User 前端项目

一个美观、现代的V2Board管理后台前端项目，基于Vue 3开发。

## 特性

-  美观的UI设计，简约高端
-  支持亮色/暗色主题切换
-  内置国际化支持（中文/英文）
-  响应式设计，适配各种设备
-  完善的登录认证系统
-  模块化的代码结构，易于维护

## 项目结构

```
src/
├── api/                # API接口
├── assets/             # 静态资源
│   └── styles/         # 样式文件
│       ├── base/       # 基础样式
│       ├── components/ # 组件样式
│       └── layouts/    # 布局样式
├── components/         # 公共组件
├── composables/        # 组合式API
├── i18n/               # 国际化
│   └── locales/        # 语言包
├── router/             # 路由配置
├── store/              # Vuex存储
├── utils/              # 工具函数
└── views/              # 页面视图
```

## 开始使用

### 安装依赖

```bash
npm install
```

### 开发环境运行

```bash
npm run dev
```

### 生产环境构建

```bash
npm run build
```

## 自定义配置

### 主题配置

主题颜色、API和其他配置可以在 `src/config` 下文件中修改。

## 浏览器支持

- Chrome
- Firefox
- Safari
- Edge
- 其他现代浏览器

