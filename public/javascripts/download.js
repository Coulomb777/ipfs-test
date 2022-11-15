
$(async () => {

    let ipfs = await window.IpfsCore.create({ repo: userID });
    // 復号化するファイルのバッファーを取得。
    let buffer = new Array(); 
    for await (const chunk of ipfs.cat(cid)) {
        buffer.push(chunk);
    }

    let json = { 
        "password" : localStorage.getItem(userID),
        "buffer" : buffer[0]
    }
    // 復号化のためにPOST
    $.ajax({
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
        a.download = 'file.jpg';
        a.href = downloadUrl;
        a.click();
        a.remove();
        URL.revokeObjectURL(downloadUrl);
/*
        $('<button>').attr({
            id: 'download',
            href: downloadUrl
        }).appendTo('body');
        $('#download').trigger("click");
        window.URL.revokeObjectURL(downloadUrl);
            */
    });

});