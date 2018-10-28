import { Plugin, Permission, Command } from "bottercak3";
import cowsay from "cowsay";

export default class Cowsay extends Plugin {
  public init() {
    this.bot.registerCommand({
      name: "cowsay",
      handler: this.cowsay.bind(this),
      permissionLevel: Permission.EVERYONE
    });
  }

  private cowsay(command: Command) {
    const raw = cowsay.say({
      text: command.params.join(" ")
    });
    const lines = raw.split("\n");

    for (const line of lines) {
      this.bot.say(command.channel, "," + line.replace(/\s/g, "."));
    }
  }
}
