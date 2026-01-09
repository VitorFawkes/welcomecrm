import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../ui/Button';
import { Skeleton } from '../../ui/Skeleton';
import {
    LayoutGrid,
    Users,
    FolderTree,
    Pencil,
    ChevronRight,
    ChevronDown
} from 'lucide-react';
import { AddTeamModal } from './AddTeamModal';
import { EditTeamModal } from './EditTeamModal';
import type { Database } from '../../../database.types';

type Department = Database['public']['Tables']['departments']['Row'];
type Team = Database['public']['Tables']['teams']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface TeamWithMembers extends Team {
    members: Profile[];
}

interface DepartmentWithTeams extends Department {
    teams: TeamWithMembers[];
}

export function TeamManagement() {
    const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Fetch Departments
    const { data: departments, isLoading: isLoadingDepts } = useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .order('name');
            if (error) throw error;
            return data;
        }
    });

    // Fetch Teams and Members
    const { data: hierarchy, isLoading: isLoadingHierarchy } = useQuery({
        queryKey: ['team-hierarchy'],
        queryFn: async () => {
            // 1. Get all teams
            const { data: teams, error: teamsError } = await supabase
                .from('teams')
                .select('*')
                .order('name');
            if (teamsError) throw teamsError;

            // 2. Get all profiles with team_id
            const { data: profiles, error: profilesError } = await (supabase.from('profiles') as any)
                .select('id, nome, email, role, team_id, active')
                .not('team_id', 'is', null);
            if (profilesError) throw profilesError;

            // 3. Get all departments (already fetched but needed for structure)
            const { data: depts, error: deptsError } = await supabase
                .from('departments')
                .select('*')
                .order('name');
            if (deptsError) throw deptsError;

            // 4. Build Hierarchy
            const hierarchy: DepartmentWithTeams[] = depts.map(dept => {
                const deptTeams = teams
                    .filter(t => t.department_id === dept.id)
                    .map(team => ({
                        ...team,
                        members: profiles.filter((p: any) => p.team_id === team.id)
                    }));

                return {
                    ...dept,
                    teams: deptTeams
                };
            });

            return hierarchy;
        }
    });

    const toggleDept = (deptId: string) => {
        const newExpanded = new Set(expandedDepts);
        if (newExpanded.has(deptId)) {
            newExpanded.delete(deptId);
        } else {
            newExpanded.add(deptId);
        }
        setExpandedDepts(newExpanded);
    };

    const handleEditClick = (team: Team) => {
        setEditingTeam(team);
        setIsEditModalOpen(true);
    };

    if (isLoadingDepts || isLoadingHierarchy) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header / Actions */}
            <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border shadow-sm">
                <div>
                    <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                        <FolderTree className="w-5 h-5 text-primary" />
                        Estrutura Organizacional
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Gerencie departamentos, times e alocação de pessoas.
                    </p>
                </div>
                <AddTeamModal departments={departments || []} />
            </div>

            {/* Hierarchy Tree */}
            <div className="space-y-4">
                {hierarchy?.map((dept) => (
                    <div key={dept.id} className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                        {/* Department Header */}
                        <div
                            className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => toggleDept(dept.id)}
                        >
                            <div className="flex items-center gap-3">
                                {expandedDepts.has(dept.id) ? (
                                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                ) : (
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                )}
                                <div className="flex items-center gap-2">
                                    <LayoutGrid className="w-5 h-5 text-muted-foreground" />
                                    <span className="font-semibold text-foreground">{dept.name}</span>
                                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                                        {dept.teams.length} times
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Teams List */}
                        {expandedDepts.has(dept.id) && (
                            <div className="divide-y divide-border border-t border-border">
                                {dept.teams.length === 0 ? (
                                    <div className="p-8 text-center text-muted-foreground text-sm italic">
                                        Nenhum time criado neste departamento.
                                    </div>
                                ) : (
                                    dept.teams.map((team) => (
                                        <div key={team.id} className="p-4 hover:bg-muted/30 transition-colors group">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Users className="w-4 h-4 text-primary" />
                                                        <h4 className="font-medium text-foreground">{team.name}</h4>
                                                    </div>
                                                    {team.description && (
                                                        <p className="text-sm text-muted-foreground mb-3">{team.description}</p>
                                                    )}

                                                    {/* Members Chips */}
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {team.members.length === 0 ? (
                                                            <span className="text-xs text-muted-foreground italic">Sem membros</span>
                                                        ) : (
                                                            team.members.map(member => (
                                                                <div key={member.id} className="flex items-center gap-1.5 bg-primary/10 text-primary px-2 py-1 rounded-md text-xs border border-primary/20">
                                                                    <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold">
                                                                        {member.nome?.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    {member.nome}
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEditClick(team);
                                                    }}
                                                >
                                                    <Pencil className="w-4 h-4 text-muted-foreground hover:text-primary" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <EditTeamModal
                team={editingTeam}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                departments={departments || []}
            />
        </div>
    );
}
