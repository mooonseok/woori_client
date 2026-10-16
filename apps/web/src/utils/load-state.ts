// What a screen shows while its data loads. Only a first load (or a retry from
// the error screen) shows loading; a refresh of shown data runs in the
// background, keeps that data on failure, and a new scope (group, album list
// tab) starts over so another scope's data or late response never shows.
export interface LoadState {
  scope: string;
  loaded: boolean;
  loading: boolean;
  error: string;
}

export const freshLoad = (scope: string): LoadState => ({
  scope,
  loaded: false,
  loading: true,
  error: '',
});

export function startLoad(state: LoadState, scope: string) {
  if (state.scope !== scope)
    return { state: freshLoad(scope), background: false };
  const background = state.loaded && !state.error;
  return {
    state: background ? state : { ...state, loading: true, error: '' },
    background,
  };
}

export function finishLoad(
  state: LoadState,
  scope: string,
  background: boolean,
  error = ''
): LoadState {
  if (state.scope !== scope) return state;
  if (!error) return { scope, loaded: true, loading: false, error: '' };
  return background ? state : { ...state, loading: false, error };
}
