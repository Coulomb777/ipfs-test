
let ipfs;
$(async () => { // ページ読み込み中の処理。
    // クライアントのブラウザでのipfsノード
    ipfs = await window.IpfsCore.create({ repo: userID });
    const stat = await ipfs.files.stat('/');
    const clientHomeCid = stat.cid.toString();

    // クライアント側のホームディレクトリが空の場合。
    if (clientHomeCid == "QmUNLLsPACCz1vLxQVkXqqLX5R1X345qqfHbsf67hvA3Nn") {
        // 他ノードからホームディレクトリを取得。
        await getHome();
    }

    // CIDからディレクトリ内容を読み込み。
    await loadDirectory(cid);

    // ロード画面を隠す・ページ内容の表示。
    await $('.loader').fadeOut();
    await $('.contents').delay(400).fadeIn();
});

$(window).on('load', async () => { // ページ読み込み終了後の処理。
    
    // ファイルの追加。
    $(document).on('change', '#add-file', async () => {
        try {
            await addFile();
        } catch (err) {
            console.log(err);
        }
        return false;
    });
    
    // ディレクトリの追加。
    $(document).on('click', '#dir',() => {
        makeDirectory();
        return false;
    });

    // 削除ボタンを押したときの処理。
    $(document).on('click', '#remove', () => {
        console.log('remove')
    /*
        let result = confirm('Remove selected files?');
        if (result) {
            rmFiles();
        }
        */
        return false;
    });

    // コンテンツのチェックボックスについての処理。
    $(document).on('change', '.files', () => {
        console.log('check')
        // ひとつでも選択されていたら削除ボタンを出す。
        // それ以外では隠す。
        if ($('.file:checked').length > 0) {
            $('#remove-btn').show();
        }
        else {
            $('#remove-btn').hide();
        }
        
    });

    // コンテンツをクリックしたときの処理。(hrefの内容に飛ぶ)
    $(document).on('click', '.clickable-row', (e) => {
        window.open($(e.currentTarget).attr('href'));
    });

});

async function addFile() {
    const files = $('#add-file')[0].files;
    if (files.length > 0) {
        const file = files[0];
        // FormDataの作成。
        const formData = new FormData();
        formData.append('file', file);
        formData.append('password', localStorage.getItem(userID));
        formData.append('path', $('#path').text());
        // /user/{ユーザID}/upload にFormData をPOST。
        $.ajax({
            url: `/user/${userID}/upload`,
            type: 'post',
            data: formData,
            contentType: false,
            processData: false
        }).done(async (data) => {
            /*
                data = {
                    file :{
                        name: string
                        path: string
                        buff: Array
                    }
                }

            */
            // クライアント側のIPFSノードに追加するファイルのパス。
            const encryptedAllPath = `/${data.file.path}/${data.file.name}`;
            console.log(encryptedAllPath);
            let stat, isExist = true;
            try { // ファイルの存在確認。
                stat = await ipfs.files.stat(encryptedAllPath);
            } catch (err) { // ファイルが存在しない場合。
                isExist = false;
            }
            if (isExist) { // 存在していたらファイルを削除。
                await ipfs.files.rm(encryptedAllPath);
            }
            console.log(encryptedAllPath);
            // buff を IPFSノードに登録できる形にする。
            const buff = new Uint8Array(data.file.buff[0].data);
            // ファイルをクライアント側のIPFSノードに登録。
            await ipfs.files.write(`/${encryptedAllPath}`, buff, { create: true });
            stat = await ipfs.files.stat('/');
            console.log(stat.cid.toString());
            window.location.reload();
        });
    }
}

async function makeDirectory() {
    let currentDirPath = $('#current_dir_path').text(); 
    let madeDirName = $('#dir').val();
    let madeDirPath = makePath(currentDirPath, madeDirName);
    console.log("makeDirectory:madeDirPath\n" + madeDirPath);

    await ipfs.files.mkdir(madeDirPath, { parents: true });
    await ipfs.files.flush('/');
    let stat = await ipfs.files.stat(madeDirPath);
    console.log("makeDirectory:stat");
    console.log(stat);

    loadDirectory(currentDirPath);

}

