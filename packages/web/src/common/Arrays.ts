export function removeElement(array: string[], elementToRemove: string) {
  const index = array.indexOf(elementToRemove, 0);
  const newArray = [...array];
  if (index > -1) {
    newArray.splice(index, 1);
  }
  return newArray;
}

export function removeAt<T>(array: T[], indexToRemove: number) {
  const newArray = [...array];
  if (indexToRemove > -1) {
    newArray.splice(indexToRemove, 1);
  }
  return newArray;
}
