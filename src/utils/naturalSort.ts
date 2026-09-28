/** 파일명에 숫자가 있을 때 1, 2, ..., 10, 11 순으로 정렬한다. */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export function sortFilesNaturally<T extends { name: string }>(files: T[]): T[] {
  return [...files].sort((a, b) => naturalCompare(a.name, b.name));
}
