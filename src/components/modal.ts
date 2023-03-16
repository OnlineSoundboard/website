import { onTrigger } from './input.js'

const MODAL_TRANSITION_DURATION = 200

// parse modals
export function button ($button: HTMLButtonElement | null): void {
  if ($button == null) return

  const modalId = $button.getAttribute('data-target')
  if (modalId == null || modalId === '') return
  const $modal = document.getElementById(modalId)
  if ($modal == null) return

  if ($modal.hasAttribute('data-close')) {
    let clickOnModal = false
    $modal.addEventListener('mousedown', (e) => {
      clickOnModal = $modal.isEqualNode(e.composedPath()[0] as HTMLElement)
    })
    $modal.addEventListener('mouseup', () => {
      if (!clickOnModal) return
      close(modalId)
    })
    const cancelCloseModal = (e: Event): void => { clickOnModal = false; e.stopPropagation() }
    $modal.firstElementChild?.addEventListener('mousedown', cancelCloseModal)
    $modal.firstElementChild?.addEventListener('mouseup', cancelCloseModal)
  }
  onTrigger($button, () => { open(modalId) })
}

export function open (modalId: string): void {
  const $modal = document.getElementById(modalId)
  if ($modal == null) return

  Array.from($modal.getElementsByTagName('form')).forEach(($f) => { $f.dispatchEvent(new CustomEvent('init')) })
  $modal.style.setProperty('--modal-transition-duration', `${MODAL_TRANSITION_DURATION}ms`)
  $modal.classList.add('show', 'modal-opening')
  setTimeout(() => {
    $modal.classList.remove('modal-opening')
  }, MODAL_TRANSITION_DURATION)
}

export function close (modalId: string = ''): void {
  if (modalId === '') {
    Array.from(document.getElementsByClassName('modal')).forEach(($m) => {
      if ($m.classList.contains('show')) close($m.id)
    })
    return
  }
  const $modal = document.getElementById(modalId)
  if ($modal == null) {
    return
  }
  if ($modal.classList.contains('modal-opening')) return

  $modal.classList.add('modal-closing')
  setTimeout(() => {
    $modal.classList.remove('show', 'modal-closing')
  }, MODAL_TRANSITION_DURATION)
}
