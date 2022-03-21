var Paragraph = /** @class */ (function () {
    function Paragraph() {
        this.words = [];
    }
    return Paragraph;
}());
var Word = /** @class */ (function () {
    function Word() {
        this.glyphs = [];
        this.plaintext = "";
        this.isOnlyPlaintext = false;
        this.isIcon = false;
    }
    Word.prototype.toString = function () {
        if (this.plaintext)
            return this.plaintext;
        return "[".concat(this.glyphs.map(function (g) { return g.toString(); }).join(" "), "]");
    };
    return Word;
}());
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
var Glyph = /** @class */ (function () {
    function Glyph() {
    }
    Glyph.prototype.toString = function () {
        return this.encoded.toString(16).toUpperCase().padStart(4, "0");
    };
    return Glyph;
}());
var App = /** @class */ (function () {
    function App() {
        var _this = this;
        this.glyphState = 0;
        // Hopefull this won't miss anything
        if (document.readyState == "interactive")
            this.init();
        else
            document.addEventListener("DOMContentLoaded", function () { return _this.init(); }, false);
    }
    App.prototype.init = function () {
        var _this = this;
        this.svg = document.querySelector("svg");
        var _loop_1 = function (i) {
            var lineId = "#".concat(i < 8 ? "high" : "low", "_").concat(i % 8 + 1);
            var lineElem = this_1.svg.querySelector(lineId);
            lineElem.addEventListener("click", function () {
                var newState = lineElem.classList.toggle("hide");
                _this.glyphState ^= Math.pow(2, i);
                _this.updateState(_this.glyphState, i);
            });
        };
        var this_1 = this;
        for (var i = 0; i < 16; i++) {
            _loop_1(i);
        }
        console.log("Init!");
        document.querySelector("#button-add-glyph");
        document.querySelector("#button-flip-glyph");
        document.querySelector("#button-new-word");
        this.glyphState = 13495;
        this.updateState(this.glyphState);
    };
    App.prototype.updateState = function (state, skip) {
        if (skip === void 0) { skip = null; }
        for (var i = 0; i < 16; i++) {
            if (i == skip)
                continue;
            var lineId = "#".concat(i < 8 ? "high" : "low", "_").concat(i % 8 + 1);
            var classList = (state & (Math.pow(2, i))) == 0 ? "line hide" : "line";
            var lineElem = this.svg.querySelector(lineId);
            console.log(lineId, classList, lineElem.className);
            lineElem.className.baseVal = classList;
        }
    };
    App.prototype.setLineState = function (state) {
    };
    return App;
}());
new App();
