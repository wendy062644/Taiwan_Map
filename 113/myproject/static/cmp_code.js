document.getElementById('code_input1').addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        let start = e.target.selectionStart;
        let end = e.target.selectionEnd;

        // Calculate the number of spaces to add to align to the nearest multiple of 4
        let currentLineStart = e.target.value.lastIndexOf('', start - 1) + 1;
        let currentIndentation = start - currentLineStart;
        let spacesToAdd = (4 - (currentIndentation % 4)) % 4;

        // set textarea value to: text before caret + spaces + text after caret
        e.target.value = e.target.value.substring(0, start) + ' '.repeat(spacesToAdd) + e.target.value.substring(end);

        // put caret at right position again
        e.target.selectionStart = e.target.selectionEnd = start + spacesToAdd;
    }
});

document.getElementById('code_input2').addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
        e.preventDefault();
        let start = e.target.selectionStart;
        let end = e.target.selectionEnd;

        // Calculate the number of spaces to add to align to the nearest multiple of 4
        let currentLineStart = e.target.value.lastIndexOf('', start - 1) + 1;
        let currentIndentation = start - currentLineStart;
        let spacesToAdd = (4 - (currentIndentation % 4)) % 4;

        // set textarea value to: text before caret + spaces + text after caret
        e.target.value = e.target.value.substring(0, start) + ' '.repeat(spacesToAdd) + e.target.value.substring(end);

        // put caret at right position again
        e.target.selectionStart = e.target.selectionEnd = start + spacesToAdd;
    }
});

document.getElementById('upload_file1').addEventListener('click', function () {
    let file = document.getElementById('file_input1').files[0];
    if (file) {
        let reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('code_input1').value = e.target.result;
            document.getElementById('file_input1').value = '';
        };
        reader.readAsText(file);
    }
});

document.getElementById('upload_file2').addEventListener('click', function () {
    let file = document.getElementById('file_input2').files[0];
    if (file) {
        let reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('code_input2').value = e.target.result;
            document.getElementById('file_input2').value = '';
        };
        reader.readAsText(file);
    }
});