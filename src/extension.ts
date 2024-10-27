import * as vscode from 'vscode';

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
            console.log(`\nlog..=========================`);
            const line = document.lineAt(i);
            const text = line.text.trim();
            console.log(`log..text @ ${i+1}: ${text}`);

            if (text.endsWith('{') || text.endsWith('[')) {
                console.log(`log..getFirstKeyValuePreview for startline ${i+1}`);
                const preview = getFirstKeyValuePreview(document, i);
                console.log(`log..preview: ${preview}`);
                          
                const lineToCheck = i;
                const collapsed = isLineCollapsed(editor, lineToCheck);
                console.log(`Collapsed State: ${lineToCheck+1} is ${collapsed ? 'collapsed' : 'not collapsed'}`);

                const decoration = { range: new vscode.Range(i, line.range.end.character, i, line.range.end.character), renderOptions: { after: { contentText: preview } } };
                decorations.push(decoration);
            }
        }
    });

    editor.setDecorations(decorationType, decorations);
}

function isLineCollapsed(editor: vscode.TextEditor, line: number): boolean {
    const document = editor.document;
    const text = document.lineAt(line).text.trim();
    
    console.log(`LOG..Text at line: ${line}:${text} `);

    return false;
}

function getFirstKeyValuePreview(document: vscode.TextDocument, startLine: number): string {
    let preview = '';
    let depth = 0;
    let firstKeyValueFound = false;

    for (let i = startLine; i < document.lineCount; i++) {
        const line = document.lineAt(i);
        const text = line.text.trim();

        if (text.endsWith('{') || text.endsWith('[')) {
            depth++;
        } else if (text.endsWith('}') || text.endsWith(']')) {
            depth--;
        }

        if (!firstKeyValueFound && text.includes(':')) {
            const keyValue = text.split(':').map(part => part.trim());
            if (keyValue.length >= 2) {
                preview = `${getFirstValuePreview(keyValue[1],document, i)}`;
                console.log(`log..initial preview: ${preview}`);
                if (!preview.includes('...]') && !preview.includes('...}')){
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

function getFirstValuePreview(value: string,  document: vscode.TextDocument, lineNum:number): string {
    console.log(`log..Value: ${value}`);
    try {
        const parsedValue = JSON.parse(value);
        console.log(`log..parsedValue ${parsedValue}`);
        if (typeof parsedValue === 'object' && parsedValue !== null) {
            const firstKey = Object.keys(parsedValue)[0];
            return `${firstKey}: ${JSON.stringify(parsedValue[firstKey])}`;
        }
    } catch (e) {
        console.log(`log..Error ${e}`);
        // If parsing fails, return the value as is
    }
    if(value==='{' && !document.lineAt(lineNum+1).text.trim().includes('{') ){ // Also need to check the next two lines
        return `${document.lineAt(lineNum+1).text.trim()}...}`;
    }

    if(value==='{'){ // Also need to check the next two lines
        return `...}`;
    }

    if(value==='['){
        return `...]`;
    }

    return value;
}

export function deactivate() {}
