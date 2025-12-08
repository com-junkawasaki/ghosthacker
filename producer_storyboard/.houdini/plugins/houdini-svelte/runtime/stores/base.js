import { DocumentStore } from "$houdini/runtime/client";
import { get } from "svelte/store";
import { isBrowser } from "../adapter";
import { getClient, initClient } from "../client";
class BaseStore {
  // the underlying data
  #params;
  get artifact() {
    return this.#params.artifact;
  }
  get name() {
    return this.artifact.name;
  }
  // loading the client is an asynchronous process so we need something for users to subscribe
  // to while we load the client. this means we need 2 different document stores, one that
  // the user subscribes to and one that we actually get results from.
  #store;
  #unsubscribe = null;
  constructor(params) {
    if (typeof params.initialize === "undefined") {
      params.initialize = true;
    }
    this.#store = new DocumentStore({
      artifact: params.artifact,
      client: null,
      fetching: params.fetching,
      initialValue: params.initialValue
    });
    this.#params = params;
  }
  #observer = null;
  get observer() {
    if (this.#observer) {
      return this.#observer;
    }
    this.#observer = getClient().observe(this.#params);
    return this.#observer;
  }
  subscribe(...args) {
    const bubbleUp = this.#store.subscribe(...args);
    if (isBrowser && (this.#subscriberCount === 0 || !this.#unsubscribe)) {
      this.setup();
    }
    this.#subscriberCount = (this.#subscriberCount ?? 0) + 1;
    return () => {
      this.#subscriberCount--;
      if (this.#subscriberCount <= 0) {
        this.#unsubscribe?.();
        this.#unsubscribe = null;
        bubbleUp();
      }
    };
  }
  // in order to clear the store's value when unmounting, we need to track how many concurrent subscribers
  // we have. when this number is 0, we need to clear the store
  #subscriberCount = 0;
  setup(init = true) {
    let initPromise = Promise.resolve();
    try {
      getClient();
    } catch {
      initPromise = initClient();
    }
    initPromise.then(() => {
      if (this.#unsubscribe) {
        return;
      }
      this.#unsubscribe = this.observer.subscribe((value) => {
        this.#store.set(value);
      });
      if (init && this.#params.initialize) {
        return this.observer.send({
          setup: true,
          variables: get(this.observer).variables
        });
      }
    });
  }
}
export {
  BaseStore
};
