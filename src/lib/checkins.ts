export type CheckInLike = {
  id: string;
  userId: string;
  checkedAt: Date;
};

export function findPreviousCheckIn<T extends CheckInLike>(items: T[], userId: string, before: Date) {
  return items
    .filter((item) => item.userId === userId && item.checkedAt.getTime() < before.getTime())
    .sort((a, b) => b.checkedAt.getTime() - a.checkedAt.getTime())[0] ?? null;
}
