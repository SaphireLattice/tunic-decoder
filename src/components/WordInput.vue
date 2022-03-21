<template>
    <div class="card d-flex flex-column">
        <div class="card-header">
            <h2 class="card-title">Glyph input</h2>
        </div>
        <div class="card-body d-flex glyph">
            <IconGlyph :height="512" v-model="props.glyph.encoded" />
        </div>
        <div class="card-footer">
            <canvas ref="canvas" :height="18 * glyphScale" :width="canvasWidth"></canvas>
            <div>
                <span class="text-muted" v-if="props.word.glyphs.length > 0">{{ props.word.toGlyphString() }}</span>
                {{ props.glyph.encoded.toString(16).padStart(4, "0") }}
            </div>
        </div>
        <div class="card-footer bg-body d-flex justify-content-center">
            <button @click="pushGlyph(false)" class="btn btn-success mx-1">Add</button>
            <button
                :disabled="props.word.glyphs.length < 1"
                @click="setState(props.word.glyphs.pop()!.encoded)"
                class="btn btn-outline-danger mx-1"
            >
                Del
            </button>
            <button @click="setState(~props.glyph.encoded & (2 ** 16 - 1))" class="btn btn-secondary mx-1">Flip</button>
            <button @click="setState(0)" class="btn btn-secondary mx-1">Clear</button>
            <button @click="newWord" class="btn mx-1" :class="{'btn-primary': !editing, 'btn-success': editing}">{{ editing ? "Save" : "New" }} word</button>
        </div>
        <div class="card-footer bg-body">
            <div class="input-group">
                <span class="input-group-text" id="basic-addon1">Text</span>
                <input
                    v-model="props.word.plaintext"
                    type="text"
                    class="form-control"
                    placeholder="Plaintext"
                    aria-label="Plaintext"
                    aria-describedby="basic-addon1"
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import IconGlyph from "./icons/IconGlyph.vue";
import { Word, Glyph } from "@/glyphs";
import { computed, nextTick, onMounted, reactive, ref, watch } from "vue";

const props = defineProps({
    word: { type: Word, required: true },
    glyph: { type: Glyph, required: true },
    editing: { type: Boolean },
});
const emit = defineEmits<{
    (e: "update:word", value: Word): void;
}>();

const glyphScale = ref(2);

const canvas = ref<HTMLCanvasElement>();
const state = reactive({
    stashedWord: undefined as Word | undefined
});
const canvasWidth = (2 + 10 * 8) * glyphScale.value;


watch(
    () => props.word,
    (newValue) => renderCanvas()
);

watch(
    () => props.glyph.encoded,
    (newValue) => renderCanvas()
);

function renderCanvas() {
    if (!canvas.value) return;
    const context = canvas.value.getContext("2d");
    if (!context) return;

    const s = glyphScale.value;
    context.clearRect(0, 0, canvasWidth, 18 * s);
    props.word.render(context, 1 * s, 1 * s, s, "#6c757d");
    props.glyph.render(context, (1 + props.word.glyphs.length * 8) * s, 1 * s, false, s);
}

function pushGlyph(final: boolean) {
    const mask = 0b0100_0000_0100_0000;
    const rightVertical = (props.glyph.encoded & mask) >> 2;
    if (!final) props.glyph.encoded &= ~mask;
    props.word.glyphs.push(new Glyph(props.glyph.encoded));

    setState(0 + (final ? 0 : rightVertical));
}

function setState(newState: number) {
    if (newState == props.glyph.encoded)
        renderCanvas();
    props.glyph.encoded = newState;
}

function newWord() {
    if (props.glyph.encoded != 0) pushGlyph(true);
    emit("update:word", props.word);
    nextTick(() => renderCanvas());
}

onMounted(() => {
    renderCanvas();
})
</script>
