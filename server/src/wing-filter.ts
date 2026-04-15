export function isHiddenWing(name: string): boolean {
  return name.startsWith('.') || name.startsWith('wing_');
}
