import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listPrinters } from "../services/tenantPrintApi.js";

export default function usePrinterOptions(category) {
    // Solo en Vite desarrollo con la bandera QA explícita. El Bridge de producción
    // continúa habilitado y el backend QA conserva su 403 protector.
    // Solo localhost + servidor backend de QA (8001). Nunca desactivar impresión en producción.
    // También funciona si la bandera se fijó solo en otra consola PowerShell.
    const qaBackend = /^http:\/\/(127\.0\.0\.1|localhost):8001\/?$/.test(
        String(import.meta.env.VITE_API_URL || "").trim()
    );
    const localFrontend = typeof window !== "undefined" &&
        ["127.0.0.1", "localhost"].includes(window.location.hostname);
    const qaBlocksPrinters = import.meta.env.DEV && localFrontend &&
        (qaBackend || import.meta.env.VITE_DLS_QA_MODE === "1");
    const printersQuery = useQuery({
        queryKey: ["printer-options", category],
        queryFn: () => listPrinters(category ? { category } : {}),
        enabled: !qaBlocksPrinters,
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