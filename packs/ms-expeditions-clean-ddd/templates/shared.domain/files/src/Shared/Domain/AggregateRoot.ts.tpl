export abstract class AggregateRoot {
  private readonly domainEvents: unknown[] = [];
  protected record(event: unknown): void { this.domainEvents.push(event); }
  public pullDomainEvents(): unknown[] { return this.domainEvents.splice(0); }
}
