function handleTabIndentation(textareaId) {
    document.getElementById(textareaId).addEventListener('keydown', function (e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            let start = e.target.selectionStart;
            let end = e.target.selectionEnd;

            // Calculate the number of spaces to add to align to the nearest multiple of 4
            let currentLineStart = e.target.value.lastIndexOf('\n', start - 1) + 1;
            let currentIndentation = start - currentLineStart;
            let spacesToAdd = (4 - (currentIndentation % 4)) % 4;

            // set textarea value to: text before caret + spaces + text after caret
            e.target.value = e.target.value.substring(0, start) + ' '.repeat(spacesToAdd) + e.target.value.substring(end);

            // put caret at right position again
            e.target.selectionStart = e.target.selectionEnd = start + spacesToAdd;
        }
    });
}

function handleFileUpload(uploadButtonId, fileInputId, textareaId) {
    document.getElementById(uploadButtonId).addEventListener('click', function () {
        let file = document.getElementById(fileInputId).files[0];
        if (file) {
            let reader = new FileReader();
            reader.onload = function (e) {
                document.getElementById(textareaId).value = e.target.result;
                document.getElementById(fileInputId).value = '';
            };
            reader.readAsText(file);
        } else {
            alert("Please select a file to upload.");
        }
    });
}

document.getElementById('code_input1').addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

document.getElementById('compare_raw').addEventListener('click', function () {
    const code1 = document.getElementById('code_input1').value;
    const code2 = document.getElementById('code_input2').value;

    // 发起 AJAX 请求进行普通 LCS 对比
    fetch('/compare_code_raw/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: new URLSearchParams({
            'code_input1': code1,
            'code_input2': code2
        })
    }).then(response => response.json())
      .then(data => {
          document.getElementById('result_left').innerHTML = data.result_left;
          document.getElementById('result_right').innerHTML = data.result_right;
      }).catch(error => {
          console.error('Error:', error);
      });
});

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}


handleTabIndentation('code_input1');
handleTabIndentation('code_input2');
handleFileUpload('upload_file1', 'file_input1', 'code_input1');
handleFileUpload('upload_file2', 'file_input2', 'code_input2');