async function listFile(cid, name) {
    const params = new URLSearchParams();
    params.append('password', localStorage.getItem(userID));
    params.append('text', name);
    $.ajax({
        url: `/user/${userID}/decrypt/text`,
        type: 'post',
        data: params,
        contentType: false,
        processData: false
    }).done(async (data) => {
        $(".files").append(
              '<tr>'
            + `<td class="clickable-row" href="/user/${userID}/files/${cid}">`
            + ` <div class="selection" style="display: inline-block; _display: inline;">`
            + `     <input type="checkbox" class="file">`
            + ` </div>`
            + ` <div class="content-icon" style="display: inline-block; _display: inline;">`
            + `     <svg focusable="false" viewBox="0 0 32 32" height="16px" width="16px" fill="#5f6368">`
            + `         <g>`
            + `             <path d="M28.681 7.159c-0.694-0.947-1.662-2.053-2.724-3.116s-2.169-2.030-3.116-2.724c-1.612-1.182-2.393-1.319-2.841-1.319h-15.5c-1.378 0-2.5 1.121-2.5 2.5v27c0 1.378 1.122 2.5 2.5 2.5h23c1.378 0 2.5-1.122 2.5-2.5v-19.5c0-0.448-0.137-1.23-1.319-2.841zM24.543 5.457c0.959 0.959 1.712 1.825 2.268 2.543h-4.811v-4.811c0.718 0.556 1.584 1.309 2.543 2.268zM28 29.5c0 0.271-0.229 0.5-0.5 0.5h-23c-0.271 0-0.5-0.229-0.5-0.5v-27c0-0.271 0.229-0.5 0.5-0.5 0 0 15.499-0 15.5 0v7c0 0.552 0.448 1 1 1h7v19.5z"></path>`
            + `         </g>`
            + `     </svg>`
            + ` </div>`
            + ` <div class="file-name" style="display: inline-block; _display: inline;">`
            + `     ${data.text}`
            + ` </div>`
            + ` <td scope="row">`
            + `</tr>`
        );
    }).fail(async () => {
        $(".files").append(
            '<tr>'
          + `<td class="clickable-row" href="/user/${userID}/files/${cid}">`
          + ` <div class="selection" style="display: inline-block; _display: inline;">`
          + `     <input type="checkbox" class="file">`
          + ` </div>`
          + ` <div class="content-icon" style="display: inline-block; _display: inline;">`
          + `     <svg focusable="false" viewBox="0 0 32 32" height="16px" width="16px" fill="#5f6368">`
          + `         <g>`
          + `             <path d="M28.681 7.159c-0.694-0.947-1.662-2.053-2.724-3.116s-2.169-2.030-3.116-2.724c-1.612-1.182-2.393-1.319-2.841-1.319h-15.5c-1.378 0-2.5 1.121-2.5 2.5v27c0 1.378 1.122 2.5 2.5 2.5h23c1.378 0 2.5-1.122 2.5-2.5v-19.5c0-0.448-0.137-1.23-1.319-2.841zM24.543 5.457c0.959 0.959 1.712 1.825 2.268 2.543h-4.811v-4.811c0.718 0.556 1.584 1.309 2.543 2.268zM28 29.5c0 0.271-0.229 0.5-0.5 0.5h-23c-0.271 0-0.5-0.229-0.5-0.5v-27c0-0.271 0.229-0.5 0.5-0.5 0 0 15.499-0 15.5 0v7c0 0.552 0.448 1 1 1h7v19.5z"></path>`
          + `         </g>`
          + `     </svg>`
          + ` </div>`
          + ` <div class="file-name" style="display: inline-block; _display: inline;">`
          + `     [encrypted]${name}`
          + ` </div>`
          + ` <td scope="row">`
          + `</tr>`
      );
    });
}

async function listDir(cid, name) {
    $(".files").append(
        '<tr><td scope="row"><input type="checkbox" class="file"> [D]</td>'
        + `<td class="clickable-row" href='/user/${userID}/directories/${cid}'>${name}</td></tr>`
    );
}

async function rmFiles() {
    let currentDirPath = $('#current_dir_path').text();
    let files = $('.files:checked');
    for (let i = 0; i < files.length; i++) {
        let fileLinkName = files[i].nextSibling.innerText;
        let fileName = fileLinkName.substr(3);
        console.log(fileName);

        await ipfs.files.rm(`${currentDirPath}/${fileName}`, { recursive: true }); 
    }
    await ipfs.files.flush('/');
    loadDirectory(currentDirPath);
}

function makePath(currentPath, name) {
    let fixedName;
    if (name[0] == '/') {
        fixedName = name.substr(1, name.length - 1);
    } else if (name[length - 1] == '/') {
        fixedName = name.substr(0, name.length - 2);
    } else {
        fixedName = name;
    }

    return currentPath + (currentPath == '/' ? '' : '/') + fixedName;
}

async function getHome() {
    for await (let file of ipfs.ls(homeCid)) {
        console.log(file);
        console.log('file')
        await ipfs.files.cp(
            `/ipfs/${file.cid.toString()}`, `/${file.name}`
        );
    }
}

async function loadDirectory(cid) {
    const dirCid = cid == "home" ? homeCid : cid;

    for await (let result of ipfs.ls(dirCid)) {
        if (result.type == "file") {
            await listFile(result.cid.toString(), result.name);
        } else if (result.type == "directory") {
            listDir(result.cid.toString(), result.name);
        }
    } 

}

// $('#path').append('/<a href="#" class="path">dir1</a>')
// /dir1/dir2/dir3 -> $(".paht").prevAll() = [dir1, dir2, dir3]