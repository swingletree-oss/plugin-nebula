import "reflect-metadata";

import { log } from "@swingletree-oss/harness";
import container from "./ioc-config";
import { NebulaStatusEmitter } from "./status-emitter";
import NebulaWebhook from "./webhook";
import { WebServer } from "./webserver";

require("source-map-support").install();

process.on("unhandledRejection", error => {
  // Will print "unhandledRejection err is not defined"
  console.log("unhandledRejection ", error);
});

export class NebulaPlugin {

  constructor() {
  }

  public run(): void {
    log.info("Starting up Twistlock Plugin...");
    const webserver = container.get<WebServer>(WebServer);

    // initialize Emitters
    container.get<NebulaStatusEmitter>(NebulaStatusEmitter);

    // add webhook endpoint
    webserver.addRouter("/report", container.get<NebulaWebhook>(NebulaWebhook).getRouter());
  }

}

new NebulaPlugin().run();
