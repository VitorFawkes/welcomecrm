---
name: visual-check
description: Verificação visual de UI após mudanças em componentes
disable-model-invocation: false
argument-hint: "[url-ou-pagina]"
---

Verificação visual da UI em $ARGUMENTS:

1. Abra o Chrome em $ARGUMENTS (se não especificado, use localhost:5173)
2. Navegue até a área que foi modificada
3. Tire um screenshot
4. Compare com as regras de docs/DESIGN_SYSTEM.md:
   - Light Mode First está respeitado?
   - Cores semânticas estão corretas?
   - Glassmorphism está consistente?
   - Espaçamentos e tipografia seguem o padrão?
5. Se encontrar problemas visuais, corrija o código e verifique novamente
6. Reporte o resultado ao usuário com o screenshot
