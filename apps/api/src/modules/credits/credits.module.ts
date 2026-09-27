import { Module } from "@nestjs/common";
import { AdminCreditsController, CreditsController, PaymentsWebhookController } from "./credits.controller";
import { CreditsService } from "./credits.service";
import { PAYMENT_PROVIDER, createPaymentProvider } from "./payment-provider";
import { PromotionsService } from "./promotions.service";

/** App credits: payOS top-ups into an append-only ledger; features spend through CreditsService.apply. */
@Module({
  controllers: [CreditsController, PaymentsWebhookController, AdminCreditsController],
  providers: [CreditsService, PromotionsService, { provide: PAYMENT_PROVIDER, useFactory: () => createPaymentProvider() }],
  exports: [CreditsService],
})
export class CreditsModule {}
