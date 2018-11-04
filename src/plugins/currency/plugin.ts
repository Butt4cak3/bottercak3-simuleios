import Database from "better-sqlite3";
import { Command, Event, Permission, Plugin, TwitchBot } from "bottercak3";
import fs from "fs";
import Currency from "./currency";

interface Configuration {
  decimals: number;
}

interface BalanceChange {
  username: string;
  oldAmount: number;
  newAmount: number;
}

export default class CurrencyPlugin extends Plugin {
  public get currency() {
    return this._currency;
  }

  public readonly onBalanceChanged = new Event<BalanceChange>();

  protected config: Configuration = this.getDefaultConfiguration();

  private readonly db: Database;
  private _currency = new Currency("Credit", "Credits", this.config.decimals);

  public constructor(bot: TwitchBot, name: string) {
    super(bot, name);

    if (!fs.existsSync("data")) {
      fs.mkdirSync("data");
    }

    this.db = new Database("data/currency.db");
  }

  public getDefaultConfiguration(): Configuration {
    return {
      decimals: 2,
    };
  }

  public init() {
    this.setupDatabase();

    this.registerCommand({
      handler: this.manage,
      name: "credits",
      permissionLevel: Permission.EVERYONE,
    });
  }

  public hasAccount(username: string, channel: string) {
    username = username.toLowerCase();
    channel = channel.toLowerCase();
    const row = this.db.prepare("SELECT * FROM accounts WHERE username = ? AND channel = ?").get(username, channel);

    return row != null;
  }

  public getBalance(username: string, channel: string): number {
    username = username.toLowerCase();
    channel = channel.toLowerCase();

    const row = this.db.prepare("SELECT * FROM accounts WHERE username = ? AND channel = ?").get(username, channel);

    if (row == null) {
      const insert = this.db.prepare("INSERT INTO accounts (username, channel, balance) VALUES (?, ?, ?)");
      insert.run(username, channel, 0);
      return 0;
    }

    return this.currency.round(row.balance);
  }

  public setBalance(username: string, channel: string, balance: number) {
    if (!isFinite(balance)) return false;

    balance = this.currency.round(balance);
    username = username.toLowerCase();
    const oldAmount = this.getBalance(username, channel);

    const update = this.db.prepare("UPDATE accounts SET balance = ? WHERE username = ? AND channel = ?");
    update.run(balance, username, channel);

    this.onBalanceChanged.invoke({
      newAmount: balance,
      oldAmount,
      username,
    });

    return true;
  }

  public addAmount(recipient: string, channel: string, amount: number) {
    amount = this.currency.round(amount);
    const balance = this.getBalance(recipient, channel);
    const newBalance = balance + amount;

    return this.setBalance(recipient, channel, newBalance);
  }

  public subtractAmount(recipient: string, channel: string, amount: number) {
    return this.addAmount(recipient, channel, -amount);
  }

  public transfer(from: string, to: string, channel: string, amount: number) {
    return this.subtractAmount(from, channel, amount) && this.addAmount(to, channel, amount);
  }

  private setupDatabase() {
    this.db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      username TEXT,
      channel TEXT,
      balance REAL,
      PRIMARY KEY (username, channel)
    )
    `);
  }

  private manage(command: Command) {
    if (command.params.length === 0) {
      this.cmdGetBalance(command);
      return;
    }

    const subcommand = command.params[0].toLowerCase();

    switch (subcommand) {
      case "give":
        this.cmdGiveAmount(command);
        break;
      case "set":
        this.cmdSetAmount(command);
        break;
      case "add":
        this.cmdAddAmount(command);
        break;
      case "sub":
      case "take":
        this.cmdSubAmount(command);
        break;
    }
  }

  private cmdGetBalance(command: Command) {
    const { channel, sender } = command;
    const balance = this.getBalance(sender.name, channel);
    const formatted = this.currency.format(balance);

    this.bot.say(channel, `@${sender.displayName} You have ${formatted}.`);
  }

  private cmdSetAmount(command: Command) {
    if (!command.sender.hasPermission(Permission.BROADCASTER) || command.params.length < 3) {
      return;
    }

    const recipient = command.params[1].startsWith("@")
      ? command.params[1].slice(1)
      : command.params[1];

    const newAmount = parseFloat(command.params[2]);

    if (this.setBalance(recipient, command.channel, newAmount)) {
      const formatted = this.currency.format(newAmount);
      this.bot.say(command.channel, `@${command.sender.displayName} ${recipient} now has ${formatted}.`);
    } else {
      this.bot.say(command.channel, `@${command.sender.displayName} ${command.params[2]} is not a valid amount.`);
    }
  }

  private cmdAddAmount(command: Command) {
    if (!command.sender.hasPermission(Permission.BROADCASTER) || command.params.length < 3) {
      return;
    }

    const recipient = command.params[1].startsWith("@")
      ? command.params[1].slice(1)
      : command.params[1];

    const amount = parseFloat(command.params[2]);

    if (this.addAmount(recipient, command.channel, amount)) {
      const formatted = this.currency.format(amount);
      this.bot.say(command.channel, `@${command.sender.displayName} Added ${formatted} to ${recipient}'s account.`);
    } else {
      this.bot.say(command.channel, `@${command.sender.displayName} ${command.params[2]} is not a valid amount.`);
    }
  }

  private cmdSubAmount(command: Command) {
    if (!command.sender.hasPermission(Permission.BROADCASTER) || command.params.length < 3) {
      return;
    }

    const recipient = command.params[1].startsWith("@")
      ? command.params[1].slice(1)
      : command.params[1];

    const amount = parseFloat(command.params[2]);

    if (this.subtractAmount(recipient, command.channel, amount)) {
      const formatted = this.currency.format(amount);
      this.bot.say(command.channel, `@${command.sender.displayName} You took ${formatted} from ${recipient}.`);
    } else {
      this.bot.say(command.channel, `@${command.sender.displayName} ${command.params[2]} is not a valid amount.`);
    }
  }

  private cmdGiveAmount(command: Command) {
    if (command.params.length < 3) {
      return;
    }

    const channel = command.channel;
    const sender = command.sender;
    const recipient = command.params[1].startsWith("@")
      ? command.params[1].slice(1)
      : command.params[1];

    const amount = Math.abs(parseFloat(command.params[2]));

    if (!this.hasAccount(recipient, channel)) {
      this.bot.say(command.channel, `@${sender.displayName} I don't know the user ${recipient}.`);
      return;
    }

    if (amount > this.getBalance(sender.name, channel)) {
      this.bot.say(command.channel, `@${sender.displayName} You don't have enough for that.`);
      return;
    }

    if (this.transfer(sender.name, recipient, channel, amount)) {
      const formatted = this.currency.format(amount);
      this.bot.say(channel, `@${sender.displayName} You gave ${formatted} to ${recipient}`);
    } else {
      this.bot.say(channel, `@${sender.displayName} ${command.params[2]} is not a valid amount.`);
    }
  }
}
