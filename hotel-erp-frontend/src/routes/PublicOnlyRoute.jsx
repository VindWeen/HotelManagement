import { Navigate } from 'react-router-dom';
import { useAdminAuthStore } from '../store/adminAuthStore';
import { getDefaultAuthenticatedPath } from './permissionRouting';

export default function PublicOnlyRoute({ children }) {
    const token = useAdminAuthStore((s) => s.token);
    const role = useAdminAuthStore((s) => s.user?.role);
    const permissions = useAdminAuthStore((s) => s.permissions);

    if (token) {
        return <Navigate to={getDefaultAuthenticatedPath(role, permissions)} replace />;
    }

    return children;
}
