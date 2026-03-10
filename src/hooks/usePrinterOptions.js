import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listPrinters } from "../services/tenantPrintApi.js";

export default function usePrinterOptions(category) {
    const printersQuery = useQuery({
        queryKey: ["printer-options", category],
        queryFn: () => listPrinters(category ? { category } : {}),
        staleTime: 0,
        refetchOnMount: "always",
    });

    const printers = useMemo(() => printersQuery.data || [], [printersQuery.data]);

    const defaultPrinter = useMemo(
        () => printers.find((p) => p.isDefault) || printers[0] || null,
        [printers]
    );

    return {
        printers,
        defaultPrinter,
        isLoadingPrinters: printersQuery.isLoading,
        refetchPrinters: printersQuery.refetch,
    };
}