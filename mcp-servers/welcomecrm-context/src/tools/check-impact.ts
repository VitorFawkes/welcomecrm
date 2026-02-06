/**
 * check_impact - Analisa o blast radius de uma modificação
 *
 * Retorna:
 * - Dependências diretas que serão afetadas
 * - Hooks que usam os arquivos
 * - Tabelas envolvidas
 * - Nível de risco
 * - Testes a executar
 */

import type { ImpactResult, ParsedProjectData } from '../types.js'

// Arquivos críticos que aumentam o risco
const CRITICAL_FILES = [
  'KanbanBoard.tsx',
  'CardHeader.tsx',
  'CardDetail.tsx',
  'Pipeline.tsx',
  'Layout.tsx',
  'database.types.ts',
  'supabaseClient.ts'
]

// Mapeamento de arquivos para testes
const FILE_TO_TESTS: Record<string, string[]> = {
  'KanbanBoard': ['npm test -- KanbanBoard', 'npm run test:e2e -- pipeline'],
  'CardHeader': ['npm test -- CardHeader', 'npm test -- CardDetail'],
  'CardDetail': ['npm test -- CardDetail'],
  'Pipeline': ['npm test -- Pipeline', 'npm run test:e2e -- pipeline'],
  'Proposal': ['npm test -- Proposal'],
  'useFieldConfig': ['npm test -- useFieldConfig'],
  'usePipelineStages': ['npm test -- usePipelineStages', 'npm test -- Pipeline'],
}

/**
 * Extrai o nome base de um arquivo
 */
function getBaseName(filePath: string): string {
  const parts = filePath.split('/')
  const fileName = parts[parts.length - 1]
  return fileName.replace(/\.(tsx?|js)$/, '')
}

/**
 * Encontra dependências diretas de um arquivo
 */
function findDirectDependencies(
  filePath: string,
  projectData: ParsedProjectData
): Array<{ file: string; type: 'component' | 'hook' | 'page' | 'util'; reason: string }> {
  const baseName = getBaseName(filePath)
  const dependencies: Array<{ file: string; type: 'component' | 'hook' | 'page' | 'util'; reason: string }> = []

  // Verifica componentes que usam este arquivo
  for (const component of projectData.codebase.components) {
    if (component.usedIn.some(u => u.includes(baseName))) {
      dependencies.push({
        file: component.path,
        type: 'component',
        reason: `Importa ${baseName}`
      })
    }
  }

  // Verifica páginas que podem usar este arquivo
  for (const page of projectData.codebase.pages) {
    const pageName = getBaseName(page.path)
    // Se o arquivo é um componente usado em páginas comuns
    if (baseName.includes('Card') && pageName.includes('Card')) {
      dependencies.push({
        file: page.path,
        type: 'page',
        reason: `Provavelmente usa ${baseName}`
      })
    }
    if (baseName.includes('Pipeline') && pageName.includes('Pipeline')) {
      dependencies.push({
        file: page.path,
        type: 'page',
        reason: `Provavelmente usa ${baseName}`
      })
    }
  }

  // Verifica hooks que podem ser afetados
  for (const hook of projectData.codebase.hooks) {
    if (hook.purpose.toLowerCase().includes(baseName.toLowerCase())) {
      dependencies.push({
        file: `src/hooks/${hook.file}`,
        type: 'hook',
        reason: `Relacionado a ${baseName}`
      })
    }
  }

  return dependencies
}

/**
 * Encontra hooks afetados pela modificação
 */
function findAffectedHooks(
  files: string[],
  projectData: ParsedProjectData
): string[] {
  const affected: string[] = []

  for (const file of files) {
    const baseName = getBaseName(file)

    for (const hook of projectData.codebase.hooks) {
      // Hook que tem nome similar ao arquivo
      if (hook.name.toLowerCase().includes(baseName.toLowerCase().replace('use', ''))) {
        affected.push(hook.name)
      }
      // Hook cujo propósito menciona o arquivo
      if (hook.purpose.toLowerCase().includes(baseName.toLowerCase())) {
        affected.push(hook.name)
      }
    }
  }

  return [...new Set(affected)]
}

/**
 * Encontra tabelas envolvidas
 */
function findInvolvedTables(
  files: string[],
  projectData: ParsedProjectData
): string[] {
  const tables: string[] = []

  for (const file of files) {
    const baseName = getBaseName(file).toLowerCase()

    for (const table of projectData.codebase.tables) {
      const tableName = table.name.toLowerCase()

      // Match por nome similar
      if (baseName.includes(tableName.replace('_', '')) ||
          tableName.includes(baseName.replace('use', ''))) {
        tables.push(table.name)
      }

      // Regras específicas
      if (baseName.includes('card') && ['cards', 'card_creation_rules'].includes(tableName)) {
        tables.push(table.name)
      }
      if (baseName.includes('pipeline') && tableName.includes('pipeline')) {
        tables.push(table.name)
      }
      if (baseName.includes('proposal') && tableName.includes('proposal')) {
        tables.push(table.name)
      }
    }
  }

  return [...new Set(tables)]
}

