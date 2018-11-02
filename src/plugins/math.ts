import { Command, Permission, Plugin } from "bottercak3";
import { Formula } from "solvethis";

export default class MathPlugin extends Plugin {
  public init() {
    this.registerCommand({
      handler: this.whats,
      name: "whats",
      permissionLevel: Permission.EVERYONE,
    });
  }

  private whats(command: Command) {
    const expression = command.params.join(" ");
    try {
      const result = Formula.execute(expression);
      this.bot.say(command.channel, `@${command.sender.displayName} ${result}`);
    } catch (_e) {
      this.bot.say(command.channel, "I couldn't calculate the solution for that.");
    }
  }
}
