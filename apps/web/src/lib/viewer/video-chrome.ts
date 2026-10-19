/** Idle controls never disappear while someone is operating them. */
export function createVideoChrome(
  show: (visible: boolean) => void,
  delay = 3000
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let playing = false;
  let blocked = false;
  let focused = false;
  let touching = false;
  const clear = () => {
    clearTimeout(timer);
    timer = undefined;
  };
  const activity = () => {
    clear();
    show(true);
    if (playing && !blocked && !focused && !touching)
      timer = setTimeout(() => show(false), delay);
  };
  return {
    activity,
    playback(value: boolean) {
      playing = value;
      activity();
    },
    block(value: boolean) {
      blocked = value;
      activity();
    },
    focus(value: boolean) {
      focused = value;
      activity();
    },
    touch(value: boolean) {
      touching = value;
      activity();
    },
    reset() {
      playing = false;
      focused = false;
      touching = false;
      activity();
    },
    dispose: clear,
  };
}
