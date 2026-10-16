/**
 * Computes the total handling time (in minutes) between an indent's received
 * and completed timestamps. Both dates are stored as UTC midnight of the MYT
 * date; the times are zero-padded 24-hour "HH:mm" strings in MYT.
 *
 * Completion before receipt is physically impossible (typically the received
 * time was edited after counterchecking) — clamped to 0 rather than returning
 * a negative total.
 */
export function calculateMinutes(
  dateReceived: Date,
  timeReceived: string,
  dateCompleted: Date,
  timeCompleted: string
): number {
  const [rh, rm] = timeReceived.split(':').map(Number);
  const [ry, rmon, rd] = [dateReceived.getUTCFullYear(), dateReceived.getUTCMonth(), dateReceived.getUTCDate()];
  const start = new Date(Date.UTC(ry, rmon, rd, rh, rm));

  const [ch, cm] = timeCompleted.split(':').map(Number);
  const [cy, cmon, cd] = [dateCompleted.getUTCFullYear(), dateCompleted.getUTCMonth(), dateCompleted.getUTCDate()];
  const end = new Date(Date.UTC(cy, cmon, cd, ch, cm));

  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}
