# HiveForge Harness

English | [中文](README.zh.md)

HiveForge Harness (`dsh`) is an open-source agent harness developed by [HiveForge AI](https://hiveforge.com).

It uses an architecture where **everything is a plugin**, and is powered by [Cordis](https://github.com/cordiverse/cordis), whose design is described in [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper).

## Developer preview

HiveForge Harness is currently in _developer preview_ and is iterating rapidly. **THERE WILL BE COMPATIBILITY-BREAKING CHANGES.**

## Run

### Install a release

No Node.js, npm, pnpm, compiler, or Git installation is required.

Windows PowerShell:

```powershell
irm https://github.com/phemik-dev/HiveForge-Build/releases/latest/download/install.ps1 | iex
```

Linux and macOS:

```sh
curl -fsSL https://github.com/phemik-dev/HiveForge-Build/releases/latest/download/install.sh | sh
```

Open a new terminal after installation, then run:

```sh
dsh web
```

The installers select the native artifact for the current platform, verify its SHA-256 checksum, and install it under the current user's profile. The command starts the Web UI at `http://127.0.0.1:3080` by default and opens it in the default browser for a local launch. Pass `--no-open` to run the server without opening a browser. See [Web UI guide](docs/user/guide/index.md).

### Run from source

To run from a repository checkout:

```sh
git clone https://github.com/phemik-dev/HiveForge-Build.git
cd HiveForge-Build
pnpm install
pnpm run build
pnpm dsh web
```

`pnpm run build` prepares the repository artifacts. `pnpm dsh web` uses those built artifacts without rebuilding.

## Community and support

- Feel free to submit feedback or bug reports through [GitHub Discussions](https://github.com/hiveforge-ai/hiveforge-harness/discussions).
- Add the [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic to your plugin repository for discoverability.
- Join <a href="https://discord.gg/Ycq5dCaS4">HiveForge Harness Discord community</a>.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Development

Start with the [development guide](docs/development.md) and [architecture documentation](docs/architecture.md).

For agents, follow [AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE)

Third-party dependencies and their licenses are disclosed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
