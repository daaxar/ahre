export class Kernel {
  public async start(): Promise<void> {
    // AHRE_SLOT_START:service.{{service}}.kernel.bootstrap
    // Initialize environment, DI container, persistence, HTTP server and consumers.
    // AHRE_SLOT_END:service.{{service}}.kernel.bootstrap
  }
}
