/** Follow server page counts so selection controls never silently truncate associates or cases. */
export async function getAllPages<T>(fetchPage: (page: number) => Promise<{ content: T[]; totalPages?: number }>): Promise<T[]> {
  const first = await fetchPage(0)
  const result = [...first.content]
  for (let page = 1; page < (first.totalPages ?? 1); page += 1) {
    result.push(...(await fetchPage(page)).content)
  }
  return result
}
