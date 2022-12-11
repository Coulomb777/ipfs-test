$(async () => {// 準備処理。

    await loadDirectory();
  
    // ロード画面を隠す・ページ内容の表示。
    await $(".loader").fadeOut();
    await $(".contents").delay(400).fadeIn();
  });
  
  $(window).on("load", async () => { // ページ読み込み終了後の処理。  
    // 削除ボタンを押したときの処理。
    $(document).on("click", "#remove", async (e) => {
      e.stopPropagation();
      e.preventDefault();
  
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
  
    //　ドラッグアンドドロップ無視。
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
  });
  
  /////////////////////////////////////////////////////////////////////////
  
  async function listFile(cid, name) {
    const json = {
      password: localStorage.getItem(userID),
      text: name,
      ownership: false
    }
    const res = await fetch(`/user/${userID}/decrypt/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(json)
    });
    if (res.ok) {
      const data = await res.json();
      console.log(data.from)
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
        + `  <td class="file content-name" href="/user/${userID}/share/files/${cid}?name=${name}" id="${name}">`
        + `    ${data.text}`
        + `  </td>`
        + `  <td class="file conten-from" id="${data.from}">`
        + `    ${data.from}`
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
        + `          <a class="dropdown-item" href="/user/${userID}/share/download/${cid}?name=${name}" target="_blank" rel="noopener noreferrer" draggable="false">ダウンロード</a>`
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
        + `  <td class="file-disabled content-from">`
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
      password: localStorage.getItem(userID),
      path: "share",
      target_files: targetFiles
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
        listFile(result.cid, result.content.name);
    }
    // テーブルレイアウトの調整。
    $($("th")[0]).css("width", "5%");
    $($("th")[1]).css("width", "5%");
    $($("th")[2]).css("width", "50%");
    $($("th")[3]).css("width", "30%");
    $($("th")[4]).css("width", "10%");
  }
