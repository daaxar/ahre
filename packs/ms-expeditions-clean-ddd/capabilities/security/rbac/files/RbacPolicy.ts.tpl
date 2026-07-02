export type RoleGroup = 'client' | 'logisticOperator' | 'warehouse';
export class RbacPolicy { public allows(role: RoleGroup, allowed: readonly RoleGroup[]): boolean { return allowed.includes(role); } }
