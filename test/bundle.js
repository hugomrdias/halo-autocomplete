(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var Auto = require('./src/autocomplete');

new Auto(document.querySelector('input[name="country"]'), [
    ['NorteShopping', '1'],
    ['SportZone Barcelona', '111'],
    ['SportZone NortesShopping', '11'],
    ['SportZone Braga', '20']
]);

},{"./src/autocomplete":2}],2:[function(require,module,exports){
'use strict';

var Jaro = require('./jaro-winkler');

function Auto(input, options) {
    this.input = input;
    this.options = options;
    this.scoredOptions = null;
    this.container = null;
    this.ul = null;
    this.highlightedIndex = -1;
    this.events();
}

module.exports = Auto;

Auto.scoreFn = function(inputValue, optionSynonyms) {
    var closestSynonym = null;

    for (var i = optionSynonyms.length - 1; i >= 0; i--) {
        var synonym = optionSynonyms[i]
        var similarity = Jaro(
            synonym.trim().toLowerCase(),
            inputValue.trim().toLowerCase()
        );

        if (closestSynonym === null || similarity > closestSynonym.similarity) {
            closestSynonym = {
                similarity: similarity,
                value: synonym
            };
            if (similarity === 1) {
                break;
            }
        }
    }
    return {
        score: closestSynonym.similarity,
        displayValue: optionSynonyms[0]
    };
}

Auto.MAX_ITEMS = 8;

Auto.listItemFn = function(scoredOption, itemIndex) {
    var li = itemIndex > Auto.MAX_ITEMS ? null : document.createElement("li");
    li && li.appendChild(document.createTextNode(scoredOption.displayValue));
    return li;
}


Auto.prototype.events = function() {
    this.input.addEventListener('input', function() {
        if (this.input.value.length > 0) {
            this.scoredOptions = this.options
                .map(function(option) {
                    return Auto.scoreFn(this.input.value, option);
                }.bind(this))
                .sort(function(a, b) {
                    return b.score - a.score;
                })
        } else {
            this.scoredOptions = [];
        }

        console.table(this.scoredOptions)
        this.renderOptions();
    }.bind(this));

    this.input.addEventListener('keydown', function(event) {
        if (this.ul) { // dropdown visible?
            switch (event.keyCode) {
                case 13:
                    this.select();
                    break;
                case 27: // Esc
                    this.removeDropdown();
                    break;
                case 40: // Down arrow
                    // Otherwise up arrow places the cursor at the beginning of the
                    // field, and down arrow at the end
                    event.preventDefault();
                    this.changeHighlightedOption(
                        this.highlightedIndex < this.ul.children.length - 1 ? this.highlightedIndex + 1 : -1
                    );
                    break;
                case 38: // Up arrow
                    event.preventDefault();
                    this.changeHighlightedOption(
                        this.highlightedIndex > -1 ? this.highlightedIndex - 1 : this.ul.children.length - 1
                    );
                    break;
            }
        }
    }.bind(this));

    this.input.addEventListener('blur', function(event){
        this.removeDropdown();
        this.highlightedIndex = -1;
    }.bind(this));

    this.input.addEventListener('focus', function(event){
        this.renderOptions()
    }.bind(this));
}

Auto.prototype.getSiblingIndex = function(node) {
    var index = -1;
    var n = node;
    do {
        index++;
        n = n.previousElementSibling;
    } while (n);
    return index;
}

Auto.prototype.renderOptions = function() {
    var documentFragment = document.createDocumentFragment();

    this.scoredOptions.every((scoredOption, i) => {
        var listItem = Auto.listItemFn(scoredOption, i);
        listItem && documentFragment.appendChild(listItem);
        return !!listItem;
    });

    this.removeDropdown();
    this.highlightedIndex = -1;

    if (documentFragment.hasChildNodes()) {
        var newUl = document.createElement("ul");
        newUl.addEventListener('mouseover', event => {
            if (event.target.tagName === 'LI') {
                this.changeHighlightedOption(this.getSiblingIndex(event.target));
            }
        });

        newUl.addEventListener('mouseleave', () => {
            this.changeHighlightedOption(-1);
        });

        newUl.addEventListener('mousedown', event => event.preventDefault());

        newUl.addEventListener('click', event => {
            if (event.target.tagName === 'LI') {
                this.select();
            }
        });

        newUl.appendChild(documentFragment);

        // See CSS to understand why the <ul> has to be wrapped in a <div>
        const newContainer = document.createElement("div");
        newContainer.className = 'miss-plete';
        newContainer.appendChild(newUl);

        // Inserts the dropdown just after the <input> element
        this.input.parentNode.insertBefore(newContainer, this.input.nextSibling);
        this.container = newContainer;
        this.ul = newUl;
        this.changeHighlightedOption(0);
    }
}

Auto.prototype.changeHighlightedOption = function(newHighlightedIndex) {
    if (newHighlightedIndex >= -1 &&
        newHighlightedIndex < this.ul.children.length) {
        // If any option already selected, then unselect it
        if (this.highlightedIndex !== -1) {
            this.ul.children[this.highlightedIndex].classList.remove("highlight");
        }

        this.highlightedIndex = newHighlightedIndex;

        if (this.highlightedIndex !== -1) {
            this.ul.children[this.highlightedIndex].classList.add("highlight");
        }
    }
}

Auto.prototype.select = function() {
    if (this.highlightedIndex !== -1) {
        this.input.value = this.scoredOptions[this.highlightedIndex].displayValue;
        this.removeDropdown();
    }
}

Auto.prototype.removeDropdown = function() {
    this.container && this.container.remove();
    this.container = null;
    this.ul = null;

}

},{"./jaro-winkler":3}],3:[function(require,module,exports){
// https://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance
'use strict';

function jaro(s1, s2) {
    var shorter, longer;

    var t = s1.length > s2.length ? [s1, s2] : [s2, s1];
    shorter = t[0];
    longer = t[1];

    var matchingWindow = Math.floor(longer.length / 2) - 1;
    var shorterMatches = [];
    var longerMatches = [];

    for (let i = 0; i < shorter.length; i++) {
        let ch = shorter[i];
        var windowStart = Math.max(0, i - matchingWindow);
        var windowEnd = Math.min(i + matchingWindow + 1, longer.length);
        for (let j = windowStart; j < windowEnd; j++) {
            if (longerMatches[j] === undefined && ch === longer[j]) {
                shorterMatches[i] = longerMatches[j] = ch;
                break;
            }
        }
    }

    var shorterMatchesString = shorterMatches.join("");
    var longerMatchesString = longerMatches.join("");
    var numMatches = shorterMatchesString.length;

    let transpositions = 0;
    for (let i = 0; i < shorterMatchesString.length; i++) {
        if (shorterMatchesString[i] !== longerMatchesString[i]) {
            transpositions++;
        }
    }

    return numMatches > 0 ? (
        numMatches / shorter.length +
        numMatches / longer.length +
        (numMatches - Math.floor(transpositions / 2)) / numMatches
    ) / 3.0 : 0;
}

module.exports = function(s1, s2, prefixScalingFactor) {
    var jaroSimilarity = jaro(s1, s2);
    prefixScalingFactor = prefixScalingFactor || 0.2;

    let commonPrefixLength = 0;
    for (let i = 0; i < s1.length; i++) {
        if (s1[i] === s2[i]) {
            commonPrefixLength++;
        } else {
            break;
        }
    }

    return jaroSimilarity +
        Math.min(commonPrefixLength, 4) *
        prefixScalingFactor *
        (1 - jaroSimilarity);
}

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiaW5kZXguanMiLCJzcmMvYXV0b2NvbXBsZXRlLmpzIiwic3JjL2phcm8td2lua2xlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIndXNlIHN0cmljdCc7XG5cbnZhciBBdXRvID0gcmVxdWlyZSgnLi9zcmMvYXV0b2NvbXBsZXRlJyk7XG5cbm5ldyBBdXRvKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ2lucHV0W25hbWU9XCJjb3VudHJ5XCJdJyksIFtcbiAgICBbJ05vcnRlU2hvcHBpbmcnLCAnMSddLFxuICAgIFsnU3BvcnRab25lIEJhcmNlbG9uYScsICcxMTEnXSxcbiAgICBbJ1Nwb3J0Wm9uZSBOb3J0ZXNTaG9wcGluZycsICcxMSddLFxuICAgIFsnU3BvcnRab25lIEJyYWdhJywgJzIwJ11cbl0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgSmFybyA9IHJlcXVpcmUoJy4vamFyby13aW5rbGVyJyk7XG5cbmZ1bmN0aW9uIEF1dG8oaW5wdXQsIG9wdGlvbnMpIHtcbiAgICB0aGlzLmlucHV0ID0gaW5wdXQ7XG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLnNjb3JlZE9wdGlvbnMgPSBudWxsO1xuICAgIHRoaXMuY29udGFpbmVyID0gbnVsbDtcbiAgICB0aGlzLnVsID0gbnVsbDtcbiAgICB0aGlzLmhpZ2hsaWdodGVkSW5kZXggPSAtMTtcbiAgICB0aGlzLmV2ZW50cygpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEF1dG87XG5cbkF1dG8uc2NvcmVGbiA9IGZ1bmN0aW9uKGlucHV0VmFsdWUsIG9wdGlvblN5bm9ueW1zKSB7XG4gICAgdmFyIGNsb3Nlc3RTeW5vbnltID0gbnVsbDtcblxuICAgIGZvciAodmFyIGkgPSBvcHRpb25TeW5vbnltcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICB2YXIgc3lub255bSA9IG9wdGlvblN5bm9ueW1zW2ldXG4gICAgICAgIHZhciBzaW1pbGFyaXR5ID0gSmFybyhcbiAgICAgICAgICAgIHN5bm9ueW0udHJpbSgpLnRvTG93ZXJDYXNlKCksXG4gICAgICAgICAgICBpbnB1dFZhbHVlLnRyaW0oKS50b0xvd2VyQ2FzZSgpXG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKGNsb3Nlc3RTeW5vbnltID09PSBudWxsIHx8IHNpbWlsYXJpdHkgPiBjbG9zZXN0U3lub255bS5zaW1pbGFyaXR5KSB7XG4gICAgICAgICAgICBjbG9zZXN0U3lub255bSA9IHtcbiAgICAgICAgICAgICAgICBzaW1pbGFyaXR5OiBzaW1pbGFyaXR5LFxuICAgICAgICAgICAgICAgIHZhbHVlOiBzeW5vbnltXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgaWYgKHNpbWlsYXJpdHkgPT09IDEpIHtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICBzY29yZTogY2xvc2VzdFN5bm9ueW0uc2ltaWxhcml0eSxcbiAgICAgICAgZGlzcGxheVZhbHVlOiBvcHRpb25TeW5vbnltc1swXVxuICAgIH07XG59XG5cbkF1dG8uTUFYX0lURU1TID0gODtcblxuQXV0by5saXN0SXRlbUZuID0gZnVuY3Rpb24oc2NvcmVkT3B0aW9uLCBpdGVtSW5kZXgpIHtcbiAgICB2YXIgbGkgPSBpdGVtSW5kZXggPiBBdXRvLk1BWF9JVEVNUyA/IG51bGwgOiBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwibGlcIik7XG4gICAgbGkgJiYgbGkuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoc2NvcmVkT3B0aW9uLmRpc3BsYXlWYWx1ZSkpO1xuICAgIHJldHVybiBsaTtcbn1cblxuXG5BdXRvLnByb3RvdHlwZS5ldmVudHMgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLmlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh0aGlzLmlucHV0LnZhbHVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHRoaXMuc2NvcmVkT3B0aW9ucyA9IHRoaXMub3B0aW9uc1xuICAgICAgICAgICAgICAgIC5tYXAoZnVuY3Rpb24ob3B0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBBdXRvLnNjb3JlRm4odGhpcy5pbnB1dC52YWx1ZSwgb3B0aW9uKTtcbiAgICAgICAgICAgICAgICB9LmJpbmQodGhpcykpXG4gICAgICAgICAgICAgICAgLnNvcnQoZnVuY3Rpb24oYSwgYikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYi5zY29yZSAtIGEuc2NvcmU7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuc2NvcmVkT3B0aW9ucyA9IFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS50YWJsZSh0aGlzLnNjb3JlZE9wdGlvbnMpXG4gICAgICAgIHRoaXMucmVuZGVyT3B0aW9ucygpO1xuICAgIH0uYmluZCh0aGlzKSk7XG5cbiAgICB0aGlzLmlucHV0LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBmdW5jdGlvbihldmVudCkge1xuICAgICAgICBpZiAodGhpcy51bCkgeyAvLyBkcm9wZG93biB2aXNpYmxlP1xuICAgICAgICAgICAgc3dpdGNoIChldmVudC5rZXlDb2RlKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAxMzpcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZWxlY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAyNzogLy8gRXNjXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlRHJvcGRvd24oKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA0MDogLy8gRG93biBhcnJvd1xuICAgICAgICAgICAgICAgICAgICAvLyBPdGhlcndpc2UgdXAgYXJyb3cgcGxhY2VzIHRoZSBjdXJzb3IgYXQgdGhlIGJlZ2lubmluZyBvZiB0aGVcbiAgICAgICAgICAgICAgICAgICAgLy8gZmllbGQsIGFuZCBkb3duIGFycm93IGF0IHRoZSBlbmRcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VIaWdobGlnaHRlZE9wdGlvbihcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGlnaGxpZ2h0ZWRJbmRleCA8IHRoaXMudWwuY2hpbGRyZW4ubGVuZ3RoIC0gMSA/IHRoaXMuaGlnaGxpZ2h0ZWRJbmRleCArIDEgOiAtMVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDM4OiAvLyBVcCBhcnJvd1xuICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZUhpZ2hsaWdodGVkT3B0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oaWdobGlnaHRlZEluZGV4ID4gLTEgPyB0aGlzLmhpZ2hsaWdodGVkSW5kZXggLSAxIDogdGhpcy51bC5jaGlsZHJlbi5sZW5ndGggLSAxXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfS5iaW5kKHRoaXMpKTtcblxuICAgIHRoaXMuaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcignYmx1cicsIGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgdGhpcy5yZW1vdmVEcm9wZG93bigpO1xuICAgICAgICB0aGlzLmhpZ2hsaWdodGVkSW5kZXggPSAtMTtcbiAgICB9LmJpbmQodGhpcykpO1xuXG4gICAgdGhpcy5pbnB1dC5hZGRFdmVudExpc3RlbmVyKCdmb2N1cycsIGZ1bmN0aW9uKGV2ZW50KXtcbiAgICAgICAgdGhpcy5yZW5kZXJPcHRpb25zKClcbiAgICB9LmJpbmQodGhpcykpO1xufVxuXG5BdXRvLnByb3RvdHlwZS5nZXRTaWJsaW5nSW5kZXggPSBmdW5jdGlvbihub2RlKSB7XG4gICAgdmFyIGluZGV4ID0gLTE7XG4gICAgdmFyIG4gPSBub2RlO1xuICAgIGRvIHtcbiAgICAgICAgaW5kZXgrKztcbiAgICAgICAgbiA9IG4ucHJldmlvdXNFbGVtZW50U2libGluZztcbiAgICB9IHdoaWxlIChuKTtcbiAgICByZXR1cm4gaW5kZXg7XG59XG5cbkF1dG8ucHJvdG90eXBlLnJlbmRlck9wdGlvbnMgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgZG9jdW1lbnRGcmFnbWVudCA9IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKTtcblxuICAgIHRoaXMuc2NvcmVkT3B0aW9ucy5ldmVyeSgoc2NvcmVkT3B0aW9uLCBpKSA9PiB7XG4gICAgICAgIHZhciBsaXN0SXRlbSA9IEF1dG8ubGlzdEl0ZW1GbihzY29yZWRPcHRpb24sIGkpO1xuICAgICAgICBsaXN0SXRlbSAmJiBkb2N1bWVudEZyYWdtZW50LmFwcGVuZENoaWxkKGxpc3RJdGVtKTtcbiAgICAgICAgcmV0dXJuICEhbGlzdEl0ZW07XG4gICAgfSk7XG5cbiAgICB0aGlzLnJlbW92ZURyb3Bkb3duKCk7XG4gICAgdGhpcy5oaWdobGlnaHRlZEluZGV4ID0gLTE7XG5cbiAgICBpZiAoZG9jdW1lbnRGcmFnbWVudC5oYXNDaGlsZE5vZGVzKCkpIHtcbiAgICAgICAgdmFyIG5ld1VsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInVsXCIpO1xuICAgICAgICBuZXdVbC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW92ZXInLCBldmVudCA9PiB7XG4gICAgICAgICAgICBpZiAoZXZlbnQudGFyZ2V0LnRhZ05hbWUgPT09ICdMSScpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZUhpZ2hsaWdodGVkT3B0aW9uKHRoaXMuZ2V0U2libGluZ0luZGV4KGV2ZW50LnRhcmdldCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICBuZXdVbC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWxlYXZlJywgKCkgPT4ge1xuICAgICAgICAgICAgdGhpcy5jaGFuZ2VIaWdobGlnaHRlZE9wdGlvbigtMSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG5ld1VsLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIGV2ZW50ID0+IGV2ZW50LnByZXZlbnREZWZhdWx0KCkpO1xuXG4gICAgICAgIG5ld1VsLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZXZlbnQgPT4ge1xuICAgICAgICAgICAgaWYgKGV2ZW50LnRhcmdldC50YWdOYW1lID09PSAnTEknKSB7XG4gICAgICAgICAgICAgICAgdGhpcy5zZWxlY3QoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgbmV3VWwuYXBwZW5kQ2hpbGQoZG9jdW1lbnRGcmFnbWVudCk7XG5cbiAgICAgICAgLy8gU2VlIENTUyB0byB1bmRlcnN0YW5kIHdoeSB0aGUgPHVsPiBoYXMgdG8gYmUgd3JhcHBlZCBpbiBhIDxkaXY+XG4gICAgICAgIGNvbnN0IG5ld0NvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIG5ld0NvbnRhaW5lci5jbGFzc05hbWUgPSAnbWlzcy1wbGV0ZSc7XG4gICAgICAgIG5ld0NvbnRhaW5lci5hcHBlbmRDaGlsZChuZXdVbCk7XG5cbiAgICAgICAgLy8gSW5zZXJ0cyB0aGUgZHJvcGRvd24ganVzdCBhZnRlciB0aGUgPGlucHV0PiBlbGVtZW50XG4gICAgICAgIHRoaXMuaW5wdXQucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUobmV3Q29udGFpbmVyLCB0aGlzLmlucHV0Lm5leHRTaWJsaW5nKTtcbiAgICAgICAgdGhpcy5jb250YWluZXIgPSBuZXdDb250YWluZXI7XG4gICAgICAgIHRoaXMudWwgPSBuZXdVbDtcbiAgICAgICAgdGhpcy5jaGFuZ2VIaWdobGlnaHRlZE9wdGlvbigwKTtcbiAgICB9XG59XG5cbkF1dG8ucHJvdG90eXBlLmNoYW5nZUhpZ2hsaWdodGVkT3B0aW9uID0gZnVuY3Rpb24obmV3SGlnaGxpZ2h0ZWRJbmRleCkge1xuICAgIGlmIChuZXdIaWdobGlnaHRlZEluZGV4ID49IC0xICYmXG4gICAgICAgIG5ld0hpZ2hsaWdodGVkSW5kZXggPCB0aGlzLnVsLmNoaWxkcmVuLmxlbmd0aCkge1xuICAgICAgICAvLyBJZiBhbnkgb3B0aW9uIGFscmVhZHkgc2VsZWN0ZWQsIHRoZW4gdW5zZWxlY3QgaXRcbiAgICAgICAgaWYgKHRoaXMuaGlnaGxpZ2h0ZWRJbmRleCAhPT0gLTEpIHtcbiAgICAgICAgICAgIHRoaXMudWwuY2hpbGRyZW5bdGhpcy5oaWdobGlnaHRlZEluZGV4XS5jbGFzc0xpc3QucmVtb3ZlKFwiaGlnaGxpZ2h0XCIpO1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5oaWdobGlnaHRlZEluZGV4ID0gbmV3SGlnaGxpZ2h0ZWRJbmRleDtcblxuICAgICAgICBpZiAodGhpcy5oaWdobGlnaHRlZEluZGV4ICE9PSAtMSkge1xuICAgICAgICAgICAgdGhpcy51bC5jaGlsZHJlblt0aGlzLmhpZ2hsaWdodGVkSW5kZXhdLmNsYXNzTGlzdC5hZGQoXCJoaWdobGlnaHRcIik7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbkF1dG8ucHJvdG90eXBlLnNlbGVjdCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLmhpZ2hsaWdodGVkSW5kZXggIT09IC0xKSB7XG4gICAgICAgIHRoaXMuaW5wdXQudmFsdWUgPSB0aGlzLnNjb3JlZE9wdGlvbnNbdGhpcy5oaWdobGlnaHRlZEluZGV4XS5kaXNwbGF5VmFsdWU7XG4gICAgICAgIHRoaXMucmVtb3ZlRHJvcGRvd24oKTtcbiAgICB9XG59XG5cbkF1dG8ucHJvdG90eXBlLnJlbW92ZURyb3Bkb3duID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5jb250YWluZXIgJiYgdGhpcy5jb250YWluZXIucmVtb3ZlKCk7XG4gICAgdGhpcy5jb250YWluZXIgPSBudWxsO1xuICAgIHRoaXMudWwgPSBudWxsO1xuXG59XG4iLCIvLyBodHRwczovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9KYXJvJUUyJTgwJTkzV2lua2xlcl9kaXN0YW5jZVxuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBqYXJvKHMxLCBzMikge1xuICAgIHZhciBzaG9ydGVyLCBsb25nZXI7XG5cbiAgICB2YXIgdCA9IHMxLmxlbmd0aCA+IHMyLmxlbmd0aCA/IFtzMSwgczJdIDogW3MyLCBzMV07XG4gICAgc2hvcnRlciA9IHRbMF07XG4gICAgbG9uZ2VyID0gdFsxXTtcblxuICAgIHZhciBtYXRjaGluZ1dpbmRvdyA9IE1hdGguZmxvb3IobG9uZ2VyLmxlbmd0aCAvIDIpIC0gMTtcbiAgICB2YXIgc2hvcnRlck1hdGNoZXMgPSBbXTtcbiAgICB2YXIgbG9uZ2VyTWF0Y2hlcyA9IFtdO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzaG9ydGVyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGxldCBjaCA9IHNob3J0ZXJbaV07XG4gICAgICAgIHZhciB3aW5kb3dTdGFydCA9IE1hdGgubWF4KDAsIGkgLSBtYXRjaGluZ1dpbmRvdyk7XG4gICAgICAgIHZhciB3aW5kb3dFbmQgPSBNYXRoLm1pbihpICsgbWF0Y2hpbmdXaW5kb3cgKyAxLCBsb25nZXIubGVuZ3RoKTtcbiAgICAgICAgZm9yIChsZXQgaiA9IHdpbmRvd1N0YXJ0OyBqIDwgd2luZG93RW5kOyBqKyspIHtcbiAgICAgICAgICAgIGlmIChsb25nZXJNYXRjaGVzW2pdID09PSB1bmRlZmluZWQgJiYgY2ggPT09IGxvbmdlcltqXSkge1xuICAgICAgICAgICAgICAgIHNob3J0ZXJNYXRjaGVzW2ldID0gbG9uZ2VyTWF0Y2hlc1tqXSA9IGNoO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHNob3J0ZXJNYXRjaGVzU3RyaW5nID0gc2hvcnRlck1hdGNoZXMuam9pbihcIlwiKTtcbiAgICB2YXIgbG9uZ2VyTWF0Y2hlc1N0cmluZyA9IGxvbmdlck1hdGNoZXMuam9pbihcIlwiKTtcbiAgICB2YXIgbnVtTWF0Y2hlcyA9IHNob3J0ZXJNYXRjaGVzU3RyaW5nLmxlbmd0aDtcblxuICAgIGxldCB0cmFuc3Bvc2l0aW9ucyA9IDA7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzaG9ydGVyTWF0Y2hlc1N0cmluZy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoc2hvcnRlck1hdGNoZXNTdHJpbmdbaV0gIT09IGxvbmdlck1hdGNoZXNTdHJpbmdbaV0pIHtcbiAgICAgICAgICAgIHRyYW5zcG9zaXRpb25zKys7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gbnVtTWF0Y2hlcyA+IDAgPyAoXG4gICAgICAgIG51bU1hdGNoZXMgLyBzaG9ydGVyLmxlbmd0aCArXG4gICAgICAgIG51bU1hdGNoZXMgLyBsb25nZXIubGVuZ3RoICtcbiAgICAgICAgKG51bU1hdGNoZXMgLSBNYXRoLmZsb29yKHRyYW5zcG9zaXRpb25zIC8gMikpIC8gbnVtTWF0Y2hlc1xuICAgICkgLyAzLjAgOiAwO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHMxLCBzMiwgcHJlZml4U2NhbGluZ0ZhY3Rvcikge1xuICAgIHZhciBqYXJvU2ltaWxhcml0eSA9IGphcm8oczEsIHMyKTtcbiAgICBwcmVmaXhTY2FsaW5nRmFjdG9yID0gcHJlZml4U2NhbGluZ0ZhY3RvciB8fCAwLjI7XG5cbiAgICBsZXQgY29tbW9uUHJlZml4TGVuZ3RoID0gMDtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHMxLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChzMVtpXSA9PT0gczJbaV0pIHtcbiAgICAgICAgICAgIGNvbW1vblByZWZpeExlbmd0aCsrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gamFyb1NpbWlsYXJpdHkgK1xuICAgICAgICBNYXRoLm1pbihjb21tb25QcmVmaXhMZW5ndGgsIDQpICpcbiAgICAgICAgcHJlZml4U2NhbGluZ0ZhY3RvciAqXG4gICAgICAgICgxIC0gamFyb1NpbWlsYXJpdHkpO1xufVxuIl19
