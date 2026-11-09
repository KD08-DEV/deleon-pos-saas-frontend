const QA_BRANCH = "release/rc-20261103";
const QA_BACKEND = "https://deleon-pos-saas-backend-1.onrender.com";
const normalized = value => String(value || "").trim().replace(/\/+$/, "");

export function assertQaBuildEnvironment(env) {
    if (env.VERCEL_ENV === "production") {
        const productionBackend = "https://deleon-pos-saas-backend.onrender.com";
        const urls = [env.VITE_API_URL, env.VITE_BACKEND_URL || env.VITE_API_URL, env.VITE_SOCKET_URL || env.VITE_API_URL];
        if (urls.some(url => normalized(url) !== productionBackend)) {
            throw new Error("PRODUCTION_BUILD_BACKEND_MUST_BE_PRODUCTION: check Production API, backend and Socket.IO variables");
        }
    }
    if (env.VERCEL_GIT_COMMIT_REF !== QA_BRANCH) return;
    if (env.VERCEL_ENV !== "preview") {
        throw new Error("QA_BUILD_REQUIRES_VERCEL_PREVIEW");
    }
    const api = normalized(env.VITE_API_URL);
    const socket = normalized(env.VITE_SOCKET_URL || env.VITE_API_URL);
    const backend = normalized(env.VITE_BACKEND_URL || env.VITE_API_URL);
    if ([api, socket, backend].some(url => url !== QA_BACKEND)) {
        throw new Error("QA_BUILD_BACKEND_MUST_BE_QA: check Preview API, backend and Socket.IO variables");
    }
}
