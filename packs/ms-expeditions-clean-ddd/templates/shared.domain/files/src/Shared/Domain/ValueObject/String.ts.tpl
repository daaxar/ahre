export abstract class StringValueObject { constructor(public readonly value: string) { if (!value.trim()) throw new Error('Value is required'); } }
