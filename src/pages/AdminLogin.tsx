import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Lock, Mail, Loader2 } from 'lucide-react'

export const AdminLogin = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const navigate = useNavigate()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) throw error

            // Successfully logged in
            navigate('/admin/dashboard', { replace: true })
        } catch (err: any) {
            setError(err.message || "Failed to authenticate.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 animate-fade-in">
            <div className="max-w-md w-full glass rounded-2xl p-8 shadow-premium border border-border">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-foreground rounded-2xl mx-auto flex items-center justify-center text-background shadow-lg mb-4">
                        <Lock size={32} />
                    </div>
                    <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">Admin Portal</h1>
                    <p className="text-sm text-muted-foreground mt-2">Sign in to manage the BNS Hype catalogue</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="email">
                            Email Address
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                <Mail size={18} />
                            </div>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 bg-surface border border-border rounded-xl text-foreground focus:ring-2 focus:ring-foreground focus:border-foreground transition-shadow outline-none"
                                placeholder="admin@bnshype.com"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5" htmlFor="password">
                            Password
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                <Lock size={18} />
                            </div>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 bg-surface border border-border rounded-xl text-foreground focus:ring-2 focus:ring-foreground focus:border-foreground transition-shadow outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm hover:shadow-premium text-sm font-medium text-background bg-foreground hover:bg-zinc-800 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <Loader2 size={18} className="animate-spin" />
                                Signing in...
                            </span>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
