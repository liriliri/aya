import memoize from 'licia/memoize'
import FileStore from 'licia/FileStore'
import { getUserDataPath } from './util'

export const getMainStore = memoize(function () {
  return new FileStore(getUserDataPath('data/main.json'), {
    bounds: {
      width: 1280,
      height: 850,
    },
    recentProjects: [],
  })
})
