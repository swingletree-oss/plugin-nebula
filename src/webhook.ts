"use strict";

import { Request, Response, Router } from "express";
import { inject, injectable } from "inversify";
import TwistlockStatusEmitter from "./status-emitter";
import { ConfigurationService, NebulaConfig } from "./configuration";
import { log, Comms, Harness } from "@swingletree-oss/harness";
import { BadRequestError } from "@swingletree-oss/harness/dist/comms";
import { NebulaModel } from "./model";

/** Provides a Webhook for Sonar
 */
@injectable()
class NebulaWebhook {
  private configurationService: ConfigurationService;
  private readonly statusEmitter: TwistlockStatusEmitter;

  constructor(
    @inject(ConfigurationService) configurationService: ConfigurationService,
    @inject(TwistlockStatusEmitter) statusEmitter: TwistlockStatusEmitter
  ) {
    this.configurationService = configurationService;
    this.statusEmitter = statusEmitter;
  }

  public getRouter(): Router {
    const router = Router();
    router.post("/", this.webhook.bind(this));
    return router;
  }

  private isWebhookEventRelevant(event: NebulaModel.Report) {

    return event.payload &&
      event.payload.build &&
      event.payload.build.result &&
      event.payload.build.result.status != NebulaModel.ResultValue.UNKNOWN;
  }

  public webhook = async (req: Request, res: Response) => {
    log.debug("received gradle-metrics webhook event");

    const message: Comms.Gate.PluginReportProcessRequest<NebulaModel.Report> = req.body;

    if (this.configurationService.getBoolean(NebulaConfig.LOG_WEBHOOK_EVENTS)) {
      log.debug("%j", req.body);
    }

    const reportData: NebulaModel.Report = message.data.report;

    if (!message.meta) {
      res.status(400).send(
        new Comms.Message.ErrorMessage(
          new BadRequestError("missing source coordinates in request metadata.")
        )
      );
      return;
    }

    try {
      reportData.payload.build = JSON.parse(reportData.payload.build as any);
    } catch (err) {
      log.warn("failed to parse gradle-metrics build payload. Skipping event.");
      res.status(400).send(
        new Comms.Message.ErrorMessage(
          new BadRequestError("could not parse build payload. Check your request.")
        )
      );
      return;
    }

    const webhookData: NebulaModel.Report = message.data.report;
    if (!message.meta || !message.meta.source) {
      res.status(400).send(
        new Comms.Message.ErrorMessage(
          new BadRequestError("malformed source object in request metadata.")
        )
      );
      return;
    }

    const source = new Harness.GithubSource();
    Object.assign(source, message.meta.source);

    if (!source.isDataComplete()) {
      res.status(400).send(
        new Comms.Message.ErrorMessage(
          new BadRequestError("missing source coordinates in request metadata.")
        )
      );
      return;
    }

    if (this.isWebhookEventRelevant(webhookData)) {
      // check if installation is available
      this.statusEmitter.sendReport(webhookData, source);
    } else {
      log.debug("gradle-metrics webhook data did not contain a report. This event will be ignored.");
      res.status(400).send(
        new Comms.Message.ErrorMessage(
          new BadRequestError("webhook data did not contain a report. This event will be ignored.")
        )
      );
      return;
    }

    res.status(204).send();
  }
}

export default NebulaWebhook;