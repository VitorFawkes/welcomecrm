import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Loader2, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function InvitePage() {
    const { token } = useParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [valid, setValid] = useState(false);
    const [inviteData, setInviteData] = useState<{ email: string; role: string } | null>(null);

    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (token) {
            validateToken(token);
        }
    }, [token]);

    const validateToken = async (t: string) => {
        try {
            const { data, error } = await supabase.rpc('get_invite_details' as any, { token_input: t });

            if (error) throw error;

            const result = data as any;
            if (result && result.valid) {
                setValid(true);
                setInviteData({ email: result.email, role: result.role });
            } else {
                setValid(false);
            }
        } catch (error) {
            console.error('Error validating token:', error);
            setValid(false);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast({ title: 'Erro', description: 'As senhas não coincidem.', type: 'error' });
            return;
        }
        if (password.length < 6) {
            toast({ title: 'Erro', description: 'A senha deve ter no mínimo 6 caracteres.', type: 'error' });
            return;
        }

        setSubmitting(true);
        try {
            // 1. Sign Up (Trigger will validate whitelist)
            const { error } = await supabase.auth.signUp({
                email: inviteData!.email,
                password: password,
                options: {
                    data: {
                        full_name: name,
                        role: inviteData!.role // Pass role to metadata if needed by triggers
                    }
                }
            });

            if (error) throw error;

            toast({
                title: 'Conta Criada!',
                description: 'Bem-vindo ao time de Elite.',
                type: 'success'
            });

            // Redirect to dashboard
            navigate('/dashboard');

        } catch (error: any) {
            console.error('Signup error:', error);
            toast({
                title: 'Erro ao criar conta',
                description: error.message || 'Verifique se o convite ainda é válido.',
                type: 'error'
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!valid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Convite Inválido</h2>
                    <p className="text-gray-500 mb-6">
                        Este link de convite expirou ou não existe. Peça um novo convite ao administrador.
                    </p>
                    <Button onClick={() => navigate('/login')} variant="outline" className="w-full">
                        Voltar para Login
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-6 h-6 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Aceitar Convite</h2>
                    <p className="text-gray-500 mt-2">
                        Você foi convidado para o WelcomeCRM.
                    </p>
                    <div className="mt-4 p-3 bg-indigo-50 rounded-lg inline-block">
                        <p className="text-sm font-medium text-indigo-800">{inviteData?.email}</p>
                    </div>
                </div>

                <form onSubmit={handleAccept} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                        <Input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Seu nome"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Definir Senha</label>
                        <Input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="******"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
                        <Input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="******"
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-4"
                        disabled={submitting}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Criando Conta...
                            </>
                        ) : (
                            <>
                                Entrar no Sistema
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </>
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
