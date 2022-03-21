import { createApp } from 'vue'
import App from './App.vue'

createApp(App).mount('#app')

/*
class App {
    glyphState = 0;
    svg: SVGElement;

    constructor() {
        // Hopefull this won't miss anything
        if (document.readyState == "interactive")
            this.init()
        else
            document.addEventListener("DOMContentLoaded", () => this.init(), false);
    }

    init() {
        this.svg = document.querySelector("svg");

        for (let i = 0; i < 16; i++) {
            const lineId = `#${i < 8 ? "high" : "low"}_${i % 8 + 1}`;
            const lineElem = this.svg.querySelector<SVGElement>(lineId);
            lineElem.addEventListener("click", () => {
                const newState = lineElem.classList.toggle("hide");
                this.glyphState ^= 2 ** i;
                this.updateState(this.glyphState, i);
            });
        }

        console.log("Init!");
        document.querySelector("#button-add-glyph");
        document.querySelector("#button-flip-glyph");
        document.querySelector("#button-new-word");
        this.glyphState = 0b0011_0100_1011_0111;
        this.updateState(this.glyphState);
    }

    updateState(state: number, skip: number | null = null) {
        for (let i = 0; i < 16; i++) {
            if (i == skip) continue;
            const lineId = `#${i < 8 ? "high" : "low"}_${i % 8 + 1}`;
            const classList = (state & (2 ** i)) == 0 ? "line hide" : "line";
            const lineElem = this.svg.querySelector(lineId);
            console.log(lineId, classList, lineElem.className);
            (lineElem.className as any).baseVal = classList;
        }
    }

    setLineState(state: boolean | null) {

    }
}

new App();*/