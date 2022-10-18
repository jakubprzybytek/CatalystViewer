import { Dispatch, SetStateAction, useEffect, useState } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
    // State to store our value
    // Pass initial state function to useState so logic is only executed once
    const [storedValue, setStoredValue] = useState(initialValue);

    useEffect(() => {
        try {
            // Get from local storage by key
            const item = window.localStorage.getItem(key);
            // Parse stored json or if none return initialValue
            setStoredValue(item ? JSON.parse(item) : initialValue);
        } catch (error) {
            // If error also return initialValue
            console.log(error);
        }
    }, [key, initialValue]);

    // Return a wrapped version of useState's setter function that ...
    // ... persists the new value to localStorage.
    const setValue: Dispatch<SetStateAction<T>> = (value: T | ((oldValue: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            // Save state
            setStoredValue(valueToStore);
            // Save to local storage
            if (typeof window !== "undefined") {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            // A more advanced implementation would handle the error case
            console.log(error);
        }
    };

    return [storedValue, setValue];
}

export function useArrayLocalStorage<T>(key: string, initialValue: T[]): [T[], (newElement: T) => void, (elementToRemove: T) => void] {
    const [storedArray, setStoredArray] = useLocalStorage<T[]>(key, initialValue);

    const addElement = (newElement: T) => {
        const newArray = [...storedArray, newElement];
        setStoredArray(newArray);
    }

    const removeElement = (elementToRemove: T) => {
        const index = storedArray.indexOf(elementToRemove, 0);
        const newArray = [...storedArray];
        if (index > -1) {
            newArray.splice(index, 1);
        }
        setStoredArray(newArray);
    }

    return [storedArray, addElement, removeElement];
}
