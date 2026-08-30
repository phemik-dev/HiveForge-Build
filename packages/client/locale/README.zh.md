# @hiveforge-ai/dsh-client-locale

[English](README.md) | 中文

locale 插件：LocaleRuntime——`en`／`zh` 偏好以 `locale.preference` 存储在 `$DSH_HOME/settings.yaml` 中；若没有显式 Host 值，每个全新浏览器都使用英文，不受 `navigator.language` 影响。Host 读取在插件激活后执行，因此 settings 服务不可用不会阻塞页面；显式存储的偏好会实时替换英文默认值。已显式存储 `zh` 的现有 profile 会继续使用中文，直到用户在 **Settings → General → Language** 中选择 **English**。settings API 仅限回环请求，因此远程浏览器的选择仅保留在进程内。`locale/change` 仅在切换语言时触发；插件会在激活时以及每次切换时把 `<html lang>` 指向当前 locale（`zh-CN`／`en`）。该服务还拥有 ns×locale 字典注册表（类型化 `register(ns, {zh, en})` 按 `LocaleNamespaceMap` 校验，`bind(ns)`→`TranslateNS<ns>`；查找链 ns → common → en → key），实现 slot 系统的 `LocaleFace`，并经 `ctx.slots.installLocale` 自行安装，支撑框架注入的 `t` 标准席位（`Translate`／`TranslateNS` 是 ui-slots 的类型；请从那里导入——本包的再导出仅为字典所有者提供便利）。该持久化边界由[Host settings 支撑的偏好决策](../../../.agents/notes/implemented/bug-fix/2026-08-06-host-backed-web-preferences.zh.md)拥有。

## 模型体验

无。locale 注册表为浏览器 UI 文案提供服务；这里没有任何内容进入模型请求。

#### KV Cache 影响

无；该包既不组装也不发送提供方请求。

## 已知限制与暂缓事项

- **部分基础组件仍保留内联英文文案**——设置行、侧边栏、问题作答器和模型选择使用 locale seat；不依赖 Cordis 的基础组件使用可由调用方覆盖的英文默认文案。
- **注册表持有的文本只读取一次翻译**——在 slot 渲染路径之外于注册时捕获的文案（例如 command 注册表中的 `/model` 命令描述）在重新注册前保持注册时的语言；slot 渲染的文案随切换实时更新。
