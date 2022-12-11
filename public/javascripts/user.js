$(async () => {// 準備処理。
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
    
    $("#processing-modal").modal("show");
    for (const file of files) {
      await addFile(file);
    }
    window.location.reload();
  });

  // ディレクトリの追加ボタンを押したときの処理。
  $(document).on("click", "#make-dir", async (e) => {
    e.stopPropagation();
    e.preventDefault();

    $("#dir-modal").modal("hide");
    $("#processing-modal").modal("show");
    await makeDirectory();
    window.location.reload();
  });

  // ディレクトリ名入力時の処理。
  $(document).on("keydown", "#dir-name", async (e) => {
    const input = $("#dir-name").val();

    if(e.key === "Enter") {
      e.stopPropagation();
      e.preventDefault();

      if (input !== "") {
        $("#dir-modal").modal("hide");
        $("#processing-modal").modal("show");
        await makeDirectory();
        window.location.reload();
      } 
    }
  });

  // ディレクトリ名入力後の処理。
  $(document).on("keyup", "#dir-name", () => {
    const input = $("#dir-name").val();

    if (input === "") {
      $("#dir-alert").removeAttr("hidden");
      $("#make-dir").attr("disabled", "");
    } else {
      $("#dir-alert").attr("hidden", "");
      $("#make-dir").removeAttr("disabled");
    }
  });

  // 削除ボタンを押したときの処理。
  $(document).on("click", "#remove", async (e) => {
    e.stopPropagation();
    e.preventDefault();

    $("#processing-modal").modal("show");
    await rmFiles();
    window.location.reload();
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

    $("#processing-modal").modal("show");
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

  // ファイル共有モーダルを開いた時の処理。
  $(document).on("show.bs.modal", "#share-modal", (e) => {
    const shareMenuBtn = $(e.relatedTarget);
    const cid = shareMenuBtn.data("cid");
    const contentName = shareMenuBtn.data("name");

    $("#modal-cid").text(cid);
    $("#modal-content-name").text(contentName);
  });

  let isPress;
  // ファイル共有モーダル内へのID入力時の処理。
  // Enter キーのみデフォルトとは違う処理を行う。
  $(document).on("keypress", "#share-target", async (e) => {
    isPress = true;
    if (e.key === "Enter") {
      e.stopPropagation();
      e.preventDefault();

      if (!$("#share").attr("disabled")) {
        await shareFile();
      }
    }
  });

  // ファイル共有モーダル内へのID入力後の処理。
  $(document).on("keyup", "#share-target", async () => {
    isPress = false;
    const input = $("#share-target").val();

    $("#share").attr("disabled", "");
    if (isPress || input === "") {
      $("#users-table").hide();
    } else {
      await reloadUsersTable(input);
      $("#users-table").show();

      for (const user of $(".search-user")) {
        if ($(user).text() === input) {
          $("#share").removeAttr("disabled");
          break;
        }
      }
    } 
  });

  // ファイル共有モーダル内で検索ユーザをクリックしたときの処理。
  $(document).on("click", ".search-user", (e) => {
    const targetID = $(e.target).text();
    $("#share-target").val(targetID);
    $("#share").removeAttr("disabled");
    $("#users-table").hide();
  });

  // ファイル共有ボタンを押した後の処理。
  $(document).on("click", "#share", async (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    await shareFile();
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
  const json = {
    password: localStorage.getItem(userID),
    text: name,
    ownership: true
  }
  const res = await fetch(`/user/${userID}/decrypt/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json)
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
      + `          <label class="dropdown-item">`
      + `            共有`
      + `            <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#share-modal" data-cid="${cid}" data-name="${name}" hidden></button>`
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
  const json = {
    password: localStorage.getItem(userID),
    text: name,
    ownership: true
  }
  const res = await fetch(`/user/${userID}/decrypt/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json)
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
  $($("th")[0]).css("width", "5%");
  $($("th")[1]).css("width", "5%");
  $($("th")[2]).css("width", "80%");
  $($("th")[3]).css("width", "10%");

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
    const json = {
      password: localStorage.getItem(userID),
      text: dir,
      ownership: true
    }
    const res = await fetch(`/user/${userID}/decrypt/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(json)
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

async function reloadUsersTable(target) {
  const params = new URLSearchParams();
  params.append("target", target);
  const res = await fetch(`/user/search`, {
    method: "POST",
    body: params
  });
  if (res.ok) {
    const data = await res.json();
    const users = data.users;

    let table, isOtherUserExist = false;
    if (users.length > 0) {
      for (const user of users) {
        if (user !== userID) {
          isOtherUserExist = true;
          table +=
              `<tr>`
            + `  <td class="search-user" style="padding-left: 10px;">${user}</td>`
            + `</tr>`;
        }
      }
      $("#search-users").html(table);
    }
    if (!isOtherUserExist) {
      $("#search-users").html(
        '<tr><td class="text-center" style="color: gray;">ユーザーが見つかりません。</td></tr>'
      );
    }
  } else {
    throw new Error(res.statusText);
  }
}

async function shareFile() {
  const cid = $("#modal-cid").text();
  const contentName = $("#modal-content-name").text();

  const params = new URLSearchParams();
  params.append("target-id", $("#share-target").val());
  params.append("cid", cid);
  params.append("content-name", contentName);
  params.append("password", localStorage.getItem(userID));

  $("#share-modal").modal("hide");
  $("#processing-modal").modal("show");
  const res = await fetch(`/user/${userID}/share`, {
    method: "POST",
    body: params
  });

  if (res.ok) {
    $("#processing-modal").modal("hide");
    $("#share-complete-modal").modal("show");
  } else {
    throw new Error(res.statusText);
  }
}