import { ChatMessage, Command, Permission, Plugin } from "bottercak3";
import fetch from "node-fetch";
import unescape from "unescape";

export default class LinkPreview extends Plugin {
  private enabled: boolean = true;
  private onKeywords = ["1", "yes", "on", "enable", "enabled", "true", "y"];
  private offKeywords = ["0", "no", "off", "disable", "disabled", "false", "n"];

  public init() {
    this.registerCommand({
      name: "linkpreview",
      handler: this.cmdLinkPreview,
      permissionLevel: Permission.MODERATOR
    })
    this.bot.onChatMessage.subscribe(this.onChatMessage, this);
  }

  private cmdLinkPreview(command: Command) {
    if (command.params.length < 1) {
      this.bot.say(command.channel, `@${command.sender.displayName} Try ${this.bot.config.commandPrefix}linkpreview on/off`);
      return;
    }

    const newState = command.params[0];
    if (this.onKeywords.indexOf(newState) !== -1) {
      this.enabled = true;
      this.bot.say(command.channel, "Link previews are now on.");
    } else if (this.offKeywords.indexOf(newState) !== -1) {
      this.enabled = false;
      this.bot.say(command.channel, "Link previews are now off.");
    } else {
      const keywordList = this.onKeywords.concat(this.offKeywords).join(", ");

      this.bot.say(command.channel, `I don't know "${newState}". Try one of the following: ${keywordList}`);
    }
  }

  private async onChatMessage(message: ChatMessage) {
    if (!this.enabled) return;

    const re = /https?:\/\/\S+/g;
    const urls = message.text.match(re);

    if (urls == null) return;

    for (const url of urls) {
      try {
        const title = await this.getWebsiteTitle(url);
        if (title != null) {
          this.bot.say(message.channel, `Link description: ${title}`);
        }
      } catch (e) {
        if (e instanceof Error) {
          console.error(e.stack);
        }
      }
    }
  }

  private async getWebsiteTitle(url: string) {
    const response = await fetch(url);
    const text = await response.text();

    // Don't do this at home! Parsing HTML with regular expressions is bad.
    // See https://stackoverflow.com/questions/1732348/regex-match-open-tags-except-xhtml-self-contained-tags/1732454#1732454
    const re = /<\s*title[^>]*>([^<]+)<\s*\/\s*title\s*>/i;

    const match = re.exec(text);
    if (match == null) return null;

    return unescape(match[1]);
  }
}
