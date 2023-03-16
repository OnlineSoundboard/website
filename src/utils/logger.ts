type LogType = 'log' | 'warn' | 'error'

const _log = (type: LogType, ...data: any[]): void => { console[type]('%c[OSB]', 'color: #DBD966; font-weight: 700;', ...data) }
export const log = (...data: any[]): void => { _log('log', ...data) }
export const warn = (...data: any[]): void => { _log('warn', ...data) }
export const error = (...data: any[]): void => { _log('error', ...data) }
