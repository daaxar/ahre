import { Get, JsonController } from 'routing-controllers';
import { {{usecase}} } from '../../../Application/UseCase/{{usecase}}/{{usecase}}';

@JsonController('{{route}}')
export class {{controller}} {
  constructor(private readonly useCase: {{usecase}}) {}

  @Get()
  public async execute(): Promise<unknown> {
    // AHRE_SLOT_START:{{context}}.{{controller}}.transportMapping
    return this.useCase.run();
    // AHRE_SLOT_END:{{context}}.{{controller}}.transportMapping
  }
}
