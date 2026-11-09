"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { eventFor, type AutomationEvent } from "@/lib/alerts/events";
import { useStore } from "../store";

const key = (mandateId: string) => `mandate.notifications.seen.${mandateId}`;
const readSeen = (mandateId: string) => {
  try {
    return Number(localStorage.getItem(key(mandateId)) ?? 0) || 0;
  } catch {
    return 0;
  }
};

/** This mandate's notifications, newest first, and how many arrived since you last looked (kept in this browser). */
export function useNotifications() {
  const { receipts, mandate } = useStore();
  const id = mandate?.id ?? null;
  const items = useMemo<AutomationEvent[]>(
    () =>
      id
        ? receipts
            .filter((r) => r.mandateId === id)
            .map((r) => eventFor(r, ""))
            .filter((e): e is AutomationEvent => e !== null)
            .reverse()
        : [],
    [receipts, id],
  );
  const [seen, setSeen] = useState(0);
  useEffect(() => {
    if (!id) return;
    setSeen(readSeen(id));
    // Another part of the page (the Notifications page, the bell) marked them read.
    const sync = () => setSeen(readSeen(id));
    window.addEventListener("mandate:notifications-read", sync);
    return () => window.removeEventListener("mandate:notifications-read", sync);
  }, [id]);
  const unread = items.filter((e) => e.receipt.seq > seen).length;
  const markRead = useCallback(() => {
    if (!id || !items.length) return;
    const top = items[0]!.receipt.seq;
    try {
      localStorage.setItem(key(id), String(top));
    } catch {}
    setSeen(top);
    window.dispatchEvent(new Event("mandate:notifications-read"));
  }, [id, items]);
  return { items, unread, seen, markRead };
}
