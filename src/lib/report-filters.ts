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
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function clean(value?: string | null) {
  const text = value?.trim();
  return text || undefined;
}

function startOfBangkokDay(value?: string) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) return undefined;
  return new Date(calendarDate.getTime() - BANGKOK_OFFSET_MS);
}

export function buildBangkokReportDateFilter(input: ReportFilterInput): Prisma.DateTimeFilter | undefined {
  const filters = normalizeReportFilters(input);

  if (filters.month) {
    const [year, month] = filters.month.split("-").map(Number);
    if (month < 1 || month > 12) return undefined;
    return {
      gte: new Date(Date.UTC(year, month - 1, 1) - BANGKOK_OFFSET_MS),
      lt: new Date(Date.UTC(year, month, 1) - BANGKOK_OFFSET_MS)
    };
  }

  const fromDate = startOfBangkokDay(filters.from);
  const toDate = startOfBangkokDay(filters.to);
  if (!fromDate && !toDate) return undefined;

  return {
    ...(fromDate ? { gte: fromDate } : {}),
    ...(toDate ? { lt: new Date(toDate.getTime() + DAY_MS) } : {})
  };
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
