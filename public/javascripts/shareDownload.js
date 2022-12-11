$(async () => {

  const json = {
    password: localStorage.getItem(userID),
    cid: cid,
    ownership: false,
    contentName: contentName
  }

  // ファイルの取得・ダウンロード。
  const res = await fetch(`/user/${userID}/decrypt/file`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json)
  })
  if (res.ok) {
    const disposition = res.headers.get("Content-Disposition");
    if (disposition && disposition.indexOf("attachment") !== -1) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = filenameRegex.exec(disposition);
      if (matches != null && matches[1]) {
        const fileName = decodeURIComponent(matches[1].replace(/['"]/g, ""));
        const a = document.createElement("a");
        a.href = window.URL.createObjectURL(await res.blob());
        a.download = fileName;
        a.click();
      }
    }
  } else {
    throw new Error(res.statusText);
  }
  
});