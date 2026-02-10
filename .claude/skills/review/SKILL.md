---
name: review
description: Revisão completa das mudanças atuais antes de commit
disable-model-invocation: true
context: fork
agent: code-reviewer
---

Revise todas as mudanças pendentes no repositório.
Use `git diff` para ver mudanças não staged e `git diff --staged` para staged.
Forneça um relatório completo de qualidade.
