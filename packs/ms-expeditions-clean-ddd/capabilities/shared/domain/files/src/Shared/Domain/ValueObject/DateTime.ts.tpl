export class DateTime { constructor(public readonly value: Date) { if (Number.isNaN(value.getTime())) throw new Error('Valid date required'); } }
