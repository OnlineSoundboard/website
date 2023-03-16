import { type InputSound, type OSBError, type Sound } from 'online-soundboard-client'
import { client, connected, websiteData, type SoundData } from './board.js'
import * as logger from '../utils/logger.js'
import { refreshBoardSound, refreshBoardSounds } from '../utils/refresh.js'
import * as modal from '../components/modal.js'
import { getContrast, Contrast } from './theme.js'
import storage, { download } from '../utils/storage.js'
import { type Form } from '../components/form.js'
import { onTrigger } from '../components/input.js'

export const MAX_AUDIO_SIZE = 1 * 1024 * 1024
export const MAX_AUDIO_DURATION = 10
export const DEFAULT_VOLUME = 100
export const DEFAULT_SOUNDS_COLUMNS = 6
export const DEFAULT_SOUNDS_ROWS = 5

export const IconsSpritePath = '/assets/icons-sprite.svg'

export const localSounds: Array<Sound<SoundData>> = []

export const soundsDimensions = {
  columns: DEFAULT_SOUNDS_COLUMNS,
  rows: DEFAULT_SOUNDS_ROWS
}

export function checkSoundName (name: string): string | null {
  if (name === '') return 'Audio name required'

  return null
}

export function checkSoundFile (file?: File): string | null {
  if (file == null) return 'Audio file required'
  if (file.size <= 0) return 'Audio file cannot be empty'
  if (file.size > MAX_AUDIO_SIZE) return 'Audio file too heavy (max 1MB)'

  return null
}

interface SoundRenderOptions {
  page: number
  color: string
  colorIndex: number
  refreshColors?: boolean
}

