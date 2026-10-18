/** Map Prisma enum 'mixed_use' to client-expected 'mixed-use' */
export function serializePropertyType(type: string): string {
  return type === 'mixed_use' ? 'mixed-use' : type;
}
