# Trusted factory image

Build with `npm run image:build` against a configured rootless Docker engine. Node and Playwright versions are fixed in the Dockerfile. Dependency downloads occur during this trusted build, before candidate input is mounted. Every lease resolves and records the actual local image ID.

The image contains the trusted initializer, deadline watchdog, syntax checker, bounded HTTP bridge and browser test runners, including the data-only software-pack runner. Candidate server code runs as UID65534, browser verification as UID1000 and trusted control code as root mapped through the rootless daemon. Candidates can write only to tmpfs within the memory limit. Host-backed source staging is beneath a private image-owned parent.

Read [engine setup](../../docs/ENGINE.md), [execution boundary](../WORKCELL.md) and [verification](../../docs/VERIFICATION.md). Never copy a previous operator's UID, socket, DNS address or absolute path into a new machine's configuration.
