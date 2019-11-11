import { Container } from "inversify";
import "reflect-metadata";
import { ConfigurationService } from "./configuration";
import { NebulaStatusEmitter } from "./status-emitter";
import NebulaWebhook from "./webhook";
import { WebServer } from "./webserver";

const container = new Container();

container.bind<ConfigurationService>(ConfigurationService).toSelf().inSingletonScope();
container.bind<NebulaStatusEmitter>(NebulaStatusEmitter).toSelf().inSingletonScope();
container.bind<NebulaWebhook>(NebulaWebhook).toSelf().inSingletonScope();
container.bind<WebServer>(WebServer).toSelf().inSingletonScope();


export default container;