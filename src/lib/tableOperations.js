import { QK } from "../queryKeys";
import { getScope } from "./api";

export async function refreshTableViews(queryClient) {
    const { tenantId, clientId = "default" } = getScope();
    await Promise.all([
        QK.TABLES, QK.ORDERS, ["order"],
        ["table-accounts-12842", String(tenantId || ""), String(clientId)],
    ].map(queryKey => queryClient.invalidateQueries({ queryKey })));
}

export function tableOperationMessage(error) {
    const code = error?.response?.data?.code || error?.response?.data?.message;
    const messages = {
        ORDER_TABLE_RELEASED: "La orden pertenece a una mesa ya liberada. Actualiza la lista e inicia un nuevo consumo.",
        ORDER_NOT_INVOICED: "La orden debe estar facturada o pagada antes de desocupar la mesa.",
        TABLE_HAS_UNPAID_ACCOUNTS: "La mesa tiene otras cuentas pendientes de pago.",
        TABLE_LINKED_TO_ANOTHER_ORDER: "La mesa ya pertenece a otra orden. Actualiza la lista.",
        ORDER_CLOSE_REQUIRED: "Cierra la orden actual antes de liberar la mesa.",
        ORDER_NOT_ELIGIBLE_TO_RELEASE: "Esta orden está en borrador o cancelada. Revisa sus productos desde la mesa antes de continuar.",
        TABLE_RELEASE_PERMISSION_DENIED: "No tienes permiso para desocupar esta mesa en la sucursal actual.",
        TABLE_MOVE_PERMISSION_DENIED: "No tienes permiso para cambiar esta mesa en la sucursal actual.",
        TARGET_TABLE_OCCUPIED: "La mesa de destino ya está ocupada. Selecciona otra.",
        TABLE_ORDER_CHANGED: "La orden o la mesa cambió. Actualiza la lista antes de intentarlo de nuevo.",
        ORDER_NOT_MOVABLE: "Solo se pueden trasladar órdenes pendientes, sin factura ni inventario descontado.",
        TABLE_HAS_MULTIPLE_ACCOUNTS: "Esta mesa tiene varias cuentas. No se puede trasladar una cuenta de forma aislada.",
        TABLE_OR_ORDER_NOT_FOUND: "No se encontró la mesa o la orden en la sucursal actual.",
    };
    return messages[code] || "No se pudo completar la operación. Revisa la conexión e inténtalo de nuevo.";
}
