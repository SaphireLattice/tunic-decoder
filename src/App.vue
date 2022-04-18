<script setup lang="ts">
import WordInput from "./components/WordInput.vue";
import WordList from "./components/WordList.vue";
import Toast from "./components/Toast.vue";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import { onMounted, onUnmounted, reactive, ref, watch, type Ref } from "vue";
import { Glyph, Paragraph, Word } from "./glyphs";

type SavedState = {
    words: { glyphs: string; text?: string }[];
    texts: { glyphs: string[]; description?: string }[];
};

const canvas = ref(document.createElement("canvas"));

const keyevents = ref([] as ((event: KeyboardEvent) => any)[]);

const state = reactive({
    word: new Word(),
    glyph: new Glyph(0b0011_0100_1011_0111),
    words: [] as Word[],
    texts: [] as Paragraph[],
    selectedWord: undefined as Word | undefined,
    stashedWord: undefined as Word | undefined,
    selectedText: undefined as Paragraph | undefined,
    glyphOnly: false,
    showPhonetic: false,
    toastText: undefined as string | undefined,
    showSecrets: true,
});

async function onWordUpdate(value: Word) {
    const found = state.words.find((w) => w.toGlyphString() == value.toGlyphString());
    if (state.selectedWord) {
        if (found && found != state.selectedWord) {
            alert("Word already exists");
            return;
        }
        restoreEditing(state.selectedWord, true);
        state.selectedWord = undefined;
        return;
    }
    if (found) {
        state.toastText = "Word already exists";
        //showToast("Word already exists", "warning");
        addTextWord(found);
        return;
    }
    state.word = new Word();
    await value.toBlob(canvas.value, undefined, state.showSecrets);
    state.words.push(value);
    saveData();
}

async function onKeyInput(event: KeyboardEvent) {
    const notHandled = keyevents.value.reduce((prev, v) => prev && v(event), true);
    if (!notHandled) return;

    if (event.key == "Escape" && state.selectedWord) state.selectedWord = undefined;
}

