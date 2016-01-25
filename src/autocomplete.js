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
