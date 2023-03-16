import './style.less'
import { type Sound, type OSBError } from 'online-soundboard-client'
import { client, boardId, join, type SoundData, websiteData, connected } from './board/board.js'
import { Form } from './components/form.js'
import * as logger from './utils/logger.js'
import * as modal from './components/modal.js'
import storage from './utils/storage.js'
import { onTrigger, inputFile, inputSwitch, inputRange } from './components/input.js'
import { refreshBoardData, refreshBoardSounds, refreshGlobalVolume, refreshImmersive } from './utils/refresh.js'
import { checkSoundFile, playSound, soundsDimensions, checkScreenSize, updateSound, removeSound, checkSoundName, addSound } from './board/sound.js'
import * as tab from './components/tab.js'
import { setThemePalettes } from './board/theme.js'

storage.osbdb.open().then(async () => {
  const sounds = await storage.osbdb.getAll()
  Promise.allSettled(sounds.map(async (s: Sound<SoundData>) => {
    await client.cache({ ...s, buffer: s.buffer, data: { ...s.data, displayName: s.data.displayName ?? s.data.name } })
  })).then((res) => {
    res.forEach((r) => { if (r.status === 'rejected') logger.error(r.reason?.cause) })
    refreshBoardSounds(true)
  }).catch((err) => { logger.error(err) })
}).catch((err) => { logger.error(err) })

// header menu
const $menu = document.getElementById('extend-header-nav') as HTMLButtonElement | null
onTrigger($menu, () => {
  document.getElementById('header-nav')?.classList.toggle('extend')
})

// update clients count
client.on('client:join', () => { updateClientsCount(1) })
client.on('client:leave', () => { updateClientsCount(-1) })

// play sound
client.on('sound:play', (sound) => { playSound(sound) })

// refresh board data
client.on('board:update', refreshBoardData)

// sound update/remove
client.on('sound:update', updateSound)
client.on('sound:remove', removeSound)

// parse modal buttons
Array.from(document.getElementsByTagName('button')).forEach(($b) => {
  if ($b.getAttribute('data-dismiss') === 'modal') {
    const modalId = $b.closest('[class*="modal"][role="dialog"]')?.id
    if (modalId == null) return
    onTrigger($b, () => { modal.close(modalId) })
  } else if ($b.getAttribute('data-toggle') === 'modal') {
    modal.button($b)
  }
})
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') modal.close()
})

// parse tabs
Array.from(document.getElementsByClassName('tab-list')).forEach(($t) => { Array.from($t.getElementsByTagName('li')).forEach(($t) => { tab.list($t) }) })

// parse input files
Array.from(document.getElementsByClassName('input-file')).forEach(($inputFile) => { inputFile($inputFile as HTMLElement) })

// parse input range
Array.from(document.getElementsByClassName('input-range')).forEach(($inputRange) => { inputRange($inputRange as HTMLElement) })

// board pagination
addEventListener('keydown', (e) => {
  if (['ArrowUp', 'PageUp'].includes(e.key)) changePage(-1)
  else if (['ArrowDown', 'PageDown'].includes(e.key)) changePage(1)
})
const $boardPreviousPage = document.getElementById('board-previous-page')
onTrigger($boardPreviousPage, () => { changePage(-1) })
const $boardNextPage = document.getElementById('board-next-page')
onTrigger($boardNextPage, () => { changePage(1) })

// mute/unmute audios
// addEventListener('osb-muted', ((e: CustomEvent) => {
//   audiosPlaying.forEach(($a) => { $a.muted = e.detail })
// }) as EventListener)

// theme colors
setThemePalettes()

// load website data
refreshImmersive()
refreshGlobalVolume()

