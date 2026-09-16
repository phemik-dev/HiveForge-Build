# CLOUD-RUNTIME-001 — Harness-agnostic secure cloud runtime

Status: Draft implementation baseline

## Decision

HiveForge must remain first-class in both local and cloud execution modes. Cloud execution is not implemented by teaching HiveForge about a specific cloud provider. Instead, a generic runtime envelope publishes a replaceable workload through a secure gateway.

The same envelope must be reusable for an independent DeepSeek harness and later external/open-source harnesses.

> Assimilate capability, not dependency.

## Existing fact

The current HiveForge web server already supports two listen addresses:

- `127.0.0.1` — default loopback posture;
- `0.0.0.0` — deliberate all-interface exposure.

However, the web-server subsystem deliberately provides no TLS, authentication, or origin policy. Therefore `0.0.0.0` is suitable only inside a private runtime network unless another boundary supplies those controls.

## Target topology

```text
                     public / shared access
                              |
                              v
                 +-------------------------+
                 | TLS + identity gateway  |
                 | auth / routing / policy |
                 +------------+------------+
                              |
                     private runtime network
                              |
                  +-----------+-----------+
                  | runtime supervisor     |
                  | lifecycle + health     |
                  +-----+-------------+----+
                        |             |
                        v             v
              +---------------+  +------------------+
              | HiveForge     |  | DeepSeek harness |
              | workload      |  | workload         |
              | :3080         |  | :<port>          |
              +---------------+  +------------------+
```

The gateway is public. Workload ports are not.

## Workload contract

The runtime core must understand only the following workload facts:

```ts
export interface CloudWorkloadSpec {
  id: string
  launch:
    | { kind: 'oci-image'; image: string; args?: string[] }
    | { kind: 'command'; command: string; args?: string[] }
  internalPort: number
  environment?: Record<string, string>
  secretRefs?: string[]
  volumes?: Array<{
    name: string
    mountPath: string
    persistent: boolean
  }>
  health?:
    | { kind: 'http'; path: string; expectedStatus?: number }
    | { kind: 'process' }
  readiness?: {
    path: string
    expectedStatus?: number
  }
}
```

The exact implementation may evolve. The architectural constraint may not: the contract must contain deployment facts, not HiveForge concepts.

## Provider adapters

Provider-specific deployment belongs behind a deployment adapter.

```ts
export interface CloudRuntimeProvider {
  deploy(spec: CloudWorkloadSpec): Promise<DeploymentHandle>
  stop(handle: DeploymentHandle): Promise<void>
  start(handle: DeploymentHandle): Promise<void>
  restart(handle: DeploymentHandle): Promise<void>
  remove(handle: DeploymentHandle): Promise<void>
  status(handle: DeploymentHandle): Promise<DeploymentStatus>
  logs(handle: DeploymentHandle, options?: LogOptions): AsyncIterable<string>
}
```

A provider adapter may target a VM/container host first, then Azure Container Apps, Kubernetes, Nomad, Fly.io, or another runtime later. None of those provider names belong in HiveForge core packages.

## HiveForge adapter

The HiveForge workload adapter is intentionally thin:

1. start the existing `dsh web` composition;
2. bind to `0.0.0.0` inside the private workload boundary;
3. publish internal port 3080 to the gateway only;
4. preserve existing local `127.0.0.1` behavior outside cloud mode;
5. supply persistent paths and secret references as deployment configuration rather than hard-coded runtime assumptions.

No public deployment may expose HiveForge's raw port directly.

## DeepSeek adapter

The DeepSeek proof uses the same runtime contract. It may have a different image/command, internal port, persistent paths, and health probe. It may not require a fork of the gateway or runtime supervisor.

This is the portability proof. If the second harness requires special knowledge in the runtime core, the boundary is not generic enough.

## Security floor

A cloud proof is invalid unless it has:

- TLS/HTTPS termination;
- authenticated access;
- private workload networking;
- explicit host/origin policy at the gateway;
- secrets outside source control;
- least-privilege runtime identity;
- request/rate limits appropriate to the deployment;
- no direct public mapping of workload ports.

## Proof sequence

### CR-001A — local parity

Prove current local installation remains unchanged and continues to default to `127.0.0.1`.

### CR-001B — private container proof

Run HiveForge as a workload bound to `0.0.0.0` inside a private container/network namespace. Confirm GUI, API bridge, SSE/WebSocket/upgrade routes, plugin bundles, and long-running responses survive the boundary.

### CR-001C — secure URL proof

Place the gateway in front of the private workload and obtain a TLS URL. From a separate device/browser, authenticate and use HiveForge without RDP and without knowing a localhost port.

### CR-001D — lifecycle/persistence proof

Restart the workload and then recreate it from configuration. Confirm declared persistent state survives and runtime logs expose startup/failure without VM desktop access.

### CR-001E — second-harness proof

Deploy the independent DeepSeek harness through the same runtime core. Only workload configuration/adapter code may differ.

### CR-001F — removal proof

Remove either workload and prove the runtime and remaining workload continue operating. Then deploy a trivial HTTP fixture as a third workload to prove the core is not accidentally coupled to either harness.

## Non-goals for 001

CLOUD-RUNTIME-001 does not attempt to:

- turn HiveForge into a multi-tenant SaaS product;
- replace PLUGIN-SDK-001;
- make every internal service remotely addressable;
- choose a permanent cloud vendor;
- expose the existing port directly to the internet;
- rewrite the current native installer.

## Relationship to PLUGIN-SDK-001

These remain separate seams:

```text
PLUGIN-SDK-001
    capability composition boundary
               |
               v
        [ host / harness ]
               |
               v
CLOUD-RUNTIME-001
       execution + reachability boundary
```

A plugin should not know whether its host is running on a laptop, a VM, or a managed cloud service. A cloud provider should not know the semantic meaning of the plugins loaded into the host.

## Exit condition

CLOUD-RUNTIME-001 is proven when HiveForge and the independent DeepSeek harness can both be deployed through the same generic runtime envelope, each is reachable through a secure authenticated URL, each can be restarted and removed independently, and local HiveForge operation remains first-class.