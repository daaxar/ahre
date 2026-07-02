import { {{entity}} } from '../../../Domain/Model/{{entity}}';
import { {{entity}}Id } from '../../../Domain/ValueObject/{{entity}}Id';
import { {{entity}}Repository } from '../../../Domain/Repository/{{entity}}Repository';

export class Create{{entity}} {
  constructor(private readonly repository: {{entity}}Repository) {}
  public async run(input: { id: string }): Promise<void> {
    // AHRE_SLOT_START:{{context}}.Create{{entity}}.run.orchestration
    const entity = {{entity}}.create(new {{entity}}Id(input.id));
    // AHRE_SLOT_END:{{context}}.Create{{entity}}.run.orchestration
    // AHRE_SLOT_START:{{context}}.Create{{entity}}.run.persistence
    await this.repository.save(entity);
    // AHRE_SLOT_END:{{context}}.Create{{entity}}.run.persistence
  }
}
