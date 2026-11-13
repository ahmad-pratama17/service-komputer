import type { OrderStatus } from "@/types";

/**
 * Peta transisi status. Harus selalu sinkron dengan trigger
 * public.validate_order_status_transition() di
 * supabase/migrations/00004_service_workflow.sql — database tetap menjadi
 * sumber kebenaran, peta ini hanya untuk membatasi pilihan di UI.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["accepted", "cancelled"],
  accepted: ["diagnosis", "cancelled"],
  diagnosis: ["waiting_approval", "cancelled"],
  waiting_approval: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: ["paid"],
  paid: ["closed"],
  closed: [],
  cancelled: [],
};

export function nextStatuses(current: OrderStatus): OrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[current] ?? [];
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return nextStatuses(from).includes(to);
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return nextStatuses(status).length === 0;
}
