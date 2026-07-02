export class {{event}}Consumer {
  public async consume(message: unknown): Promise<void> {
    // AHRE_SLOT_START:{{context}}.{{event}}Consumer.consume.mapping
    void message;
    // AHRE_SLOT_END:{{context}}.{{event}}Consumer.consume.mapping
  }
}
