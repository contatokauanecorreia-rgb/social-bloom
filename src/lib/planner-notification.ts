import { useEffect, useState } from "react";

const KEY = "postly:planner:hasDraft";
const EVENT = "postly:planner-notification";

export function markPlannerHasDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, "1");
  window.dispatchEvent(new Event(EVENT));
}

export function clearPlannerHasDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

export function hasPlannerDraft() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "1";
}

export function usePlannerNotification() {
  const [has, setHas] = useState(false);
  useEffect(() => {
    const update = () => setHas(hasPlannerDraft());
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return has;
}
