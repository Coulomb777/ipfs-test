$(async () => {// 準備処理。

  const pageUrl = window.location.href;
  await loadDirectory();

  // ロード画面を隠す・ページ内容の表示。
  await $(".loader").fadeOut();
  await $(".contents").delay(400).fadeIn();
});

$(window).on("load", async () => { // ページ読み込み終了後の処理。

  // ファイルの追加。
  $(document).on("change", "#add-file", async (e) => {
    e.stopPropagation();
    e.preventDefault();

    const files = $("#add-file")[0].files;
    if (files.length <= 0) {
      return;
    }
    
    for (const file of files) {
      await addFile(file);
    }
    window.location.reload();
  });

  // ディレクトリの追加。
  $(document).on("click", "#make-dir", async (e) => {
    e.stopPropagation();
    e.preventDefault();

    await makeDirectory();
    window.location.reload();
  });
  $(document).on("keydown", "#dir-name", async (e) => {
    if (e.key === "Enter") {
      e.stopPropagation();
      e.preventDefault();

      await makeDirectory();
      window.location.reload();
    }
  });

  // 削除ボタンを押したときの処理。
  $(document).on("click", "#remove", async (e) => {
    e.stopPropagation();
    e.preventDefault();

    await rmFiles();
    window.location.reload();
  });

  // ファイル共有モーダルを開いた時の処理。
  $("#file-share").on("show.bs.modal", (e) => {
    e.stopPropagation();
    e.preventDefault();

    const shareBtn = $(e.relatedTarget);
    const cid = shareBtn.data("cid");

    $("#modal-cid").text(cid);
  });

  // ファイル共有ボタン。
  $(document).on("click", "#share", (e) => {
    e.stopPropagation();
    e.preventDefault();
    shareFile();
  });

  // コンテンツのチェックボックスについての処理。
  $(document).on("change", ".selection", (e) => {
    e.stopPropagation();
    e.preventDefault();
    // ひとつでも選択されていたら削除ボタンを出す。
    // それ以外では隠す。
    if ($(".selection:checked").length > 0) {
      $("#remove-btn").show();
    }
    else {
      $("#remove-btn").hide();
    }

  });

  // ドラッグ中にドロップエリアに入った時。
  $(document).on("dragover", ".drop-area", (e) => {
    e.stopPropagation();
    e.preventDefault();

    $(".drop-area").addClass("emphasized");
  });

  // ドラッグ中にドロップエリアから出たとき。
  $(document).on("dragleave", ".drop-area", (e) => {
    e.stopPropagation();
    e.preventDefault();

    $(".drop-area").removeClass("emphasized");
  });

  // ドロップエリアへのドロップ時の操作
  $(document).on("drop", ".drop-area", async (e) => {
    e.stopPropagation();
    e.preventDefault();

    $(".drop-area").removeClass("emphasized");

    const items = e.originalEvent.dataTransfer.items;
    for (const item of items) {
      const entry = item.webkitGetAsEntry();
      if (entry.isDirectory) {
        $("#alert-dir").modal("show");
        return;
      }
    }

    const files = e.originalEvent.dataTransfer.files;
    for (let file of files) {
      await addFile(file);
    }
    window.location.reload();
  });

  //　ドロップエリア以外のドロップ禁止
  $(document).on("dragenter dragover drop", (e) => {
    e.stopPropagation();
    e.preventDefault();
  });

  // ファイルコンテンツをダブルクリックしたときの処理。(hrefの内容に飛ぶ。別タブ。)
  $(document).on("dblclick", ".file", (e) => {
    e.stopPropagation();
    e.preventDefault();

    window.open($(e.currentTarget).attr("href"));
  });

  // ディレクトリコンテンツをダブルクリックしたときの処理。(hrefの内容に飛ぶ)
  $(document).on("dblclick", ".dir", (e) => {
    e.stopPropagation();
    e.preventDefault();

    window.location.href = $(e.currentTarget).attr("href");
  });
});

/////////////////////////////////////////////////////////////////////////
async function addFile(file) {
  // FormDataの作成。
  const formData = new FormData();
  formData.append("file", file);
  formData.append("file-name", file.name)
  formData.append("password", localStorage.getItem(userID));
  formData.append("path", currentPath);
  // /user/{ユーザID}/upload にFormData をPOST。
  const res = await fetch(`/user/${userID}/upload`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) {
    throw new Error(res.statusText);
  }
}

