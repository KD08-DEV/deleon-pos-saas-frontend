/**
 * La sucursal visible procede de la membresía actual, no del navegador anterior.
 * La preferencia guardada de Owner/Admin se conserva únicamente si corresponde
 * al MISMO usuario y tenant. No sustituye las autorizaciones del backend.
 */
export function normalizedRole(user) {
    return String(user?.membershipRole || user?.role || "").trim().toLowerCase();
}

export function canAdministrateBranches(user) {
    return ["owner", "admin"].includes(normalizedRole(user));
}

export function assignedBranches(user) {
    const branches = Array.isArray(user?.clientIds)
        ? user.clientIds.map(value => String(value || "").trim()).filter(Boolean)
        : [];
    return [...new Set(branches.length ? branches : ["default"])];
}

export function scopeForAuthenticatedUser(user, previousScope = {}) {
    const tenantId = String(user?.tenantId || "").trim();
    const userId = String(user?._id || user?.id || "").trim();
    const allowed = assignedBranches(user);
    if (!tenantId || !userId) throw new Error("AUTH_SCOPE_MISSING_IDENTITY");
    const sameIdentity = String(previousScope?.tenantId || "") === tenantId &&
        String(previousScope?.userId || "") === userId;
    const restored = String(previousScope?.clientId || "").trim();
    // Owner/Admin pueden elegir sucursal; la preferencia de otra cuenta no se reutiliza.
    if (canAdministrateBranches(user)) {
        return { tenantId, clientId: sameIdentity && restored ? restored : "default", userId };
    }
    // Cajera/Camarero/Cocina usan únicamente las sedes de su membresía.
    // La selección es fija en la primera sede asignada; el servidor sigue validando.
    return { tenantId, clientId: allowed[0] || "default", userId };
}
