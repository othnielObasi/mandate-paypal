// Injected into every module of the preview bundle: the Node globals the shared code expects.
import { Buffer as B } from "./shims/buffer";

const g = globalThis as unknown as { Buffer?: typeof B; process?: { env: Record<string, string | undefined> } };
g.Buffer ??= B;
g.process ??= { env: {} };
// Offline mode with a public-looking app URL for connection links shown in the UI.
g.process.env.APP_URL ??= "https://mandate-preview.local";

export const Buffer = g.Buffer;
export const process = g.process;
