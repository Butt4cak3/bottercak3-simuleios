import { Plugin, Permission, Command } from "bottercak3";
import cowsay from "cowsay";
import { Cooldown } from "../cooldown";

interface Config {
  cooldown: number;
}

export default class Cowsay extends Plugin {
  protected config: Config = this.getDefaultConfiguration();
  private cooldown = new Cooldown(20);

  public getDefaultConfiguration(): Config {
    return {
      cooldown: 20
    };
  }

  public init() {
    this.cooldown = new Cooldown(this.config.cooldown);

    this.registerCommand({
      name: "cowsay",
      handler: this.cowsay,
      permissionLevel: Permission.EVERYONE
    });
  }

  private cowsay(command: Command) {
    if (!this.cooldown.done && !command.sender.hasPermission(Permission.BROADCASTER)) return;

    if (command.params.length < 1) return;

    this.cooldown.restart();

    const raw = cowsay.say({
      text: command.params.join(" ")
    });
    const lines = raw.split("\n");

    for (const line of lines) {
      this.bot.say(command.channel, "," + line.replace(/\s/g, "."));
    }
  }
}
