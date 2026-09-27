import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { importOpgg, nextRun } from "./guides-import";
import { createPoliteFetcher } from "./sources/polite-fetch";

/** Refreshes op.gg build guides every night at 3am Vietnam time, when traffic on both sides is lowest. */
@Injectable()
export class GuidesImportService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GuidesImportService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    this.schedule();
    // A fresh database would show no guides until the first 3am run, so fill it once on boot.
    void this.prisma.buildGuide.count().then((count) => (count === 0 ? this.run() : undefined));
  }

  onModuleDestroy() {
    if (this.timer) clearTimeout(this.timer);
  }

  private schedule() {
    const at = nextRun(new Date());
    this.timer = setTimeout(() => void this.run().finally(() => this.schedule()), at.getTime() - Date.now());
    this.timer.unref();
  }

  async run() {
    if (this.running) return;
    this.running = true;
    try {
      const result = await importOpgg(this.prisma, createPoliteFetcher());
      this.logger.log(`Guides import: ${result.saved} saved, ${result.removed} removed, ${result.failed.length} failed${result.failed.length ? ` (${result.failed.join(", ")})` : ""}`);
    } catch (error) {
      this.logger.warn(`Guides import failed: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
