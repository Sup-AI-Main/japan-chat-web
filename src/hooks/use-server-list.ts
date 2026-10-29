"use client";

import { useState, type Dispatch, type SetStateAction } from "react";

/** Keep optimistic list edits while accepting fresh Server Component data on refresh. */
export function useServerList<T>(initial: T[]): [T[], Dispatch<SetStateAction<T[]>>] {
  const [source, setSource] = useState(initial);
  const [items, setItems] = useState(initial);
  if (source !== initial) {
    setSource(initial);
    setItems(initial);
  }
  return [items, setItems];
}