async function makeDirectory() {
  const params = new URLSearchParams();
  params.append("path", currentPath);
  params.append("password", localStorage.getItem(userID));
  params.append("dir", $("#dir-name").val());
  // /user/{ユーザID}/mkdir に params をPOST。
  const res = await fetch(`/user/${userID}/mkdir`, {
    method: "POST",
    body: params
  });
  if (!res.ok) {
    throw new Error(res.statusText);
  }
}

async function listFile(cid, name) {
  const params = new URLSearchParams();
  params.append("password", localStorage.getItem(userID));
  params.append("text", name);
  const res = await fetch(`/user/${userID}/decrypt/text`, {
    method: "POST",
    body: params
  });
  if (res.ok) {
    const data = await res.json();
    table.row.add($(
        `<tr>`
      + `   <td class="text-center">`
      + `     <input class="selection" type="checkbox"/>`
      + `   </td>`
      + `   <td class="text-center" style="padding-bottom: 1%;">`
      + `     <svg focusable="false" viewBox="0 0 32 32" height="16px" width="16px" fill="#5f6368">`
      + `      <g>`
      + `        <path d="M28.681 7.159c-0.694-0.947-1.662-2.053-2.724-3.116s-2.169-2.030-3.116-2.724c-1.612-1.182-2.393-1.319-2.841-1.319h-15.5c-1.378 0-2.5 1.121-2.5 2.5v27c0 1.378 1.122 2.5 2.5 2.5h23c1.378 0 2.5-1.122 2.5-2.5v-19.5c0-0.448-0.137-1.23-1.319-2.841zM24.543 5.457c0.959 0.959 1.712 1.825 2.268 2.543h-4.811v-4.811c0.718 0.556 1.584 1.309 2.543 2.268zM28 29.5c0 0.271-0.229 0.5-0.5 0.5h-23c-0.271 0-0.5-0.229-0.5-0.5v-27c0-0.271 0.229-0.5 0.5-0.5 0 0 15.499-0 15.5 0v7c0 0.552 0.448 1 1 1h7v19.5z"/>`
      + `      </g>`
      + `    </svg>`
      + `  </td>`
      + `  <td class="file content-name" href="/user/${userID}/files/${cid}" id="${name}">`
      + `    ${data.text}`
      + `  </td>`
      + `  <td class="text-center file-menu">`
      + `    <div class="btn-group dropend">`
      + `      <button type="button" class="btn btn-sm dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">`
      + `        <svg focusable="false" viewBox="0 0 16 16" height="16px" width="16px" fill="#5f6368">`
      + `          <g>`
      + `            <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>`
      + `          </g>`
      + `        </svg>`
      + `      </button>`
      + `      <ul class="dropdown-menu">`
      + `        <li>`
      + `          <a class="dropdown-item" href="/user/${userID}/download/${cid}" target="_blank" rel="noopener noreferrer" draggable="false">ダウンロード</a>`
      + `        </li>`
      + `        <li>`
      + `          <label class="dropdown-item" id="share-modal">`
      + `            共有`
      + `            <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#file-share" data-cid="${cid}" hidden></button>`
      + `          </label>`
      + `        </li>`
      + `      </ul>`
      + `    </div>`
      + `  </td>`
      + `</tr>`
    )).draw();
  } else {
    table.row.add($(
        `<tr>`
      + `   <td class="text-center">`
      + `     <input class="selection" type="checkbox"/>`
      + `   </td>`
      + `   <td class="text-center" style="padding-bottom: 1%;">`
      + `     <svg focusable="false" viewBox="0 0 32 32" height="16px" width="16px" fill="#5f6368">`
      + `      <g>`
      + `        <path d="M28.681 7.159c-0.694-0.947-1.662-2.053-2.724-3.116s-2.169-2.030-3.116-2.724c-1.612-1.182-2.393-1.319-2.841-1.319h-15.5c-1.378 0-2.5 1.121-2.5 2.5v27c0 1.378 1.122 2.5 2.5 2.5h23c1.378 0 2.5-1.122 2.5-2.5v-19.5c0-0.448-0.137-1.23-1.319-2.841zM24.543 5.457c0.959 0.959 1.712 1.825 2.268 2.543h-4.811v-4.811c0.718 0.556 1.584 1.309 2.543 2.268zM28 29.5c0 0.271-0.229 0.5-0.5 0.5h-23c-0.271 0-0.5-0.229-0.5-0.5v-27c0-0.271 0.229-0.5 0.5-0.5 0 0 15.499-0 15.5 0v7c0 0.552 0.448 1 1 1h7v19.5z"/>`
      + `      </g>`
      + `    </svg>`
      + `  </td>`
      + `  <td class="file-disabled content-name" id="${name}" style="colort: gray">`
      + `    ${name}`
      + `  </td>`
      + `  <td class="text-center file-menu">`
      + `  </td>`
      + `</tr>`
    )).draw();
  }
}

