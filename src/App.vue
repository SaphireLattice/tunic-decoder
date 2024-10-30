<script setup lang="ts">
import WordInput from "./components/WordInput.vue";
import WordList from "./components/WordList.vue";
import Toast from "./components/Toast.vue";
import Modal from "./components/Modal.vue";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import { onMounted, onUnmounted, reactive, ref, watch, type Ref } from "vue";
import { Glyph, Paragraph, Word } from "./glyphs";

type SavedState = {
    spoilerMode?: boolean;
    spoilHidden?: boolean;
    spoilerSpecificFeature?: boolean;
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
    modalHelp: false,

    spoilerMode: false,
    spoilHidden: false,
    spoilerConfirmShowModal: false,
    page: "input",
});

async function onWordUpdate(value: Word) {
    const found = state.words.find((w) => w.toGlyphString() == value.toGlyphString());
    if (state.selectedWord) {
        if (found && found != state.selectedWord) {
            state.toastText = "Word already exists";
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
    await value.toBlob(canvas.value, undefined, state.spoilerMode);
    state.words.push(value);
    saveData();
}

async function onKeyInput(event: KeyboardEvent) {
    const notHandled = keyevents.value.reduce((prev, v) => prev && v(event), true);
    if (!notHandled) return;

    if (event.key == "Escape" && state.selectedWord) state.selectedWord = undefined;
    if (event.key == "F1") state.modalHelp = !state.modalHelp;
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
    () => state.spoilerMode,
    (val) => {
        if (!val && state.showPhonetic)
            state.showPhonetic = false;
        refreshWords(val)
    }
);

watch(
    () => state.spoilHidden,
    (val) => {
        console.log("Hide?", val, state.spoilHidden);
        let wasOn = state.spoilerMode;
        if (state.spoilHidden) {
            state.showPhonetic = false;
            state.spoilerMode = false;
        }
        if (wasOn)
            refreshWords(val)
    }
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

async function addNewText() {
    if (state.texts[state.texts.length - 1].words.length == 0) return;
    const newPara = new Paragraph();
    state.texts.push(newPara);
}

onMounted(() => {
    if (!canvas.value) return;
    const context = canvas.value.getContext("2d");
    if (!context) return;

    loadData();
    document.addEventListener("keydown", onKeyInput);

    const keybindsButton = document.getElementById("keybinds-button") as HTMLAnchorElement;
    keybindsButton.addEventListener("click", (e) => {
        e.preventDefault();

        state.modalHelp = true;
    })
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

    state.spoilHidden = data.spoilHidden ?? false;
    if (!state.spoilHidden) {
        state.spoilerMode = data.spoilerMode ?? false;
        state.showPhonetic = data.spoilerSpecificFeature ?? false;
    }

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
                        t.glyphs
                            .map((g) => state.words.find((w) => w.toGlyphString() == g)!)
                            .filter((w) => w != null),
                        t.description
                    )
            )
        ))
    );
}

function spoilerConfirm(event: MouseEvent) {
    if (state.spoilerMode) return;

    event.preventDefault();
    state.spoilerConfirmShowModal = true;
}

