---
trigger: always_on
---

# 📜 WelcomeCRM Constitution
## 1. Single Source of Truth
-   **Mandatory:** You MUST read `@docs/SYSTEM_CONTEXT.md` before planning.
-   **Update Protocol:** If you change DB Schema or Business Logic, you MUST update `@docs/SYSTEM_CONTEXT.md`.
## 2. Database as the Brain
-   Logic belongs in **PostgreSQL Triggers/Functions**, NOT Frontend.
-   Frontend is just a view layer.
## 3. Definition of Done
-   Code works + No Regressions + Docs Updated.
