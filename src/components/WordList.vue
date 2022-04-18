<template>
    <div class="card">
        <div class="card-header">
            <h2 class="card-title d-flex justify-content-between align-items-center">
                Words <span class="text-muted">{{ words.length }}</span>
            </h2>
        </div>
        <div class="card-header">
            <input
                @keydown.stop
                v-model="searchQuery"
                type="text"
                class="form-control"
                placeholder="Search"
                aria-label="Search"
            />
        </div>
        <ul class="list-group list-group-flush">
            <li v-if="words.length == 0" class="list-group-item d-flex justify-content-center text-muted">
                No words recorded...
            </li>
            <template v-for="word in words">
                <li
                    @click="selectWord(word)"
                    v-if="filterCheck(searchQuery, word)"
                    class="list-group-item d-flex justify-content-between align-items-stretch"
                    :class="{ active: word == selected }"
                >
                    <span class="d-flex align-items-center mx-3 my-2">
                        <img v-if="word.cachedBlob" :src="word.cachedBlob" :title="word.toGlyphString()" />
                        <span v-if="word.plaintext || !word.cachedBlob" class="ms-2">{{ word }}</span>
                    </span>
                    <div class="d-flex align-items-center">
                        <span
                            v-if="word.usedIn.length == 0"
                            class="ms-2 badge bg-danger text-light rounded-pill"
                            title="Unused"
                            >0</span
                        >
                        <span
                            v-else
                            class="ms-2 badge rounded-pill"
                            :class="{
                                'bg-primary ': word.usedIn.length >= 2,
                                'bg-light text-muted': word.usedIn.length < 2,
                            }"
                            >{{ word.usedIn.length }}</span
                        >
                        <div
                            @click.stop="addWord(word)"
                            class="list-group-item-add d-flex align-items-center bg-light text-primary align-self-stretch px-3 py-1 ms-2"
                        >
                            <i class="bi bi-arrow-right-circle"></i>
                        </div>
                    </div></li
            ></template>
        </ul>
        <div v-if="selected" class="card-footer d-flex justify-content-end">
            <button @click="deleteWord(selected!)" class="btn btn-danger">Delete</button>
        </div>
    </div>
</template>

<style scoped>
.list-group-item {
    padding: 0;
}
.list-group-item-add {
    cursor: pointer;
}

.active img {
    filter: drop-shadow(1px 1px 1px white) drop-shadow(1px -1px 1px white) drop-shadow(-1px 1px 1px white)
        drop-shadow(-1px -1px 1px white);
}
</style>

<script setup lang="ts">
import { ref, type PropType } from "vue";
import { Glyph, Masks, Word } from "@/glyphs";

const searchQuery = ref("");

const props = defineProps({
    words: { type: Array as PropType<Array<Word>>, required: true },
    selected: { type: Word },
    glyph: { type: Glyph },
});
const emit = defineEmits<{
    (e: "deleted", value: Word): void;
    (e: "update:selected", value: Word | undefined): void;
    (e: "addWord", value: Word): void;
}>();

function filterCheck(query: string, word: Word): boolean {
    const q = query.trim().toLowerCase();
    return (
        q == "" ||
        word == props.selected ||
        word.toGlyphString().toLowerCase().includes(q) ||
        word.plaintext.toLowerCase().includes(q) ||
        (q.match(/^(\\|==?)\d*[v^|lro]*\d*$/) != null && filterExpr(q, word)) ||
        (q == "@" &&
            props.glyph != undefined &&
            word.glyphs.some((g) => (g.encoded & props.glyph!.encoded) == props.glyph!.encoded)) ||
        (q == "@@" &&
            props.glyph != undefined &&
            word.glyphs.some((g) => g.encoded == props.glyph!.encoded)) ||
        (q == "@i" &&
            props.glyph != undefined &&
            word.glyphs.some((g) => (g.encoded & Masks.Inner) == (props.glyph!.encoded & Masks.Inner))) ||
        (q == "@o" &&
            props.glyph != undefined &&
            word.glyphs.some((g) => (g.encoded & Masks.Outer) == (props.glyph!.encoded & Masks.Outer))) ||
        (q.match(/^@[io][0-9a-f]{4}$/) != null && filterComponents(q, word))
    );
}

function filterExpr(query: string, word: Word): boolean {
    const leftNeeded = query.match(/l/g)?.length ?? 0;
    const rightNeeded = query.match(/r/g)?.length ?? 0;
    const centerNeeded = query.match(/\|/g)?.length ?? 0;
    const upperNeeded = query.match(/\^/g)?.length ?? 0;
    const lowerNeeded = query.match(/v/g)?.length ?? 0;
    const circlesNeeded = query.match(/o/g)?.length ?? 0;
    const glyphsNeeded = parseInt(query.match(/\d+/)?.[0] ?? "0");

    let comp = (a: number, b: number) => a >= b;
    if (query[0] == "=") comp = (a, b) => (b == 0 ? true : a == b);
    if (query[0] == "=" && query[1] == "=") comp = (a, b) => a == b;

    const r = word.glyphs.reduce(
        (prev, g) => {
            const n = g.encoded;
            prev.left += bitCount(n & 0x1010);
            prev.right += bitCount(n & 0x4040);
            prev.center += bitCount(n & 0x20a0);

            prev.upper += (n & 0x0003) == 0x0003 ? 1 : 0;
            prev.upper += (n & 0x0300) == 0x0300 ? 1 : 0;
            prev.lower += (n & 0x000c) == 0x000c ? 1 : 0;
            prev.lower += (n & 0x0c00) == 0x0c00 ? 1 : 0;

            prev.circles += (n & 0x8000) != 0 ? 1 : 0;
            prev.glyphs++;

            return prev;
        },
        { left: 0, right: 0, center: 0, upper: 0, lower: 0, circles: 0, glyphs: 0 }
    );

    return (
        comp(r.left, leftNeeded) &&
        comp(r.right, rightNeeded) &&
        comp(r.center, centerNeeded) &&
        comp(r.upper, upperNeeded) &&
        comp(r.lower, lowerNeeded) &&
        comp(r.circles, circlesNeeded) &&
        (glyphsNeeded == 0 ? true : r.glyphs == glyphsNeeded)
    );
}

function filterComponents(query: string, word: Word): boolean {
    const inner = query.startsWith("@i");
    const aaa = 1;
    return false;
}

function bitCount(n: number) {
    n = n - ((n >> 1) & 0x55555555);
    n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
    return (((n + (n >> 4)) & 0xf0f0f0f) * 0x1010101) >> 24;
}

function deleteWord(word: Word) {
    const idx = props.words.indexOf(word);
    props.words.splice(idx, 1);
    emit("deleted", word);
    emit("update:selected", undefined);
}

function selectWord(word: Word) {
    emit("update:selected", props.selected == word ? undefined : word);
}

function addWord(clicked: Word) {
    emit("addWord", clicked);
}
</script>
