<template>
    <svg
        class="mx-auto"
        ref="root"
        :height="height"
        viewBox="0 0 16 32"
        version="1.1"
        id="svg5"
        inkscape:version="1.1.2 (0a00cf5339, 2022-02-04, custom)"
        sodipodi:docname="glyph.svg"
        xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
        xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
        xmlns="http://www.w3.org/2000/svg"
        xmlns:svg="http://www.w3.org/2000/svg"
    >
        <sodipodi:namedview
            id="namedview7"
            pagecolor="#ffffff"
            bordercolor="#666666"
            borderopacity="1.0"
            inkscape:pageshadow="2"
            inkscape:pageopacity="0.0"
            inkscape:pagecheckerboard="0"
            inkscape:document-units="px"
            showgrid="false"
            height="32px"
            inkscape:zoom="22.627417"
            inkscape:cx="5.9883106"
            inkscape:cy="17.147339"
            inkscape:window-width="1920"
            inkscape:window-height="1021"
            inkscape:window-x="0"
            inkscape:window-y="0"
            inkscape:window-maximized="1"
            inkscape:current-layer="high"
        />
        <defs id="defs2" />
        <g inkscape:label="Layer 1" inkscape:groupmode="layer" id="layer1">
            <g id="high">
                <path d="m 8,2.5 -7,4.5" id="high_1" class="line" />
                <path d="m 8,2.5 7,4.5" id="high_2" class="line" />
                <path d="m 1,7 7,4.5" id="high_3" class="line" />
                <path d="m 15,7 -7,4.5" id="high_4" class="line" />
                <path d="m 1,7 v 8.5" id="high_5" class="line" />
                <path d="m 8,2.5 v 9" id="high_6" class="line" />
                <path d="m 15,7 v 8.5" id="high_7" class="line" />
                <path d="m 8,11.5 v 4" id="high_8" class="line" />
            </g>
            <g id="low">
                <path d="m 8,17.5 -7,4.5" id="low_1" class="line" />
                <path d="m 8,17.5 7,4.5" id="low_2" class="line" />
                <path d="m 1,22 7,4.5" id="low_3" class="line" />
                <path d="m 15,22 -7,4.5" id="low_4" class="line" />
                <path d="m 1,17.5 0,4.5" id="low_5" class="line" />
                <path d="m 8,17.5 v9" id="low_6" class="line" />
                <path d="m 15,17.5 0,4.5" id="low_7" class="line" />
                <circle id="low_8" cx="8" cy="28" r="1.5" class="line" />
            </g>
            <g id="caps">
                <circle cx="8" cy="2.5" r="1" />
                <circle cx="1" cy="7" r="1" />
                <circle cx="15" cy="7" r="1" />
                <circle cx="8" cy="11.5" r="1" />

                <circle cx="8" cy="17.5" r="1" />
                <circle cx="1" cy="22" r="1" />
                <circle cx="15" cy="22" r="1" />
                <circle cx="8" cy="26.5" r="1" />
            </g>
            <path
                style="
                    fill: none;
                    stroke: #000000;
                    stroke-width: 1px;
                    stroke-linecap: square;
                    stroke-linejoin: round;
                    stroke-opacity: 1;
                "
                d="M 1.0,15.5 15.0,15.5"
                id="baseline"
            />
        </g>
    </svg>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue";

const props = defineProps({
    modelValue: { type: Number, required: true },
    height: { type: Number },
    row: { type: Number }
});
const emit = defineEmits<{
    (e: "update:modelValue", value: number): void;
}>();

const root = ref<SVGElement>();
function updateState(state: number, skip: number | null = null) {
    for (let i = 0; i < 16; i++) {
        if (i == skip) continue;
        const lineId = `#${i < 8 ? "high" : "low"}_${(i % 8) + 1}`;
        const lineElem = root.value?.querySelector(lineId);
        if (!lineElem) throw "Element not found: " + lineId;
        lineElem.classList.toggle("hide", (state & (2 ** i)) == 0)
        lineElem.classList.toggle("highlight", props.row != undefined && Math.floor(i / 4) == props.row);
    }
}

watch(
    () => props.modelValue,
    (newValue) => {
        updateState(newValue);
    }
);

watch(
    () => props.row,
    (newValue) => {
        updateState(props.modelValue);
    }
);

onMounted(() => {
    updateState(props.modelValue);
    for (let i = 0; i < 16; i++) {
        const lineId = `#${i < 8 ? "high" : "low"}_${(i % 8) + 1}`;
        const lineElem = root.value?.querySelector<SVGElement>(lineId);
        if (!lineElem) throw "Element not found: " + lineId;
        lineElem.addEventListener("click", (event) => {
            const newState = lineElem.classList.toggle("hide");
            const newValue = props.modelValue ^ (2 ** i);
            updateState(newValue, i);
            emit("update:modelValue", newValue);
        });
    }
});

function line(n: number) {}
</script>

<style scoped>
.line {
    fill: none;
    stroke: #000000;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 1px;
    transition: stroke 200ms ease;
    cursor: pointer;
}
.line.hide {
    stroke: #00000000;
}

.glyph-input:hover .line.highlight,
.focused .line.highlight {
    stroke: #222288;
}

.glyph-input:hover .line.hide.highlight,
.focused .line.hide.highlight {
    stroke: #d0d0ff;
}

.glyph:hover .line.hide {
    stroke: #d0d0d0;
}

.glyph:hover .line:hover {
    stroke: #606060;
}
.glyph:hover .line.hide:hover {
    stroke: #808080;
}

#caps circle {
    fill: #00000044;
    transition: fill 200ms ease;
}
.glyph:hover #caps circle {
    fill: #000000;
}
</style>
