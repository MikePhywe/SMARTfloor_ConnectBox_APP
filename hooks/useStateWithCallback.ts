import React, { useState, useLayoutEffect, useRef, useCallback, useMemo } from "react"
const useStateWithCallback = <T,>(value: T) => {
  const callbackRef = useRef<(value: T) => void>();
  // As we know, re-created object with exact same value
  // resides in different memory location.
  // We are storing the set value inside an object,
  // so that the hook re-renders everytime the setState is called
  // even with the same value.
  const [state, setState] = useState({ value });

  // Anytime setState is called and the value is updated,
  // React will very soon call this effect
  // It will call the callback, if any,
  // then clear it as we want to run the callback once.
  useLayoutEffect(() => {
    callbackRef.current?.(state.value)
    callbackRef.current = undefined
  }, [state]);

  // We are momoizing the function so that the hook doesn't
  // re-render unnecessarily
  const setStateWithCallback = useCallback((value: T, callback: (value: T) => void) => {
    callbackRef.current = callback;
    setState({ value });
  }, []);

  // Finally we return the tuple in React useState like format,
  // without SetStateAction type. Also, we memoize,
  // so that the component using the hook only re-renders
  // on value change, not on each update.
  // In another word, the original useState behaviour is preserved.
  return useMemo(() =>
    [state.value, setStateWithCallback] as const,
    [state.value, setStateWithCallback]
  );
};


export default useStateWithCallback;