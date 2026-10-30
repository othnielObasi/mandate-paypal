/**
 * Server-only dependencies the preview never reaches: it always runs in
 * offline mode (no PayPal keys, no database), so these code paths are never
 * taken. Each throws loudly if that assumption is ever broken.
 */
const unavailable = (name: string) =>
  class {
    constructor() {
      throw new Error(`${name} is not available in the standalone preview`);
    }
  };

export const PayPalAgentToolkit = unavailable("PayPal Agent Toolkit");
export const Pool = unavailable("Postgres");
export default {};
