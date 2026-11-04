import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";
import {
    listPrinters,
    createPrinter,
    updatePrinter,
    deletePrinter,
    setDefaultPrinter,
} from "../services/tenantPrintApi.js";

export default function usePrinters(category = "") {
    const qc = useQueryClient();

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
        queryKey: ["printers", category],
        queryFn: () => listPrinters(category ? { category } : {}),
        enabled: !qaBlocksPrinters,
        staleTime: 0,
        refetchOnMount: "always",
    });

    const invalidate = async () => {
        await qc.invalidateQueries({ queryKey: ["printers"] });
    };

    const createMutation = useMutation({
        mutationFn: createPrinter,
        onSuccess: async () => {
            await invalidate();
            enqueueSnackbar("Impresora creada", { variant: "success" });
        },
        onError: (e) => {
            enqueueSnackbar(
                e?.response?.data?.message || "Error creando impresora",
                { variant: "error" }
            );
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }) => updatePrinter(id, payload),
        onSuccess: async () => {
            await invalidate();
            enqueueSnackbar("Impresora actualizada", { variant: "success" });
        },
        onError: (e) => {
            enqueueSnackbar(
                e?.response?.data?.message || "Error actualizando impresora",
                { variant: "error" }
            );
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deletePrinter,
        onSuccess: async () => {
            await invalidate();
            enqueueSnackbar("Impresora eliminada", { variant: "success" });
        },
        onError: (e) => {
            enqueueSnackbar(
                e?.response?.data?.message || "Error eliminando impresora",
                { variant: "error" }
            );
        },
    });

    const defaultMutation = useMutation({
        mutationFn: setDefaultPrinter,
        onSuccess: async () => {
            await invalidate();
            enqueueSnackbar("Impresora por defecto actualizada", { variant: "success" });
        },
        onError: (e) => {
            enqueueSnackbar(
                e?.response?.data?.message || "Error marcando impresora por defecto",
                { variant: "error" }
            );
        },
    });

    return {
        printers: printersQuery.data || [],
        isLoadingPrinters: printersQuery.isLoading,
        refetchPrinters: printersQuery.refetch,

        createPrinter: createMutation.mutateAsync,
        creatingPrinter: createMutation.isPending,

        updatePrinter: updateMutation.mutateAsync,
        updatingPrinter: updateMutation.isPending,

        deletePrinter: deleteMutation.mutateAsync,
        deletingPrinter: deleteMutation.isPending,

        setDefaultPrinter: defaultMutation.mutateAsync,
        settingDefaultPrinter: defaultMutation.isPending,
    };
}