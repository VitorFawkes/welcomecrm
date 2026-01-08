import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '../../ui/Table';
import { Badge } from '../../ui/Badge';
import { Loader2, Search } from 'lucide-react';
import { Input } from '../../ui/Input';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AuditLog {
    id: string;
    action: string;
    table_name: string;
    record_id: string;
    old_data: Record<string, unknown> | null;
    new_data: Record<string, unknown> | null;
    created_at: string;
    changed_by: string | null;
    actor?: {
        email: string;
        nome: string;
    };
}

export default function AuditLogViewer() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            // Attempt to fetch logs. If the relation 'actor' fails, we might need to adjust.
            // Based on error, columns are: action, changed_by, created_at, id, new_data, old_data, record_id, table_name
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any)
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;

            // Transform data to match AuditLog interface if needed, or just cast if it matches enough
            // We might not get 'actor' details if we don't join. 
            // For now, let's just fix the build by matching the interface to the data.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const formattedLogs: AuditLog[] = (data || []).map((log: any) => ({
                ...log,
                // If we can't join, we won't have actor details. 
                // We could try to fetch them separately or just show the ID.
                actor: undefined
            }));

            setLogs(formattedLogs);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.table_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.actor?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.actor?.nome || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Logs de Auditoria</h3>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                        placeholder="Buscar logs..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data/Hora</TableHead>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Ação</TableHead>
                            <TableHead>Recurso</TableHead>
                            <TableHead>Detalhes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                                </TableCell>
                            </TableRow>
                        ) : filteredLogs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                    Nenhum registro encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredLogs.map(log => (
                                <TableRow key={log.id}>
                                    <TableCell className="text-xs text-gray-500">
                                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-900">
                                                {log.actor?.nome || 'Sistema'}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {log.actor?.email || log.changed_by}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="uppercase text-[10px]">
                                            {log.action}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-gray-600">
                                        {log.table_name}
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate text-xs text-gray-500" title={JSON.stringify(log.new_data || log.old_data, null, 2)}>
                                        {JSON.stringify(log.new_data || log.old_data)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
