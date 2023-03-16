
import { Client, OSBError } from 'online-soundboard-client'
import * as logger from '../utils/logger.js'
import * as modal from '../components/modal.js'
import { refreshBoardClients, refreshBoardSounds } from '../utils/refresh.js'
import storage from '../utils/storage.js'
import { palettes } from './theme.js'

const SERVER_URL = 'ws://localhost:1212'

export type ClientData = any

export interface BoardData {
  totalClients: number
}

export interface SoundData {
  name: string
  displayName: string
  duration: number
}

export interface WebsiteData {
  immersive: boolean
  volume: number
  theme: string
  [key: string]: any
}

export let boardId = location.search.slice(1)
export const client = new Client<ClientData, BoardData, SoundData>(SERVER_URL)

export const connected = (): boolean => client.board?.id != null

export const websiteData: WebsiteData = storage.store({
  immersive: true,
  volume: 100,
  theme: Object.keys(palettes)[0]
})

if (boardId === '') {
  const defaultData: BoardData = {
    totalClients: 1
  }
  client.create({ data: defaultData }).then(() => {
    boardId = String(client.board?.id)
    history.replaceState({}, '', new URL(location.origin + `/?${boardId}`))
    setConnected(true)
    logger.log('created board', boardId)
  }).catch((err: OSBError) => {
    setConnected(false)
    logger.error(err.message)
  })
} else {
  join(boardId).then(() => {
    refreshBoardClients()
  }).catch((err: OSBError) => {
    if (err.code !== OSBError.Errors.AuthFailed) throw err
    modal.open('join-board-modal')
  }).catch((err: OSBError) => {
    setConnected(false)
    logger.error(err.message)
  })
}

export async function join (id: string, auth?: string): Promise<void> {
  await client.join(id, auth).then(async () => {
    boardId = String(client.board?.id)
    setConnected(true)
    const sounds = await client.fetchSounds()
    sounds.forEach((s) => {
      storage.osbdb.set(s).catch((err) => {
        logger.error(err)
      })
    })
    refreshBoardSounds()
    logger.log('joined board', boardId)
  })
}

function setConnected (connected: boolean): void {
  document.body.setAttribute('data-connected', connected ? 'yes' : 'no')
  if (!connected) history.replaceState({}, '', location.origin)
}