watch(
    () => state.selectedWord,
    (val, oldVal) => {
        if (!val) {
            restoreEditing();
            return;
        }

        const oldGlyph = state.glyph;
        const oldWord = state.word;

        const newWord = new Word(state.selectedWord?.toGlyphString(), state.selectedWord?.plaintext);

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

watch(
    () => state.selectedText,
    () => saveData()
);

watch(
    () => state.showSecrets,
    (val) => refreshWords(val)
);

async function restoreEditing(target?: Word, alreadySaved: boolean = false) {
    if (!target && !state.stashedWord) return;
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

function filterCheckText(text: Paragraph) {
    return !state.selectedWord || text == state.selectedText || text.words.includes(state.selectedWord);
}

async function addTextWord(word: Word) {
    if (!state.texts[0]) state.texts.push(new Paragraph());
    (state.selectedText ?? state.texts[state.texts.length - 1]).pushWord(word);
    saveData();
}

async function popTextWord() {
    if (!state.texts[0]) state.texts.push(new Paragraph());
    const target = state.selectedText ?? state.texts[state.texts.length - 1];
    if (!target) {
        state.toastText = "No text to delete the word from? Strange";
        return;
    }
    if (!filterCheckText(target)) return;
    if (target.words.length > 0) {
        target.popWord();
    } else {
        const idx = state.texts.indexOf(target);
        state.texts.splice(idx, 1);
        if (state.selectedText) state.selectedText = undefined;
    }
    saveData();
}

onMounted(() => {
    if (!canvas.value) return;
    const context = canvas.value.getContext("2d");
    if (!context) return;

    loadData();
    document.addEventListener("keydown", onKeyInput);
});

onUnmounted(() => {
    document.removeEventListener("keydown", onKeyInput);
});

async function refreshWords(showSecrets = false) {
    console.log("Starting full cache refresh");
    await Promise.all(
        state.words.map(async (word): Promise<string> => {
            return await word.toBlob(canvas.value, undefined, showSecrets);
        })
    );
    console.log("Done refreshing all words");
}

async function loadData() {
    if (!storageAvailable("localStorage")) return;
    const json = localStorage.getItem("savedData");
    if (!json) return;
    const data = JSON.parse(json) as SavedState;

    console.log("Loading all words");
    state.words.push(
        ...(await Promise.all(
            data.words.map(async (s): Promise<Word> => {
                const word = new Word(s.glyphs, s.text);
                await word.toBlob(canvas.value);
                return word;
            })
        ))
    );
    console.log("Done loading all words");
    state.texts.push(
        ...(await Promise.all(
            data.texts.map(
                (t) =>
                    new Paragraph(
                        t.glyphs.map((g) => state.words.find((w) => w.toGlyphString() == g)!),
                        t.description
                    )
            )
        ))
    );
}

function saveData() {
    let data: SavedState = {
        words: state.words.map((w) => ({
            glyphs: w.toGlyphString(),
            text: w.plaintext,
        })),
        texts: state.texts.map((t) => ({
            glyphs: t.words.map((w) => w.toGlyphString()),
            description: t.description,
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

<style>
html {
    overflow-y: scroll;
}

.cursor-pointer {
    cursor: pointer;
}

.font-size-1 {
    font-size: 1rem;
}

.word-highlight {
    background: #aaf;
    border: 1px solid blue;
    margin: -1px;
}

.active .word-highlight {
    border-color: #228;
}
</style>

<template>
    <main class="container my-4">
        <div class="row">
            <div class="col-4">
                <WordInput
                    ref="wordinput"
                    :glyph="state.glyph"
                    :word="state.word"
                    :editing="!!state.selectedWord"
                    :keyevents="keyevents"
                    @update:word="onWordUpdate"
                    :split-components="state.showSecrets"
                />
            </div>
            <div class="col-4">
                <WordList
                    :glyph="state.glyph"
                    :words="state.words"
                    v-model:selected="state.selectedWord"
                    @deleted="saveData()"
                    @add-word="addTextWord"
                />
            </div>
            <div class="col-4">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title d-flex justify-content-end align-items-end">
                            <span class="flex-fill">Texts</span>
                            <div v-if="state.showSecrets" class="form-check font-size-1">
                                <input
                                    class="form-check-input"
                                    type="checkbox"
                                    v-model="state.showPhonetic"
                                    id="flexCheckDefault"
                                />
                                <label class="form-check-label" for="flexCheckDefault"> Phonetic </label>
                            </div>
                            <div class="form-check font-size-1 ms-2">
                                <input
                                    class="form-check-input"
                                    type="checkbox"
                                    v-model="state.showSecrets"
                                    id="flexCheckDefault"
                                />
                                <label class="form-check-label" for="flexCheckDefault"> Spoil! </label>
                            </div>
                            <div class="form-check font-size-1 ms-2">
                                <input
                                    class="form-check-input"
                                    type="checkbox"
                                    v-model="state.glyphOnly"
                                    id="flexCheckDefault"
                                />
                                <label class="form-check-label" for="flexCheckDefault"> Glyph </label>
                            </div>
                        </h2>
                    </div>
                    <ul class="list-group list-group-flush">
                        <template v-for="text in state.texts">
                            <li
                                v-if="filterCheckText(text)"
                                class="list-group-item"
                                :class="{
                                    active: text == state.selectedText,
                                    'bg-info border-info text-black':
                                        text == state.selectedText &&
                                        state.selectedWord &&
                                        !text.words.includes(state.selectedWord),
                                }"
                                @click="state.selectedText = state.selectedText == text ? undefined : text"
                            >
                                <div
                                    v-if="text.description != ''"
                                    :class="{
                                        'text-muted':
                                            state.selectedText != text ||
                                            (state.selectedText == text &&
                                                state.selectedWord &&
                                                !text.words.includes(state.selectedWord)),
                                        'text-white-50':
                                            state.selectedText == text &&
                                            (!state.selectedWord || text.words.includes(state.selectedWord)),
                                    }"
                                >
                                    {{ text.description }}
                                </div>
                                <div>
                                    <template v-for="word in text.words">
                                        <img
                                            v-if="
                                                (state.glyphOnly || !word.plaintext) &&
                                                word.cachedBlob &&
                                                !state.showPhonetic
                                            "
                                            class="cursor-pointer"
                                            :class="{ 'word-highlight': word == state.selectedWord }"
                                            :src="word.cachedBlob"
                                            :title="word.toGlyphString()"
                                            @click.stop="
                                                () =>
                                                    (state.selectedWord =
                                                        state.selectedWord == word ? undefined : word)
                                            "
                                        />
                                        <span
                                            v-else
                                            class="cursor-pointer"
                                            :class="{ 'word-highlight': word == state.selectedWord }"
                                            :title="word.toGlyphString()"
                                            @click.stop="
                                                () =>
                                                    (state.selectedWord =
                                                        state.selectedWord == word ? undefined : word)
                                            "
                                            >{{
                                                word.plaintext == "" ? "[" + word.toPhonetic() + "]" : word
                                            }}</span
                                        >
                                        {{ " " }}
                                    </template>
                                </div>
                            </li>
                        </template>
                    </ul>
                    <div class="card-footer">
                        <input
                            v-if="!state.selectedText"
                            @keydown.stop
                            disabled
                            type="text"
                            class="form-control"
                            placeholder="Description"
                            aria-label="Description"
                        />
                        <input
                            v-else
                            @blur="saveData()"
                            @keydown.stop
                            v-model="state.selectedText!.description"
                            type="text"
                            class="form-control"
                            placeholder="Description"
                            aria-label="Description"
                        />
                    </div>
                    <div class="card-footer">
                        <button @click="popTextWord" class="btn btn-outline-danger mx-1">Pop word</button>
                        <button
                            @click="() => state.texts.push(new Paragraph())"
                            class="btn btn-outline-success mx-1"
                        >
                            New text
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="toast-container position-fixed bottom-0 end-0 p-3">
            <Toast :text="state.toastText" @done="state.toastText = undefined"></Toast>
        </div>
    </main>
</template>
