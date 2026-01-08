import TextFieldInput from '../components/pipeline/fields/TextFieldInput'
import DateRangeField from '../components/pipeline/fields/DateRangeField'
import DestinosField from '../components/pipeline/fields/DestinosField'
import PessoasField from '../components/pipeline/fields/PessoasField'
import OrcamentoField from '../components/pipeline/fields/OrcamentoField'
import TaxaPlanejamentoField from '../components/pipeline/fields/TaxaPlanejamentoField'

export interface FieldConfig {
    name: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: React.ComponentType<any>
    label: string
}

// Registry mapping field names to their components
export const TRIPS_FIELD_REGISTRY: Record<string, FieldConfig> = {
    destinos: {
        name: 'destinos',
        component: DestinosField,
        label: 'Destinos'
    },
    epoca_viagem: {
        name: 'epoca_viagem',
        component: DateRangeField,
        label: 'Época da Viagem'
    },
    pessoas: {
        name: 'pessoas',
        component: PessoasField,
        label: 'Viajantes'
    },
    motivo: {
        name: 'motivo',
        component: TextFieldInput,
        label: 'Motivo da Viagem'
    },
    orcamento: {
        name: 'orcamento',
        component: OrcamentoField,
        label: 'Orçamento'
    },
    taxa_planejamento: {
        name: 'taxa_planejamento',
        component: TaxaPlanejamentoField,
        label: 'Taxa de Planejamento'
    }
}

// For WEDDING product (future expansion)
export const WEDDING_FIELD_REGISTRY: Record<string, FieldConfig> = {
    data_casamento: {
        name: 'data_casamento',
        component: TextFieldInput, // Could be a DateField
        label: 'Data do Casamento'
    },
    local: {
        name: 'local',
        component: TextFieldInput,
        label: 'Local'
    },
    num_convidados: {
        name: 'num_convidados',
        component: TextFieldInput, // Could be a NumberField
        label: 'Número de Convidados'
    }
}

// For CORP product (future expansion)
export const CORP_FIELD_REGISTRY: Record<string, FieldConfig> = {
    tipo_evento: {
        name: 'tipo_evento',
        component: TextFieldInput,
        label: 'Tipo de Evento'
    },
    empresa: {
        name: 'empresa',
        component: TextFieldInput,
        label: 'Empresa'
    },
    num_participantes: {
        name: 'num_participantes',
        component: TextFieldInput,
        label: 'Número de Participantes'
    }
}

export function getFieldRegistry(produto: 'TRIPS' | 'WEDDING' | 'CORP'): Record<string, FieldConfig> {
    switch (produto) {
        case 'TRIPS':
            return TRIPS_FIELD_REGISTRY
        case 'WEDDING':
            return WEDDING_FIELD_REGISTRY
        case 'CORP':
            return CORP_FIELD_REGISTRY
        default:
            return TRIPS_FIELD_REGISTRY
    }
}
