<template>
    <div class="card">
        <div class="card-header">
            <h2 class="card-title d-flex justify-content-between align-items-center">
                Words <span class="text-muted">{{ words.length }}</span>
            </h2>
        </div>
        <ul class="list-group list-group-flush">
            <li v-if="words.length == 0" class="list-group-item d-flex justify-content-center text-muted">
                No words recorded...
            </li>
            <li
                @click="selectWord(word)"
                v-for="word in words"
                class="list-group-item d-flex justify-content-between align-items-center"
                :class="{ active: word == selected }"
            >
                <span class="d-flex align-items-center">
                    <img v-if="word.cachedBlob" :src="word.cachedBlob" :title="word.toGlyphString()" />
                    <span v-if="word.plaintext || !word.cachedBlob" class="ms-2">{{ word }}</span>
                </span>
                <span>
                    <span class="ms-2 badge bg-primary rounded-pill">14</span>
                </span>
            </li>
        </ul>
        <div v-if="selected" class="card-footer d-flex justify-content-end">
            <button @click="deleteWord(selected!)" class="btn btn-danger">Delete</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { PropType } from "vue";
import { Word } from "@/glyphs";

const props = defineProps({
    words: { type: Array as PropType<Array<Word>>, required: true },
    selected: { type: Word },
});
const emit = defineEmits<{
    (e: "deleted", value: Word): void;
    (e: "update:selected", value: Word | undefined): void;
}>();

function deleteWord(word: Word) {
    const idx = props.words.indexOf(word);
    props.words.splice(idx, 1);
    emit("deleted", word);
    emit("update:selected", undefined);
}

function selectWord(word: Word) {
    emit("update:selected", props.selected == word ? undefined : word);
}
</script>
