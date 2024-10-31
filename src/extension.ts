import * as vscode from 'vscode';

let hiddenDecorationType: vscode.TextEditorDecorationType | undefined;
let hiddenRanges: vscode.Range[] = [];
let hiddenLines: number[] = [];

export function activate(context: vscode.ExtensionContext) {
    vscode.languages.registerFoldingRangeProvider({ language: 'json' }, new JsonFoldingRangeProvider());

    const decorationType = vscode.window.createTextEditorDecorationType({
        after: {
            margin: '0 0 0 0em',
            color: 'gray'
        }
    });

    const updateDecorationsForEditor = (editor: vscode.TextEditor | undefined) => {
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

class JsonFoldingRangeProvider implements vscode.FoldingRangeProvider {
    provideFoldingRanges(document: vscode.TextDocument, context: vscode.FoldingContext, token: vscode.CancellationToken): vscode.FoldingRange[] {
        const ranges: vscode.FoldingRange[] = [];
        const stack: number[] = [];

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text.trim();

            if (text.endsWith('{') || text.endsWith('[')) {
                stack.push(i);
            } else if (text.endsWith('}') || text.endsWith(']')) {
                const start = stack.pop();
                if (start !== undefined) {
                    ranges.push(new vscode.FoldingRange(start, i, vscode.FoldingRangeKind.Region));
                }
            }
        }

        return ranges;
    }
}

function updateDecorations(editor: vscode.TextEditor, decorationType: vscode.TextEditorDecorationType) {
    const document = editor.document;
    const decorations: vscode.DecorationOptions[] = [];

    const foldingRanges = editor.visibleRanges;
    foldingRanges.forEach(range => {
        for (let i = range.start.line; i <= range.end.line; i++) {
            // console.log(`\nlog..=========================`);
            const line = document.lineAt(i);
            const text = line.text.trim();
            // console.log(`log..text @ ${i+1}: ${text}`);

            const lineToCheck = i;
            if (text.endsWith('{') || text.endsWith('[')) {
                // console.log(`\nDEBUG..getFirstKeyValuePreview for startline ${i+1} with text ${text}`);
                const preview = getFirstKeyValuePreview(document, i);
                // console.log(`log..preview: ${preview}`);
                
                const folded = isLineFolded(editor, lineToCheck+1);
                // console.log(`folded State AT ${lineToCheck+1} is ${folded ? 'folded' : 'not folded'}`);
                if (folded)
                    {const decoration = { range: new vscode.Range(i, line.range.end.character, i, line.range.end.character), renderOptions: { after: { contentText: preview } } };
                    decorations.push(decoration);
                }
            }

            // Begin section to hide or show lines
            if (text === "}" || text === "}," || text === "]" || text === "],") {
                // Hide the line above ONLY if the line right above is folded
                const hidden = isLineFolded(editor, lineToCheck-1);
                // console.log(`Hidden Line State: ${lineToCheck} is ${hidden ? 'hidden' : 'not hidden'}`);
                if (hidden){
                    hideTextInLine(editor, lineToCheck);
                    hiddenLines.push(lineToCheck);
                };
            }
            
            // Check if the current line is in hiddenLines array
            const isHidden = hiddenLines.includes(lineToCheck);
            // If current line is there, we need to unhide it ONLY IF the line above is NOT folded
            if (isHidden){
                const lineAboveIsFolded = isLineFolded(editor, lineToCheck-1);
                if (!lineAboveIsFolded){
                    // console.log(`Need to unhide this line(${lineToCheck+1})!`);
                    showHiddenText(editor,lineToCheck);
                }

            }
            // End of section to hide  and show lines
        }
    });

    editor.setDecorations(decorationType, decorations);
}

function showHiddenText(editor: vscode.TextEditor, line: number) {
    if (!hiddenDecorationType) {
        return;
    }
    // Filter out the range for the specified line
    hiddenRanges = hiddenRanges.filter(range => range.start.line !== line);

    // Update the decorations
    editor.setDecorations(hiddenDecorationType, hiddenRanges);

    // Dispose the decoration type if no ranges are left
    if (hiddenRanges.length === 0) {
        hiddenDecorationType.dispose();
        hiddenDecorationType = undefined;
    }
}


function hideTextInLine(editor: vscode.TextEditor, line: number) {
    if (!hiddenDecorationType) {
        hiddenDecorationType = vscode.window.createTextEditorDecorationType({
            textDecoration: 'none; opacity: 0.18;', // Make text faded.
        });
    }

    const range = new vscode.Range(new vscode.Position(line, 0), new vscode.Position(line, editor.document.lineAt(line).text.length));
    hiddenRanges.push(range);
    editor.setDecorations(hiddenDecorationType, hiddenRanges);
}

function isLineFolded(editor: vscode.TextEditor, line: number): boolean {
    for (const range of editor.visibleRanges) {
        if (line >= range.start.line && line <= range.end.line) {
            return false;
        }
    }
    return true;
}

function getFirstKeyValuePreview(document: vscode.TextDocument, startLine: number): string {
    let preview = '';
    let depth = 0;
    let firstKeyValueFound = false;

    for (let i = startLine; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        const text = line.text.trim();

        // console.log(`DEBUG: startLine: ${startLine+1}`)
        if (text.endsWith('{') || text.endsWith('[')) {
            depth++;
        } else if (text.endsWith('}') || text.endsWith(']')) {
            depth--;
        }

        if (!firstKeyValueFound && text.includes(':')) {
            const keyValue = text.split(':').map(part => part.trim());
            // console.log(`DEBUG:Line ${i+1} keyValue: ${keyValue}`);
            if (keyValue.length >= 2) {
                preview = `${getFirstValuePreview(keyValue[1],document, i)}`;
                const calc_preview = preview;
                // console.log(`log..initial preview: ${preview}`);
                if ( (!preview.includes('...]') && !preview.includes('...}')) ){
                    preview = `${keyValue[0]}: ${preview}`;
                }

                firstKeyValueFound = true;
            }
        }
        else if (!firstKeyValueFound && text === "{"){
            preview = `${document.lineAt(i+1).text.trim()}...}`;
            firstKeyValueFound = true;
        }
        

        if (depth === 0) {
            break;
        }
    }
    // console.log(`log...getFirstKeyValuePreview for line ${startLine+1}: ${preview}`);
    return preview.length > 120 ? preview.substring(0, 80) + '...' : preview;
}

function getFirstValuePreview(value: string,  document: vscode.TextDocument, lineNum:number): string {
    // console.log(`log..item to run getFirstValuePreview for: ${value}`);
    try {
        const parsedValue = JSON.parse(value);
        // console.log(`log..parsedValue ${parsedValue}`);
        if (typeof parsedValue === 'object' && parsedValue !== null) {
            const firstKey = Object.keys(parsedValue)[0];
            return `${firstKey}: ${JSON.stringify(parsedValue[firstKey])}`;
        }
    } catch (e) {
        // console.log(`log..Error ${e}`);
        // If parsing fails, return the value as is
    }
    if(value==='{' && !document.lineAt(lineNum+1).text.trim().includes('{') ){ // Also need to check the next two lines
        return `${document.lineAt(lineNum+1).text.trim()}...}`;
    }

    if(value==='{'){ 
        return `...}`;
    }

    if(value==='['){
        if (document.lineAt(lineNum+1).text.trim().startsWith("\"")) {
            // console.log(`DEBUG: line ${lineNum+2} starts with "". The full value is ${document.lineAt(lineNum+1).text.trim()}`);
            let nextLineCount = 2;
            let elementCount = 1;
            while (document.lineAt(lineNum+nextLineCount).text.trim().startsWith("\"")){
                elementCount =elementCount+1;
                nextLineCount = nextLineCount+1;
            };
            return `${elementCount} elements...]`;
        };

        return `...]`;
    }

    return value;
}

export function deactivate() {}
