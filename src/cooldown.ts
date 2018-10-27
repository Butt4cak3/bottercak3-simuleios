export class Cooldown {
  private timeout: NodeJS.Timeout | null;
  private running: boolean;
  private ms: number = 0;

  public get done() {
    return !this.running;
  }

  private get time() {
    return this.ms / 1000;
  }

  private set time(time: number) {
    this.ms = time * 1000;
  }

  public constructor(time: number) {
    this.timeout = null;
    this.running = false;
    this.time = time;
  }

  public start(time = this.time) {
    if (this.timeout != null) return;

    this.time = time;
    this.running = true;

    this.timeout = setTimeout(() => {
      this.running = false;
    }, this.ms);
  }

  public reset() {
    if (this.timeout != null) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }

  public restart() {
    this.reset();
    this.start();
  }
}