async function listDir(name) {
  const params = new URLSearchParams();
  params.append("password", localStorage.getItem(userID));
  params.append("text", name);
  const res = await fetch(`/user/${userID}/decrypt/text`, {
    method: "POST",
    body: params
  });
  if (res.ok) {
    const data = await res.json();
    const dirPath = currentPath === "" ? name : `${currentPath}/${name}`;
    table.row.add($(
        `<tr>`
      + `   <td class="text-center">`
      + `     <input class="selection" type="checkbox"/>`
      + `   </td>`
      + `   <td class="text-center" style="padding-bottom: 1%;">`
      + `     <svg focusable="false" viewBox="0 0 32 32" height="16px" width="16px" fill="#5f6368">`
      + `      <g>`
      + `        <path d="M14 4l4 4h14v22h-32v-26z"/>`
      + `      </g>`
      + `    </svg>`
      + `  </td>`
      + `  <td class="dir content-name" href="/user/${userID}/directories/${dirPath}" id="${name}">`
      + `    ${data.text}`
      + `  </td>`
      + `  <td class="text-center file-menu">`
      + `  </td>`
      + `</tr>`
    )).draw();
  } else {
    table.row.add($(
        `<tr>`
      + `   <td class="text-center">`
      + `     <input class="selection" type="checkbox"/>`
      + `   </td>`
      + `   <td class="text-center" style="padding-bottom: 1%;">`
      + `     <svg focusable="false" viewBox="0 0 32 32" height="16px" width="16px" fill="#5f6368">`
      + `      <g>`
      + `        <path d="M14 4l4 4h14v22h-32v-26z"/>`
      + `      </g>`
      + `    </svg>`
      + `  </td>`
      + `  <td class="dir-disabled content-name" id="${name}" style="color: gray">`
      + `    ${name}`
      + `  </td>`
      + `  <td class="text-center file-menu">`
      + `  </td>`
      + `</tr>`
    )).draw();
  }
}

async function rmFiles() {
  let targetFiles = new Array();
  for (let target of $(".selection:checked")) {
    // 削除するコンテンツの名前を追加。
    targetFiles.push($(target).parents().siblings(".content-name").attr("id"));
  }

  const json = {
    "password": localStorage.getItem(userID),
    "path": currentPath,
    "target_files": targetFiles
  }

  const res = await fetch(`/user/${userID}/rmFiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json)
  });
  if (!res.ok) {
    throw new Error(res.statusText);
  }
}

async function loadDirectory() {
  //　ディレクトリ内容の反映。
  for (let result of data.contents) {
    contentsIsExist = true;
    if (result.content.type === "file") {
      listFile(result.cid, result.content.name);
    } else if (result.content.type === "dir") {
      listDir(result.content.name);
    }
  }
  // テーブルレイアウトの調整。
  $($('th')[0]).css("width", "5%");
  $($('th')[1]).css("width", "5%");
  $($('th')[2]).css("width", "80%");
  $($('th')[3]).css("width", "10%");

  // パス反映。
  if (currentPath !== "") {
    const decryptedDirs = await getDecryptedDirsName();
    let dirHref = currentPath;
    for (let dir of decryptedDirs.reverse()) {
      $("#path").prepend(`/<a href="/user/${userID}/directories/${dirHref}" class="path">${dir}</a>`);
      dirHref = dirHref.substring(0, dirHref.lastIndexOf("/"));
    }
  }
}

async function getDecryptedDirsName() {
  const encryptedDirs = currentPath.split("/");
  let dirs = new Array();
  for (let dir of encryptedDirs) {
    const params = new URLSearchParams();
    params.append("password", localStorage.getItem(userID));
    params.append("text", dir);
    const res = await fetch(`/user/${userID}/decrypt/text`, {
      method: "POST",
      body: params
    })
    if (res.ok) {
      const data = await res.json();
      dirs.push(data.text);
    } else {
      throw new Error(res.statusText);
    }
  }
  return dirs;
}

async function shareFile() {
  const cid = $("#modal-cid").text();

}