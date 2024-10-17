export function isDev() {
  // @ts-ignore
  return import.meta.env.MODE === 'development'
}
