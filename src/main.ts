import { Configuration, defaultConfig, plugins, TwitchBot, TwitchJSConnector } from "bottercak3";
import fs from "fs";
import yaml from "js-yaml";
import CowsayPlugin from "./plugins/cowsay";
import CurrencyPlugin from "./plugins/currency/plugin";
import Dice from "./plugins/dice";
import GitHubPlugin from "./plugins/github";
import JokesPlugin from "./plugins/jokes";
import LinkPreviewPlugin from "./plugins/linkpreview";
import MathPlugin from "./plugins/math";

const configFileName = "config.yml";

// Create the configuration file if it does not alrady exist
if (!fs.existsSync(configFileName)) {
  fs.writeFileSync(configFileName, "");
}

// Load the contents of the configuration file
const configString = fs.readFileSync(configFileName, { encoding: "utf-8" });

// Merge the loaded configuration with the default configuration
const config: Configuration = {
  ...defaultConfig,
  ...yaml.load(configString),
};

// Create a new connector that delegates the connection to Twitch to a third-party library
const connector = new TwitchJSConnector({
  channels: [...config.channels],
  password: process.env.TWITCH_OAUTH_TOKEN || "",
  username: config.username,
});

// Start up the bot
const bot = new TwitchBot(connector, config);

// Load all the plugins
bot.loadPlugin(plugins.General);
bot.loadPlugin(GitHubPlugin);
bot.loadPlugin(JokesPlugin);
bot.loadPlugin(LinkPreviewPlugin);
bot.loadPlugin(CowsayPlugin);
bot.loadPlugin(MathPlugin);
bot.loadPlugin(CurrencyPlugin);
bot.loadPlugin(Dice);

// Write the new config back into the file
fs.writeFileSync(configFileName, yaml.dump(bot.getConfiguration()));

bot.main();

bot.onDisconnect.subscribe(() => {
  // Write the configuration file again in case some options have changed
  fs.writeFileSync(configFileName, yaml.dump(bot.getConfiguration()));
});