function saveData() {
    let data: SavedState = {
        spoilerMode: state.spoilerMode,
        spoilerSpecificFeature: state.showPhonetic,
        spoilHidden: state.spoilHidden,
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
    <main class="container my-4" @keydown.question="console.log('hi')">
        <ul class="nav nav-tabs d-flex d-lg-none">
            <li class="nav-item" v-for="page in ['input', 'words', 'texts']">
                <a
                    class="nav-link"
                    :class="{ active: state.page == page }"
                    :aria-current="state.page == page ? 'page' : undefined"
                    href="#"
                    @click="state.page = page"
                    >{{ page }}</a
                >
            </li>
        </ul>
        <div class="row">
            <div class="col-12 col-lg-4 d-lg-block" :class="{ 'd-none': state.page != 'input', 'd-block': state.page == 'input' }">
                <WordInput
                    ref="wordinput"
                    :glyph="state.glyph"
                    :word="state.word"
                    :editing="!!state.selectedWord"
                    :keyevents="keyevents"
                    @update:word="onWordUpdate"
                    :show-secrets="state.spoilerMode"
                />
            </div>
            <div class="col-12 col-lg-4 d-lg-block" :class="{ 'd-none': state.page != 'words', 'd-block': state.page == 'words' }">
                <WordList
                    :glyph="state.glyph"
                    :words="state.words"
                    v-model:selected="state.selectedWord"
                    v-model:spoilHidden="state.spoilHidden"
                    @deleted="saveData()"
                    @add-word="addTextWord"
                />
            </div>
            <div class="col-12 col-lg-4 d-lg-block" :class="{ 'd-none': state.page != 'texts', 'd-block': state.page == 'texts' }">
                <div class="card">
                    <div class="card-header">
                        <h2 class="card-title d-flex justify-content-end align-items-end">
                            <span class="flex-fill">Texts</span>
                            <div v-if="state.spoilerMode && !state.spoilHidden" class="form-check font-size-1">
                                <input
                                    class="form-check-input"
                                    type="checkbox"
                                    v-model="state.showPhonetic"
                                    id="spoilerGatedFeatureCheckbox"
                                />
                                <label class="form-check-label" for="spoilerGatedFeatureCheckbox"> Phonetic </label>
                            </div>
                            <div v-if="!state.spoilHidden" class="form-check font-size-1 ms-2" title="Away with the theatre, show me everything!">
                                <input
                                    class="form-check-input"
                                    type="checkbox"
                                    v-model="state.spoilerMode"
                                    @click="spoilerConfirm"
                                    id="spoilerCheckbox"
                                />
                                <label class="form-check-label" for="spoilerCheckbox"> Spoil! </label>
                            </div>
                            <div class="form-check font-size-1 ms-2" title="Show only glyphs, no translations!">
                                <input
                                    class="form-check-input"
                                    type="checkbox"
                                    v-model="state.glyphOnly"
                                    id="glyphCheckbox"
                                />
                                <label class="form-check-label" for="glyphCheckbox"> Glyph </label>
                            </div>
                        </h2>
                    </div>
                    <ul class="list-group list-group-flush">
                        <div class="list-group-item text-center text-muted my-2" v-if="state.texts.length == 0">
                            Press "New text" to add a text
                        </div>
                        <div class="list-group-item text-center text-muted my-2" v-if="state.texts.length != 0 && !state.texts.some((t) => filterCheckText(t))">
                            No texts with selected word found. <a href="#" @click="state.selectedWord = undefined">Reset selected word?</a>
                        </div>
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
                                    <div class="text-center text-muted" v-if="text.words.length == 0">
                                        Empty text
                                    </div>
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
                            @click="addNewText"
                            :disabled="
                                state.texts.length > 0 &&
                                state.texts[state.texts.length - 1].words.length == 0
                            "
                            class="btn btn-outline-success mx-1"
                        >
                            New text
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="toast-container position-fixed bottom-0 start-0 end-0 mx-auto p-3">
            <Toast :text="state.toastText" @done="state.toastText = undefined"></Toast>
        </div>
    </main>
    <div id="modals">
    </div>

    <Modal modal-id="spoiler-confirm"  title="The last line between"  v-model="state.spoilerConfirmShowModal">
        <p>Are you sure you want to enable the spoiler mode? If you've not finished the game yet, there will be hints that show up later!</p>
        <p>You can disable this checkbox by typing <code>@hide spoiler</code> into the search box, and reveal it again with <code>@show spoiler</code>!</p>
        <template v-slot:footer="footerSlot">
            <button class="btn btn-outline-primary" @click="footerSlot.close">Go back</button>
            <button class="btn btn-danger"  @click="() => { state.spoilerMode = true; footerSlot.close(); }">Spoil!</button>
        </template>
    </Modal>
    <Modal modal-id="help" title="Help and Keybinds" v-model="state.modalHelp">
        <p>
            Hi! Thanks for taking a look at this web app. This is made for figuring out TUNIC's writing <em>on your own</em>.
            No this does <em>not</em> translate things automatically for you! I wrote this while playing the game and figuring things out myself, and realized that using just paper will be rather difficult if I want to search through things and cross-reference them.
            As such, there's a lot of little things to help you figure out the writing yourself, though potentially biased by my own attempts at figuring it out in some places, whether they were right or wrong.
        </p>
        <hr>
        <p>
            This application was made with extensive keyboard input support, to make typing in patterns quick and easy. It's oriented towards input with the left half of a QWERTY keyboard, and sadly there's no right handed mode.
            Feel free to poke me on <a href="https://github.com/SaphireLattice/tunic-decoder/issues">GitHub issues</a> or via email if you want more extensive keybinds support!
        </p>
        <p class="mb-0"><strong>Keybinds:</strong></p>
        <ul>
            <li><code>QWER</code> to toggle lines 1-2-3-4 out of the currently highlit with blue ones. There's no highlight until you first use the keyboard input!</li>
            <li><code>F</code> and <code>Shift + F</code> for choosing next and previous 4 lines to input</li>
            <li><code>A</code> and <code>Shift + A</code> to delete/pop, and to add a blank/push a glyph respectively. If the glyph is not empty, it will be saved into a temporary secondary buffer (shown to the right of the fully black cursor). This can be useful to copy a word! Note that the buffer is not saved between app reloads</li>
            <li><code>C</code> to clear current glyph input</li>
            <li><code>Shift + D</code> to push the current word into the list of words, including the text/descriping in the field under the input panel. The secondary buffer is not cleared</li>
            <li><code>Esc</code> to hide the highlight and stop keyboard input session. The glyph, word and buffer are not cleared</li>
            <li><code>F1</code> to show this dialog</li>
        </ul>
        <hr>
        <p><strong>Search box:</strong></p>
        <p>You can search for any text that you've put into the word's assigned note, or for hex code of a glyph within a word.</p>
        <p>The search box also supports a weird way of searching for patterns!</p>
        <p class="mb-0">
            Type <code>\</code> and then...
        </p>
        <ul>
            <li>one or a few of <code>v^|o</code> to search for glyphs that have as many similar line patterns to the searched thing as you put in. Play around with it!</li>
            <li><code>lr</code> searches for lines on the "left" and "right" half of it respectively.</li>
            <li>Replace <code>\</code> with one <code>=</code> to require exact count of patterns you've entered, not counting the ones you didn't search for. Two <code>==</code> to search for EXACT match in count, and assume 0 for anything not entered.</li>
        </ul>
        <p class="mb-0">
            Search patterns that depend on current Glyph Input state:
        </p>
        <ul>
            <li><code>@</code> - glyphs that have at least the same lines active as current Glyph Input state</li>
            <li><code>@@</code> - glyphs that are identical to the Glyph Input </li>
            <li v-if="state.spoilerMode"><code>@i [optional hex]</code> - glyphs that match the Glyph Input on the "inside", or match the hex input in same way</li>
            <li v-if="state.spoilerMode"><code>@o [hex?]</code> - same as above, but "outside"</li>
        </ul>
        <hr>
        <p>To hide the <strong>Spoil!</strong> checkbox (don't worry, it now has a modal confirmation!), type <code>@hide spoilers</code> into search box, and it'll disappear. If you do want it back, just type <code>@show spoilers</code> - this only shows the checkbox, it doesn't activate it!</p>
    </Modal>
</template>
