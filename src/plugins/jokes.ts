import { Command, Permission, Plugin } from "bottercak3";
import fetch from "node-fetch";
import { Cooldown } from "../cooldown";

interface APIResponse {
  id: string;
  joke: string;
  status: number;
}

export default class Jokes extends Plugin {
  private commandCooldown = new Cooldown(10);

  public init() {
    this.bot.registerCommand({
      name: "joke",
      handler: this.joke.bind(this),
      permissionLevel: Permission.EVERYONE
    });
  }

  public async joke(command: Command) {
    if (!this.commandCooldown.done) return;
    this.commandCooldown.restart();

    const response = await fetch("https://icanhazdadjoke.com/", {
      headers: {
        "Accept": "application/json"
      }
    });
    const joke = await response.json() as APIResponse;

    this.bot.say(command.channel, joke.joke);
  }
}
