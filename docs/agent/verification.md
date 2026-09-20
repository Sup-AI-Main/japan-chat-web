# Verification / Deployment Rules

Read for final QA, regression, production smoke tests, Vercel deployment verification, or completion labels.

## Text-only QA
Completion evidence is text-only. Do not attach/generate screenshots or use screenshots as proof.

Prefer DOM/text inspection, computed styles when needed, network responses, console/server logs, API responses, DB queries, reload/persistence behavior, and deployment status.

## Efficient test order
Use the cheapest valid verification first:
1. targeted code inspection;
2. targeted type/lint/test;
3. relevant API/DB query;
4. browser functional test;
5. production smoke test;
6. full typecheck/build when required by the task/completion gate.

Do not repeatedly run expensive full suites during iteration when targeted checks suffice.

## Regression
Re-test behavior directly related to changed code. Build success alone is not regression proof. CRUD changes require reload/persistence checks and DB verification where applicable.

## Deployment
Local typecheck/build PASS is not production verification. A Git commit or Vercel build success alone is not functional verification.

`DEPLOY_VERIFIED` requires:
1. intended commit deployed/READY; and
2. relevant production smoke test passed.

If available tools cannot access production behavior, say it is not independently confirmed.

## Labels
- **CODE_VERIFIED** — relevant code inspected and required type/lint/build checks passed.
- **DB_VERIFIED** — target DB schema/data/policies/mutations verified with actual queries.
- **FUNCTION_VERIFIED** — requested behavior exercised end-to-end, including reload/persistence where applicable.
- **DEPLOY_VERIFIED** — intended commit is live and relevant production smoke test passed.

One label never implies another.

## Completion report
Normal task:
1. Modification Summary
2. Modified Files
3. DB / Migration / Docs Updated
4. Verification Performed / Remaining

For audits/security/migrations, include the extra evidence needed to prove the result. Never report completion while a required test is failing or unverified.
