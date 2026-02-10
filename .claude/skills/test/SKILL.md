---
name: test
description: Rodar verificações de qualidade (lint + typecheck + build)
disable-model-invocation: true
---

Rode as verificações de qualidade do projeto:

1. `npm run lint` — verificar estilo de código
2. `npx tsc --noEmit` — verificar tipos TypeScript
3. `npm run build` — verificar que o build compila

Reporte o resultado de cada etapa. Se alguma falhar, mostre os erros e sugira correções.
