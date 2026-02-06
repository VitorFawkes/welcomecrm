/**
 * get_dependencies - Retorna mapa de dependências de uma entidade
 *
 * Mostra quem usa uma tabela, hook, componente ou página
 */

import type { DependencyResult, ParsedProjectData } from '../types.js'

// Mapeamento manual de dependências conhecidas (seção 11 do CODEBASE.md)
const KNOWN_DEPENDENCIES: Record<string, {
  hooks: string[]
  pages: string[]
  components: string[]
}> = {
  // Tabelas Core
  'cards': {
    hooks: ['usePipelineCards', 'useCardContacts', 'useTrips', 'useSubCards', 'useDeleteCard', 'useArchiveCard'],
    pages: ['Pipeline', 'CardDetail', 'Dashboard', 'Cards'],
    components: ['KanbanBoard', 'KanbanCard', 'CardHeader']
  },
  'contatos': {
    hooks: ['useContacts', 'useCardPeople', 'useCardContacts'],
    pages: ['People', 'CardDetail'],
    components: ['ContactSelector', 'PeopleSection']
  },
  'profiles': {
    hooks: ['useUsers', 'useTeams', 'useRoles'],
    pages: ['UserManagement', 'CardDetail'],
    components: ['UserSelector', 'OwnerSelector']
  },
  'pipeline_stages': {
    hooks: ['usePipelineStages', 'useQualityGate', 'useAllowedStages', 'useStageRequirements'],
    pages: ['Pipeline', 'PipelineStudio', 'CardDetail'],
    components: ['KanbanBoard', 'CardHeader', 'CreateCardModal', 'StageSelector']
  },
  'pipeline_phases': {
    hooks: ['usePipelinePhases'],
    pages: ['Pipeline', 'PipelineStudio'],
    components: ['CardHeader', 'TripInformation']
  },
  'proposals': {
    hooks: ['useProposals', 'useProposal', 'useProposalBuilder'],
    pages: ['ProposalBuilderV4', 'CardDetail', 'ProposalsPage'],
    components: ['ProposalSection', 'ProposalCard']
  },
  'tarefas': {
    hooks: ['useTasks', 'useCardTasks'],
    pages: ['Tasks', 'CardDetail'],
    components: ['TaskList', 'TaskItem']
  },
  'system_fields': {
    hooks: ['useFieldConfig', 'useStageRequiredFields'],
    pages: ['CardDetail', 'PipelineStudio'],
    components: ['DynamicSection', 'DynamicField']
  },
  'stage_field_config': {
    hooks: ['useFieldConfig', 'useStageRequirements'],
    pages: ['CardDetail', 'PipelineStudio'],
    components: ['StageRequirements', 'DynamicSection']
  },

  // Views críticas
  'view_cards_acoes': {
    hooks: ['usePipelineCards'],
    pages: ['Pipeline'],
    components: ['KanbanBoard']
  },
  'view_contacts_full': {
    hooks: ['useContacts'],
    pages: ['People'],
    components: ['PeopleTable']
  },
  'view_card_360': {
    hooks: ['useCard360'],
    pages: ['CardDetail'],
    components: []
  },

  // Hooks importantes
  'useFieldConfig': {
    hooks: [],
    pages: ['CardDetail'],
    components: ['DynamicSection', 'TripInformation', 'ObservacoesEstruturadas']
  },
  'usePipelineStages': {
    hooks: ['useQualityGate'],
    pages: ['Pipeline', 'CardDetail'],
    components: ['KanbanBoard', 'CardHeader', 'StageSelector']
  },
  'usePipelinePhases': {
    hooks: [],
    pages: ['Pipeline', 'CardDetail'],
    components: ['CardHeader', 'TripInformation']
  },
  'useQualityGate': {
    hooks: [],
    pages: ['CardDetail'],
    components: ['CardHeader', 'KanbanBoard']
  },

  // Componentes críticos
  'KanbanBoard': {
    hooks: ['usePipelineCards', 'usePipelineStages'],
    pages: ['Pipeline'],
    components: ['KanbanColumn', 'KanbanCard']
  },
  'CardHeader': {
    hooks: ['usePipelineStages', 'usePipelinePhases', 'useQualityGate'],
    pages: ['CardDetail'],
    components: ['StageSelector', 'OwnerSelector']
  },
  'TripInformation': {
    hooks: ['useFieldConfig', 'usePipelinePhases'],
    pages: ['CardDetail'],
    components: ['ObservacoesEstruturadas', 'DynamicField']
  },
  'CreateCardModal': {
    hooks: ['useAllowedStages', 'useCardCreationRules'],
    pages: ['Pipeline', 'Dashboard'],
    components: []
  }
}

// Níveis de risco por entidade
const RISK_LEVELS: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
  // Tabelas core = crítico
  'cards': 'critical',
  'contatos': 'critical',
  'profiles': 'critical',
  'pipeline_stages': 'critical',

  // Views = alto
  'view_cards_acoes': 'high',
  'view_contacts_full': 'high',
  'view_card_360': 'high',

  // Componentes core = alto
  'KanbanBoard': 'high',
  'CardHeader': 'high',
  'CardDetail': 'high',

  // Hooks core = médio-alto
  'usePipelineCards': 'high',
  'useFieldConfig': 'medium',
  'usePipelineStages': 'medium',
}

