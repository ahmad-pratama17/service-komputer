import type { OrderStatus } from "@/types";
import { ORDER_STATUS_LABEL } from "@/lib/constants";
import { Badge, type BadgeProps } from "@/components/ui/badge";

const STATUS_VARIANT: Record<OrderStatus, BadgeProps["variant"]> = {
  pending: "warning",
  accepted: "info",
  diagnosis: "info",
  waiting_approval: "warning",
  in_progress: "info",
  completed: "success",
  paid: "success",
  closed: "default",
  cancelled: "danger",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{ORDER_STATUS_LABEL[status]}</Badge>;
}