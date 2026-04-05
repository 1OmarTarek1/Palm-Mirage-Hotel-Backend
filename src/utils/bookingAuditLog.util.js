import { BookingAuditLog } from "../DB/Model/BookingAuditLog.model.js";

const safeClone = (value) => {
  if (value === undefined || value === null) return undefined;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return undefined;
  }
};

export const appendBookingAudit = async ({
  entityType,
  entityId,
  action,
  actorId,
  before,
  after,
  metadata,
}) => {
  if (!entityType || !entityId || !action) return null;

  try {
    return await BookingAuditLog.create({
      entityType,
      entityId,
      action,
      actorId: actorId || null,
      before: safeClone(before),
      after: safeClone(after),
      metadata: metadata && typeof metadata === "object" ? { ...metadata } : undefined,
    });
  } catch (err) {
    console.error("appendBookingAudit failed:", err?.message || err);
    return null;
  }
};
