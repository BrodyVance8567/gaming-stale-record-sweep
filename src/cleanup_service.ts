import { z } from "zod";
import { infrai } from "./infrai.js";

export const sweepRequest = z.object({
  playerId: z.string().min(1),
  assetIds: z.array(z.string()),
  liveEventIds: z.array(z.string()),
  moderationQueue: z.string().min(1),
  staleBefore: z.coerce.date()
});

export type SweepRequest = z.infer<typeof sweepRequest>;

export function staleAssetIds(input: SweepRequest, now = new Date()): string[] {
  return input.assetIds.filter((id) => id.length > 0 && input.staleBefore.getTime() < now.getTime());
}

export async function runSweep(taskUrl: string, queue: string): Promise<{ jobId: string; acknowledged: number }> {
  const job = await infrai.cron.create({ cron_expr: "0 * * * *", task: taskUrl });
  const batch = await infrai.queue.consume({ queue, max_messages: 50, visibility_timeout: 60 });
  let acknowledged = 0;
  for (const message of batch.messages ?? []) {
    const parsed = sweepRequest.safeParse(message.payload);
    if (parsed.success && staleAssetIds(parsed.data).length > 0) {
      await infrai.queue.ack({ queue, message_id: message.message_id });
      acknowledged += 1;
    }
  }
  return { jobId: job.job_id, acknowledged };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const taskUrl = process.env.SWEEP_TASK_URL ?? "https://example.com/game-cleanup";
  const queue = process.env.SWEEP_QUEUE;
  if (!queue) throw new Error("SWEEP_QUEUE is required");
  runSweep(taskUrl, queue).then((result) => console.log(JSON.stringify(result)));
}
