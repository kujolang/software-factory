# Independently reviewed CLI construction

`npm run factory -- cli-mission INPUT.json` constructs a single-file standard-library CLI through native Dispatch. The input freezes a mission, one installed runtime profile and one to four exact argument/stdout/exit cases. No arbitrary build command, package installation or host candidate execution is admitted.

```json
{
  "schema": "kujo.factory.cli-mission-input/v1",
  "profile": "python-cli",
  "mission": "Accept exactly one integer between -1000 and 1000; print its double. Invalid input prints invalid and exits 2. Do not write files or use the network.",
  "cases": [
    {"args": ["7"], "stdout": "14\n", "exitCode": 0},
    {"args": ["-3"], "stdout": "-6\n", "exitCode": 0},
    {"args": ["bad"], "stdout": "invalid\n", "exitCode": 2},
    {"args": [], "stdout": "invalid\n", "exitCode": 2}
  ]
}
```

The controller validates the contract through native Spec. A separate canonical Code Reviewer reviews the cases before Core Developer receives them. A fresh Code Reviewer reviews the resulting source. The trusted runtime executes every frozen case inside Workcell. Release Verifier then reviews the source and actual evidence, followed by a second complete Workcell execution. Only exact reviewed source can receive a local candidate record after native RunLedger finalization. Failures retain CaseFile evidence and cannot produce a successful candidate. Every proposal is tool-free; only the implementation role may supply the profile's single entrypoint. Kujo missions activate pinned language/tool-building skills as guidance, never authority.

Outputs are private under `.runtime/cli-missions/cli-*/`: frozen `input.json`, proposals/receipts, native Spec/Dispatch/accounting evidence, both runtime evaluations, the source under `application/`, and `reviewed-cli.json` when all gates pass. Local review does not authorize a human approval, deployment, publication, or package installation. Fixture-provider runs are explicitly labeled and cannot grant software-release approval.

Supported runtime images and their existing fixture scope are listed in [CLI-RUNTIMES.md](CLI-RUNTIMES.md). Construction qualification is recorded separately in [release qualification](RELEASE-QUALIFICATION.md); an image or a successful deterministic fixture alone is not a model-backed construction claim. This path currently excludes services, frameworks, dependencies, databases, multiple source files, automatic repair/recovery and general-purpose package builds. Finite cases do not prove universal program behavior. The application evidence exporter does not yet certify this distinct CLI candidate schema; keep the complete private mission evidence for review.
