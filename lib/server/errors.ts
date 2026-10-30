import { HttpError } from "./http";

/** Map domain errors from the fulfilment service to HTTP statuses. */
export function asHttp(e: unknown): never {
  const msg = e instanceof Error ? e.message : String(e);
  if (/not found/i.test(msg)) throw new HttpError(404, msg);
  if (/confirm|at least|at most/i.test(msg)) throw new HttpError(400, msg);
  if (/already|no delivery problem|draft the dispute first|only available/i.test(msg)) throw new HttpError(409, msg);
  throw e;
}
