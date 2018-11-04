export default class Currency {
  public readonly singularName: string;
  public readonly pluralName: string;

  public constructor(singularName: string, pluralName: string) {
    this.singularName = singularName;
    this.pluralName = pluralName;
  }

  public format(amount: number) {
    if (Math.abs(amount) === 1) {
      return `${amount} ${this.singularName}`;
    } else {
      return `${amount} ${this.pluralName}`;
    }
  }
}
