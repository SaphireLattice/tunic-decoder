<template>
    <div
        class="toast align-items-center"
        :class="{ show: text != undefined }"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
    >
        <div class="toast-header bg-warning">
            <strong class="me-auto">Warning!</strong>
            <button
                @click="forceClose"
                type="button"
                class="btn-close"
                data-bs-dismiss="toast"
                aria-label="Close"
            ></button>
        </div>
        <div class="d-flex">
            <div class="toast-body">{{ text }}</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps({
    text: { type: String }
});
const emit = defineEmits<{
    (e: "done", value: string): void;
}>();

const closeTimeout = ref<number>();

watch(() => props.text, (val, old) => {
    if (closeTimeout.value)
        clearTimeout(closeTimeout.value);
    closeTimeout.value = setTimeout(
        () => forceClose(),
        3000
    );
});

function forceClose() {
    if (props.text)
        emit("done", props.text);
    clearTimeout(closeTimeout.value);
}
</script>