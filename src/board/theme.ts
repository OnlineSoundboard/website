import { refreshBoardSounds } from '../utils/refresh.js'
import { websiteData } from './board.js'

type Palette = Record<string, {
  name: string
  colors: string[]
}>

export const palettes: Palette = {
  rainbow: {
    name: 'Rainbow',
    colors: ['#f94144', '#f3722c', '#f8961e', '#f9844a', '#f9c74f', '#90be6d', '#43aa8b', '#4d908e', '#577590', '#277da1']
  },
  sunset: {
    name: 'Sunset',
    colors: ['#F9ED69', '#F08A5D', '#B83B5E', '#6A2C70']
  },
  pastel: {
    name: 'Pastel',
    colors: ['#B9F3E4', '#EA8FEA', '#FFAACF', '#F6E6C2']
  },
  vintage: {
    name: 'Vintage',
    colors: ['#8D7B68', '#A4907C', '#C8B6A6', '#F1DEC9']
  },
  neon: {
    name: 'Neon',
    colors: ['#060047', '#B3005E', '#E90064', '#FF5F9E']
  },
  nature: {
    name: 'Nature',
    colors: ['#F7F1E5', '#E7B10A', '#898121', '#4C4B16']
  },
  earth: {
    name: 'Earth',
    colors: ['#395144', '#4E6C50', '#AA8B56', '#F0EBCE']
  },
  night: {
    name: 'Night',
    colors: ['#37306B', '#66347F', '#9E4784', '#D27685']
  }
}

export enum Contrast {
  LIGHT = 'light',
  DARK = 'dark'
}

export function getContrast (color: string | RGBColor): Contrast {
  let rgb
  if (typeof color !== 'string') rgb = color
  else rgb = hexToRgb(color)
  if (rgb == null) return Contrast.LIGHT

  const brightness = Math.round(((rgb.r * 299) + (rgb.g * 587) + (rgb.b * 114)) / 1000)
  if (brightness > 125) return Contrast.DARK
  return Contrast.LIGHT
}

interface RGBColor {
  r: number
  g: number
  b: number
}

export function hexToRgb (hex: string): RGBColor | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (result == null) return null
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  }
}

export function shuffleArray<T = any> (array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = array[i]
    array[i] = array[j]
    array[j] = tmp
  }
  return array
}

export function setThemePalettes (): void {
  const $palettes = document.getElementById('theme-palettes')
  if ($palettes == null) return

  Object.entries(palettes).forEach(([id, palette]) => {
    const $palette = document.createElement('div')
    $palette.classList.add('palette')

    const $label = document.createElement('label')
    $label.classList.add('palette-name')
    const $radio = document.createElement('input')
    $radio.type = 'radio'
    $radio.name = 'palette'
    $radio.checked = id === websiteData.theme
    $radio.addEventListener('change', () => {
      websiteData.theme = id
      refreshBoardSounds(true)
    })
    const $name = document.createElement('span')
    $name.innerText = palette.name
    $label.append($radio)
    $label.append($name)

    const $colors = document.createElement('div')
    $colors.classList.add('colors')
    palette.colors.forEach((color) => {
      const $color = document.createElement('div')
      $color.classList.add('color')
      $color.title = color
      $color.style.backgroundColor = color
      $colors.append($color)
    })

    $palette.append($label)
    $palette.append($colors)
    $palettes.append($palette)
  })
}
