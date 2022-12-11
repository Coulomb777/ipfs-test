$(async () => {

  const json = {
    password: localStorage.getItem(userID),
    cid: cid,
    ownership: true
  }

  // ファイルの要求・表示。
  const res = await fetch(`/user/${userID}/decrypt/file`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(json)
  });
  if (res.ok) {
    const blob = await res.blob();
    await $(".iframe-container").append(
      `<iframe src="${window.URL.createObjectURL(blob)}"}"></iframe>`
    );
  } else {
    throw new Error(res.statusText);
  }

  // iframe の見た目の調整。
  $(".iframe-container iframe").on("load", async () => {
    await $(".iframe-container iframe").contents().find("html").css("height", "");
    await $(".iframe-container iframe").contents().find("html").css("display", "block");

    const iframeImg = await $(".iframe-container iframe").contents().find("img");
    if (iframeImg.length > 0) {
      await iframeImg.css("display", "block");
      await iframeImg.css("width", "100%");
    }
  })

});