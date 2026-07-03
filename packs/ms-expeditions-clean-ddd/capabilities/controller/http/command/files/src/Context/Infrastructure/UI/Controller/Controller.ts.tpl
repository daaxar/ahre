import { Body, JsonController, Post } from 'routing-controllers';
import { {{usecase}} } from '../../../Application/UseCase/{{usecase}}/{{usecase}}';

@JsonController('{{route}}')
export class {{controller}} {
  constructor(private readonly useCase: {{usecase}}) {}

  @Post()
  public async execute(@Body() body: Record<string, unknown>): Promise<void> {
    // AHRE_SLOT_START:{{context}}.{{controller}}.transportMapping
    await this.useCase.run(body);
    // AHRE_SLOT_END:{{context}}.{{controller}}.transportMapping
  }
}
