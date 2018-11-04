export default class Currency {
  public readonly singularName: string;
  public readonly pluralName: string;
  public readonly decimals: number;

  public constructor(singularName: string, pluralName: string, decimals: number) {
    this.singularName = singularName;
    this.pluralName = pluralName;
    this.decimals = decimals;
  }

  public format(amount: number) {
    if (Math.abs(amount) === 1) {
      return `${amount} ${this.singularName}`;
    } else {
      return `${amount} ${this.pluralName}`;
    }
  }

  public round(amount: number) {
    return Math.floor(amount * Math.pow(10, this.decimals)) / Math.pow(10, this.decimals);
  }
}