/**
 * Calcula o nível de risco
 */
function calculateRiskLevel(
  files: string[],
  dependencies: Array<{ file: string }>,
  tables: string[]
): 'low' | 'medium' | 'high' | 'critical' {
  let riskScore = 0

  // Arquivos críticos aumentam muito o risco
  for (const file of files) {
    const baseName = getBaseName(file)
    if (CRITICAL_FILES.some(cf => baseName.includes(cf.replace('.tsx', '')))) {
      riskScore += 3
    }
  }

  // Número de dependências afeta o risco
  riskScore += Math.min(dependencies.length, 5)

  // Tabelas core aumentam o risco
  const coreTables = ['cards', 'contatos', 'profiles', 'pipeline_stages']
  for (const table of tables) {
    if (coreTables.includes(table)) {
      riskScore += 2
    }
  }

  if (riskScore >= 8) return 'critical'
  if (riskScore >= 5) return 'high'
  if (riskScore >= 3) return 'medium'
  return 'low'
}

/**
 * Determina quais testes devem ser executados
 */
function determineTests(files: string[]): string[] {
  const tests: string[] = []

  for (const file of files) {
    const baseName = getBaseName(file)

    // Verifica mapeamento direto
    for (const [pattern, testCommands] of Object.entries(FILE_TO_TESTS)) {
      if (baseName.includes(pattern)) {
        tests.push(...testCommands)
      }
    }
  }

  // Sempre adiciona lint
  tests.push('npm run lint')

  // Se modificou TypeScript, adiciona type check
  if (files.some(f => f.endsWith('.ts') || f.endsWith('.tsx'))) {
    tests.push('npx tsc --noEmit')
  }

  return [...new Set(tests)]
}

/**
 * Gera warnings específicos
 */
function generateWarnings(
  files: string[],
  action: string,
  riskLevel: string
): string[] {
  const warnings: string[] = []

  // Warning por risco alto
  if (riskLevel === 'critical' || riskLevel === 'high') {
    warnings.push('⚠️ RISCO ALTO: Considere fazer backup ou criar branch antes de modificar')
  }

  // Warning por arquivos específicos
  for (const file of files) {
    if (file.includes('database.types.ts')) {
      warnings.push('⚠️ database.types.ts é gerado automaticamente. Use `npx supabase gen types` em vez de editar manualmente')
    }
    if (file.includes('KanbanBoard')) {
      warnings.push('⚠️ KanbanBoard é crítico para o fluxo de cards. Teste drag-and-drop após modificar')
    }
    if (file.includes('CardHeader')) {
      warnings.push('⚠️ CardHeader controla mudança de etapa e owner. Verifique quality gate')
    }
  }

  // Warning por tipo de ação
  if (action === 'delete') {
    warnings.push('⚠️ DELETE: Verifique se não há imports deste arquivo em outros lugares')
  }
  if (action === 'rename') {
    warnings.push('⚠️ RENAME: Atualize todos os imports que referenciam este arquivo')
  }

  return warnings
}

/**
 * Função principal: check_impact
 */
export async function checkImpact(
  input: { files: string[]; action: string; description?: string },
  projectData: ParsedProjectData
): Promise<ImpactResult> {
  const { files, action } = input

  // 1. Encontra dependências diretas
  const allDependencies: Array<{ file: string; type: 'component' | 'hook' | 'page' | 'util'; reason: string }> = []
  for (const file of files) {
    const deps = findDirectDependencies(file, projectData)
    allDependencies.push(...deps)
  }
  const directDependencies = [...new Map(allDependencies.map(d => [d.file, d])).values()]

  // 2. Encontra hooks afetados
  const hooksAffected = findAffectedHooks(files, projectData)

  // 3. Encontra tabelas envolvidas
  const tablesInvolved = findInvolvedTables(files, projectData)

  // 4. Calcula nível de risco
  const riskLevel = calculateRiskLevel(files, directDependencies, tablesInvolved)

  // 5. Determina testes a executar
  const testsToRun = determineTests(files)

  // 6. Gera warnings
  const warnings = generateWarnings(files, action, riskLevel)

  return {
    directDependencies,
    hooksAffected,
    tablesInvolved,
    riskLevel,
    testsToRun,
    warnings
  }
}
