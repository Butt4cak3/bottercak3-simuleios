import { Command, Permission, Plugin, User } from "bottercak3";
import CurrencyPlugin from "./currency/plugin";

function randomInt(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

interface Configuration {
  maxRolls: number;
  maxSides: number;
  duelTimeout: number;
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
  private currencyPlugin: CurrencyPlugin | null = null;
  private duels = new Set<Duel>();

  public getDefaultConfiguration(): Configuration {
    return {
      duelTimeout: 60,
      maxRolls: 20,
      maxSides: 120,
    };
  }

  public init() {
    this.bot.waitForPlugin("CurrencyPlugin").then((currencyPlugin) => {
      if (currencyPlugin instanceof CurrencyPlugin) {
        this.currencyPlugin = currencyPlugin;
      }
    });

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

    this.registerCommand({
      handler: this.cmdDecline,
      name: "decline",
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

    if (roll.amount < 1 || roll.amount > this.config.maxRolls) {
      this.bot.say(command.channel, `@${command.sender.displayName} You can only roll ${this.config.maxRolls} dice at once.`);
      return;
    }

    if (roll.sides < 2 || roll.sides > this.config.maxSides) {
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

  private inDuel(username: string, channel: string) {
    return this.getDuel(username, channel) !== null;
  }

  private getDuel(username: string, channel: string) {
    username = username.toLowerCase();
    channel = channel.toLowerCase();

    for (const duel of this.duels) {
      if (duel.channel === channel && (duel.challenger.name === username || duel.opponent === username)) {
        return duel;
      }
    }

    return null;
  }

  private cmdDuel(command: Command) {
    if (command.params.length < 3) {
      return;
    }

    const channel = command.channel;
    const challenger = command.sender;
    const opponent = command.params[0].startsWith("@")
      ? command.params[0].slice(1).toLowerCase()
      : command.params[0].toLowerCase();

    const roll = this.parse(command.params[1]);
    const stake = parseFloat(command.params[2]);

    if (this.inDuel(challenger.name, channel)) {
      this.bot.say(channel, `@${challenger.displayName} You already are in a duel.`);
      return;
    }

    if (stake < 0 || !isFinite(stake)) {
      this.bot.say(channel, `@${challenger.displayName} You have to challenge for a positive number.`);
      return;
    }

    if (opponent === challenger.name) {
      this.bot.say(channel, `@${challenger.displayName} you can't duel yourself.`);
      return;
    }

    if (roll == null) {
      this.bot.say(channel, `@${challenger.displayName} ${command.params[1]} is not a valid dice roll.`);
      return;
    }

    if (this.currencyPlugin != null) {
      const balance = this.currencyPlugin.getBalance(challenger.name, channel);
      if (balance < stake) {
        this.bot.say(channel, `@${challenger.displayName} You don't have enough ${this.currencyPlugin.currency.pluralName} for that.`);
        return;
      }
    }

    const duel = {
      challenger,
      channel,
      opponent,
      roll,
      stake,
    };

    this.duels.add(duel);

    this.bot.say(channel, `${challenger.displayName} challenged ${opponent} to a duel. Type ${this.bot.commandPrefix}accept or ${this.bot.commandPrefix}decline.`);

    setTimeout(() => {
      if (!this.duels.has(duel)) return;

      this.bot.say(duel.channel, `The duel between ${challenger.displayName} and ${opponent} timed out.`);
      this.duels.delete(duel);
    }, this.config.duelTimeout * 1000);
  }

  private cmdAccept(command: Command) {
    const duel = this.getDuel(command.sender.name, command.channel);

    if (duel == null) {
      return;
    }

    const channel = command.channel;
    const challenger = duel.challenger;
    const opponent = command.sender;

    if (this.currencyPlugin != null) {
      const balance = this.currencyPlugin.getBalance(opponent.name, channel);

      if (balance < duel.stake) {
        this.bot.say(channel, `@${challenger.displayName} You don't have enough ${this.currencyPlugin.currency.pluralName} to accept.`);
      }
    }

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
      if (this.currencyPlugin != null) {
        this.currencyPlugin.transfer(loser.name, winner.name, duel.channel, duel.stake);
        const formatted = this.currencyPlugin.currency.format(duel.stake);
        this.bot.say(duel.channel, `${winner.displayName} won ${formatted}!`);
      } else {
        this.bot.say(duel.channel, `${winner.displayName} won!`);
      }
    } else {
      this.bot.say(duel.channel, "It's a draw.");
    }

    this.duels.delete(duel);
  }

  private cmdDecline(command: Command) {
    const duel = this.getDuel(command.sender.name, command.channel);

    if (duel == null) {
      return;
    }

    this.duels.delete(duel);
    this.bot.say(command.channel, `${command.sender.displayName} declined the duel.`);
  }
}
