import { Command, Permission, Plugin } from "bottercak3";

function randomInt(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

interface Configuration {
  maxRolls: number;
  maxSides: number;
}

export default class Dice extends Plugin {
  protected config: Configuration = this.getDefaultConfiguration();

  public getDefaultConfiguration(): Configuration {
    return {
      maxRolls: 20,
      maxSides: 120,
    };
  }

  public init() {
    this.registerCommand({
      handler: this.cmdRoll,
      name: "roll",
      permissionLevel: Permission.EVERYONE,
    });
  }

  private cmdRoll(command: Command) {
    if (command.params.length === 0) {
      command.params = ["1d6"];
    }

    const results: number[] = [];
    const def = command.params[0];

    const parsed = this.parse(def);

    if (parsed == null) {
      this.bot.say(command.channel, `@${command.sender.displayName} ${def} is not a valid dice roll.`);
      return;
    }

    if (parsed.amount > this.config.maxRolls) {
      this.bot.say(command.channel, `@${command.sender.displayName} You can only roll ${this.config.maxRolls} dice at once.`);
      return;
    }

    if (parsed.type > this.config.maxSides) {
      this.bot.say(command.channel, `@${command.sender.displayName} You can only roll dice with up to ${this.config.maxSides} sides.`);
      return;
    }

    const total = results.reduce((roll, sum) => sum + roll, 0);

    for (let i = 0; i < parsed.amount; i++) {
      results.push(randomInt(1, parsed.type));
    }

    const formatted = results.join(", ");
    this.bot.say(command.channel, `${command.sender.displayName} rolled ${total} (${formatted}).`);
  }

  private parse(str: string) {
    const re = /(\d+)?d(\d+)/;
    const match = str.match(re);

    if (match == null) return null;

    return {
      amount: parseInt(match[1], 10) || 1,
      type: parseInt(match[2], 10),
    };
  }
}
