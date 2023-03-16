type ValidationFunction = ($input: HTMLInputElement) => string | null

export class Form {
  public readonly $form: HTMLFormElement
  public readonly $submit: HTMLButtonElement | null
  public readonly inputs: Map<string, FormControl>
  public oninit?: () => any

  private readonly onvalid?: () => void

  constructor (formId: string, onvalid?: () => void) {
    const $form = document.getElementById(formId) as HTMLFormElement | null
    if ($form == null) throw new Error('Form cannot be null')
    this.$form = $form
    this.$submit = Array.from(this.$form.getElementsByTagName('button')).find(($i) => $i.type === 'submit') as HTMLButtonElement | null
    this.inputs = new Map()
    this.onvalid = onvalid

    this.$form.addEventListener('submit', (e: Event): void => {
      e.preventDefault()
      this.submit()
    })

    this.$form.addEventListener('init', (): void => {
      this.oninit?.()
    })
  }

  public submit (): void {
    this.validate()
    this.checkValidity(true)
  }

  public reset (): void {
    this.inputs.forEach((i) => { i.reset() })
  }

  public set (inputName: string, validation?: ValidationFunction): Form {
    if (inputName == null) return this
    const input = new FormControl(this, inputName, validation ?? (() => null))
    this.inputs.set(inputName, input)
    return this
  }

  public get isValid (): boolean {
    return Array.from(this.inputs.values()).every((i) => i.isValid)
  }

  public validate (): void {
    this.inputs.forEach(($i) => { $i.validate() })
  }

  public checkValidity (submit = false): void {
    if (this.$submit != null) this.$submit.disabled = !this.isValid
    if (this.isValid && submit) this.onvalid?.()
  }
}

export class FormControl {
  public readonly form: Form
  public readonly $input: HTMLInputElement
  public readonly $group: HTMLElement
  public readonly validation: ValidationFunction
  private _valid = true

  constructor (form: Form, inputName: string, validation: ValidationFunction) {
    if (form == null) throw new Error('Form cannot be null')
    this.form = form
    if (inputName == null) throw new Error('Input name cannot be null')
    const $input = form.$form.querySelector<HTMLInputElement>(`[name="${inputName}"]`)
    if ($input == null) throw new Error('Input cannot be null')
    this.$input = $input
    const $group = $input.closest<HTMLElement>('.form-group')
    if ($group == null) throw new Error('Input cannot be null')
    this.$group = $group
    if (validation == null || typeof validation !== 'function') throw new Error('Validation must be a function')
    this.validation = validation

    $input.addEventListener('input', () => {
      this.validate()
      form.checkValidity()
    })

    $input.addEventListener('reset', () => {
      this.$input.value = ''
    })
  }

  public reset (): void {
    this.$input.dispatchEvent(new Event('reset'))
    this.toggleInvalid(null)
  }

  public get isValid (): boolean {
    return this._valid
  }

  public validate (): void {
    const message = this.validation(this.$input)
    this.toggleInvalid(message)
  }

  public toggleInvalid (message: string | null): void {
    this.$group.classList.toggle('invalid', message != null)
    const $invalid = this.$group.getElementsByClassName('input-invalid').item(0) as HTMLElement | null
    if ($invalid != null) $invalid.textContent = message
    this._valid = message == null
  }

  public invalid (message: string | null): void {
    this.toggleInvalid(message)
    this.form.checkValidity()
  }
}
