export async function refreshSalesViews(queryClient) {
    await Promise.all([
        ["orders"], ["order"], ["admin/reports"], ["admin/orders/reports"],
        ["admin/cash-session"], ["cash-session"], ["home-summary"],
        ["order-correction-history"], ["accounts-receivable"], ["accounts-receivable-summary"],
    ].map(queryKey => queryClient.invalidateQueries({queryKey})));
}
