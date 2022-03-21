export class Paragraph {
    words: Word[] = [];
}

export class Word {
    glyphs: Glyph[] = [];

    plaintext = "";
    isOnlyPlaintext = false;
    isIcon = false;

    cachedBlob?: string;

    constructor(glyphString?: string, text?: string) {
        if (glyphString && glyphString.trim() != "")
            this.glyphs.push(...glyphString.split(" ").map((s) => new Glyph(parseInt(s, 16))));

        this.plaintext = text ?? this.plaintext;
    }

    async toBlob(targetCanvas: HTMLCanvasElement, scale = 2): Promise<string> {
        const s = scale;

        const context = targetCanvas.getContext("2d");
        if (!context) throw "No 2D context";

        targetCanvas.height = 18 * s;
        targetCanvas.width = (2 + this.glyphs.length * 8) * s;
        context.clearRect(0, 0, targetCanvas.width, 18 * s);
        this.render(context, 1 * s, 1 * s, s, "#000000");

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
        debugRect = false
    ) {
        let n = 0;
        if (debugRect) {
            ctx.clearRect(x - 4 * scaling, y, (this.glyphs.length + 1) * 8 * scaling, 16 * scaling);
            ctx.fillStyle = "#f88";
            ctx.fillRect(x - 4 * scaling, y, (this.glyphs.length + 1) * 8 * scaling, 16 * scaling);
        }
        for (const glyph of this.glyphs) {
            glyph.render(ctx, x + n * 8 * scaling, y, false, scaling, color);
            n++;
        }
    }

    toGlyphString = () => this.glyphs.map((g) => g.toString()).join(" ");

    toString() {
        if (this.plaintext.trim() != "") return this.plaintext;
        if (this.glyphs.length == 0) return "[ NOTHING ]"

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
    [4, 0.5, -4, 2.5],
    [4, 0.5, 4, 2.5],
    [0, 3, 4, 2.5],
    [8, 3, -4, 2.5],

    [0, 3, 0, 5],
    [4, 0.5, 0, 5],
    [8, 3, 0, 5],
    [4, 5.5, 0, 2.5],

    [4, 9.5, -4, 2.5],
    [4, 9.5, 4, 2.5],
    [0, 12, 4, 2.5],
    [8, 12, -4, 2.5],

    [0, 9.5, 0, 2.5],
    [4, 9.5, 0, 5],
    [8, 9.5, 0, 2.5],
];

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
        color = "#000000"
    ) {
        const context: GlyphContext = {
            canvas: ctx,
            x,
            y,
            scaling,
        };
        let n = 0;

        for (const line of lines) {
            this.line(context, line[0], line[1], line[2], line[3], this.encoded & (2 ** n++), color);
        }

        this.circle(context, 4, 15.5, 1, this.encoded & (2 ** n++));

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

    circle(ctx: GlyphContext, x: number, y: number, r: number, condition: boolean | number, color = "#000000") {
        if (!condition) return;
        const lx = ctx.x + x * ctx.scaling;
        const ly = ctx.y + y * ctx.scaling;

        ctx.canvas.beginPath();
        ctx.canvas.arc(lx, ly, r * ctx.scaling, 0, Math.PI * 2, true);
        ctx.canvas.lineWidth = 1 * ctx.scaling;
        ctx.canvas.stroke();
    }

    toString() {
        return this.encoded.toString(16).toUpperCase().padStart(4, "0");
    }
}
