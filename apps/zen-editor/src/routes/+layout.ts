export const ssr = false;
export const prerender = false;

if (typeof window !== 'undefined') {
    console.log("SPA Mode: SSR disabled, Layout loaded on client.");
}

