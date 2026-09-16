# HiveForge Harness

[English](README.md) | 中文

HiveForge Harness（`dsh`）是由 [HiveForge AI](https://hiveforge.com) 开发的开源 agent harness（智能体框架）。

它采用**一切皆插件**的架构，并由 [Cordis](https://github.com/cordiverse/cordis) 驱动，其设计参见论文 [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper)。

## 开发者预览

HiveForge Harness 目前处于 _开发者预览_ 阶段，正在快速迭代。**未来将出现破坏兼容性的变更。**

<a id="run"></a>

## 运行

### 安装发行版

无需安装 Node.js、npm、pnpm、编译器或 Git。

Windows PowerShell：

```powershell
irm https://github.com/phemik-dev/HiveForge-Build/releases/latest/download/install.ps1 | iex
```

Linux 与 macOS：

```sh
curl -fsSL https://github.com/phemik-dev/HiveForge-Build/releases/latest/download/install.sh | sh
```

安装后打开一个新终端，然后运行：

```sh
hiveforge web
```

`hiveforge` 命令、状态目录以及默认 Web 端口（`3081`）均与现有的 `dsh` 安装隔离。

安装程序会选择当前平台的原生构建、验证 SHA-256 校验和，并安装到当前用户目录。该命令默认会在 `http://127.0.0.1:3081` 启动 Web UI，并在本机启动时用默认浏览器打开页面。传入 `--no-open` 可仅运行服务器而不打开浏览器。详见 [Web UI 指南](docs/user/guide/index.zh.md)。

#### 从 rc2 的 `dsh` 冲突中恢复（macOS/Linux）

`0.1.1-rc.2` 曾短暂安装 HiveForge 自有的 `~/.local/bin/dsh` 符号链接。删除之前，请确认它指向 `~/.local/share/hiveforge` 内部；然后只删除该符号链接，并通过原来的安装方式重新安装 DeepSeek Harness。不要删除 `~/.dsh`，其中可能包含 DeepSeek 的设置或会话。

```sh
readlink ~/.local/bin/dsh
rm ~/.local/bin/dsh
hash -r
```

安装 rc3 会创建 `~/.local/bin/hiveforge`，并且仅在旧符号链接归 HiveForge 所有时自动删除它。

<a id="run-from-source"></a>

### 从源码运行

如需从仓库源码运行：

```sh
git clone https://github.com/phemik-dev/HiveForge-Build.git
cd HiveForge-Build
pnpm install
pnpm run build
pnpm dsh web
```

`pnpm run build` 会准备仓库产物。`pnpm dsh web` 会直接使用这些已构建产物，不会重新构建。

## 社区与支持

- 欢迎通过 [GitHub Discussions](https://github.com/hiveforge-ai/hiveforge-harness/discussions) 提交反馈或 bug 报告。
- 为你的插件仓库添加 [`dsh-plugin`](https://github.com/topics/dsh-plugin) 话题，便于被发现。
- 欢迎加入 HiveForge Harness 企微群：扫码添加企微小助手并填写入群问卷，完成后小助手会邀请你入群。

<table>
  <thead>
    <tr>
      <th align="center">企微小助手</th>
      <th align="center">入群问卷</th>
      <th align="center">微信公众号</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center"><img src="https://cdn.hiveforge.com/harness/readme/community-wecom-assistant.png" alt="HiveForge Harness 企微小助手二维码" width="180" height="180"></td>
      <td align="center"><a href="https://trtgsjkv6r.feishu.cn/share/base/form/shrcnIt5twSVdLGD52KJBckGCgg"><img src="https://cdn.hiveforge.com/harness/readme/community-wecom-survey.png" alt="HiveForge Harness 入群问卷二维码" width="180" height="180"></a></td>
      <td align="center"><img src="https://cdn.hiveforge.com/harness/readme/community-wechat-official-account.png" alt="HiveForge Harness 团队微信公众号二维码" width="180" height="180"></td>
    </tr>
  </tbody>
</table>

## 参与贡献

参见 [CONTRIBUTING.md](CONTRIBUTING.zh.md)。

## 开发

请先阅读[开发指南](docs/development.zh.md)与[架构文档](docs/architecture.zh.md)。

面向 agent：请遵循 [AGENTS.md](AGENTS.md)。

## 许可证

[MIT](LICENSE)

第三方依赖及其许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