// screen resize
const changeGrid = (columns: number, rows: number, fontSize: number = 10): void => {
  soundsDimensions.columns = columns
  soundsDimensions.rows = rows
  const $sounds = document.getElementById('sounds')
  if ($sounds == null) return
  $sounds.setAttribute('data-page', '0')
  $sounds.style.setProperty('--sound-font-size', `${fontSize}em`)
  refreshBoardSounds()
}
const setMobile = (mobile: boolean): void => {
  document.body.classList.toggle('mobile', mobile)
}
checkScreenSize(1536, -1, () => { changeGrid(6, 5) })
checkScreenSize(1280, 1535, () => { changeGrid(5, 5) })
checkScreenSize(960, 1279, () => { changeGrid(4, 4) })
checkScreenSize(768, 959, () => { changeGrid(3, 4, 10) })
checkScreenSize(-1, 767, () => { changeGrid(2, 3, 8) })
checkScreenSize(-1, 959, () => { setMobile(true) })
checkScreenSize(960, -1, () => { setMobile(false) })

// toggle immersive
const $toggleImmersive = document.getElementById('toggle-immersive') as HTMLButtonElement | null
onTrigger($toggleImmersive, () => { toggleImmersive() })

// join board form
const joinBoardForm = new Form('join-board-form', () => {
  joinBoard(joinBoardForm)
}).set('join-auth', ($input) => {
  if ($input.value === '') return 'Password required'
  return null
})

// add sound form
const addSoundForm = new Form('add-sound-form', () => {
  addSound(addSoundForm)
}).set('sound-name', ($input) => {
  return checkSoundName($input.value.replace(/\n|\r/g, '').trim())
}).set('sound-file', ($input) => {
  return checkSoundFile($input.files?.[0])
})
addSoundForm.oninit = () => {
  addSoundForm.reset()
}
const $soundName = addSoundForm.inputs.get('sound-name')?.$input
const $soundFile = addSoundForm.inputs.get('sound-file')?.$input
if ($soundName != null && $soundFile != null) {
  $soundFile.addEventListener('input', () => {
    if ($soundName.value !== '') return
    const soundName = $soundFile.files?.[0]?.name.replace(/.[^.]*$/g, '').replace(/_/g, ' ').trim() ?? ''
    const max = Math.min(soundName.length, Number($soundName.getAttribute('maxlength')))
    $soundName.value = soundName.slice(0, max)
    $soundName.dispatchEvent(new Event('input'))
  })
}

// quick add sound drag-n-drop
document.getElementById('board')?.addEventListener('dragenter', () => {
  modal.open('add-sound-modal')
})

// board auth
Array.from(document.getElementsByClassName('input-switch')).forEach(($switch) => { inputSwitch($switch as HTMLElement) })
const boardAuthForm = new Form('board-auth-form', () => {
  const $boardLock = boardAuthForm.inputs.get('board-lock')?.$input
  const locked = $boardLock?.checked ?? false
  const $boardAuth = boardAuthForm.inputs.get('board-auth')?.$input
  if ($boardAuth == null) return
  const auth = boardAuthForm.inputs.get('board-enable-auth')?.$input.checked === true ? $boardAuth.value : null
  $boardAuth.value = ''
  updateBoardAuth(auth, locked)
}).set('board-lock').set('board-enable-auth', ($input) => {
  const $boardAuth = boardAuthForm.inputs.get('board-auth')?.$input
  if ($boardAuth == null) return null
  $boardAuth.disabled = !$input.checked
  if (!$input.checked) $boardAuth.dispatchEvent(new Event('input'))
  return null
}).set('board-auth', ($input) => {
  const $boardEnableAuth = boardAuthForm.inputs.get('board-enable-auth')?.$input
  if ($boardEnableAuth == null || !$boardEnableAuth.checked) return null
  if ($boardEnableAuth.checked && $input.value === '') return 'Password required'
  return null
})
boardAuthForm.oninit = () => {
  const $boardLock = boardAuthForm.inputs.get('board-lock')?.$input
  if ($boardLock != null) $boardLock.checked = client.board?.locked ?? false
  boardAuthForm.inputs.get('board-auth')?.reset()
  const $boardEnableAuth = boardAuthForm.inputs.get('board-enable-auth')?.$input
  if ($boardEnableAuth != null) {
    $boardEnableAuth.checked = client.board?.auth != null
    $boardEnableAuth.dispatchEvent(new Event('input'))
  }
}

