<template>
  <div class="app-alert" :class="`app-alert--${variant}`">
    <IconAlertTriangle :size="22" class="app-alert__icon" />
    <div class="app-alert__content">
      <div v-if="title" class="app-alert__title">{{ title }}</div>
      <div class="app-alert__desc">
        <slot />
      </div>
    </div>
  </div>
</template>

<script>
import { IconAlertTriangle } from '@tabler/icons-vue';

export default {
  name: 'AppAlert',
  components: {
    IconAlertTriangle
  },
  props: {
    title: {
      type: String,
      default: ''
    },
    variant: {
      type: String,
      default: 'warning',
      validator: value => ['warning'].includes(value)
    }
  }
};
</script>

<style lang="scss" scoped>
.app-alert {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  border-radius: 12px;
  padding: 16px;
  position: relative;
  overflow: hidden;
}

.app-alert--warning {
  background-color: rgba(255, 152, 0, 0.08);
  border: 1px solid rgba(255, 152, 0, 0.2);

  .app-alert__icon {
    color: #ff9800;
    filter: drop-shadow(0 2px 4px rgba(255, 152, 0, 0.3));
  }

  .app-alert__title {
    color: #ff9800;
  }
}

.app-alert__icon {
  flex-shrink: 0;
  margin-right: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-alert__content {
  flex: 1;
  min-width: 0;
}

.app-alert__title {
  font-weight: 600;
  margin-bottom: 4px;
  font-size: 15px;
}

.app-alert__desc {
  color: var(--text-color);
  opacity: 0.9;
  font-size: 14px;
  line-height: 1.5;
}

.app-alert__desc :deep(p) {
  margin: 0;
  color: inherit;
  font-size: inherit;
  line-height: inherit;
}
</style>