/**
 * Busca dependências de uma entidade no mapa conhecido
 */
function findKnownDependencies(entity: string): {
  hooks: string[]
  pages: string[]
  components: string[]
} | null {
  // Busca exata
  if (KNOWN_DEPENDENCIES[entity]) {
    return KNOWN_DEPENDENCIES[entity]
  }

  // Busca case-insensitive
  const entityLower = entity.toLowerCase()
  for (const [key, value] of Object.entries(KNOWN_DEPENDENCIES)) {
    if (key.toLowerCase() === entityLower) {
      return value
    }
  }

  return null
}

/**
 * Infere dependências baseado no tipo e nome
 */
function inferDependencies(
  entity: string,
  entityType: string,
  projectData: ParsedProjectData
): {
  hooks: string[]
  pages: string[]
  components: string[]
} {
  const result = {
    hooks: [] as string[],
    pages: [] as string[],
    components: [] as string[]
  }

  const entityLower = entity.toLowerCase()

  // Busca em hooks
  for (const hook of projectData.codebase.hooks) {
    if (hook.purpose.toLowerCase().includes(entityLower) ||
        hook.name.toLowerCase().includes(entityLower.replace('_', ''))) {
      result.hooks.push(hook.name)
    }
  }

  // Busca em páginas
  for (const page of projectData.codebase.pages) {
    if (page.description.toLowerCase().includes(entityLower) ||
        page.name.toLowerCase().includes(entityLower)) {
      result.pages.push(page.name)
    }
  }

  // Busca em componentes
  for (const component of projectData.codebase.components) {
    if (component.name.toLowerCase().includes(entityLower) ||
        component.usedIn.some(u => u.toLowerCase().includes(entityLower))) {
      result.components.push(component.name)
    }
  }

  return result
}

/**
 * Determina o nível de risco
 */
function determineRiskLevel(
  entity: string,
  usedByHooks: string[],
  usedByPages: string[],
  usedByComponents: string[]
): 'low' | 'medium' | 'high' | 'critical' {
  // Verifica se tem risco conhecido
  if (RISK_LEVELS[entity]) {
    return RISK_LEVELS[entity]
  }

  // Calcula baseado em uso
  const totalUsage = usedByHooks.length + usedByPages.length + usedByComponents.length

  if (totalUsage >= 10) return 'critical'
  if (totalUsage >= 6) return 'high'
  if (totalUsage >= 3) return 'medium'
  return 'low'
}

/**
 * Gera explicação do risco
 */
function generateRiskExplanation(
  entity: string,
  entityType: string,
  riskLevel: string,
  usedByHooks: string[],
  usedByPages: string[],
  usedByComponents: string[]
): string {
  const parts: string[] = []

  if (riskLevel === 'critical') {
    parts.push(`${entity} é uma entidade CRÍTICA do sistema.`)
  } else if (riskLevel === 'high') {
    parts.push(`${entity} tem alto impacto no sistema.`)
  }

  if (usedByHooks.length > 0) {
    parts.push(`Usado por ${usedByHooks.length} hooks: ${usedByHooks.slice(0, 3).join(', ')}${usedByHooks.length > 3 ? '...' : ''}.`)
  }

  if (usedByPages.length > 0) {
    parts.push(`Afeta ${usedByPages.length} páginas: ${usedByPages.join(', ')}.`)
  }

  if (usedByComponents.length > 0) {
    parts.push(`Usado em ${usedByComponents.length} componentes.`)
  }

  if (entityType === 'table' && ['cards', 'contatos', 'profiles'].includes(entity)) {
    parts.push('Esta é uma das 3 entidades core ("Suns") - mudanças afetam TODO o sistema.')
  }

  return parts.join(' ')
}

/**
 * Função principal: get_dependencies
 */
export async function getDependencies(
  input: { entity: string; entityType: string },
  projectData: ParsedProjectData
): Promise<DependencyResult> {
  const { entity, entityType } = input

  // 1. Busca dependências conhecidas
  let deps = findKnownDependencies(entity)

  // 2. Se não encontrou, infere
  if (!deps) {
    deps = inferDependencies(entity, entityType, projectData)
  }

  const { hooks: usedByHooks, pages: usedByPages, components: usedByComponents } = deps

  // 3. Determina nível de risco
  const cascadeRisk = determineRiskLevel(entity, usedByHooks, usedByPages, usedByComponents)

  // 4. Gera explicação
  const riskExplanation = generateRiskExplanation(
    entity,
    entityType,
    cascadeRisk,
    usedByHooks,
    usedByPages,
    usedByComponents
  )

  return {
    entity,
    entityType: entityType as 'table' | 'hook' | 'component' | 'page',
    usedByHooks,
    usedByPages,
    usedByComponents,
    cascadeRisk,
    riskExplanation
  }
}
