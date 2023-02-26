export type ColorCode = 'red' | 'orange' | 'yellow' | 'green' | 'white' | 'none';

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
    color: 'black',
    backgroundColor: 'white'
  },
  'none': undefined
}
