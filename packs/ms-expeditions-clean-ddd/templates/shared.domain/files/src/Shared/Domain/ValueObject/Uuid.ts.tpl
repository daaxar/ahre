export abstract class Uuid { constructor(public readonly value: string) { if (!value) throw new Error('UUID is required'); } }