export function renderSound (sound: Sound<SoundData>, options?: SoundRenderOptions): void {
  const $sounds = document.getElementById('sounds')
  if ($sounds == null) return
  let $sound = document.getElementById(sound.id)
  const newSound = $sound == null

  if ($sound == null) {
    $sound = document.createElement('div')
    $sound.id = sound.id
    $sound.classList.add('sound')
    $sound.setAttribute('data-sound-type', String(sound.ext))
    $sound.setAttribute('data-sound-duration', String(sound.data.duration))
  }

  if (options?.color != null && (newSound || options?.refreshColors === true)) {
    $sound.style.setProperty('--card-background', options.color)
    $sound.style.setProperty('--card-color', getContrast(options.color) === Contrast.LIGHT ? 'var(--card-text-light)' : 'var(--card-text-dark)')
  }

  // easter-egg
  if (['cest ma pute', 'c\'est ma pute'].includes(sound.data.name.toLowerCase()) && sound.data.displayName.toLowerCase() === 'florian') {
    $sound.style.setProperty('--easter-egg', '1')
  } else {
    $sound.style.removeProperty('--easter-egg')
  }

  if (options?.colorIndex != null) {
    const soundsMax = soundsDimensions.columns * soundsDimensions.rows
    $sound.classList.toggle('hidden', options.colorIndex < options.page * soundsMax || options.colorIndex >= (options.page + 1) * soundsMax)
  }

  const originalSoundName = sound.data.name !== sound.data.displayName ? `(${sound.data.name})` : ''
  $sound.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="sound-actions"></div>
      </div>
      <div class="card-body">
        <p>
          <span class="sound-display-name"></span>
          <small class="sound-name"></small>
        </p>
      </div>
      <div class="card-footer">
        <span class="sound-duration"></span>
      </div>
    </div>
  `
  const $displayName = $sound.getElementsByClassName('sound-display-name').item(0) as HTMLElement
  if ($displayName != null) $displayName.innerText = sound.data.displayName ?? sound.data.name
  const $name = $sound.getElementsByClassName('sound-name').item(0) as HTMLElement
  if ($name != null) $name.innerText = originalSoundName
  const $duration = $sound.getElementsByClassName('sound-duration').item(0) as HTMLElement
  if ($duration != null) $duration.innerText = `${sound.data.duration}s`

  // actions
  $sound.getElementsByClassName('sound-actions').item(0)?.append(...renderSoundActions(sound))

  if (newSound) {
    onTrigger($sound, () => { client.play(sound.id) })
    $sounds.append($sound)
  }
}

export function renderSoundActions (sound: Sound<SoundData>): HTMLElement[] {
  // download
  const $download = document.createElement('button')
  $download.type = 'button'
  $download.classList.add('button')
  $download.title = 'Download sound'
  onTrigger($download, (e) => {
    e.stopPropagation()
    if (sound.buffer == null) return
    download(sound.buffer, `${sound.data.displayName.replace(/ /g, '_')}.${sound.ext}`)
  })
  $download.innerHTML = `<svg><use href="${IconsSpritePath}#download"></use></svg>`

  // edit
  const $edit = document.createElement('button')
  $edit.type = 'button'
  $edit.setAttribute('data-toggle', 'modal')
  $edit.setAttribute('data-target', 'edit-sound-modal')
  $edit.classList.add('button')
  $edit.title = 'Edit sound'
  $edit.innerHTML = `<svg><use href="${IconsSpritePath}#edit"></use></svg>`
  onTrigger($edit, (e) => {
    e.stopPropagation()
    const $form = document.getElementById('edit-sound-form')
    $form?.setAttribute('data-sound-id', sound.id)
  })
  modal.button($edit)

  // delete
  const $delete = document.createElement('button')
  $delete.type = 'button'
  $delete.classList.add('button')
  $delete.title = 'Delete sound'
  onTrigger($delete, (e) => {
    e.stopPropagation()
    client.delete(sound).then(async () => {
      removeSound(sound.id)
    }).catch((err: OSBError) => {
      logger.error(err)
    })
  })
  $delete.innerHTML = `<svg><use href="${IconsSpritePath}#delete"></use></svg>`

  return [$download, $edit, $delete]
}

let audioContext: AudioContext

export function playSound (sound: Sound<SoundData>): void {
  if (sound.buffer == null) return
  if (audioContext == null) audioContext = new AudioContext()

  storage.osbdb.set(sound).catch((err) => {
    logger.error(err)
  })

  const source: AudioBufferSourceNode = audioContext.createBufferSource()

  const gainNode = audioContext.createGain()
  gainNode.gain.value = websiteData.volume / 100

  audioContext.decodeAudioData(copyArrayBuffer(sound.buffer)).then((audioBuffer) => {
    source.buffer = audioBuffer
    gainNode.connect(audioContext.destination)
    source.connect(gainNode)
    source.start(0)
  }).catch((err) => {
    logger.error(err.message)
  })

  refreshBoardSound(sound.id)
}

export function addSound (form: Form): void {
  if (!connected()) return

  const file = form.inputs.get('sound-file')?.$input.files?.[0]
  if (file == null) return

  const soundName = form.inputs.get('sound-name')?.$input.value ?? ''
  const sound: InputSound<SoundData> = {
    buffer: undefined,
    data: {
      name: soundName,
      displayName: soundName,
      duration: -1
    }
  }

  const reader = new FileReader()
  reader.addEventListener('load', (e) => {
    const blob = new Blob([e.target?.result ?? ''], { type: file.type })
    const url = URL.createObjectURL(blob)
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.addEventListener('loadedmetadata', () => {
      if (sound.data != null) {
        sound.data.duration = Number((Math.round(audio.duration * 10) / 10).toFixed(1))
        if (sound.data.duration > MAX_AUDIO_DURATION) {
          form.inputs.get('sound-file')?.invalid(`Audio duration too long [max ${MAX_AUDIO_DURATION}s]`)
          return
        }
      }
      file.arrayBuffer().then((arrayBuffer) => {
        sound.buffer = arrayBuffer
        client.cache(sound).then((soundId) => {
          modal.close('add-sound-modal')
          const cachedSound = client.sounds.find((s) => s.id === soundId)
          if (cachedSound == null) return
          logger.log('added sound', cachedSound)
          storage.osbdb.set(cachedSound).catch((err) => {
            logger.error(err)
          })
          refreshBoardSounds()
        }).catch((err: OSBError) => {
          logger.error(err.cause)
          form.inputs.get('sound-file')?.invalid(String(err.cause ?? err.message))
        })
      }).catch((err: Error) => {
        logger.error(err.message)
      })
    })
    audio.addEventListener('error', () => {
      logger.error('Failed to load audio metadata')
      form.inputs.get('sound-file')?.invalid('Invalid audio format')
    })
    audio.src = url
  })
  reader.readAsArrayBuffer(file)
}

export function updateSound (sound: Sound<SoundData>): void {
  storage.osbdb.set(sound).catch((err) => {
    logger.error(err)
  })

  refreshBoardSound(sound.id)
}

export function removeSound (soundId: string): void {
  storage.osbdb.remove(soundId).catch((err) => {
    logger.error(err)
  })

  refreshBoardSound(soundId)
}

export function checkScreenSize (min: number, max: number, onmatch?: () => void): MediaQueryList {
  let query = ''
  const minQuery = min > -1 ? `(min-width: ${min}px)` : ''
  const maxQuery = max > -1 ? `(max-width: ${max}px)` : ''
  if (minQuery !== '' && maxQuery !== '') query = `${minQuery} AND ${maxQuery}`
  else query = minQuery + maxQuery
  const mediaQueryLarge = matchMedia(query)
  mediaQueryLarge.onchange = (e) => { if (e.matches) onmatch?.() }
  if (mediaQueryLarge.matches) onmatch?.()
  return mediaQueryLarge
}

function copyArrayBuffer (src: ArrayBuffer): ArrayBuffer {
  const dst = new ArrayBuffer(src.byteLength)
  new Uint8Array(dst).set(new Uint8Array(src))
  return dst
}
