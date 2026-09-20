export type Actor = { kind: "admin"; id: null; name: string } | { kind: "member"; id: number; name: string };

/**
 * idle     – nothing ticked yet
 * working  – some items ticked
 * ready    – runner pressed "All done"
 * late     – not ready and within the warning window before start (or already started)
 * over     – the slot has ended
 */
export type RoomStatus = "idle" | "working" | "ready" | "late" | "over";
export type CompanyStatus = "idle" | "working" | "ready" | "late" | "over";

export class UserError extends Error {}
