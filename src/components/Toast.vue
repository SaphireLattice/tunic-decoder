<template>
    <div
        class="toast align-items-center"
        :class="{ show: text != undefined }"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
    >
        <div class="d-flex">
            <div class="toast-body">{{ text }}</div>
            <button
                @click="forceClose"
                type="button"
                class="btn-close me-2 m-auto"
                data-bs-dismiss="toast"
                aria-label="Close"
            ></button>
        </div>
    </div>
</template>

<script setup lang="ts">import { ref, watch } from 'vue';

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
        2000
    );
});

function forceClose() {
    if (props.text)
        emit("done", props.text);
    clearTimeout(closeTimeout.value);
}
</script>