export function onTrigger ($input: HTMLElement | null, callback: (e: Event) => unknown, click = true): void {
  if ($input == null) return

  $input.addEventListener('keydown', (e) => { if (e.key === 'Enter') callback(e) })
  if (click) $input.addEventListener('click', callback)
}

export function inputFile ($inputFile: HTMLElement | null): void {
  if ($inputFile == null) return
  const $input = (Array.from($inputFile.getElementsByTagName('input'))).find(($i) => $i.type === 'file')
  if ($input == null) return

  $input.addEventListener('change', () => {
    setFile($inputFile)
  })
  $input.addEventListener('reset', () => {
    setFile($inputFile, null)
  })

  const dragin = (e: DragEvent): void => {
    e.preventDefault()
    $inputFile.classList.add('dragover')
  }
  const dragout = (e: DragEvent): void => {
    e.preventDefault()
    $inputFile.classList.remove('dragover')
  }
  const drop = (e: DragEvent): void => {
    dragout(e)
    const dropFile = e.dataTransfer?.files?.[0]
    setFile($inputFile, dropFile)
  }
  $inputFile.addEventListener('dragover', dragin)
  $inputFile.addEventListener('dragenter', dragin)
  $inputFile.addEventListener('dragleave', dragout)
  $inputFile.addEventListener('dragend', dragout)
  $inputFile.addEventListener('drop', drop)
}

export function setFile ($inputFile: HTMLElement, file?: File | null): void {
  const $input = $inputFile.querySelector<HTMLInputElement>('input[type="file"]')
  if ($input == null) return
  const $label = $inputFile.getElementsByClassName('input-label').item(0) as HTMLElement | null
  if ($label == null) return
  $label.innerText = ''

  if (file != null) {
    const dt = new DataTransfer()
    dt.items.add(file)
    $input.files = dt.files
    $input.dispatchEvent(new Event('input'))
  }
  if (file !== null) file = $input.files?.item(0)

  $inputFile.classList.toggle('has-file', file != null)
  $label.innerText = file?.name ?? ''
}

export function inputSwitch ($switch: HTMLElement | null): void {
  if ($switch == null) return
  const $input = (Array.from($switch.getElementsByTagName('input'))).find(($i) => $i.type === 'checkbox')
  if ($input == null) return

  $switch.addEventListener('keydown', (e) => {
    if (e.key === ' ') $input.checked = !$input.checked
    $input.dispatchEvent(new Event('input'))
  })
}

export function inputRange ($inputRange: HTMLElement | null): void {
  if ($inputRange == null) return
  const $input = (Array.from($inputRange.getElementsByTagName('input'))).find(($i) => $i.type === 'range')
  if ($input == null) return
  const $tooltip = $inputRange.getElementsByClassName('tooltip').item(0) as HTMLElement | null

  $input.addEventListener('input', () => {
    $input.style.background = `linear-gradient(to right, rgba(var(--primary), 1) 0%, rgba(var(--primary), 1) ${$input.value}%, rgba(var(--background-3), 1) ${$input.value}%, rgba(var(--background-3), 1) 100%)`
    if ($tooltip != null) {
      $tooltip.innerText = `${$input.value} %`
      const ratio = Number($input.value) / 100
      const thumbSize = getComputedStyle($input).getPropertyValue('--thumb-size').trim()
      $tooltip.style.left = `calc((100% - 2.6 * ${thumbSize}) * ${ratio} + ${thumbSize} / 3)`
    }
  })
}
