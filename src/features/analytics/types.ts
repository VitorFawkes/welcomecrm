
export type LeadStatus = 'open' | 'won' | 'lost';
export type LeadOrigin = string;
export type LeadChannel = string;

export interface SimplifiedProfile {
    id: string;
    name: string;
    avatar?: string;
}

export type LeadStage = string;

export interface AnalyticsLead {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    origin: LeadOrigin;
    channel?: LeadChannel;
    status: LeadStatus;
    stage: LeadStage;

    sdrId?: string;
    plannerId?: string;

    // Dates
    createdAt: Date;
    contactedAt?: Date;  // New
    briefingAt?: Date;   // New
    proposalAt?: Date;   // New
    wonAt?: Date;
    lostAt?: Date;

    value: number;
    product: string;
}

export interface AnalyticsTrip {
    id: string;
    leadId: string;
    destination: string;
    startDate?: Date;
    endDate?: Date;
    value: number;
    margin: number;
    status: 'confirmed' | 'completed' | 'cancelled';
}

export interface AnalyticsIncident {
    id: string;
    tripId: string;
    createdAt: Date;
    status: 'open' | 'resolved';
}

export interface AnalyticsInteraction {
    id: string;
    leadId: string;
    channel: 'whatsapp' | 'email';
    direction: 'inbound' | 'outbound';
    timestamp: Date;
}

export interface AnalyticsData {
    leads: AnalyticsLead[];
    trips: AnalyticsTrip[];
    incidents: AnalyticsIncident[];
    interactions: AnalyticsInteraction[];
    sdrs: SimplifiedProfile[];
    planners: SimplifiedProfile[];
}
