export class Paragraph {
    words: Word[] = [];
    description: string = "";

    constructor(words?: Word[], description?: string) {
        this.words.push(...(words ?? []));
        this.description = description ?? this.description;
        this.words.forEach((w) => {
            if (w.usedIn.includes(this)) return;
            w.usedIn.push(this);
        });
    }

    pushWord(word: Word) {
        this.words.push(word);
        if (word.usedIn.indexOf(this) != -1) return;
        word.usedIn.push(this);
    }

    popWord() {
        const word = this.words.pop();
        const idx = word?.usedIn.indexOf(this);
        if (!word || idx == undefined || idx == -1) return;
        word.usedIn.splice(idx, 1);
    }
}

export class Word {
    glyphs: Glyph[] = [];

    plaintext = "";
    isOnlyPlaintext = false;
    isIcon = false;

    cachedBlob?: string;
    usedIn: Paragraph[] = [];

    constructor(glyphString?: string, text?: string) {
        if (glyphString && glyphString.trim() != "")
            this.glyphs.push(...glyphString.split(" ").map((s) => new Glyph(parseInt(s, 16))));

        this.plaintext = text ?? this.plaintext;
    }

    async toBlob(targetCanvas: HTMLCanvasElement, scale = 2, splitComponents = false): Promise<string> {
        const s = scale;

        const context = targetCanvas.getContext("2d");
        if (!context) throw "No 2D context";

        targetCanvas.height = 18 * s;
        targetCanvas.width = (2 + this.glyphs.length * 8) * s;
        context.clearRect(0, 0, targetCanvas.width, 18 * s);
        this.render(context, 1 * s, 1 * s, s, "#000000", undefined, splitComponents);

        const toBlobPromise = new Promise<string>((resolve, reject) => {
            targetCanvas.toBlob((blob) => {
                if (!blob) return reject("No blob object?");
                const url = URL.createObjectURL(blob);
                this.cachedBlob = url;
                resolve(url);
            });
        });

        return toBlobPromise;
    }

    render(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        scaling: number = 1,
        color = "#000000",
        debugRect = false,
        splitComponents = false,
        inColor?: string,
        outColor?: string
    ) {
        let n = 0;
        if (debugRect) {
            ctx.clearRect(x - 4 * scaling, y, (this.glyphs.length + 1) * 8 * scaling, 16 * scaling);
            ctx.fillStyle = "#f88";
            ctx.fillRect(x - 4 * scaling, y, (this.glyphs.length + 1) * 8 * scaling, 16 * scaling);
        }
        for (const glyph of this.glyphs) {
            glyph.render(
                ctx,
                x + n * 8 * scaling,
                y,
                false,
                scaling,
                color,
                splitComponents,
                inColor,
                outColor
            );
            n++;
        }
    }

    toGlyphString = () => this.glyphs.map((g) => g.toString()).join(" ");

    toPhonetic = () =>
        this.glyphs
            .map(g => g.toPhonetic())
            .join(" ");

    toString() {
        if (this.plaintext.trim() != "") return this.plaintext;
        if (this.glyphs.length == 0) return "[ NOTHING ]";

        return this.glyphs.map((g) => g.toString()).join(" ");
    }
}

/*
THE GLYPH:

  /|\
 1 6 2
|3 | 4|
5 \+/ 7
|  8  | Top (LSB)
-------
5 /+\ 7 Bottom (MSB)
|1 6 2|
 3 | 4
  \+/
   8     <- A loop here

Encoded as a number or hex string, 16 bit, 1 is LSB
*/

type GlyphContext = {
    canvas: CanvasRenderingContext2D;
    x: number;
    y: number;
    scaling: number;
};

const lines = [
    { n: 0, x: 4, y: 0.5, dx: -4, dy: 2.5, in: false },
    { n: 1, x: 4, y: 0.5, dx: 4, dy: 2.5, in: false },
    { n: 2, x: 0, y: 3, dx: 4, dy: 2.5, in: true },
    { n: 3, x: 8, y: 3, dx: -4, dy: 2.5, in: true },

    { n: 4, x: 0, y: 3, dx: 0, dy: 5, in: false },
    { n: 5, x: 4, y: 0.5, dx: 0, dy: 5, in: true },
    { n: 6, x: 8, y: 3, dx: 0, dy: 5, in: false },
    { n: 7, x: 4, y: 5.5, dx: 0, dy: 2.5, in: true },

    { n: 8, x: 4, y: 9.5, dx: -4, dy: 2.5, in: true },
    { n: 9, x: 4, y: 9.5, dx: 4, dy: 2.5, in: true },
    { n: 10, x: 0, y: 12, dx: 4, dy: 2.5, in: false },
    { n: 11, x: 8, y: 12, dx: -4, dy: 2.5, in: false },

    { n: 12, x: 0, y: 9.5, dx: 0, dy: 2.5, in: false },
    { n: 13, x: 4, y: 9.5, dx: 0, dy: 5, in: true },
    { n: 14, x: 8, y: 9.5, dx: 0, dy: 2.5, in: false },
];

