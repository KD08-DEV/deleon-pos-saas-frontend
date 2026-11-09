const messages = {
    CATEGORY_ALREADY_EXISTS: 'Ya existe una categoría con ese nombre en esta sucursal.',
    NAME_REQUIRED: 'Escribe el nombre de la categoría.',
    CATEGORY_STATUS_INVALID: 'Selecciona un estado válido para la categoría.',
    CATEGORY_IN_USE: 'Esta categoría tiene gastos asociados y no se puede eliminar.',
    CATEGORY_INACTIVE: 'Esta categoría está inactiva. Selecciona otra para el gasto.',
    CATEGORY_NOT_FOUND: 'La categoría ya no está disponible en esta sucursal. Actualiza la lista.',
    CATEGORY_INVALID: 'Selecciona una categoría válida.',
    SYSTEM_CATEGORY_PROTECTED: 'Esta categoría pertenece al sistema y no se puede renombrar, desactivar ni eliminar.',
    INVALID_OPENING_FLOAT: 'Introduce un monto válido para la apertura de caja.',
    OPEN_CASH_SESSION_FAILED: 'No se pudo abrir la caja. Inténtalo de nuevo.',
    PENDING_CASH_SESSION_CLOSE: 'Tienes una caja anterior pendiente de cierre. Ciérrala antes de abrir otra.',
    CASH_SESSION_ALREADY_CLOSED: 'Esta caja ya fue cerrada y no se puede abrir otra vez.',
    SESSION_ALREADY_EXISTS: 'Ya existe una apertura para esta caja y fecha. Actualiza la pantalla.',
    MISSING_REGISTER_ID: 'Selecciona una caja para registrar la apertura.',
    MISSING_REGISTER_ID_FOR_CASH_SESSION: 'Selecciona una caja para registrar la apertura.',
    MISSING_DATEYMD: 'Selecciona la fecha de apertura.',
    INVALID_MANAGER_CODE: 'El código de autorización es incorrecto.',
    MISSING_MANAGER_CODE: 'Introduce el código de autorización.',
};

export function financeErrorMessage(error, fallback = 'No se pudo completar la operación. Inténtalo de nuevo.') {
    const code = error?.response?.data?.message;
    if (messages[code]) return messages[code];
    if (error?.response?.status === 403) return 'No tienes permiso para realizar esta operación en la sucursal seleccionada.';
    if (error?.response?.status === 401) return 'Tu sesión ha vencido. Inicia sesión de nuevo.';
    if (!error?.response) return 'No se pudo conectar con el servidor. Revisa la conexión e inténtalo de nuevo.';
    return fallback;
}
