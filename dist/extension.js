/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ([
/* 0 */
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(__webpack_require__(1));
function activate(context) {
    vscode.languages.registerFoldingRangeProvider({ language: 'json' }, new JsonFoldingRangeProvider());
    const decorationType = vscode.window.createTextEditorDecorationType({
        after: {
            margin: '0 0 0 0em',
            color: 'gray'
        }
    });
    const updateDecorationsForEditor = (editor) => {
        if (editor && editor.document.languageId === 'json') {
            updateDecorations(editor, decorationType);
        }
    };
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
        updateDecorationsForEditor(editor);
    }));
    context.subscriptions.push(vscode.window.onDidChangeTextEditorVisibleRanges(event => {
        updateDecorationsForEditor(event.textEditor);
    }));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor && event.document === editor.document && editor.document.languageId === 'json') {
            updateDecorations(editor, decorationType);
        }
    }));
    // Apply decorations to the active editor when the extension is activated
    updateDecorationsForEditor(vscode.window.activeTextEditor);
}
class JsonFoldingRangeProvider {
    provideFoldingRanges(document, context, token) {
        const ranges = [];
        const stack = [];
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text.trim();
            if (text.endsWith('{') || text.endsWith('[')) {
                stack.push(i);
            }
            else if (text.endsWith('}') || text.endsWith(']')) {
                const start = stack.pop();
                if (start !== undefined) {
                    ranges.push(new vscode.FoldingRange(start, i, vscode.FoldingRangeKind.Region));
                }
            }
        }
        return ranges;
    }
}
function updateDecorations(editor, decorationType) {
    const document = editor.document;
    const decorations = [];
    const foldingRanges = editor.visibleRanges;
    foldingRanges.forEach(range => {
        for (let i = range.start.line; i <= range.end.line; i++) {
            console.log(`\nlog..=========================`);
            const line = document.lineAt(i);
            const text = line.text.trim();
            console.log(`log..text @ ${i + 1}: ${text}`);
            if (text.endsWith('{') || text.endsWith('[')) {
                console.log(`log..getFirstKeyValuePreview for startline ${i + 1}`);
                const preview = getFirstKeyValuePreview(document, i);
                console.log(`log..preview: ${preview}`);
                const lineToCheck = i;
                const folded = isLineFolded(editor, lineToCheck + 1);
                console.log(`folded State AT ${lineToCheck + 1} is ${folded ? 'folded' : 'not folded'}`);
                if (folded) {
                    const decoration = { range: new vscode.Range(i, line.range.end.character, i, line.range.end.character), renderOptions: { after: { contentText: preview } } };
                    decorations.push(decoration);
                }
                // const decoration = { range: new vscode.Range(i, line.range.end.character, i, line.range.end.character), renderOptions: { after: { contentText: preview } } };
                // decorations.push(decoration);
            }
        }
    });
    editor.setDecorations(decorationType, decorations);
}
function isLineFolded(editor, line) {
    for (const range of editor.visibleRanges) {
        if (line >= range.start.line && line <= range.end.line) {
            return false;
        }
    }
    return true;
}
function getFirstKeyValuePreview(document, startLine) {
    let preview = '';
    let depth = 0;
    let firstKeyValueFound = false;
    for (let i = startLine; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        const text = line.text.trim();
        if (text.endsWith('{') || text.endsWith('[')) {
            depth++;
        }
        else if (text.endsWith('}') || text.endsWith(']')) {
            depth--;
        }
        if (!firstKeyValueFound && text.includes(':')) {
            const keyValue = text.split(':').map(part => part.trim());
            if (keyValue.length >= 2) {
                preview = `${getFirstValuePreview(keyValue[1], document, i)}`;
                console.log(`log..initial preview: ${preview}`);
                if (!preview.includes('...]') && !preview.includes('...}')) {
                    preview = `${keyValue[0]}: ${preview}`;
                }
                firstKeyValueFound = true;
            }
        }
        if (depth === 0) {
            break;
        }
    }
    console.log(`log...getFirstKeyValuePreview: ${preview}`);
    return preview.length > 50 ? preview.substring(0, 47) + '...' : preview;
}
function getFirstValuePreview(value, document, lineNum) {
    console.log(`log..Value: ${value}`);
    try {
        const parsedValue = JSON.parse(value);
        console.log(`log..parsedValue ${parsedValue}`);
        if (typeof parsedValue === 'object' && parsedValue !== null) {
            const firstKey = Object.keys(parsedValue)[0];
            return `${firstKey}: ${JSON.stringify(parsedValue[firstKey])}`;
        }
    }
    catch (e) {
        console.log(`log..Error ${e}`);
        // If parsing fails, return the value as is
    }
    if (value === '{' && !document.lineAt(lineNum + 1).text.trim().includes('{')) { // Also need to check the next two lines
        return `${document.lineAt(lineNum + 1).text.trim()}...}`;
    }
    if (value === '{') { // Also need to check the next two lines
        return `...}`;
    }
    if (value === '[') {
        return `...]`;
    }
    return value;
}
function deactivate() { }


/***/ }),
/* 1 */
/***/ ((module) => {

module.exports = require("vscode");

/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(0);
/******/ 	module.exports = __webpack_exports__;
/******/ 	
/******/ })()
;
//# sourceMappingURL=extension.js.map