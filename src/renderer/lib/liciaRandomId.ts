export default function randomId(
  size = 21,
  symbols = 'abcdefghijklmnopqrstuvwxyz0123456789'
) {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(size))
  let id = ''

  for (let index = size - 1; index >= 0; index--) {
    id += symbols[bytes[index] % symbols.length]
  }

  return id
}