import { {{entity}}Repository } from '../../Domain/Repository/{{entity}}Repository';
import { {{entity}} } from '../../Domain/Model/{{entity}}';
export class Mongo{{entity}}Repository implements {{entity}}Repository {
  public async save(entity: {{entity}}): Promise<void> {
    // AHRE_SLOT_START:{{context}}.Mongo{{entity}}Repository.save.mapping
    void entity;
    // AHRE_SLOT_END:{{context}}.Mongo{{entity}}Repository.save.mapping
  }
}
