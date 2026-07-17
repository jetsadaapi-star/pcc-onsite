import type { Prisma } from "@/generated/prisma/client";
import { bangkokDateRange, bangkokMonthRange } from "@/lib/bangkok-time";

export type ReportFilterInput = {
  q?: string | null;
  status?: string | null;
  userId?: string | null;
  vehicleId?: string | null;
  month?: string | null;
  from?: string | null;
  to?: string | null;
};

export const reportStatusOptions = [
  { value: "DRAFT", label: "ฉบับร่าง" },
  { value: "PENDING_REVIEW", label: "รอตรวจ" },
  { value: "APPROVED", label: "อนุมัติแล้ว" },
  { value: "REJECTED", label: "ปฏิเสธ" },
  { value: "PAID", label: "จ่ายแล้ว" }
] as const;

const statusValues = new Set<string>(reportStatusOptions.map((status) => status.value));

function clean(value?: string | null) {
  const text = value?.trim();
  return text || undefined;
}

export function buildBangkokReportDateFilter(input: ReportFilterInput): Prisma.DateTimeFilter | undefined {
  const filters = normalizeReportFilters(input);

  return filters.month
    ? bangkokMonthRange(filters.month)
    : bangkokDateRange(filters.from, filters.to);
}

export function normalizeReportFilters(input: ReportFilterInput) {
  const status = clean(input.status);
  const month = clean(input.month);

  return {
    q: clean(input.q),
    status: status && statusValues.has(status) ? status : undefined,
    userId: clean(input.userId),
    vehicleId: clean(input.vehicleId),
    month: month && /^\d{4}-\d{2}$/.test(month) ? month : undefined,
    from: clean(input.from),
    to: clean(input.to)
  };
}

export function buildReportQuery(filters: ReturnType<typeof normalizeReportFilters>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function buildTravelClaimWhere(
  input: ReportFilterInput,
  user: { id: string; role: string }
): Prisma.TravelClaimWhereInput {
  const filters = normalizeReportFilters(input);
  const and: Prisma.TravelClaimWhereInput[] = [];
  const where: Prisma.TravelClaimWhereInput = user.role === "ADMIN" ? {} : { userId: user.id };

  if (filters.status) where.status = filters.status as Prisma.EnumClaimStatusFilter["equals"];
  if (filters.vehicleId) where.vehicleId = filters.vehicleId;
  if (filters.userId && user.role === "ADMIN") where.userId = filters.userId;

  const submittedAt = buildBangkokReportDateFilter(filters);
  if (submittedAt) where.submittedAt = submittedAt;

  if (filters.q) {
    and.push({
      OR: [
        { user: { is: { name: { contains: filters.q, mode: "insensitive" } } } },
        { vehicleName: { contains: filters.q, mode: "insensitive" } },
        { vehicleLicensePlate: { contains: filters.q, mode: "insensitive" } },
        { travelLeg: { is: { fromProject: { is: { name: { contains: filters.q, mode: "insensitive" } } } } } },
        { travelLeg: { is: { toProject: { is: { name: { contains: filters.q, mode: "insensitive" } } } } } },
        { travelLeg: { is: { destinationLabel: { contains: filters.q, mode: "insensitive" } } } }
      ]
    });
  }

  if (and.length) where.AND = and;
  return where;
}
