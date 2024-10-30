<template>
    <div
        class="glyph-input card d-flex flex-column"
        :class="{ focused: focused }"
        tabindex="0"
        @click.self="rootClick"
        @focus="focused = true"
        @blur="focused = false"
    >
        <div class="card-header">
            <h2 class="card-title">Glyph input</h2>
        </div>
        <div class="card-body d-flex glyph">
            <IconGlyph :height="512" :row="state.row" v-model="props.glyph.encoded" />
        </div>
        <div class="card-footer">
            <canvas ref="canvas" :height="18 * glyphScale" :width="canvasWidth"></canvas>
            <div>
                <span class="text-muted" v-if="props.word.glyphs.length > 0">{{
                    props.word.toGlyphString()
                }}</span>
                {{ props.glyph.encoded.toString(16).padStart(4, "0") }}
            </div>
            <div v-if="showSecrets">
                <span class="text-muted" v-if="props.word.glyphs.length > 0">{{
                    props.word.toPhonetic()
                }}</span>
                {{ props.glyph.toPhonetic() }}
            </div>
        </div>
        <div class="card-footer bg-body d-flex justify-content-center">
            <button @click="pushGlyph(false)" class="btn btn-success mx-1">Add</button>
            <button @click="popGlyph()" class="btn btn-outline-danger mx-1">Del</button>
            <button @click="setState(~props.glyph.encoded & (2 ** 16 - 1))" class="btn btn-secondary mx-1">
                Flip
            </button>
            <button @click="setState(0)" class="btn btn-secondary mx-1">Clear</button>
            <button
                @click="newWord"
                class="btn mx-1"
                :class="{ 'btn-primary': !editing, 'btn-success': editing }"
            >
                {{ editing ? "Save" : "New" }} word
            </button>
        </div>
        <div class="card-footer bg-body">
            <div class="input-group">
                <span class="input-group-text" id="basic-addon1">Text</span>
                <input
                    @keydown.stop
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

<style scoped>
.glyph-input {
    position: sticky;
    top: 24px;
}
</style>

<script setup lang="ts">
import IconGlyph from "./icons/IconGlyph.vue";
import { Word, Glyph } from "@/glyphs";
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch, type PropType } from "vue";

const props = defineProps({
    word: { type: Word, required: true },
    glyph: { type: Glyph, required: true },
    editing: { type: Boolean },
    keyevents: { type: Array as PropType<Array<(event: KeyboardEvent) => any>> },
    showSecrets: { type: Boolean },
});
const emit = defineEmits<{
    (e: "update:word", value: Word): void;
}>();

const glyphScale = ref(2);

const focused = ref(false);
const canvas = ref<HTMLCanvasElement>();
const state = reactive({
    stashedGlyphs: [] as number[],
    row: undefined as number | undefined,
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
    props.word.render(
        context,
        1 * s,
        1 * s,
        s,
        "#6c757d",
        undefined,
        props.showSecrets,
        "#5ca1ab",
        "#a6615b"
    );
    let offset = 1 + props.word.glyphs.length * 8;
    props.glyph.render(context, offset * s, 1 * s, false, s);

    for (const stashed of state.stashedGlyphs) {
        offset += 8;
        new Glyph(stashed).render(
            context,
            offset * s,
            1 * s,
            false,
            s,
            "#a6615b",
            props.showSecrets,
            "#5ca1ab",
            "#a6615b"
        );
    }
}

function onKeyInput(event: KeyboardEvent) {
    switch (event.key) {
        case "q":
            if (state.row == undefined) state.row = 0;
            props.glyph.encoded ^= 0b0001 << (state.row * 4);
            break;
        case "w":
            if (state.row == undefined) state.row = 0;
            props.glyph.encoded ^= 0b0010 << (state.row * 4);
            break;
        case "e":
            if (state.row == undefined) state.row = 0;
            props.glyph.encoded ^= 0b0100 << (state.row * 4);
            break;
        case "r":
            if (state.row == undefined) state.row = 0;
            props.glyph.encoded ^= 0b1000 << (state.row * 4);
            break;
        case "f":
            if (state.row == undefined) state.row = -1;
            state.row++;
            if (state.row == 4)
                if (props.glyph.encoded == 0) newWord();
                else pushGlyph(false);
            state.row %= 4;
            break;
        case "F":
            if (state.row == undefined) state.row = 0;
            state.row--;
            if (state.row != -1) break;
            state.row = 3;
            if (props.word.glyphs.length > 0) popGlyph();
            else state.row = 0;
            break;
        case "a":
            if (state.row == undefined) state.row = 0;
            popGlyph();
            break;
        case "A":
            if (state.row == undefined) state.row = 0;
            pushGlyph(false);
            break;
        case "c":
            if (event.ctrlKey) return true;
            if (state.row == undefined) state.row = 0;
            setState(0);
            break;
        case "D":
            newWord();
            break;
        case "Escape":
            if (state.row == undefined) return true;
            state.row = undefined;
            break;
        default:
            return true;
    }
    return false;
}

function rootClick(event: MouseEvent) {
    (event.currentTarget as HTMLElement).focus();
}

function pushGlyph(final: boolean) {
    const mask = 0b0100_0000_0100_0000;
    const rightVertical = (props.glyph.encoded & mask) >> 2;
    if (!final) props.glyph.encoded &= ~mask;
    props.word.glyphs.push(new Glyph(props.glyph.encoded));

    setState(final ? 0 : rightVertical | (state.stashedGlyphs.shift() ?? 0));
}

function popGlyph() {
    const old = props.glyph.encoded;
    const wordLength = props.word.glyphs.length;
    setState(props.word.glyphs.pop()?.encoded ?? 0);

    if (old == 0) {
        if (wordLength == 0) setState(state.stashedGlyphs.shift() ?? 0);
        return;
    }
    state.stashedGlyphs.unshift(old);
}

function setState(newState: number) {
    if (newState == props.glyph.encoded) renderCanvas();
    props.glyph.encoded = newState;
}

function newWord() {
    if (props.glyph.encoded != 0) pushGlyph(true);
    if (state.row != undefined) state.row = 0;
    emit("update:word", props.word);
    nextTick(() => renderCanvas());
}

onMounted(() => {
    renderCanvas();
    props.keyevents?.push(onKeyInput);
});

onUnmounted(() => {
    const idx = props.keyevents?.indexOf(onKeyInput);
    if (idx == undefined || idx == -1) return;
    props.keyevents!.splice(idx, 1);
});
</script>
