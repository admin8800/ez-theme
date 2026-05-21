<template>
  <AppDialog
    :open="showDialog"
    :title="title"
    content=""
    :show-close="showCloseIcon"
    :show-dividers="showDividers"
    :dismissable="clickOverlayToClose"
    size="md"
    backdrop="opaque"
    @close="handleClose"
  >
    <slot>
      <div v-if="content" v-html="content"></div>
    </slot>

    <template #footer v-if="showCancelButton || showConfirmButton">
      <button
        v-if="showCancelButton"
        class="dialog-btn dialog-btn-cancel"
        type="button"
        @click="handleClose"
      >
        {{ cancelButtonText || $t(cancelButtonI18nKey) }}
      </button>

      <button
        v-if="showConfirmButton"
        class="dialog-btn dialog-btn-confirm"
        type="button"
        @click="handleConfirm"
      >
        {{ confirmButtonText || $t(confirmButtonI18nKey) }}
      </button>
    </template>
  </AppDialog>
</template>

<script>
import AppDialog from '@/components/common/AppDialog.vue';

export default {
  name: 'CommonDialog',
  components: {
    AppDialog
  },
  props: {
    showDialog: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: ''
    },
    content: {
      type: String,
      default: ''
    },
    showCloseIcon: {
      type: Boolean,
      default: true
    },
    showCancelButton: {
      type: Boolean,
      default: true
    },
    showConfirmButton: {
      type: Boolean,
      default: true
    },
    cancelButtonText: {
      type: String,
      default: ''
    },
    confirmButtonText: {
      type: String,
      default: ''
    },
    cancelButtonI18nKey: {
      type: String,
      default: 'common.cancel'
    },
    confirmButtonI18nKey: {
      type: String,
      default: 'common.confirm'
    },
    clickOverlayToClose: {
      type: Boolean,
      default: true
    },
    showDividers: {
      type: Boolean,
      default: true
    }
  },
  emits: ['close', 'confirm'],
  setup(props, { emit }) {
    const handleClose = () => {
      emit('close');
    };

    const handleConfirm = () => {
      emit('confirm');
    };

    return {
      handleClose,
      handleConfirm
    };
  }
};
</script>

<style lang="scss" scoped>
.dialog-btn {
  min-width: 100px;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.dialog-btn:hover {
  transform: translateY(-2px);
}

.dialog-btn-cancel {
  color: var(--text-color);
  background-color: transparent;
  border: 1px solid var(--border-color);
}

.dialog-btn-cancel:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.dialog-btn-confirm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  background-color: var(--theme-color);
  border: none;
  box-shadow: 0 4px 10px rgba(var(--theme-color-rgb), 0.3);
}

.dialog-btn-confirm:hover {
  background-color: rgba(var(--theme-color-rgb), 0.9);
  box-shadow: 0 6px 15px rgba(var(--theme-color-rgb), 0.4);
}

@media (max-width: 768px) {
  :deep(.app-dialog__footer) {
    flex-direction: row;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 24px 24px;
  }

  .dialog-btn {
    width: auto;
  }
}
</style>
