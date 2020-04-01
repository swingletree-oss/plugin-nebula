import { inject, injectable } from "inversify";
import { NebulaModel } from "./model";
import { ConfigurationService, NebulaConfig } from "./configuration";
import { Harness } from "@swingletree-oss/harness";
import ScottyClient from "@swingletree-oss/scotty-client";

interface ResultCount {
  failed: number;
  skipped: number;
  success: number;
  unknown: number;
}

@injectable()
export class NebulaStatusEmitter {
  private readonly context: string;
  private readonly scottyClient: ScottyClient;

  constructor(
    @inject(ConfigurationService) configurationService: ConfigurationService
  ) {
    this.context = configurationService.get(NebulaConfig.CONTEXT);

    this.scottyClient = new ScottyClient(configurationService.get(NebulaConfig.SCOTTY_URL));
  }

  private retrieveAnnotationsFor(resultValue: NebulaModel.ResultValue, build: NebulaModel.BuildMetrics, targetSeverity: Harness.Severity, titlePrefix: string): Harness.Annotation[] {
    const annotations: Harness.Annotation[] = [];

    build.tests
      .filter((item) => item.result.status == resultValue)
      .forEach((item) => {
        const annotation = new Harness.ProjectAnnotation();
        annotation.title = `${titlePrefix}: ${item.className} ${item.methodName}`;
        annotation.detail = `${item.suiteName} ${item.className} ${item.methodName}`;
        annotation.severity = targetSeverity;
        annotations.push(annotation);
      });

    return annotations;
  }

  public getAnnotations(report: NebulaModel.Report): Harness.Annotation[] {
    let annotations: Harness.Annotation[] = [];

    if (report.payload.build.tests) {
      annotations = annotations.concat(
        this.retrieveAnnotationsFor(
          NebulaModel.ResultValue.FAILURE,
          report.payload.build,
          Harness.Severity.BLOCKER,
          "Failed Test"
        ),
        this.retrieveAnnotationsFor(
          NebulaModel.ResultValue.SKIPPED,
          report.payload.build,
          Harness.Severity.INFO,
          "Skipped Test"
        )
      );
    }

    return annotations;
  }

  private countTestResults(build: NebulaModel.BuildMetrics): ResultCount {
    const counts: ResultCount = { failed: 0, skipped: 0, success: 0, unknown: 0 };

    build.tests.reduce(
      (counter, currentValue) => {
        switch (currentValue.result.status) {
          case NebulaModel.ResultValue.FAILURE: counter.failed++; break;
          case NebulaModel.ResultValue.SUCCESS: counter.success++; break;
          case NebulaModel.ResultValue.SKIPPED: counter.skipped++; break;
          case NebulaModel.ResultValue.UNKNOWN:
          default: counter.unknown++; break;
        }
        return counter;
      },
      counts
    );

    return counts;
  }

  public async sendReport(report: NebulaModel.Report, source: Harness.ScmSource, uid: string) {
    const annotations = this.getAnnotations(report);
    const build = report.payload.build;

    const counts = this.countTestResults(build);

    const notificationData: Harness.AnalysisReport = {
      sender: this.context,
      source: source,
      checkStatus: report.payload.build.result.status == NebulaModel.ResultValue.SUCCESS ? Harness.Conclusion.PASSED : Harness.Conclusion.BLOCKED,
      title: `${report.payload.build.testCount} Tests`,
      uuid: uid,
      metadata: {
        project: build.project,
        java: {
          version: build.info.javaVersion,
          detailVersion: build.info.detailedJavaVersion
        },
        gradle: {
          version: build.info.build.gradle.version
        },
        build: {
          id: build.buildId,
          elapsedTime: build.elapsedTime,
          startTime: build.startTime,
          finishedTime: build.finishedTime,
          result: report.payload.build.result?.status,
          tasks: build.tasks.map(it => {
            return it.description;
          })
        },
        test: {
          count: build.testCount,
          failed: counts.failed,
          skipped: counts.skipped,
          unknown: counts.unknown
        }
      },
      annotations: annotations
    };

    if (counts.skipped > 0) {
      notificationData.title += `, ${counts.skipped} skipped`;
    }

    if (counts.failed > 0) {
      notificationData.title += `, ${counts.failed} failed`;
    }

    return await this.scottyClient.sendReport(notificationData);
  }
}

export default NebulaStatusEmitter;