<script setup lang="ts">
import WordInput from "./components/WordInput.vue";
import WordList from "./components/WordList.vue";

import { onMounted, reactive, ref, watch, type Ref } from "vue";
import { Glyph, Paragraph, Word } from "./glyphs";

type SavedState = {
    words: { glyphs: string; text?: string }[];
};

const canvas = ref(document.createElement("canvas"));

const state = reactive({
    word: new Word(),
    glyph: new Glyph(0b0011_0100_1011_0111),
    words: [] as Word[],
    texts: [] as Paragraph[],
    selected: undefined as Word | undefined,
    stashedWord: undefined as Word | undefined,
});

async function onWordUpdate(value: Word) {
    if (state.selected) {
        console.log("Selected saving!");
        restoreEditing(state.selected, true);
        state.selected = undefined;
        return;
    }
    state.word = new Word();
    await value.toBlob(canvas.value);
    state.words.push(value);
    saveData();
}

watch(
    () => state.selected,
    (val, oldVal) => {
        console.log(val, oldVal);
        if (!val) {
            restoreEditing();
            return;
        }

        const oldGlyph = state.glyph;
        const oldWord = state.word;

        const newWord = new Word(state.selected?.toGlyphString(), state.selected?.plaintext);

        const pop = newWord.glyphs.pop();
        if (pop && pop.encoded == 0) {
            newWord.glyphs.push(pop);
            state.glyph = new Glyph(0);
        } else {
            state.glyph = pop ?? new Glyph(0);
        }
        state.word = newWord;

        if (!oldVal) {
            state.stashedWord = oldWord;
            state.stashedWord.glyphs.push(oldGlyph);
        }
    }
);

async function restoreEditing(target?: Word, alreadySaved: boolean = false) {
    if (!target && !state.stashedWord) return;
    console.log("Restoring~");
    const editedWord = state.word;
    const editedGlyph = state.glyph;

    state.glyph = state.stashedWord?.glyphs.pop() ?? new Glyph(0);
    state.word = state.stashedWord ?? new Word();
    state.stashedWord = undefined;

    if (target) {
        target.glyphs = editedWord.glyphs;
        if (!alreadySaved || target.glyphs.length == 0) target.glyphs.push(editedGlyph);
        target.plaintext = editedWord.plaintext;
        await target.toBlob(canvas.value);
    }
    saveData();
}

onMounted(() => {
    if (!canvas.value) return;
    const context = canvas.value.getContext("2d");
    if (!context) return;

    loadData();
});

async function loadData() {
    if (!storageAvailable("localStorage")) return;
    const json = localStorage.getItem("savedData");
    if (!json) return;
    const data = JSON.parse(json) as SavedState;

    state.words.push(
        ...(await Promise.all(
            data.words.map(async (s): Promise<Word> => {
                const word = new Word(s.glyphs, s.text);
                await word.toBlob(canvas.value);
                return word;
            })
        ))
    );
}

function saveData() {
    let data: SavedState = {
        words: state.words.map((w) => ({
            glyphs: w.toGlyphString(),
            text: w.plaintext,
        })),
    };
    localStorage.setItem("savedData", JSON.stringify(data));
}

function storageAvailable(type: string) {
    var storage;
    try {
        storage = window[type as any];
        var x = "__storage_test__";
        (storage as any).setItem(x, x);
        (storage as any).removeItem(x);
        return true;
    } catch (e) {
        return (
            e instanceof DOMException &&
            (e.code === 22 ||
                e.code === 1014 ||
                e.name === "QuotaExceededError" ||
                e.name === "NS_ERROR_DOM_QUOTA_REACHED") &&
            storage &&
            storage.length !== 0
        );
    }
}
</script>

<template>
    <main class="container my-4">
        <div class="row">
            <div class="col-4">
                <WordInput
                    :glyph="state.glyph"
                    :word="state.word"
                    :editing="!!state.selected"
                    @update:word="onWordUpdate"
                />
            </div>
            <div class="col-4">
                <WordList :words="state.words" v-model:selected="state.selected" @deleted="() => saveData()" />
            </div>
            <div class="col-4">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title">Texts</h2>
                    </div>
                    <ul class="list-group list-group-flush">
                        <li class="list-group-item">[AAAA] [AAAA]</li>
                        <li class="list-group-item"></li>
                    </ul>
                </div>
            </div>
        </div>
    </main>
</template>
