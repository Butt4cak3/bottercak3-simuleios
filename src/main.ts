import { Configuration, plugins, TwitchBot, TwitchJSConnector } from "bottercak3";
import GitHubPlugin from "./plugins/github";
import JokesPlugin from "./plugins/jokes";

const config: Partial<Configuration> = {
  username: process.env.TWITCH_USERNAME,
  password: process.env.TWITCH_OAUTH_TOKEN,
  channels: ["buttercak3"],
  bots: [],
  ops: ["buttercak3"]
};

const connector = new TwitchJSConnector(config);
const bot = new TwitchBot(connector, config);

bot.loadPlugin(plugins.General);
bot.loadPlugin(GitHubPlugin);
bot.loadPlugin(JokesPlugin);

bot.main();
