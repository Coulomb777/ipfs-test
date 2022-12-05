let currentPath;
$(async () => { // ページ読み込み中の処理。
    const pageUrl = window.location.href;
    currentPath = pageUrl.substring(pageUrl.indexOf('directories/')).replace("directories/", "");
    await loadDirectory();

    // ロード画面を隠す・ページ内容の表示。
    await $('.loader').fadeOut();
    await $('.contents').delay(400).fadeIn();
});

$(window).on('load', async () => { // ページ読み込み終了後の処理。
    
    // ファイルの追加。
    $(document).on('change', '#add-file', async () => {
        const files = $('#add-file')[0].files;
        if (files.length <= 0) {
            return;
        }
        const file = files[0];
        await addFile(file);
        window.location.reload();
        return false;
    });
    
    // ディレクトリの追加。
    $(document).on('click', '#make-dir', async () => {
        await makeDirectory();
        window.location.reload();
        return false;
    });

    // 削除ボタンを押したときの処理。
    $(document).on('click', '#remove', () => {
        rmFiles();
        return false;
    });

    // ファイル共有モーダルを開いた時の処理。
    $('#file-share').on('show.bs.modal', (e) => {
        const shareBtn = $(e.relatedTarget);
        const cid = shareBtn.data('cid');

        $('#modal-cid').text(cid);
    })

    // ファイル共有ボタン。
    $(document).on('click', '#share', () => {
        shareFile();
        return false;
    });

    // コンテンツのチェックボックスについての処理。
    $(document).on('change', '.selection', () => {
        console.log('check')
        // ひとつでも選択されていたら削除ボタンを出す。
        // それ以外では隠す。
        if ($('.selection:checked').length > 0) {
            $('#remove-btn').show();
        }
        else {
            $('#remove-btn').hide();
        }
        
    });

    //ドラッグ&ドロップ時の操作
    $(document).on('drop', '.drop-area' , async (e) => {
        const files = e.originalEvent.dataTransfer.files;
        for (let file of files) {
            await addFile(file);
        }
        window.location.reload();
    })

    //ドロップエリア以外のドロップ禁止
    $(document).on('dragenter dragover drop', (e) => {
        e.stopPropagation()
        e.preventDefault()
    })

    // ファイルコンテンツをクリックしたときの処理。(hrefの内容に飛ぶ。別タブ。)
    $(document).on('dblclick', '.list-group-item-action.file', (e) => {
        window.open($(e.currentTarget).attr('href'));
    });

    // ディレクトリコンテンツをクリックしたときの処理。(hrefの内容に飛ぶ)
    $(document).on('dblclick', '.list-group-item-action.dir', (e) => {
        window.location.href = $(e.currentTarget).attr('href');
    });

    $('.sortable').sortable();
});

/////////////////////////////////////////////////////////////////////////
async function addFile(file) {
    // FormDataの作成。
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file-name', file.name)
    formData.append('password', localStorage.getItem(userID));
    formData.append('path', currentPath);
    // /user/{ユーザID}/upload にFormData をPOST。
    await $.ajax({
        url: `/user/${userID}/upload`,
        type: 'post',
        data: formData,
        contentType: false,
        processData: false
    }).done(() => {
        return;
    });
}

async function makeDirectory() {
    const params = new URLSearchParams();
    params.append('path', currentPath);
    params.append('password', localStorage.getItem(userID));
    params.append('dir', $('#dir-name').val());
    // /user/{ユーザID}/mkdir に params をPOST。
    await $.ajax({
        url: `/user/${userID}/mkdir`,
        type: 'post',
        data: params,
        contentType: false,
        processData: false
    }).done(() => {
        return;
    });
}

