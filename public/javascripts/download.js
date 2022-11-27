
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
        // 受け取ったファイルをダウンロードする処理。
        const fileBuffer = new Uint8Array(data.fileBuffer.data);
        console.log(fileBuffer)
        const fileBlob = new Blob([fileBuffer], { type: "application/octet-binary" });
        const downloadUrl = window.URL.createObjectURL(fileBlob);

        const a = document.createElement("a");
        document.body.appendChild(a);
        a.download = `${cid}.${ext == '' ? 'unknown' : ext}`;
        a.href = downloadUrl;
        a.click();
        a.remove();
        URL.revokeObjectURL(downloadUrl);
    });

});