// sound volume
const volumeSoundForm = new Form('volume-sound-form', () => {
  const $soundVolume = volumeSoundForm.inputs.get('sound-volume')?.$input
  if ($soundVolume == null) return

  websiteData.volume = Number($soundVolume.value)
  refreshGlobalVolume()
  modal.close('volume-sound-modal')
}).set('sound-volume')
volumeSoundForm.oninit = () => {
  const $soundVolume = volumeSoundForm.inputs.get('sound-volume')?.$input
  if ($soundVolume == null) return

  $soundVolume.value = String(websiteData.volume)
  $soundVolume.dispatchEvent(new Event('input'))
}

// edit sound
const editSoundForm = new Form('edit-sound-form', () => {
  const soundId = editSoundForm.$form.getAttribute('data-sound-id')
  if (soundId == null) return
  const sound = client.sounds.find((s) => s.id === soundId)
  if (sound == null) return

  const $soundName = editSoundForm.inputs.get('sound-name')?.$input
  if ($soundName != null) {
    if (sound.data.displayName === $soundName.value) {
      modal.close('edit-sound-modal')
      return
    }
    sound.data.displayName = $soundName.value
  }
  client.updateSound(sound).then(() => {
    updateSound(sound)
    modal.close('edit-sound-modal')
  }).catch((err: OSBError) => {
    logger.error(err)
  })
}).set('sound-name', ($input) => {
  return checkSoundName($input.value.replace(/\n|\r/g, '').trim())
})
editSoundForm.oninit = () => {
  const soundId = editSoundForm.$form.getAttribute('data-sound-id')
  if (soundId == null) return
  const sound = client.sounds.find((s) => s.id === soundId)
  if (sound == null) return

  if (editSoundForm.$form.getAttribute('data-sound-id') !== sound.id) return
  const $soundName = editSoundForm.inputs.get('sound-name')?.$input
  if ($soundName != null) $soundName.value = sound.data.displayName
}

function updateClientsCount (inc: 1 | -1): void {
  const updatedData = { totalClients: (client.board?.data.totalClients ?? 1) + inc }
  client.updateBoard({ data: updatedData }).catch((err: OSBError) => {
    logger.error(err.message)
  })
}

function toggleImmersive (): void {
  websiteData.immersive = !websiteData.immersive
  refreshImmersive()
}

function joinBoard (form: Form): void {
  if (connected()) return

  const inputAuth = form.inputs.get('join-auth')
  if (inputAuth == null) return
  const $inputAuth = inputAuth.$input

  const auth = $inputAuth.value
  $inputAuth.value = ''

  join(boardId, auth).then(() => {
    inputAuth.toggleInvalid(null)
    modal.close('join-board-modal')
  }).catch((err: OSBError) => {
    logger.error(err.message)
    inputAuth.invalid(err.message)
  })
}

function updateBoardAuth (auth: string | null, locked: boolean): void {
  if (!connected()) return

  client.updateBoard({ auth, locked }).then(() => {
    modal.close('board-auth-modal')
  }).catch((err: OSBError) => {
    logger.error(err.message)
  })
}

function changePage (inc: 1 | -1 | 0 = 0): void {
  const $sounds = document.getElementById('sounds')
  if ($sounds == null) return

  const maxSounds = soundsDimensions.columns * soundsDimensions.rows
  const maxPage = Math.max(Math.ceil(client.sounds.length / maxSounds) - 1, 0)
  const currentPage = Number($sounds.getAttribute('data-page') ?? 0)
  if (currentPage + inc < 0 || currentPage + inc > maxPage) return

  $sounds.setAttribute('data-page', String(currentPage + inc))
  refreshBoardSounds()
}