async function listFile(cid, name) {
    const params = new URLSearchParams();
    params.append('password', localStorage.getItem(userID));
    params.append('text', name);
    await $.ajax({
        url: `/user/${userID}/decrypt/text`,
        type: 'post',
        data: params,
        contentType: false,
        processData: false
    }).done((data) => {
        $(".files").append(
            `<li class="list-group-item list-group-item-action d-flex justify-content-between align-items-center file" href="/user/${userID}/files/${cid}">`
            + `<div class="content">`
            + `<input class="selection" type="checkbox" style="display: inline-block; _display: inline">`
            + `&emsp;`
            + `<div class="content-icon" style="display: inline-block; _display: inline">`
            + `<svg focusable="false" viewBox="0 0 32 32" height="16px" width="16px" fill="#5f6368">`
            + `<g>`
            + `<path d="M28.681 7.159c-0.694-0.947-1.662-2.053-2.724-3.116s-2.169-2.030-3.116-2.724c-1.612-1.182-2.393-1.319-2.841-1.319h-15.5c-1.378 0-2.5 1.121-2.5 2.5v27c0 1.378 1.122 2.5 2.5 2.5h23c1.378 0 2.5-1.122 2.5-2.5v-19.5c0-0.448-0.137-1.23-1.319-2.841zM24.543 5.457c0.959 0.959 1.712 1.825 2.268 2.543h-4.811v-4.811c0.718 0.556 1.584 1.309 2.543 2.268zM28 29.5c0 0.271-0.229 0.5-0.5 0.5h-23c-0.271 0-0.5-0.229-0.5-0.5v-27c0-0.271 0.229-0.5 0.5-0.5 0 0 15.499-0 15.5 0v7c0 0.552 0.448 1 1 1h7v19.5z"></path>`
            + `</g>`
            + `</svg>`
            + `</div>`
            + `&emsp;`
            + `<div class="file-name" style="display: inline-block; _display: inline" id="${name}">`
            + `${data.text}`
            + `</div>`
            + `</div>`
            + `<span class="badge">`
            + `<div class="btn-group dropend">`
            + `<button type="button" class="btn btn-sm dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">`
            + `<i class="bi bi-three-dots fa-xs"></i>`    
            + `</button>`
            + `<ul class="dropdown-menu">`
            + `<li>`
            + `<a class="dropdown-item" href="/user/${userID}/download/${cid}" target="_blank" rel="noopener noreferrer">ダウンロード</a>`
            + `</li>`
            + `<li>`
            + `<label class="dropdown-item" id="share-file">`
            + `共有`
            + `<button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#file-share" data-cid="${cid}" hidden></button>`
            + `</label>`
            + `</li>`
            + `</ul>`
            + `</div>`
            + `</span>`
            + `</li>`
        );
    }).fail(() => {
        $(".files").append(
            `<li class="list-group-item list-group-item-action file" href="/user/${userID}/files/${cid}">`
            + `<input class="selection" type="checkbox" style="display: inline-block; _display: inline">`
            + `&emsp;`
            + `<div class="content-icon" style="display: inline-block; _display: inline">`
            + `<svg focusable="false" viewBox="0 0 32 32" height="16px" width="16px" fill="#5f6368">`
            + `<g>`
            + `<path d="M28.681 7.159c-0.694-0.947-1.662-2.053-2.724-3.116s-2.169-2.030-3.116-2.724c-1.612-1.182-2.393-1.319-2.841-1.319h-15.5c-1.378 0-2.5 1.121-2.5 2.5v27c0 1.378 1.122 2.5 2.5 2.5h23c1.378 0 2.5-1.122 2.5-2.5v-19.5c0-0.448-0.137-1.23-1.319-2.841zM24.543 5.457c0.959 0.959 1.712 1.825 2.268 2.543h-4.811v-4.811c0.718 0.556 1.584 1.309 2.543 2.268zM28 29.5c0 0.271-0.229 0.5-0.5 0.5h-23c-0.271 0-0.5-0.229-0.5-0.5v-27c0-0.271 0.229-0.5 0.5-0.5 0 0 15.499-0 15.5 0v7c0 0.552 0.448 1 1 1h7v19.5z"></path>`
            + `</g>`
            + `</svg>`
            + `</div>`
            + `&emsp;`
            + `<div class="file-name" style="display: inline-block; _display: inline; color: gray" id="${name}">`
            + `${name}`
            + `</div>`
            + `</li>`
        );
    });
}

