// Acceso VISUAL de solo lectura al historial del cierre.
// El servidor verifica rol, tenant, sucursal y autorización en cada petición.
// No conceder acceso por permisos de emisión de e33/e34: son operaciones distintas.
export function resolveClosingViewerRole({
  membershipRole, reduxRole, storageRole, tokenRole,
} = {}) {
  const candidates = [membershipRole, reduxRole, storageRole, tokenRole];
  return candidates.map((value) => String(value || "").trim()).find(Boolean) || "";
}

export function canViewClosingDocumentsForRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return ["owner", "admin", "cajera"].includes(normalized);
}
