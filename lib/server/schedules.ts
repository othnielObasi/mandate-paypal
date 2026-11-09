import type { Container } from "./container";
import { HttpError } from "./http";
import { ownMandate } from "./session";

/** The scheduled buy, if this caller owns its mandate. */
export async function ownSchedule(req: Request, c: Container, id: string) {
  const s = await c.stores.schedules.get(id);
  if (!s) throw new HttpError(404, "Scheduled buy not found.");
  await ownMandate(req, c, s.mandateId);
  return s;
}
