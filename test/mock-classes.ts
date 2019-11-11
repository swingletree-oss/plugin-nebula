import { ConfigurationService } from "../src/configuration";
import * as sinon from "sinon";
import ScottyClient from "@swingletree-oss/scotty-client";
import { Comms, Harness } from "@swingletree-oss/harness";
import TwistlockStatusEmitter, { NebulaStatusEmitter } from "../src/status-emitter";

export class ConfigurationServiceMock extends ConfigurationService {
  constructor() {
    super();
    const configStub = sinon.stub();
    this.get = configStub;
  }
}

export class ScottyClientMock extends ScottyClient {
  constructor() {
    super("");

    this.getRepositoryConfig = sinon.stub().resolves(
      new Harness.RepositoryConfig({})
    );
    this.sendReport = sinon.stub().resolves();
  }
}

export class NebulaStatusEmitterMock extends NebulaStatusEmitter {
  constructor() {
    super(
      new ConfigurationServiceMock()
    );

    this.sendReport = sinon.stub().resolves();
  }
}