import type { Prisma } from "@/generated/prisma/client";

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

function parseDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
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

  let fromDate = parseDate(filters.from);
  let toDate = parseDate(filters.to);
  if (filters.month) {
    fromDate = new Date(`${filters.month}-01T00:00:00.000`);
    toDate = new Date(fromDate);
    toDate.setMonth(toDate.getMonth() + 1);
    toDate.setDate(0);
  }
  if (fromDate || toDate) {
    const submittedAt: Prisma.DateTimeFilter = {};
    if (fromDate) submittedAt.gte = fromDate;
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      submittedAt.lte = end;
    }
    where.submittedAt = submittedAt;
  }

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
