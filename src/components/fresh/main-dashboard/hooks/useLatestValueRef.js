import { useEffect, useRef } from "react";

export default function useLatestValueRef(value) {
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  return valueRef;
}
