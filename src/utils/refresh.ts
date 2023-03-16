import { client, websiteData } from '../board/board.js'
import { palettes, shuffleArray } from '../board/theme.js'
import { IconsSpritePath, renderSound, soundsDimensions } from '../board/sound.js'

export function refreshBoardData (): void {
  refreshBoardClients()
  refreshBoardAuth()
}

export function refreshBoardClients (): void {
  const $totalClientsBadge = document.getElementById('total-clients-badge')
  if ($totalClientsBadge == null) return

  const count = client.board?.data.totalClients ?? 1
  $totalClientsBadge.innerText = String(count)
}

export function refreshGlobalVolume (): void {
  const $button = document.getElementById('global-volume') as HTMLButtonElement | null
  const $use = $button?.getElementsByTagName('use').item(0) as HTMLElement | null

  $use?.setAttribute('href', `${IconsSpritePath}#volume${websiteData.volume <= 0 ? '-mute' : (websiteData.volume >= 100 ? '-max' : '')}`)
}

export function refreshImmersive (): void {
  const $board = document.getElementById('board')
  if ($board == null) return
  const $button = document.getElementById('toggle-immersive') as HTMLButtonElement | null
  const $use = $button?.getElementsByTagName('use').item(0) as HTMLElement | null
  const $tooltip = $button?.getElementsByClassName('tooltip').item(0) as HTMLElement | null

  $use?.setAttribute('href', `${IconsSpritePath}#${websiteData.immersive ? 'fullscreen-exit' : 'fullscreen'}`)
  if ($tooltip != null) $tooltip.innerText = websiteData.immersive ? 'Exit immersive' : 'Enter immersive'
  $board.classList.toggle('immersive', websiteData.immersive)
}

export function refreshBoardAuth (): void {
  const $button = document.getElementById('board-auth-button') as HTMLButtonElement | null
  const $tooltip = $button?.getElementsByClassName('tooltip').item(0) as HTMLElement | null
  const $boardEnableAuth = document.getElementsByName('board-enable-auth').item(0) as HTMLInputElement | null
  if ($boardEnableAuth == null) return

  const hasAuth = client.board?.auth != null
  $boardEnableAuth.checked = hasAuth
  $boardEnableAuth.dispatchEvent(new Event('input'))
  if ($tooltip != null) $tooltip.innerText = hasAuth ? 'Change password' : 'Set password'
  $button?.classList.toggle('active', hasAuth)
}

export function refreshBoardSound (soundId: string): void {
  const sound = client.sounds.find((s) => s.id === soundId)
  const $sound = document.getElementById(soundId)

  // remove
  if (sound == null) $sound?.remove()
  else renderSound(sound)
}

export function refreshBoardSounds (refreshColors = false): void {
  const $sounds = document.getElementById('sounds')
  if ($sounds == null) return

  $sounds.style.setProperty('--sounds-columns', String(soundsDimensions.columns))
  $sounds.style.setProperty('--sounds-rows', String(soundsDimensions.rows))

  const currentPage = Number($sounds.getAttribute('data-page') ?? 0)
  const maxSounds = soundsDimensions.columns * soundsDimensions.rows
  const pageSoundsCount = Math.min(client.sounds.length - (currentPage * maxSounds), maxSounds)
  $sounds.style.setProperty('--sounds-count', String(pageSoundsCount))
  $sounds.style.setProperty('--sounds-breakpoint', String(Math.ceil(Math.sqrt(pageSoundsCount))))

  // ensure a theme is set by default
  if (!(websiteData.theme in palettes)) websiteData.theme = Object.keys(palettes)[0]

  const localColors: string[] = []
  const colors = palettes[websiteData.theme].colors
  for (let i = 0; i < Math.ceil(client.sounds.length / Math.max(colors.length, 1)); i++) {
    localColors.push(...shuffleArray([...colors]))
  }

  client.sounds.forEach((sound, i) => {
    renderSound(sound, {
      page: Number($sounds.getAttribute('data-page')),
      color: localColors[i],
      colorIndex: i,
      refreshColors
    })
  })

  refreshBoardPagination()
}

export function refreshBoardPagination (): void {
  const $sounds = document.getElementById('sounds')
  if ($sounds == null) return

  const soundsMax = soundsDimensions.columns * soundsDimensions.rows
  const maxPage = Math.max(Math.ceil(client.sounds.length / soundsMax) - 1, 0)
  const currentPage = Number($sounds.getAttribute('data-page') ?? 0)

  const $boardPageup = document.getElementById('board-previous-page') as HTMLButtonElement | null
  const $boardPagedown = document.getElementById('board-next-page') as HTMLButtonElement | null
  if ($boardPageup == null || $boardPagedown == null) return
  $boardPageup.disabled = currentPage - 1 < 0
  $boardPagedown.disabled = currentPage + 1 > maxPage
  document.getElementById('board-pagination')?.classList.toggle('hidden', client.sounds.length <= soundsMax)
  if (client.sounds.length <= soundsMax * currentPage) $sounds.setAttribute('data-page', String(Math.max(currentPage - 1, 0)))
}
