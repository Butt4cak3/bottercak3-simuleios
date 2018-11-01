import { ChatMessage, Plugin } from "bottercak3";
import fetch from "node-fetch";

interface RepoConfig {
  owner: string;
  name: string;
}

interface IssueTypeResponse {
  data: {
    repository: {
      issueOrPullRequest: {
        __typename: string;
      };
    };
  };
}

interface IssueResponse {
  data: {
    repository: {
      issue: {
        title: string;
        url: string;
      };
    };
  };
}

interface PullRequestResponse {
  data: {
    repository: {
      pullRequest: {
        title: string;
        url: string;
      };
    };
  };
}

enum IssueType {
  ISSUE,
  PULL_REQUEST
}

export default class GitHub extends Plugin {
  private repos: Dict<RepoConfig> = {
    buttercak3: {
      owner: "algorithm-archivists",
      name: "algorithm-archive"
    },
    simuleios: {
      owner: "algorithm-archivists",
      name: "algorithm-archive"
    }
  };

  private get apiKey() {
    return process.env.GITHUB_AUTH_TOKEN;
  }

  public init() {
    this.bot.onChatMessage.subscribe(this.onChatMessage, this);
  }

  private async onChatMessage(message: ChatMessage) {
    const re = /#(\d+)/g;

    let match: RegExpExecArray | null = null;

    while ((match = re.exec(message.text)) != null) {
      const issueNumber = parseInt(match[1]);
      const issue = await this.getIssueData(message.channel, issueNumber);
      if (issue == null) return;

      this.bot.say(message.channel, `${issue.title}: ${issue.url}`);
    }
  }

  private async getIssueData(channel: string, issueNumber: number) {
    const repo = this.getRepo(channel);
    if (repo == null) return null;

    const type = await this.getIssueType(channel, issueNumber);
    if (type == null) return null;

    const typeString = type === IssueType.ISSUE ? "issue" : "pullRequest";

    const query = `
    {
      repository(owner: "${repo.owner}", name: "${repo.name}") {
        ${typeString}(number: ${issueNumber}) {
          title,
          url
        }
      }
    }`;

    const result = await this.runQuery(query) as IssueResponse & PullRequestResponse;

    return result.data.repository[typeString];
  }

  private async getIssueType(channel: string, issueNumber: number) {
    const repo = this.getRepo(channel);

    if (repo == null) return null;

    const query = `
    {
      repository(owner: "${repo.owner}", name: "${repo.name}") {
        issueOrPullRequest(number: ${issueNumber}) {
          __typename
        }
      }
    }`;

    const result = await this.runQuery(query) as IssueTypeResponse;

    const typeName = result.data.repository.issueOrPullRequest.__typename;

    return typeName === "Issue"
      ? IssueType.ISSUE
      : IssueType.PULL_REQUEST;
  }

  private getRepo(channel: string) {
    if (channel in this.repos) {
      return this.repos[channel];
    } else {
      return null;
    }
  }

  private async runQuery(query: string) {
    const apiKey = this.apiKey;

    const headers = {
      "Authorization": `Bearer ${apiKey}`
    };

    const body = JSON.stringify({ query });

    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers,
      body
    });

    if (response.status === 200) {
      try {
        return await response.json()
      } catch (_e) {
        return null;
      }
    } else {
      return null;
    }
  }
}
