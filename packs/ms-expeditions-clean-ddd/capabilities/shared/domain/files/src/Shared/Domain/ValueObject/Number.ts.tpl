export abstract class NumberValueObject { constructor(public readonly value: number) { if (!Number.isFinite(value)) throw new Error('Finite number required'); } }
export abstract class PositiveNumber extends NumberValueObject { constructor(value: number) { super(value); if (value <= 0) throw new Error('Positive number required'); } }
