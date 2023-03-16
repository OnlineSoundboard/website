import { type Sound } from 'online-soundboard-client'
import { type SoundData } from '../board/board.js'
import * as logger from './logger.js'

const LOCAL_STORAGE_KEY = 'osb'

export function set (key: string, value: string): void {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}-${key}`, value)
  } catch (error) {
    logger.error(error)
  }
}

export function get (key: string): string | null {
  return localStorage.getItem(`${LOCAL_STORAGE_KEY}-${key}`)
}

export function store<T extends object> (data: T): T {
  return new Proxy<T>(data, {
    get (obj, prop) {
      const value = String(get(String(prop)) ?? obj[prop as keyof T])
      try {
        return JSON.parse(value)
      } catch (_) {
        return value
      }
    },
    set (target, prop, value) {
      target[prop as keyof T] = value
      set(String(prop), JSON.stringify(value))
      dispatchEvent(new CustomEvent(`${LOCAL_STORAGE_KEY}-${String(prop)}`, { detail: value }))
      return true
    }
  })
}

export function parse (key: string): any {
  const value = get(key)
  if (value == null) return null
  try {
    return JSON.parse(value)
  } catch (_) {
    return value
  }
}

class OSBDB {
  private static readonly DB_NAME = 'OnlineSoundBoardCache'
  private static readonly STORE_NAME = 'OSBCache'

  public async open (): Promise<IDBDatabase> {
    const openRequest = indexedDB.open(OSBDB.DB_NAME, 4)
    return await new Promise((resolve, reject) => {
      openRequest.onerror = () => { reject(new Error('Error loading database')) }
      openRequest.onsuccess = () => { resolve(openRequest.result) }
      openRequest.onupgradeneeded = () => {
        openRequest.result.onerror = () => { reject(new Error('Error loading database')) }
        const request = openRequest.result.createObjectStore(OSBDB.STORE_NAME, { keyPath: 'id' })
        request.transaction.oncomplete = () => { resolve(openRequest.result) }
      }
    })
  }

  public async getAll (): Promise<Array<Sound<SoundData>>> {
    return await new Promise((resolve, reject) => {
      this.open().then((db) => {
        let sounds: Array<Sound<SoundData>> = []
        const transaction = db.transaction(OSBDB.STORE_NAME)
        const objectStore = transaction.objectStore(OSBDB.STORE_NAME)
        const request = objectStore.getAll()
        request.onerror = () => { reject(request.error) }
        request.onsuccess = () => {
          sounds = request.result.map<Sound<SoundData>>((r) => ({
            id: r.id,
            buffer: r.buffer,
            ext: r.ext,
            data: {
              name: r.name,
              displayName: r.displayName,
              duration: r.duration
            }
          }))
        }
        transaction.onabort = () => { reject(transaction.error) }
        transaction.oncomplete = () => {
          db.close()
          resolve(sounds)
        }
      }).catch((err) => { reject(err) })
    })
  }

  public async set (sound: Sound<SoundData>): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      if (sound == null) { reject(new Error('Sound is null')); return }
      this.open().then((db) => {
        const transaction = db.transaction(OSBDB.STORE_NAME, 'readwrite')
        const objectStore = transaction.objectStore(OSBDB.STORE_NAME)
        objectStore.put({
          id: sound.id,
          buffer: sound.buffer,
          ext: sound.ext,
          name: sound.data.name,
          displayName: sound.data.displayName,
          duration: sound.data.duration
        })
        transaction.onabort = () => { reject(transaction.error) }
        transaction.oncomplete = () => {
          db.close()
          resolve()
        }
      }).catch((err) => { reject(err) })
    })
  }

  public async remove (soundId: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      if (soundId == null) { reject(new Error('Sound id is null')); return }
      this.open().then((db) => {
        const transaction = db.transaction(OSBDB.STORE_NAME, 'readwrite')
        const objectStore = transaction.objectStore(OSBDB.STORE_NAME)
        objectStore.delete(soundId)
        transaction.onabort = () => { reject(transaction.error) }
        transaction.oncomplete = () => {
          db.close()
          resolve()
        }
      }).catch((err) => { reject(err) })
    })
  }
}

export const osbdb = new OSBDB()

export function download (data: ArrayBuffer, fileName: string): void {
  const blob = new Blob([data])
  const url = URL.createObjectURL(blob)
  const $a = document.createElement('a')
  $a.href = url
  $a.download = fileName
  $a.click()
  URL.revokeObjectURL(url)
}

export default {
  get,
  set,
  store,
  parse,
  osbdb
}
