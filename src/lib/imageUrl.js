const API_BASE_URL = String(import.meta.env.VITE_API_URL || "")
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_BUCKET = String(import.meta.env.VITE_SUPABASE_BUCKET || "saas-uploads");

export const resolveImageUrl = (value) => {
    const raw = String(value || "").trim();

    if (!raw) return "/placeholder.jpg";

    if (/^(https?:|data:|blob:)/i.test(raw)) {
        return raw;
    }

    const clean = raw.replace(/^\/+/, "");

    if (clean.startsWith("storage/v1/object/public/") && SUPABASE_URL) {
        return `${SUPABASE_URL}/${clean}`;
    }

    if (clean.startsWith("uploads/")) {
        return API_BASE_URL ? `${API_BASE_URL}/${clean}` : `/${clean}`;
    }

    if (SUPABASE_URL) {
        const objectPath = clean.startsWith(`${SUPABASE_BUCKET}/`)
            ? clean.replace(`${SUPABASE_BUCKET}/`, "")
            : clean;

        return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${objectPath}`;
    }

    return raw.startsWith("/") ? raw : `/${raw}`;
};