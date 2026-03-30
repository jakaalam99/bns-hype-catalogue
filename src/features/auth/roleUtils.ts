export const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'MD', 'MERCHANDISER', 'ADMINISTRATOR'];
export const FINANCE_ROLES = ['FINANCE', 'ACCOUNTING'];
export const REQUESTOR_ROLES = ['PUTUS', 'BELI_PUTUS', 'ONLINE', 'CONSIGNMENT', 'STORE', 'EXPO', 'MKT', 'VM'];

export const hasDashboardAccess = (role: any): boolean => {
    if (!role) return false;
    const roles = Array.isArray(role) ? role : [role];
    return roles.some(r => typeof r === 'string' && ADMIN_ROLES.includes(r.toUpperCase()));
};

export const isAdminSide = (role: any): boolean => {
    if (!role) return false;
    const roles = Array.isArray(role) ? role : [role];
    const allAdminSide = [...ADMIN_ROLES, ...FINANCE_ROLES];
    return roles.some(r => typeof r === 'string' && allAdminSide.includes(r.toUpperCase()));
};
