
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

        await $('.container').append(
            `<iframe src="${fileUrl}" class="${data.type.mime.split('/')[0]}"></iframe>`
        );

        //window.location.href = fileUrl;
        //const a = document.createElement("a");
        //document.body.appendChild(a);
        //a.download = `${cid}.${ext == '' ? 'unknown' : ext}`;
        //a.href = downloadUrl;
        //a.click();
        //a.remove();

        URL.revokeObjectURL(fileUrl);


    });

    $('.container iframe').on('load', async () => {
        await $('.container iframe').contents().find('html').css('height', '');
        await $('.container iframe').contents().find('html').css('display', 'block');

        const iframeImg = await $('.container iframe').contents().find('img');
        if (iframeImg.length > 0) {
            console.log(iframeImg)
            await iframeImg.css('display', 'block');
            await iframeImg.css('width', '100%');
        }
    })
});