const phonemes = {
    out: [
        { mask: 0b0001_0000_0001_0011, text: "a" },
        { mask: 0b0001_0000_0001_0001, text: "o" },
        { mask: 0b0000_1100_0000_0000, text: "i" },
        { mask: 0b0001_1100_0001_0000, text: "e" },
        { mask: 0b0001_0100_0001_0000, text: "u" },
        { mask: 0b0000_0000_0000_0011, text: "ae" },

        { mask: 0b0001_1100_0001_0001, text: "ee" },
        { mask: 0b0001_0100_0001_0011, text: "uu" },
        { mask: 0b0001_1100_0001_0010, text: "r" },
        { mask: 0b0001_1000_0001_0011, text: "or" },
        { mask: 0b0000_1100_0000_0011, text: "ar" },
        { mask: 0b0001_1000_0001_0001, text: "er" },

        { mask: 0b0000_0000_0000_0001, text: "ei" },
        { mask: 0b0000_0000_0000_0010, text: "ai" },
        { mask: 0b0000_0100_0000_0000, text: "-?-" },
        { mask: 0b0000_1000_0000_0000, text: "ou" },
        { mask: 0b0001_1100_0001_0011, text: "oh" },
        { mask: 0b0001_1000_0001_0000, text: "eir" },
    ],
    in: [
        { mask: 0b0000_0011_0000_0000, text: "m" },
        { mask: 0b0000_0011_0000_0100, text: "n" },
        { mask: 0b0010_0011_1010_1100, text: "n" },
        { mask: 0b0010_0000_1000_1000, text: "p" },
        { mask: 0b0000_0010_1010_0000, text: "b" },
        { mask: 0b0010_0000_1000_1100, text: "t" },

        { mask: 0b0000_0011_1010_0000, text: "d" },
        { mask: 0b0000_0010_1010_1000, text: "k" },
        { mask: 0b0010_0010_1000_1000, text: "g" },
        { mask: 0b0000_0001_1010_0000, text: "j" },
        { mask: 0b0010_0000_1000_0100, text: "ch" },
        { mask: 0b0010_0001_1000_1000, text: "f" },

        { mask: 0b0000_0010_1010_0100, text: "v" },
        { mask: 0b0010_0000_1010_1100, text: "?th?" },
        { mask: 0b0010_0011_1010_0000, text: "th" },
        { mask: 0b0010_0001_1010_1000, text: "ss" },
        { mask: 0b0010_0010_1010_0100, text: "s." },
        { mask: 0b0010_0011_1000_1100, text: "sh" },

        { mask: 0b0000_0011_1010_1100, text: "zh" },
        { mask: 0b0010_0010_1010_0000, text: "h" },
        { mask: 0b0010_0000_1010_1000, text: "r" },
        { mask: 0b0010_0000_1010_0100, text: "y" },
        { mask: 0b0000_0000_0000_1100, text: "w" },
        { mask: 0b0010_0000_1010_0000, text: "l" },
    ],
};

export enum Masks {
    Upper = 0x00ff,
    Lower = 0xff00,
    Inner = 0b0010_0011_1010_1100,
    Outer = 0b0101_1100_0101_0011,
}

export class Glyph {
    encoded: number;

    constructor(encoded: number) {
        this.encoded = encoded;
    }

    render(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        standalone: boolean = true,
        scaling: number = 1,
        color = "#000000",
        splitComponents = false,
        inColor = "#080",
        outColor = "#f00"
    ) {
        const context: GlyphContext = {
            canvas: ctx,
            x,
            y,
            scaling,
        };

        for (const line of lines.filter((l) => l.in)) {
            this.line(
                context,
                line.x,
                line.y,
                line.dx,
                line.dy,
                this.encoded & (2 ** line.n),
                splitComponents ? inColor : color
            );
        }
        for (const line of lines.filter((l) => !l.in)) {
            this.line(
                context,
                line.x,
                line.y,
                line.dx,
                line.dy,
                this.encoded & (2 ** line.n),
                splitComponents ? outColor : color
            );
        }

        this.circle(context, 4, 15.5, 1, this.encoded & (2 ** 15));

        this.line(context, 0, 8, 8, 0, true, color, "square");
    }

    line(
        ctx: GlyphContext,
        x: number,
        y: number,
        dx: number,
        dy: number,
        condition: boolean | number,
        color = "#000000",
        cap: CanvasLineCap = "round"
    ) {
        if (!condition) return;
        const lx = ctx.x + x * ctx.scaling;
        const ly = ctx.y + y * ctx.scaling;

        ctx.canvas.beginPath();
        ctx.canvas.moveTo(lx, ly);
        ctx.canvas.lineTo(lx + dx * ctx.scaling, ly + dy * ctx.scaling);
        ctx.canvas.lineWidth = 1 * ctx.scaling;
        ctx.canvas.lineCap = cap;
        ctx.canvas.strokeStyle = color;
        ctx.canvas.stroke();
    }

    circle(
        ctx: GlyphContext,
        x: number,
        y: number,
        r: number,
        condition: boolean | number,
        color = "#000000"
    ) {
        if (!condition) return;
        const lx = ctx.x + x * ctx.scaling;
        const ly = ctx.y + y * ctx.scaling;

        ctx.canvas.beginPath();
        ctx.canvas.arc(lx, ly, r * ctx.scaling, 0, Math.PI * 2, true);
        ctx.canvas.lineWidth = 1 * ctx.scaling;
        ctx.canvas.strokeStyle = color;
        ctx.canvas.stroke();
    }

    toPhonetic() {
        const reverse = this.encoded & 0x8000;
        const inCode = this.encoded & Masks.Inner;
        const outCode = this.encoded & Masks.Outer;
        const inner = phonemes.in.find((ph) => ph.mask == inCode)?.text ?? this.toString();
        const outer = phonemes.out.find((ph) => ph.mask == outCode)?.text ?? this.toString();

        return inCode == 0
            ? outer
            : outCode == 0
            ? inner
            : reverse
            ? `${outer}_${inner}`
            : `${inner}_${outer}`;
    }

    toString() {
        return this.encoded.toString(16).toUpperCase().padStart(4, "0");
    }
}
