import React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";

import getStore from "./store";
import App from "./components/App";
import Hotkeys from "./hotkeys";
import Media from "./media";
import { getTrackCount } from "./selectors";
import { setSkinFromUrl, loadMediaFiles } from "./actionCreators";
import { LOAD_STYLE } from "./constants";

import {
  SET_AVALIABLE_SKINS,
  NETWORK_CONNECTED,
  NETWORK_DISCONNECTED
} from "./actionTypes";

// Return a promise that resolves when the store matches a predicate.
const storeHas = (store, predicate) =>
  new Promise(resolve => {
    if (predicate(store.getState())) {
      resolve();
      return;
    }
    const unsubscribe = store.subscribe(() => {
      if (predicate(store.getState())) {
        resolve();
        unsubscribe();
      }
    });
  });

class Winamp {
  static browserIsSupported() {
    const supportsAudioApi = !!(
      window.AudioContext || window.webkitAudioContext
    );
    const supportsCanvas = !!window.document.createElement("canvas").getContext;
    const supportsPromises = typeof Promise !== "undefined";
    return supportsAudioApi && supportsCanvas && supportsPromises;
  }

  constructor(options) {
    this.options = options;
    const {
      initialTracks,
      avaliableSkins,
      enableHotkeys = false
    } = this.options;

    this.media = new Media();
    this.store = getStore(this.media, this.options.__initialState);
    this.store.dispatch({
      type: navigator.onLine ? NETWORK_CONNECTED : NETWORK_DISCONNECTED
    });

    window.addEventListener("online", () =>
      this.store.dispatch({ type: NETWORK_CONNECTED })
    );
    window.addEventListener("offline", () =>
      this.store.dispatch({ type: NETWORK_DISCONNECTED })
    );

    this.store.dispatch(setSkinFromUrl(this.options.initialSkin.url));

    if (initialTracks) {
      this.appendTracks(initialTracks);
    }
    if (avaliableSkins) {
      this.store.dispatch({
        type: SET_AVALIABLE_SKINS,
        skins: avaliableSkins
      });
    }

    if (enableHotkeys) {
      new Hotkeys(this.store.dispatch);
    }
  }

  // Append this array of tracks to the end of the current playlist.
  appendTracks(tracks) {
    const nextIndex = getTrackCount(this.store.getState());
    this.store.dispatch(loadMediaFiles(tracks, LOAD_STYLE.BUFFER, nextIndex));
  }

  // Replace any existing tracks with this array of tracks, and begin playing.
  setTracksToPlay(tracks) {
    this.store.dispatch(loadMediaFiles(tracks, LOAD_STYLE.PLAY));
  }

  async renderWhenReady(node) {
    // Wait for the skin to load.
    await storeHas(this.store, state => !state.display.loading);

    render(
      <Provider store={this.store}>
        <App
          media={this.media}
          container={this.options.container}
          filePickers={this.options.filePickers}
        />
      </Provider>,
      node
    );
  }
}

export default Winamp;
module.exports = Winamp;
