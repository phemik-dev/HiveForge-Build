# HiveForge Harness

English | [中文](README.zh.md)

HiveForge Harness (`dsh`) is an open-source agent harness developed by [HiveForge AI](https://hiveforge.com).

It uses an architecture where **everything is a plugin**, and is powered by [Cordis](https://github.com/cordiverse/cordis), whose design is described in [_A Programming Paradigm for Spatiotemporal Composability_](https://github.com/cordiverse/paper).

## Developer preview

HiveForge Harness is currently in _developer preview_ and is iterating rapidly. **THERE WILL BE COMPATIBILITY-BREAKING CHANGES.**

## Run

### Install this fork from GitHub

This fork is installable as a command-line bootstrap. Install it globally from a
**pinned commit** (a normal local npm install exposes the executable only through
`node_modules/.bin`):

```sh
npm install --global github:phemik-dev/HiveForge-Build#git-runtime-<version>
dsh web
```

On its first run, `dsh` downloads the immutable, checksum-verified runtime
selected by [`runtime-manifest.json`](runtime-manifest.json) into the user's
local cache. Later runs use that cache. The commit must carry a populated runtime
manifest whose release asset has already been published; an unconfigured source
commit intentionally fails rather than downloading an unverified runtime.

To install it into a project instead:

```sh
npm install github:phemik-dev/HiveForge-Build#git-runtime-<version>
./node_modules/.bin/dsh web
```

The command starts the Web UI at `http://127.0.0.1:3080` by default and opens it in the default browser for a local launch. An SSH launch only prints the host URL because the SSH client or editor owns the local forwarded address. Pass `--no-open` to run the server without opening a browser. See [Web UI guide](docs/user/guide/index.md).

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
