<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps<{
    modalId: string;
    modelValue: boolean;
    title?: string;
}>();

const emit = defineEmits<{
    (e: "update:modelValue", value: boolean): void;
    (e: "closed"): void;
}>();

const closeButton = ref<HTMLButtonElement>();
const modalBody = ref<HTMLDivElement>();
const ariaClose = ref<HTMLDivElement>();

let previousFocus: HTMLElement | null = null;
let lastFocusable: HTMLElement;
let escListener: (event: KeyboardEvent) => void;
let closing = false;

function close() {
    if (!props.modelValue) return;

    document.removeEventListener("keydown", escListener);
    closing = true;

    emit("update:modelValue", false);
    emit("closed");
    previousFocus?.focus();
    previousFocus = null;
}

function closeEsc() {
    const defaultElement = getDefaultFocus();
    if (document.activeElement == document.body) {
        close();
        return;
    }
    if (document.activeElement != defaultElement) {
        (defaultElement as HTMLElement).focus();
        return;
    }

    close();
}

function getDefaultFocus() {
    return (
        (modalBody.value?.getElementsByClassName(
            "modal-default-element"
        )[0] as HTMLElement) ??
        closeButton.value ??
        ariaClose.value!
    );
}

function tabCapture(event: KeyboardEvent) {
    const active = document.activeElement;
    const close = closeButton.value ?? ariaClose.value!;

    if (event.shiftKey && active == close) {
        event.preventDefault();
        lastFocusable.focus();
    }
    if (!event.shiftKey && active == lastFocusable) {
        event.preventDefault();
        close.focus();
    }
}

escListener = (event) => {
    if (event.code != "Escape") return;
    if (props.modelValue == false) return;
    event.stopPropagation();
    closeEsc();
};

watch(
    () => props.modelValue,
    async (value, old) => {
        previousFocus =
            document.activeElement == document.body
                ? null
                : (document.activeElement as HTMLElement);

        if (!value || old) return;

        document.addEventListener("keydown", escListener);

        await nextTick();

        const defaultElement = getDefaultFocus();
        defaultElement.focus();

        lastFocusable = ariaClose.value!;

        const focusable = [
            ...(modalBody.value?.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            ) ?? []) as { [Symbol.iterator](): any },
        ] as HTMLElement[];

        lastFocusable =
            focusable.length > 1
                ? focusable[focusable.length - 1]
                : lastFocusable;
    }
);
</script>

<template>
    <teleport to="#modals">
        <transition appear name="fade">
            <div
                :id="'modal-'+modalId+'-base'"
                role="dialog"
                aria-modal="true"
                :aria-labelledby="'modal-title-'+modalId"
                v-if="modelValue"
                @click="close()"
                @keydown.tab="tabCapture"
                class="modal"
                :class="{ show: modelValue }"
            >
                <div
                    v-if="!closeButton"
                    ref="ariaClose"
                    tabindex="0"
                    role="button"
                    aria-label="Close modal"
                    @click.stop="close()"
                    @keydown.enter="close()"
                    @keydown.space="close()"
                ></div>
                <div
                    ref="modalBody"
                    @click.stop=""
                    class="modal-dialog modal-lg"
                >
                    <div class="modal-content">
                        <div class="modal-header">
                            <slot name="header">
                                <h5 id="modal-title">
                                    {{ title ?? "Modal" }}
                                </h5>

                                <button
                                    type="button"
                                    class="btn-close"
                                    ref="closeButton"
                                    aria-label="Close"
                                    @click="close()"
                                >
                                </button>
                            </slot>
                        </div>
                        <div class="modal-body">
                            <slot><p>Empty modal</p></slot>
                        </div>
                        <div class="modal-footer" v-if="$slots.footer">
                            <slot name="footer" :close="close"></slot>
                        </div>
                    </div>
                </div>

                <div v-if="modelValue" class="modal-backdrop" :class="{ show: modelValue }"></div>
            </div>
        </transition>
    </teleport>
</template>

<style scoped>
.modal.show {
    display: unset;
}

.modal-dialog {
    z-index: var(--bs-modal-zindex)
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
