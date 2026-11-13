# Adapt the software workflow

Use a [software pack](PACKS.md) to change the product contract and tests without editing the controller. Give the agent your idea and the pack guide. It prepares requirements, expected API results and browser steps before construction.

The shared runtime currently supports Node HTTP APIs, optional SQLite storage and static browser interfaces. The converter and notes examples use the same worker roles and release gates. Existing issue-tracker missions still work without a pack.

Review and seal each pack before running it. Candidate workers cannot change it. If a requirement or expected result was wrong, preserve the failed run, revise the pack and start a new mission. Do not weaken a test merely to pass a generated app.

A new language, dependency model, external service or deployment target needs a trusted runtime extension. Update the image and isolation policy, add independent checks, run hostile-code probes and qualify the new path. A pack cannot grant those capabilities.

VideoOps, WebOps and publishing workflows remain outside this software-runtime change.
