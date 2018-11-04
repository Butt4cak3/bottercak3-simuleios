import { Command, Permission, Plugin, User } from "bottercak3";

function randomInt(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

interface Configuration {
  maxRolls: number;
  maxSides: number;
}

interface Roll {
  amount: number;
  sides: number;
}

interface Duel {
  challenger: User;
  opponent: string;
  channel: string;
  roll: Roll;
  stake: number;
}

export default class Dice extends Plugin {
  protected config: Configuration = this.getDefaultConfiguration();
  private currentDuel: Duel | null = null;

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

    this.registerCommand({
      handler: this.cmdDuel,
      name: "duel",
      permissionLevel: Permission.EVERYONE,
    });

    this.registerCommand({
      handler: this.cmdAccept,
      name: "accept",
      permissionLevel: Permission.EVERYONE,
    });
  }

  public roll(roll: Roll) {
    const results: number[] = [];

    for (let i = 0; i < roll.amount; i++) {
      results.push(randomInt(1, roll.sides));
    }

    const total = results.reduce((roll, sum) => sum + roll, 0);

    return { total, results };
  }

  private cmdRoll(command: Command) {
    if (command.params.length === 0) {
      command.params = ["1d6"];
    }

    const def = command.params[0];
    const roll = this.parse(def);

    if (roll == null) {
      this.bot.say(command.channel, `@${command.sender.displayName} ${def} is not a valid dice roll.`);
      return;
    }

    if (roll.amount > this.config.maxRolls) {
      this.bot.say(command.channel, `@${command.sender.displayName} You can only roll ${this.config.maxRolls} dice at once.`);
      return;
    }

    if (roll.sides > this.config.maxSides) {
      this.bot.say(command.channel, `@${command.sender.displayName} You can only roll dice with up to ${this.config.maxSides} sides.`);
      return;
    }

    const { total, results } = this.roll(roll);

    const formatted = results.join(", ");
    this.bot.say(command.channel, `${command.sender.displayName} rolled ${total} (${formatted}).`);
  }

  private parse(str: string): Roll | null {
    const re = /(\d+)?d(\d+)/;
    const match = str.match(re);

    if (match == null) return null;

    return {
      amount: parseInt(match[1], 10) || 1,
      sides: parseInt(match[2], 10),
    };
  }

  private cmdDuel(command: Command) {
    if (command.params.length < 3) {
      return;
    }

    if (this.currentDuel != null) {
      const challenger = this.currentDuel.challenger.displayName;
      const opponent = this.currentDuel.opponent;

      this.bot.say(command.channel, `@${command.sender.displayName} There is already a duel running between ${challenger} and ${opponent}.`);
      return;
    }

    const channel = command.channel;
    const challenger = command.sender;
    const opponent = command.params[0];
    const roll = this.parse(command.params[1]);
    const stake = parseFloat(command.params[2]);

    if (roll == null) {
      this.bot.say(command.channel, `@${challenger.displayName} ${command.params[1]} is not a valid dice roll.`);
      return;
    }

    this.currentDuel = {
      challenger,
      channel,
      opponent,
      roll,
      stake,
    };
  }

  private cmdAccept(command: Command) {
    const duel = this.currentDuel;

    if (duel == null || command.channel !== duel.channel || command.sender.name !== duel.opponent) {
      return;
    }

    const challenger = duel.challenger;
    const opponent = command.sender;

    const challengerResult = this.roll(duel.roll);
    const opponentResult = this.roll(duel.roll);

    const challengerFormatted = challengerResult.results.join(", ");
    const opponentFormatted = opponentResult.results.join(", ");

    this.bot.say(duel.channel, `${challenger.displayName} rolled ${challengerResult.total} (${challengerFormatted})`);
    this.bot.say(duel.channel, `${opponent.displayName} rolled ${opponentResult.total} (${opponentFormatted})`);

    let winner: User | null = null;
    let loser: User | null = null;

    if (challengerResult.total > opponentResult.total) {
      winner = challenger;
      loser = opponent;
    } else if (opponentResult.total > challengerResult.total) {
      winner = opponent;
      loser = challenger;
    }

    if (winner != null && loser != null) {
      this.bot.say(duel.channel, `${winner.displayName} won!`);
    } else {
      this.bot.say(duel.channel, "It's a draw.");
      return;
    }

    this.currentDuel = null;
  }
}
