import { Body, JsonController, Post } from 'routing-controllers';
import { Create{{entity}} } from '../../../Application/UseCase/Create{{entity}}/Create{{entity}}';

@JsonController('/{{entity}}')
export class {{entity}}Controller {
  constructor(private readonly create{{entity}}: Create{{entity}}) {}
  @Post()
  public async create(@Body() body: { id: string }): Promise<void> {
    // AHRE_SLOT_START:{{context}}.{{entity}}Controller.create.transportMapping
    await this.create{{entity}}.run({ id: body.id });
    // AHRE_SLOT_END:{{context}}.{{entity}}Controller.create.transportMapping
  }
}
