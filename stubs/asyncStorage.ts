const noop = async () => undefined

const AsyncStorage = {
  getItem: async (_key: string) => null,
  setItem: noop,
  removeItem: noop,
  clear: noop,
  getAllKeys: async () => [],
  multiGet: async (keys: string[]) => keys.map((key) => [key, null]),
  multiSet: noop,
  multiRemove: noop,
}

export default AsyncStorage
export { AsyncStorage }

