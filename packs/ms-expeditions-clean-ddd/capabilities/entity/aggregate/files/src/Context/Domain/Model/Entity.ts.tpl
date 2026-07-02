import { AggregateRoot } from '../../../Shared/Domain/AggregateRoot';
import { {{entity}}Id } from '../ValueObject/{{entity}}Id';

export class {{entity}} extends AggregateRoot {
  private constructor(public readonly id: {{entity}}Id) { super(); }
  public static create(id: {{entity}}Id): {{entity}} {
    // AHRE_SLOT_START:{{context}}.{{entity}}.create.domainRules
    // Put aggregate creation invariants here.
    // AHRE_SLOT_END:{{context}}.{{entity}}.create.domainRules
    const entity = new {{entity}}(id);
    // AHRE_SLOT_START:{{context}}.{{entity}}.create.domainEvents
    // Record creation events here.
    // AHRE_SLOT_END:{{context}}.{{entity}}.create.domainEvents
    return entity;
  }
}
