import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from './useAuthStore'
import { hasDashboardAccess, REQUESTOR_ROLES } from './roleUtils'
import { Loader2 } from 'lucide-react'

export const ProtectedRoute = ({ allowRoles, children }: { allowRoles?: string[], children?: React.ReactNode }) => {
    const { session, user, isLoading, initialize } = useAuthStore()
    const location = useLocation()

    useEffect(() => {
        initialize()
    }, [])

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        )
    }

    if (!session) {
        // Redirect to login but save the attempted url
        return <Navigate to="/admin/login" state={{ from: location }} replace />
    }

    // Check roles if specified
    if (allowRoles && allowRoles.length > 0) {
        const userRole = user?.user_metadata?.role;
        if (!allowRoles.some(r => r.toUpperCase() === userRole?.toUpperCase())) {
            // If user doesn't have the role, redirect to a safe admin page if they are admin-side, or home
            if (location.pathname.startsWith('/admin')) {
                return <Navigate to="/admin/requests" replace />
            }
            return <Navigate to="/" replace />
        }
    }

    return children ? <>{children}</> : <Outlet />
}

export const PublicRoute = () => {
    const { session, isLoading, initialize } = useAuthStore()

    useEffect(() => {
        initialize()
    }, [])

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
        )
    }

    // If logged in, don't let them see the login page again
    if (session) {
        const userRole = session.user?.user_metadata?.role;
        const requestorRoles = REQUESTOR_ROLES;
        // If it's a requestor role, send them to catalogue
        if (requestorRoles.some(r => r.toUpperCase() === userRole?.toUpperCase())) {
            return <Navigate to="/" replace />
        }
        
        // Admin-side redirect
        if (hasDashboardAccess(userRole)) {
            return <Navigate to="/admin/dashboard" replace />
        }
        return <Navigate to="/admin/requests" replace />
    }

    return <Outlet />
}
