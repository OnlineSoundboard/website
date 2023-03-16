import { onTrigger } from './input.js'

// parse tabs
export function list ($li: HTMLElement | null): void {
  if ($li == null) return

  const tabId = $li.getAttribute('data-target')
  if (tabId == null || tabId === '') return
  const $tab = document.getElementById(tabId)
  if ($tab == null) return

  onTrigger($li, () => { toggle(tabId) })
}

export function toggle (tabId: string): void {
  const $tab = document.getElementById(tabId)
  if ($tab == null) return

  Array.from($tab.parentElement?.children ?? []).forEach(($t) => { $t.classList.remove('active') })
  $tab.classList.add('active')
  Array.from($tab.closest('.tabs')?.getElementsByClassName('tab-list').item(0)?.children ?? []).forEach(($t) => {
    if ($t.getAttribute('data-target') === tabId) $t.classList.add('active')
    else $t.classList.remove('active')
  })
}
