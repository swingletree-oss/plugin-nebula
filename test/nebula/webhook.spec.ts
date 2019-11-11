"use strict";

import * as chai from "chai";
import { describe } from "mocha";
import * as sinon from "sinon";
import { mockReq, mockRes } from "sinon-express-mock";
import NebulaWebhook from "../../src/webhook";
import { ConfigurationServiceMock, NebulaStatusEmitterMock } from "../mock-classes";
import { NebulaModel } from "../../src/model";
import { Comms, Harness } from "@swingletree-oss/harness";

chai.use(require("sinon-chai"));

const sandbox = sinon.createSandbox();

describe("Nebula Webhook", () => {

  let uut;
  let requestMock, responseMock;
  let nebulaTestData;
  let buildData;

  beforeEach(() => {
    uut = new NebulaWebhook(
      new ConfigurationServiceMock(),
      new NebulaStatusEmitterMock()
    );

    buildData = {
      eventName: "",
      payload: {
        build: JSON.stringify({
          buildId: "id",
          result: {
            status: NebulaModel.ResultValue.SUCCESS
          }
        } as NebulaModel.BuildMetrics),
        buildId: "id"
      }
    };

    requestMock = mockReq();
    requestMock.headers = {};
    responseMock = mockRes();

    requestMock.header = sinon.stub();

    nebulaTestData = Object.assign({}, require("../mock/nebula/call.json"));
  });



  ["owner", "repo", "sha", "branch"].forEach((prop) => {
    it(`should answer with 400 when missing ${prop} parameter`, async () => {
      requestMock.body = {
        data: {
          report: buildData,
          headers: {}
        },
        meta: {
          source: {
            branch: [ "master" ],
            owner: "org",
            repo: "repo",
            sha: "sha"
          } as Harness.GithubSource
        } as Comms.Gate.PluginReportProcessMetadata
      } as Comms.Gate.PluginReportProcessRequest<NebulaModel.Report>;

      requestMock.body.meta.source[prop] = undefined;

      await uut.webhook(requestMock, responseMock);

      sinon.assert.calledOnce(responseMock.send);
      sinon.assert.calledWith(responseMock.status, 400);
    });
  });

  it(`should answer with 400 when missing content in report body`, async () => {
    requestMock.body = {
      data: {
        report: {},
        headers: {}
      },
      meta: {
        source: {
          branch: [ "master" ],
          owner: "org",
          repo: "repo",
          sha: "sha"
        } as Harness.GithubSource
      } as Comms.Gate.PluginReportProcessMetadata
    } as Comms.Gate.PluginReportProcessRequest<NebulaModel.Report>;

    await uut.webhook(requestMock, responseMock);

    sinon.assert.calledOnce(responseMock.send);
    sinon.assert.calledWith(responseMock.status, 400);
  });

  it(`should answer with 204 when receiving valid request`, async () => {
    requestMock.body = {
      data: {
        report: buildData,
        headers: {}
      },
      meta: {
        source: {
          branch: [ "master" ],
          owner: "org",
          repo: "repo",
          sha: "sha"
        } as Harness.GithubSource
      } as Comms.Gate.PluginReportProcessMetadata
    } as Comms.Gate.PluginReportProcessRequest<NebulaModel.Report>;

    await uut.webhook(requestMock, responseMock);

    sinon.assert.calledOnce(responseMock.send);
    sinon.assert.calledWith(responseMock.status, 204);
  });
});
