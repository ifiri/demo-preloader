import { reactive, getCurrentInstance } from 'vue';
import { useRouter } from 'vue-router';

const pagesLoadingDict = reactive({});

// For Vue 2 components
export const setRoutePreloadState = (key, state) => {
  if (typeof pagesLoadingDict[key] === 'undefined') {
    pagesLoadingDict[key] = false;
  }
  Object.keys(pagesLoadingDict).forEach(componentName => { // reset all previously setted states
    pagesLoadingDict[componentName] = false;
  });
  pagesLoadingDict[key] = state;
};

// For Vue 3 components
export const useRoutePreloader = () => {
  const router = useRouter();
  const instance = getCurrentInstance();

  router.afterEach((to, from) => {
    const [matchedRoute] = from.matched;
    if (!matchedRoute || !matchedRoute.default) return;
    const fromComponentName = matchedRoute.default.name;
    pagesLoadingDict[fromComponentName] = false;
  });

  return {
    setRoutePreloadState,
    setSelfPreloadState(state = true) {
      const key = instance.type.name;
      setRoutePreloadState(key, state);
    },
    loadedRoutes: pagesLoadingDict,
  };
};
