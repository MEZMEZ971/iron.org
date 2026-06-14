/** Reference-counted body scroll lock for stacked modals/overlays. */
let lockCount = 0;
let previousOverflow = "";

export function lockBodyScroll() {
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

export function unlockBodyScroll() {
  if (lockCount <= 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow;
    previousOverflow = "";
  }
}

/** Force-clear scroll lock (e.g. route change safety net). */
export function resetBodyScrollLock() {
  lockCount = 0;
  document.body.style.overflow = previousOverflow || "";
  previousOverflow = "";
}