async function listDir(name) {
    const params = new URLSearchParams();
    params.append('password', localStorage.getItem(userID));
    params.append('text', name);
    await $.ajax({
        url: `/user/${userID}/decrypt/text`,
        type: 'post',
        data: params,
        contentType: false,
        processData: false
    }).done((data) => {
        const dirPath = currentPath == '' ? name : `${currentPath}/${name}`;
        $(".files").append(
            `<li class="list-group-item list-group-item-action  d-flex justify-content-between align-items-center dir" href="/user/${userID}/directories/${dirPath}">`
            + `<div class="content">`
            + `<input class="selection" type="checkbox" style="display: inline-block; _display: inline">`
            + `&emsp;`
            + `<div class="content-icon" style="display: inline-block; _display: inline">`
            + `<svg focusable="false" viewBox="0 0 32 32" height="16px" width="16px" fill="#5f6368">`
            + `<g>`
            + `<path d="M14 4l4 4h14v22h-32v-26z"></path>`
            + `</g>`
            + `</svg>`
            + `</div>`
            + `&emsp;`
            + `<div class="file-name" style="display: inline-block; _display: inline" id="${name}">`
            + `${data.text}`
            + `</div>`
            + `</div>`
            + `</li>`
        );
    }).fail(() => {
        $(".files").append(
            `<li class="list-group-item list-group-item-action dir" href="/user/${userID}/directories/${dirPath}">`
            + `<input class="selection" type="checkbox" style="display: inline-block; _display: inline">`
            + `&emsp;`
            + `<div class="content-icon" style="display: inline-block; _display: inline">`
            + `<svg focusable="false" viewBox="0 0 32 32" height="16px" width="16px" fill="#5f6368">`
            + `<g>`
            + `<path d="M14 4l4 4h14v22h-32v-26z"></path>`
            + `</g>`
            + `</svg>`
            + `</div>`
            + `&emsp;`
            + `<div class="file-name" style="display: inline-block; _display: inline; color: gray" id="${name}">`
            + `${name}`
            + `</div>`
            + `</li>`
      );
    });
}

async function rmFiles() {
    let targetFiles = new Array();
    for (let target of $('.selection:checked')) {
        // 削除するコンテンツの名前を追加。
        targetFiles.push($(target).siblings('.file-name').attr('id'));
    }

    const json = {
        "password": localStorage.getItem(userID),
        "path": currentPath, 
        "target_files": targetFiles
    }
    
    await $.ajax({
        url: `/user/${userID}/rmFiles`,
        type: 'post',
        data: JSON.stringify(json),
        contentType: 'application/json',
        processData: false
    }).done(() => {
        window.location.reload();
    });
}

async function loadDirectory() {
    let contentsIsExist = false;
    //　ディレクトリ内容の反映。
    for (let result of data.contents) {
        contentsIsExist = true;
        if (result.content.type == "file") {
            listFile(result.cid, result.content.name);
        } else if (result.content.type == "dir") {
            listDir(result.content.name);
        }
    } 
    // パス反映。
    if (currentPath != '') {
        const decryptedDirs = await getDecryptedDirsName();
        let dirHref = currentPath;
        for (let dir of decryptedDirs.reverse()) {
            $('#path').prepend(`/<a href="/user/${userID}/directories/${dirHref}" class="path">${dir}</a>`);
            dirHref = dirHref.substring(0, dirHref.lastIndexOf('/'));
        }  
    }
    // からディレクトリの時に表示。
    if (!contentsIsExist) {
        $('.files').html('<center style="color: gray">No contents</center>')
    }

}

async function getDecryptedDirsName() {
    const encryptedDirs = currentPath.split('/');
    let dirs = new Array();
    for (let dir of encryptedDirs) {
        const params = new URLSearchParams();
        params.append('password', localStorage.getItem(userID));
        params.append('text', dir);
        await $.ajax({
            url: `/user/${userID}/decrypt/text`,
            type: 'post',
            data: params,
            contentType: false,
            processData: false
        }).done((data) => {
            dirs.push(data.text);
        });
    }
    return dirs;
}

async function shareFile() {
    const cid = $('#modal-cid').text();

}