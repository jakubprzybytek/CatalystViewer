export type ColorCode = 'red' | 'orange' | 'yellow' | 'green' | 'white' | 'disabled' | 'none';

export type ColorMarker = {
  color: string,
  backgroundColor: string
};

export const colorMarkers: Record<ColorCode, ColorMarker | undefined> = {
  'red': {
    color: 'darkred',
    backgroundColor: 'lightpink'
  },
  'orange': {
    color: 'darkred',
    backgroundColor: 'orange'
  },
  'yellow': {
    color: 'darkred',
    backgroundColor: 'yellow'
  },
  'green': {
    color: 'darkgreen',
    backgroundColor: 'lightgreen'
  },
  'white': {
    color: '#233247',
    backgroundColor: '#eef2f7'
  },
  'disabled': {
    color: '#67758a',
    backgroundColor: '#e3e8ef'
  },
  'none': undefined
}
