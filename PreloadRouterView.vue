<template>
  <router-view
    v-slot="{ Component, route }"
    class="preload-router-view-page"
  >
    {{ registerNextComponent(Component, route) }}

    <component
      :is="routerViewPresets.firstView.Component"
      :key="routerViewPresets.firstView.key"
      class="component-holder first-component-holder"
      :class="{ 'slide-appearance': isFirstViewActive }"
    />

    <component
      :is="routerViewPresets.secondView.Component"
      :key="routerViewPresets.secondView.key"
      class="component-holder second-component-holder"
      :class="{ 'slide-appearance': isSecondViewActive }"
    />
  </router-view>
</template>

<script>
/* The idea of this implementation is the next:
*  1. We have two components, that are displayed one by one.
*  2. We have a pointer that points to the currently displayed(active) component.
*  3. When user goes to the next route, we register new route view under preloading component
*  4. When preloading component fires `setRoutePreloadState`, it notifies `PreloadRouterView`
*     that we need to switch visibiliti of active and preloading components.
*  5. `PreloadRouterView` shows preloaded component and hides previously active one. Simultaneously
*     it also sets the pointer to the next component.
*  So we can have two views displayed at the same time, while one of them is preloading.
*/
import { computed, nextTick, reactive, watch } from 'vue';
import { RouterView } from 'vue-router';
import { useRoutePreloader } from './useRoutePreloader';

const PositionEnum = {
  FIRST: 'FIRST',
  SECOND: 'SECOND',
};

export default {
  name: 'PreloadRouterView',
  inheritAttrs: false,
  props: {
    ...RouterView.props,
  },
  setup() {
    const routerViewPresets = reactive({
      active: PositionEnum.FIRST, // pointer to active view
      firstView: {
        Component: {},
        position: PositionEnum.FIRST,
        name: '',
        key: 0,
      },
      secondView: {
        Component: {},
        position: PositionEnum.SECOND,
        name: '',
        key: 0,
      },
    });

    const isFirstViewActive = computed(() => routerViewPresets.active === PositionEnum.FIRST);
    const isSecondViewActive = computed(() => routerViewPresets.active === PositionEnum.SECOND);

    // pointer to active view
    const activeView = computed(() => (
      isFirstViewActive.value
        ? routerViewPresets.firstView
        : routerViewPresets.secondView
    ));

    // pointer to preloading view
    const preloadingView = computed(() => (
      isFirstViewActive.value
        ? routerViewPresets.secondView
        : routerViewPresets.firstView
    ));

    const { loadedRoutes, setRoutePreloadState } = useRoutePreloader();

    watch(
      () => loadedRoutes,
      loadedRoutesVal => {
        const isPreloadingViewReady = loadedRoutesVal[preloadingView.value.name];

        if (!isPreloadingViewReady) return;

        routerViewPresets.active = preloadingView.value.position;

        nextTick(() => {
          // reset preloading view
          preloadingView.value.Component = {};
          preloadingView.value.name = '';
          preloadingView.value.key += 1;
        });
      },
      {
        deep: true,
      },
    );

    const registerNextComponent = (Component, route) => {
      if (!Component) return;
      const isAlreadyInited = [activeView.value.name, preloadingView.value.name]
        .includes(Component.type.name);

      if (isAlreadyInited) return;

      preloadingView.value.Component = Component;
      preloadingView.value.name = Component.type.name;

      if (!route.meta.shouldBePreloaded) {
        setRoutePreloadState(Component.type.name, true);
      }
    };

    return {
      registerNextComponent,

      routerViewPresets,

      isFirstViewActive,
      isSecondViewActive,
    };
  },
};
</script>

<style lang="scss">
// Unfortunately, styles cannot be scoped
.component-holder {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.slide-appearance {
  animation: preloading-view-transition .3s ease-out;
  opacity: 1;
  width: initial;
  height: initial;
  position: initial;
}

@keyframes preloading-view-transition {
  0% {
    transform: translateX(200px);
    opacity: 0;
  }
  100% {
    transform: translateX(0px);
    opacity: 1;
  }
}
</style>
