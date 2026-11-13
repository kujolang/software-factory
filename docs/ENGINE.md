# Rootless engine setup

The factory requires **rootless Docker**, default seccomp, cgroup memory/PID limits, and a local Unix socket. Podman and remote Docker endpoints are not qualified by this adapter. Do not weaken preflight to make an incompatible engine pass.

## Linux

Install Docker rootless using the [official rootless instructions](https://docs.docker.com/engine/security/rootless/). They cover subordinate UID/GID ranges, uidmap, rootlesskit, systemd user services, cgroup v2 and distribution-specific restrictions. Follow the supported method for your distribution; this repository does not run arbitrary privileged installers on your behalf.

Once the user daemon is installed:

```sh
systemctl --user start docker
cd software-factory
npm run configure -- --docker-host "unix:///run/user/$(id -u)/docker.sock"
npm run image:build
npm run doctor
npm run smoke
```

Enable the user daemon at boot and user lingering only if that matches your machine's policy. Rootless Docker without usable cgroup limits will fail the live Workcell checks. Resolve the host configuration instead of increasing permissions.

## macOS: rootless Docker inside a Colima Linux VM

Install the Docker CLI and Colima through your preferred package manager. A Colima VM normally provides a rootful daemon; a second **user** daemon inside the VM is required. Prefer a dedicated profile for a new installation:

```sh
colima start --profile software-factory --activate=false --cpu 2 --memory 4 --disk 30
colima ssh --profile software-factory
```

Inside the Linux guest, inspect `/etc/os-release`, then follow the same official rootless Docker instructions for that distribution. Install required packages and subordinate UID/GID mappings, configure any required AppArmor user-namespace profile for rootlesskit, and start `systemctl --user start docker`. Do not disable AppArmor globally or replace an existing rootful daemon. Check:

```sh
id -u
systemctl --user is-active docker
```

Exit the guest and connect from the factory checkout:

```sh
npm run engine:connect -- software-factory
npm run image:build
npm run doctor
npm run smoke
```

`engine:connect` discovers the guest UID and SSH alias, forwards its user socket into this checkout, verifies rootless+seccomp, and saves the endpoint. It does not switch the global Docker context, install guest packages, or delete a running endpoint. Re-run after restarting the VM. For an existing configured profile, supply its name instead of `software-factory`.

The original live qualification used an Ubuntu 24.04 Colima guest with a working user daemon. Colima images/distributions vary; creating a profile is not evidence that its rootless daemon is ready. Installing OS-level prerequisites and signing into a provider are the two parts that may require the human's participation.

## Existing trusted engines

```sh
npm run configure -- --docker-context my-rootless-context
# Or:
npm run configure -- --docker-host unix:///absolute/path/docker.sock
```

`DOCKER_HOST` or `DOCKER_CONTEXT` overrides the saved engine. Never set both. To separate public image-build credentials from your ordinary Docker configuration, create a directory with an empty `config.json` and set it with `--docker-config PATH`; the factory does not overwrite your normal configuration.

## Qualification

```sh
npm run doctor
npm run test:isolation
npm run test:controller-death
```

The last command deliberately kills its own test controller, observes the image watchdog stopping the workload, then removes only the test’s own resources. It does not kill unrelated containers. Keep outputs in `.runtime/` and inspect them before calling the engine ready.
