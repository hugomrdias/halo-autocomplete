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
