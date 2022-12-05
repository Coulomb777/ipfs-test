
$(async () => {

    let json = { 
        "password" : localStorage.getItem(userID),
        "cid" : cid
    }
    // 復号化のためにPOST
    await $.ajax({
        url: `/user/${userID}/decrypt/file`,
        type: 'post',
        data: JSON.stringify(json),
        contentType: 'application/json',
        processData: false
    }).done(async (data) => {
        // 受け取ったファイルを表示する処理。
        const fileBuffer = new Uint8Array(data.fileBuffer.data);
        const fileBlob = new Blob([fileBuffer], { type: data.type.mime });
        const fileUrl = window.URL.createObjectURL(fileBlob);

        // ダウンロード処理。
        const a = document.createElement("a");
        document.body.appendChild(a);
        a.download = `${cid}.${data.type.ext}`;
        a.href = fileUrl;
        a.click();
        a.remove();

        URL.revokeObjectURL(fileUrl);
    });
});